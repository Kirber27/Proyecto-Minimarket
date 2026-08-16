# Arqueo de caja — Diseño

## Esquema

`supabase/migrations/0009_arqueo.sql`:

```sql
create table public.denominacion (
  id      bigserial primary key,
  moneda  moneda not null,
  valor   numeric(12,2) not null,
  activa  boolean not null default true,
  orden   smallint not null,
  unique (moneda, valor)
);

insert into public.denominacion (moneda, valor, orden) values
  ('VES',5,1),('VES',10,2),('VES',20,3),('VES',50,4),
  ('VES',100,5),('VES',200,6),('VES',500,7),
  ('USD',1,1),('USD',5,2),('USD',10,3),('USD',20,4),('USD',50,5),('USD',100,6);

create table public.arqueo (
  id             uuid primary key default gen_random_uuid(),
  unidad_negocio unidad_negocio not null,
  fecha          date not null,
  estado         text not null default 'borrador'
                 check (estado in ('borrador','cerrado')),
  fondo_inicial_usd  numeric(12,2) not null default 0,
  contado_ves    numeric(14,2) not null default 0,
  contado_usd    numeric(12,2) not null default 0,
  esperado_ves   numeric(14,2),
  esperado_usd   numeric(12,2),
  diferencia_ves numeric(14,2),
  diferencia_usd numeric(12,2),
  tasa_aplicada  numeric(16,4),
  nota           text,
  usuario_id     uuid not null references public.perfil(id),
  cerrado_en     timestamptz,
  creado_en      timestamptz not null default now()
);

-- Un solo arqueo cerrado por unidad y día (requisito 3.5), pero varios
-- borradores no molestan a nadie.
create unique index arqueo_unico_cerrado
  on public.arqueo (unidad_negocio, fecha) where estado = 'cerrado';

create table public.arqueo_detalle (
  id              bigserial primary key,
  arqueo_id       uuid not null references public.arqueo(id) on delete cascade,
  denominacion_id bigint not null references public.denominacion(id),
  cantidad        integer not null check (cantidad >= 0),
  unique (arqueo_id, denominacion_id)
);
```

Las denominaciones son una tabla y no un enum por el requisito 1.6: Venezuela ha
tenido tres reconversiones monetarias en quince años, y cada una cambia el juego
de billetes. Desactivar una denominación y agregar otra tiene que ser una fila,
no una migración.

Los arqueos cerrados quedan inmutables por trigger, igual que los movimientos de
stock:

```sql
create or replace function public.impedir_editar_arqueo_cerrado()
returns trigger language plpgsql as $$
begin
  if old.estado = 'cerrado' then raise exception 'arqueo_cerrado'; end if;
  return new;
end $$;

create trigger arqueo_inmutable before update or delete on public.arqueo
  for each row execute function public.impedir_editar_arqueo_cerrado();
```

## Efectivo esperado

```sql
create or replace function public.efectivo_esperado(
  p_negocio unidad_negocio, p_fecha date
) returns table (moneda moneda, monto_usd numeric)
language sql stable as $$
  select
    case when mc.metodo = 'efectivo-usd' then 'USD'::moneda else 'VES'::moneda end,
    sum(case when mc.flujo = 'ingreso' then mc.monto_usd else -mc.monto_usd end)
  from public.movimiento_caja mc
  join public.metodo_pago mp on mp.id = mc.metodo
  where mc.unidad_negocio = p_negocio
    and mc.creado_en::date = p_fecha
    and mp.afecta_arqueo                    -- requisito 2.8
  group by 1;
$$;
```

El filtro por `afecta_arqueo` es la clave del requisito 2.8: Punto, Pago móvil y
Biopago mueven dinero real, pero ese dinero está en una cuenta bancaria, no en la
gaveta. Incluirlos en el esperado daría un faltante enorme todos los días.

Al esperado en bolívares se le suma el fondo inicial convertido a la tasa del
arqueo (requisito 4.2).

## Cálculo del cuadre

```
Contado Bs.        =  Σ (denominación.valor × cantidad)   para moneda VES
Contado $          =  Σ (denominación.valor × cantidad)   para moneda USD
Esperado Bs.       =  (efectivo_esperado[VES] × tasa) + (fondo_inicial × tasa)
Esperado $         =   efectivo_esperado[USD]
Diferencia Bs.     =  Contado Bs. − Esperado Bs.
Diferencia $       =  Contado $   − Esperado $
```

Las dos monedas se cuadran **por separado** (requisito 2.3). Convertir todo a una
sola cifra escondería el caso común: sobran bolívares y faltan dólares, que casi
siempre significa que alguien cobró en la moneda equivocada, no que falte dinero.

El total combinado en USD (requisito 1.5) se muestra como referencia informativa,
claramente separado del cuadre.

## Interfaz

```
pages/arqueo/
  ArqueoNuevo.vue      grilla de conteo, cuadre y cierre
  ArqueoDetalle.vue    vista de un arqueo cerrado
  ArqueoHistorial.vue  lista y tendencia de diferencias
```

Disposición de la grilla, pensada para el pulgar:

```
┌─────────── Bolívares ────────────┐
│  500 Bs.   [   5 ]      2.500    │
│  200 Bs.   [   0 ]          0    │
│  100 Bs.   [  63 ]      6.300    │
│   50 Bs.   [  33 ]      1.650    │
│   20 Bs.   [   1 ]         20    │
│   10 Bs.   [     ]          0    │
│    5 Bs.   [     ]          0    │
├──────────────────────────────────┤
│  Total contado         10.470 Bs.│
└──────────────────────────────────┘
```

Los valores del ejemplo son los del conteo real de la hoja `MONEDA`, y sirven
como caso de prueba: 5×500 + 63×100 + 33×50 + 1×20 = 10.470, que es exactamente
el total que da la hoja.

Decisiones de uso en móvil:

- **De mayor a menor denominación.** Se cuenta el fajo grande primero.
- `inputmode="numeric"` y `enterkeyhint="next"` para que el teclado numérico
  avance de campo con su propia tecla (requisito 6.2).
- La barra de total queda **adherida al pie** (requisito 6.3), visible mientras se
  desplaza la grilla.
- El borrador se guarda en `localStorage` en cada cambio y se sincroniza al
  servidor con rebote de 2 s (requisitos 3.8 y 6.4). Contar la caja se interrumpe
  con clientes.

## Cierre

El cierre pide confirmación explícita, y es de los pocos sitios de la app donde
sí corresponde: es irreversible por diseño.

```
┌────────────────────────────────────────┐
│  Cierre de caja · Bodega · 16/08/2026  │
│                                        │
│  Contado      10.470 Bs.      $ 45,00  │
│  Esperado     10.470 Bs.      $ 47,50  │
│  ─────────────────────────────────────  │
│  Diferencia        0 Bs.      −$ 2,50  │
│                          Faltante en $ │
│                                        │
│  Nota (obligatoria por la diferencia)  │
│  [ ____________________________ ]      │
│                                        │
│  [ Cerrar caja ]        [ Cancelar ]   │
└────────────────────────────────────────┘
```

El umbral que dispara la nota obligatoria (requisito 2.6) arranca en $1,00 y es
configurable en Ajustes.

## Retiro de la recaudación

Al cerrar, el sistema ofrece registrar el retiro (requisito 4.3). Lo que se
retira es lo contado menos el fondo que queda para mañana. Se materializa como un
egreso de categoría `retiro`, así que el flujo de caja del spec 08 lo refleja sin
lógica adicional, y el saldo de mañana arranca en el fondo.

## Tendencia

El requisito 5.4 se resuelve con un gráfico de líneas de las diferencias de los
últimos 30 arqueos. Un faltante recurrente de monto parecido tiene una causa
distinta a un faltante grande y aislado, y verlos en serie es lo que permite
distinguirlos.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Incluir el dinero electrónico daría faltantes falsos | Filtro por `afecta_arqueo` |
| Cuadrar las dos monedas juntas oculta errores de cobro | Cuadre separado por moneda |
| Perder el conteo por una interrupción | Borrador en `localStorage` + sincronización con rebote |
| Reconversión monetaria invalida las denominaciones | Tabla configurable, no enum |
| Editar un arqueo cerrado para «arreglar» un faltante | Trigger de inmutabilidad |
| Anular una venta de un día ya arqueado descuadra el cierre | El spec 05 advierte antes de anular |
