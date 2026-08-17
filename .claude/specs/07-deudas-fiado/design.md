# Deudas y fiado — Diseño

## Esquema

La base mínima (`cliente`, `deuda_movimiento`, `cliente_saldo`, `registrar_deuda`) se
adelantó como dependencia real del punto de venta, en
`supabase/migrations/0005_clientes_deudas_base.sql` y `0006_ventas.sql` (mismo
patrón que la tasa con el spec 04). Lo que sigue — `deuda_por_revisar`, los
abonos y su anulación, y el permiso de escritura de clientes para ambos roles —
se completó en `0009_deudas.sql`, y `registrar_deuda_manual` (deuda sin venta,
que `registrar_deuda` no cubre) en `0010_deuda_manual.sql`:

```sql
create type tipo_movimiento_deuda as enum ('deuda','abono','ajuste');

create table public.cliente (
  id        uuid primary key default gen_random_uuid(),
  nombre    text not null,
  nombre_busqueda text generated always as (public.normalizar(nombre)) stored,
  telefono  text,
  nota      text,
  activo    boolean not null default true,
  origen    text,                     -- 'DEUDAS 2026!B12'
  creado_en timestamptz not null default now()
);

create table public.deuda_movimiento (
  id             bigserial primary key,
  cliente_id     uuid not null references public.cliente(id),
  unidad_negocio unidad_negocio not null,
  tipo           tipo_movimiento_deuda not null,
  monto_usd      numeric(12,2) not null check (monto_usd > 0),
  tasa_aplicada  numeric(16,4) not null,
  metodo         metodo_pago,          -- solo en abonos
  venta_id       uuid references public.venta(id),
  nota           text,
  anulado        boolean not null default false,
  usuario_id     uuid not null references public.perfil(id),
  creado_en      timestamptz not null default now()
);

-- Notas heredadas del Excel, pendientes de que el dueño confirme el monto
create table public.deuda_por_revisar (
  id             bigserial primary key,
  cliente_id     uuid not null references public.cliente(id),
  unidad_negocio unidad_negocio not null,
  nota_original  text not null,
  monto_sugerido numeric(12,2),        -- siempre null: no se adivina
  resuelto       boolean not null default false,
  origen         text not null,
  creado_en      timestamptz not null default now()
);

create index deuda_cliente_idx on public.deuda_movimiento (cliente_id, creado_en desc)
  where not anulado;
```

`monto_usd` siempre positivo; el signo lo da `tipo`. Un `check (monto_usd > 0)`
cubre el requisito 2.4 y evita el error de registrar un abono negativo que
inflaría la deuda.

**`deuda_por_revisar` es una tabla aparte, no una columna en `deuda_movimiento`.**
Esa separación es lo que cumple el requisito 5.7: un registro sin confirmar no
existe para el cálculo de saldo, porque vive en otra tabla. Si fuera una bandera
en la misma tabla, cada consulta de saldo tendría que acordarse de filtrarla, y
alguna se olvidaría.

## Saldo

```sql
create view public.cliente_saldo as
select
  c.id as cliente_id,
  c.nombre,
  m.unidad_negocio,
  coalesce(sum(m.monto_usd) filter (where m.tipo = 'deuda'), 0)
    - coalesce(sum(m.monto_usd) filter (where m.tipo = 'abono'), 0) as saldo_usd,
  min(m.creado_en) filter (where m.tipo = 'deuda') as deuda_mas_antigua,
  max(m.creado_en) as ultimo_movimiento
from public.cliente c
left join public.deuda_movimiento m on m.cliente_id = c.id and not m.anulado
group by c.id, c.nombre, m.unidad_negocio;
```

El saldo nunca se guarda como columna. Un saldo persistido se desincroniza en
cuanto una operación falla a la mitad; derivarlo de los movimientos hace que sea
imposible que mienta.

`deuda_mas_antigua` cubre el requisito 4.5 sin una consulta aparte. Es una
aproximación: la deuda más antigua *registrada*, no la más antigua *sin saldar*,
porque no llevamos aplicación de abonos contra deudas específicas. Para una
bodega, donde el abono se aplica al saldo global, es la lectura correcta.

## Registrar deuda desde una venta

`crear_venta` (spec 05) llama a esta función cuando los pagos no cubren el total:

```sql
create or replace function public.registrar_deuda(
  p_cliente_id uuid, p_monto numeric, p_venta_id uuid, p_tasa numeric
) returns bigint
language plpgsql security definer set search_path = public as $$
begin
  if p_cliente_id is null then raise exception 'cliente_requerido'; end if;
  insert into public.deuda_movimiento
    (cliente_id, unidad_negocio, tipo, monto_usd, tasa_aplicada, venta_id, usuario_id)
  select p_cliente_id, v.unidad_negocio, 'deuda', p_monto, p_tasa, p_venta_id, auth.uid()
  from public.venta v where v.id = p_venta_id
  returning id;
end $$;
```

La unidad de negocio se toma de la venta, no del parámetro: son el mismo dato y
duplicarlo permitiría que se contradigan.

## Abonos

```sql
create or replace function public.registrar_abono(
  p_cliente_id uuid, p_negocio unidad_negocio, p_monto numeric,
  p_metodo metodo_pago, p_nota text default null
) returns bigint
```

El abono es un ingreso de caja (requisito 3.5). No se duplica en la tabla de
caja: el spec 08 construye el flujo leyendo ventas **y** abonos, así que
registrar el abono aquí basta.

El requisito 3.3 (abono mayor al saldo) se resuelve en la interfaz, no en la
base: la función acepta el monto que se le pase, y es el diálogo el que ofrece
las dos opciones. Un saldo a favor es un saldo negativo, y la vista lo maneja
sin cambios.

## Bandeja de revisión

Se siembra desde `mock/deudas.json`. Los 13 registros con `requiere_revision`
entran a `deuda_por_revisar` con su `nota_original` intacta:

```
┌──────────────────────────────────────────────────────────┐
│ LESTER                                    Bodega          │
│ ─────────────────────────────────────────────────────────│
│ Anotado en la planilla:                                   │
│   "4,5+1,80+1,80+1refres pq+1,80+1refre pq+1,80+2+        │
│    1,20+2,10+1,30+1flipgd+1chesse pq+3universal"          │
│                                                           │
│ Monto confirmado   [ $______ ]                            │
│                                                           │
│   [ Confirmar deuda ]      [ Descartar ]                  │
└──────────────────────────────────────────────────────────┘
```

El campo de monto arranca **vacío**. Se podría sumar los números del texto y
proponer un total, pero `"1refres pq"` y `"3universal"` son productos, no montos,
y `"1flipgd"` es un producto cuyo precio hay que buscar. Una suma parcial
presentada como sugerencia se aceptaría sin revisar y quedaría mal para siempre.
El dueño es el único que sabe qué dice esa nota.

Los casos numéricos simples (`JOSEFINA: 7420`, `BERNARDA: 2800`, y 5 más) **no**
entran a revisión: `DEUDAS 2026` tiene una columna por moneda/unidad de negocio
(columna `C` = bodega en Bs., `E` = bodega en USD, `F` = cerveza en Bs., `G` =
thais en USD), así que la columna de origen ya resuelve la moneda sin
ambigüedad — `mock/extract_excel.py` la lee de ahí, no la adivina. Solo los 6
registros de texto libre (`"4,5+1,80+1refres pq"`) van a la bandeja, porque esos
sí mezclan montos y productos en una misma celda.

## Interfaz

```
pages/deudas/
  DeudasResumen.vue     total por cobrar, clientes con más deuda, morosos > 30 días
  ClientesLista.vue     lista con saldo, ordenada descendente
  ClienteDetalle.vue    estado de cuenta con saldo corrido
  AbonoFormulario.vue   modal de abono
  RevisionPendiente.vue bandeja de las notas del Excel
```

El estado de cuenta muestra saldo corrido, que se calcula en el cliente
recorriendo los movimientos de más antiguo a más nuevo:

| Fecha | Concepto | Monto | Saldo |
| --- | --- | --- | --- |
| 12/08 | Venta #142 · 4 productos | +$4,50 | $4,50 |
| 14/08 | Abono · Pago móvil | −$2,00 | $2,50 |
| 16/08 | Venta #187 · 2 productos | +$1,80 | $4,30 |

### Compartir estado de cuenta

Requisito 6.3: se genera un texto plano y se usa `navigator.share()` cuando está
disponible, con respaldo a copiar al portapapeles. La app **no envía nada**
(requisito 6.4); prepara el texto y el usuario decide.

```
Estado de cuenta — Lester
Al 16/08/2026

12/08  Venta 4 productos      $4,50
14/08  Abono                 -$2,00
16/08  Venta 2 productos      $1,80

Saldo: $4,30  (3.440 Bs. a tasa 800)
```

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Interpretar mal una nota del Excel fija un saldo falso | No se sugiere monto; el dueño lo captura |
| Saldo persistido que se desincroniza | El saldo es una vista derivada, nunca una columna |
| Homónimos («JUAN», «PAOLA») se fusionan por error | Se advierte pero se permite; son personas distintas |
| Abono negativo infla la deuda | `check (monto_usd > 0)` y el signo lo da el tipo |
| Registros sin revisar contaminan el total por cobrar | Viven en otra tabla, no en `deuda_movimiento` |
| Fiar sin saber que el cliente ya debe | El saldo se muestra al seleccionarlo en la venta |
