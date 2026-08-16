# Flujo de caja — Diseño

## Principio: la caja se deriva, no se lleva aparte

Las ventas ya están en `venta` y `venta_pago`. Los abonos ya están en
`deuda_movimiento`. Duplicarlos en una tabla de caja crearía dos fuentes de
verdad que se desincronizan a la primera anulación.

Lo único que este spec agrega es la tabla de **egresos**, que no existe en ningún
otro lado. El resto es una vista.

## Esquema

`supabase/migrations/0008_caja.sql`:

```sql
create type categoria_egreso as enum
  ('proveedor','insumos','servicios','sueldos','retiro','otro');

create table public.egreso (
  id             uuid primary key default gen_random_uuid(),
  unidad_negocio unidad_negocio not null,
  descripcion    text not null,
  monto_usd      numeric(12,2) not null check (monto_usd > 0),
  tasa_aplicada  numeric(16,4) not null,
  categoria      categoria_egreso not null default 'otro',
  metodo         metodo_pago not null,
  referencia     text,
  anulado        boolean not null default false,
  anulado_por    uuid references public.perfil(id),
  anulado_motivo text,
  usuario_id     uuid not null references public.perfil(id),
  creado_en      timestamptz not null default now()
);

create index egreso_fecha_idx on public.egreso (creado_en desc) where not anulado;

alter table public.egreso enable row level security;
create policy egreso_lectura on public.egreso for select to authenticated using (true);
create policy egreso_insercion on public.egreso for insert to authenticated
  with check (
    public.rol_actual() = 'dueno'
    or categoria not in ('retiro','sueldos')   -- requisito 2.7
  );
create policy egreso_anulacion on public.egreso for update to authenticated
  using (public.rol_actual() = 'dueno');
```

La restricción del requisito 2.7 vive en la política, no en el formulario.
Ocultar las opciones «Retiro» y «Sueldos» al `mostrador` es una cortesía de la
interfaz; lo que impide el registro es la base.

## Vista unificada de movimientos

```sql
create view public.movimiento_caja as
  -- Ingresos por venta, una fila por método de pago
  select
    vp.id::text || '-vp'          as id,
    'ingreso'                     as flujo,
    'venta'                       as origen,
    v.id                          as documento_id,
    v.unidad_negocio,
    'Venta #' || v.correlativo    as concepto,
    vp.metodo,
    null::categoria_egreso        as categoria,
    vp.monto_usd,
    v.tasa_aplicada,
    v.creado_en
  from public.venta_pago vp
  join public.venta v on v.id = vp.venta_id
  where not v.anulada and vp.metodo <> 'credito'

union all
  -- Ingresos por abono de deuda
  select
    dm.id::text || '-dm', 'ingreso', 'abono', dm.id, dm.unidad_negocio,
    'Abono · ' || c.nombre, dm.metodo, null, dm.monto_usd, dm.tasa_aplicada, dm.creado_en
  from public.deuda_movimiento dm
  join public.cliente c on c.id = dm.cliente_id
  where dm.tipo = 'abono' and not dm.anulado

union all
  -- Egresos
  select
    e.id::text || '-eg', 'egreso', 'egreso', e.id, e.unidad_negocio,
    e.descripcion, e.metodo, e.categoria, e.monto_usd, e.tasa_aplicada, e.creado_en
  from public.egreso e
  where not e.anulado;
```

Tres decisiones que importan:

**`vp.metodo <> 'credito'`.** Una venta a fiado no mueve dinero. Lo que entra a
caja es el abono, cuando ocurra. Incluir la línea de crédito inflaría los
ingresos del día con dinero que nadie recibió.

**Una fila por método, no por venta.** Una venta con pago mixto aparece como dos
movimientos. Es lo que permite el desglose del requisito 4.1 sin desarmar nada
después.

**Las ventas y egresos anulados se filtran en la vista.** Así ninguna consulta
posterior tiene que acordarse.

## Saldo

```sql
create or replace function public.saldo_caja(
  p_negocio unidad_negocio, p_hasta timestamptz default now()
) returns table (metodo metodo_pago, saldo_usd numeric)
language sql stable as $$
  select metodo,
         sum(case when flujo = 'ingreso' then monto_usd else -monto_usd end)
  from public.movimiento_caja
  where unidad_negocio = p_negocio and creado_en <= p_hasta
  group by metodo;
$$;
```

El saldo se calcula desde el origen de los tiempos, no día a día. Con el volumen
de una bodega eso son unos pocos miles de filas al año y la consulta es
instantánea; a cambio, el requisito 3.2 (el saldo inicial de un día es el cierre
del anterior) se cumple por construcción, sin un proceso nocturno que pueda
fallar.

Si el histórico creciera lo suficiente para que pese, se agrega una tabla de
saldos de corte diario y la función suma desde el último corte. No antes.

### Efectivo vs. electrónico

El requisito 3.4 se resuelve con la columna `afecta_arqueo` del catálogo de
métodos de pago:

```
Efectivo en gaveta      $142,30      113.840 Bs.
  Efectivo Bs.          $128,40
  Efectivo $             $13,90
En cuentas              $421,60      337.280 Bs.
  Punto                 $ 24,90
  Pago móvil            $358,75
  Biopago               $ 37,95
```

Solo el primer bloque es lo que el arqueo del spec 09 puede contar físicamente.

## Interfaz

```
pages/caja/
  CajaDia.vue          movimientos del día, saldo y desglose
  EgresoFormulario.vue modal de egreso
  CajaHistorial.vue    navegación por fechas y rangos
pages/resumen/
  Resumen.vue          pantalla de inicio
```

`CajaDia` tiene tres zonas: tarjetas de saldo arriba, desglose por método al
centro, lista de movimientos abajo. En móvil se apilan; en escritorio el desglose
va en columna lateral.

Cada movimiento se muestra con `+` o `−` **antes** del monto además del color
(requisito 1.5), siguiendo la regla de accesibilidad de
[ui-ux.md](../../steering/ui-ux.md).

## Resumen

La pantalla de inicio consume una sola RPC que devuelve todo de golpe, en lugar
de cinco consultas separadas que harían parpadear la pantalla por partes:

```sql
create or replace function public.resumen_dia(p_negocio unidad_negocio)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'vendido_hoy',      ...,
    'numero_ventas',    ...,
    'ticket_promedio',  ...,
    'egresos_hoy',      ...,
    'saldo_actual',     ...,
    'serie_7_dias',     ...,   -- para el gráfico de barras
    'mismo_dia_semana_anterior', ...,
    'productos_en_alerta', ...,
    'por_cobrar',       ...,
    'pendientes_revision', ...
  );
$$;
```

El gráfico de barras (requisito 5.2) replica el del prototipo: siete barras, la
última en color de acento, con el valor abreviado (`$212k`) encima.

## Exportación

El CSV del requisito 6.4 se genera en el cliente desde los datos ya cargados. Se
incluyen ambas monedas y la tasa de cada movimiento, para que la hoja resultante
sea auditable sin volver a la app.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Doble contabilidad entre ventas y caja | La caja es una vista, no una tabla propia |
| Las ventas a fiado inflan el ingreso del día | La vista excluye el método `credito` |
| El `mostrador` registra retiros | Restricción en la política RLS, no solo en el formulario |
| El saldo desde el origen se vuelve lento | Tabla de cortes diarios si el histórico lo exige, no antes |
| Confundir efectivo con dinero en cuentas | Desglose separado, alineado con `afecta_arqueo` |
