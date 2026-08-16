# Reportes — Diseño

## Agregación en el servidor

El requisito 7.2 no es negociable: traer un año de ventas al teléfono para
sumarlas en JavaScript es lento, gasta datos móviles y no funciona sin conexión
de todos modos. Todo se agrega en Postgres.

`supabase/migrations/0010_reportes.sql`:

```sql
create or replace function public.reporte_ventas(
  p_negocio unidad_negocio,
  p_desde   timestamptz,
  p_hasta   timestamptz,
  p_granularidad text          -- 'hora'|'dia'|'semana'|'mes'|'trimestre'
) returns table (
  cubo        timestamptz,
  total_usd   numeric,
  total_ves_historico numeric,
  ventas      bigint,
  unidades    numeric
)
language sql stable as $$
  select
    date_trunc(p_granularidad, v.creado_en) as cubo,
    sum(v.total_usd),
    sum(v.total_usd * v.tasa_aplicada),     -- «tal como se cobró»
    count(*),
    sum(v.unidades)
  from public.venta v
  where not v.anulada
    and (p_negocio is null or v.unidad_negocio = p_negocio)
    and v.creado_en >= p_desde and v.creado_en < p_hasta
  group by 1 order by 1;
$$;
```

Las dos métricas de moneda del requisito 2 salen de la misma consulta:
`total_usd` se convierte una vez con la tasa de hoy; `total_ves_historico` ya
viene sumado con la tasa de cada venta. Son números distintos y la interfaz nunca
los mezcla.

`p_negocio` nulo significa consolidado, que es lo que pide el requisito 1.8.

### Periodos y granularidad

| Periodo | Rango | Granularidad | Barras |
| --- | --- | --- | --- |
| Diario | Hoy | `hour` | ~12 |
| Semanal | Últimos 7 días | `day` | 7 |
| Mensual | Mes actual | `week` | 4–5 |
| Trimestral | Últimos 3 meses | `month` | 3 |
| Semestral | Últimos 6 meses | `month` | 6 |
| Anual | Año actual | `quarter` | 4 |

El periodo anterior para comparar (requisito 1.4) es el rango inmediatamente
previo del mismo largo: la semana pasada contra esta, el mes pasado contra este.
Para el Diario se compara contra ayer, no contra el mismo día de la semana
anterior — para eso ya está la comparación del Resumen (spec 08).

Los cubos vacíos no vuelven de la consulta. El cliente rellena la serie con ceros
antes de graficar; si no, un día sin ventas hace que el gráfico salte un día y
las barras dejen de corresponder a sus etiquetas.

## Productos más vendidos

```sql
create or replace function public.reporte_productos(
  p_negocio unidad_negocio, p_desde timestamptz, p_hasta timestamptz
) returns table (
  producto_id uuid, nombre text, categoria_id text,
  unidades numeric, monto_usd numeric,
  margen_usd numeric, costo_conocido boolean
)
language sql stable as $$
  select
    p.id, p.nombre, p.categoria_id,
    sum(vl.cantidad),
    sum(vl.subtotal_usd),
    case when p.costo_usd is not null
         then sum(vl.cantidad * (vl.precio_unitario_usd - p.costo_usd))
         else null end,
    p.costo_usd is not null
  from public.venta_linea vl
  join public.venta v    on v.id = vl.venta_id and not v.anulada
  join public.producto p on p.id = vl.producto_id
  where (p_negocio is null or v.unidad_negocio = p_negocio)
    and v.creado_en >= p_desde and v.creado_en < p_hasta
  group by p.id, p.nombre, p.categoria_id, p.costo_usd;
$$;
```

El margen usa `vl.precio_unitario_usd` (el precio real de esa venta) y no
`p.precio_venta_usd` (el precio de hoy). Si un producto subió de precio en
julio, las ventas de junio tienen que calcularse con el precio de junio.

Lo que **no** se puede hacer bien todavía: el costo se toma del producto actual,
no del costo histórico. `producto.costo_usd` no tiene versionado. Para los 328
productos importados el costo además es nulo, así que hoy el margen sale nulo
para todo el catálogo heredado — de ahí el requisito 4.3, que obliga a decir
cuántos productos quedaron fuera en vez de mostrar un margen calculado sobre una
muestra parcial como si fuera el total.

Cuando el costo se empiece a capturar de verdad, conviene agregar
`costo_snapshot` a `venta_linea` y calcular el margen con él. Está anotado como
tarea futura, no en este spec.

Los rankings por unidades y por monto (requisitos 3.1 y 3.2) salen de la misma
consulta ordenada distinto en el cliente. Son rankings genuinamente distintos:
los caramelos de $0,04 encabezan por unidades y no aparecen por monto.

## Índices

```sql
create index venta_reporte_idx on public.venta (unidad_negocio, creado_en)
  where not anulada;
create index venta_linea_producto_idx on public.venta_linea (producto_id, venta_id);
```

Con un año de operación de bodega (~30 mil ventas, ~120 mil líneas) estos índices
mantienen los reportes bien por debajo de los 2 segundos del requisito 7.1. Si
creciera más, el siguiente paso es una vista materializada de agregados diarios
refrescada de noche.

## Interfaz

```
pages/reportes/
  Reportes.vue          selector de periodo, gráfico y tarjetas de métricas
  ReporteProductos.vue  ranking por unidades / monto / margen
  ReporteMetodos.vue    desglose por método de pago
  ReporteMargen.vue     rentabilidad, solo rol `dueno`
```

El gráfico de barras replica el del prototipo: barras con la última en color de
acento, valor abreviado (`$212k`) encima y etiqueta debajo. Se implementa como
SVG propio, sin librería de gráficos: son barras verticales con altura
proporcional, y una dependencia de 80 KB para eso no se justifica en una app que
tiene presupuesto de bundle.

Las tarjetas de métricas:

```
┌───────────────┬───────────────┬───────────────┐
│ Total vendido │ Ventas        │ Ticket prom.  │
│ $4.982,30     │ 1.284         │ $3,88         │
│ +12,8 % ▲     │ +8,1 % ▲      │ +4,3 % ▲      │
└───────────────┴───────────────┴───────────────┘
```

La flecha acompaña al signo del porcentaje: color solo no basta
([ui-ux.md](../../steering/ui-ux.md)). Cuando no hay periodo anterior con datos,
la línea de variación se reemplaza por «Sin base de comparación» en vez de
mostrar un `+100 %` que no significa nada (requisito 1.5).

## Restricción de margen

El requisito 4.6 se aplica en tres capas: la ruta lleva `meta.soloDueno`, la
navegación oculta la entrada, y la función `reporte_margen` verifica el rol:

```sql
if public.rol_actual() <> 'dueno' then raise exception 'sin_permiso'; end if;
```

Las dos primeras son comodidad; la tercera es el control real.

## Exportación

CSV generado en el cliente desde los datos ya agregados. Nombre del archivo:

```
ventas_bodega_2026-08-01_2026-08-16.csv
```

Cada archivo incluye una fila de cabecera con la tasa usada y la fecha de
generación, para que la hoja sea interpretable meses después sin volver a la app.

El detalle de ventas (requisito 6.3) sí baja las líneas crudas, porque ese es el
propósito del reporte; se pagina en bloques de 5.000 filas para no agotar la
memoria del teléfono.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Mezclar tasas da totales sin sentido | Dos métricas separadas y etiquetadas; USD por defecto |
| El margen es nulo para todo el catálogo heredado | Se indica explícitamente cuántos productos quedan fuera |
| El costo no tiene versionado histórico | Documentado como limitación; `costo_snapshot` queda anotado como trabajo futuro |
| Los cubos vacíos desalinean el gráfico | El cliente rellena la serie con ceros |
| `+100 %` falso cuando el periodo anterior es cero | «Sin base de comparación» |
| Los reportes se vuelven lentos con el histórico | Índices parciales ahora, vista materializada si hace falta |
