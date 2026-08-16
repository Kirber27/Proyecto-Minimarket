# Inventario y alertas de stock — Diseño

## Esquema

`supabase/migrations/0007_inventario.sql` (el número lo pisó `0006_ventas.sql`,
que se creó primero durante el desarrollo del spec 05; los archivos se numeran
por orden real de aplicación, no por número de spec):

```sql
create type tipo_movimiento as enum
  ('venta','anulacion','reposicion','ajuste','importacion');

create type motivo_ajuste as enum
  ('conteo','merma','vencimiento','robo','error','otro');

create table public.movimiento_stock (
  id             bigserial primary key,
  producto_id    uuid not null references public.producto(id),
  tipo           tipo_movimiento not null,
  cantidad       numeric(12,3) not null,   -- negativa para salidas
  stock_resultante numeric(12,3) not null,
  motivo         motivo_ajuste,
  nota           text,
  costo_unitario_usd numeric(12,2),        -- solo en reposiciones
  venta_id       uuid references public.venta(id),
  usuario_id     uuid not null references public.perfil(id),
  creado_en      timestamptz not null default now()
);

create index movimiento_producto_idx on public.movimiento_stock (producto_id, creado_en desc);
create index movimiento_fecha_idx    on public.movimiento_stock (creado_en desc);
```

`cantidad` lleva signo: `-3` en una venta, `+12` en una reposición. Así el
requisito 4.4 se verifica con una consulta trivial:

```sql
select p.id, p.stock_actual, coalesce(sum(m.cantidad), 0) as suma_movimientos
from public.producto p
left join public.movimiento_stock m on m.producto_id = p.id
group by p.id having p.stock_actual <> coalesce(sum(m.cantidad), 0);
```

Esta consulta debe devolver **cero filas**. Corre como prueba de integridad en
CI y como diagnóstico en Ajustes.

`stock_resultante` es redundante con la suma, y esa redundancia es a propósito:
permite reconstruir el stock a cualquier fecha pasada sin sumar toda la historia,
y delata una inconsistencia en cuanto aparece.

### Inmutabilidad

```sql
create policy movimiento_lectura on public.movimiento_stock
  for select to authenticated using (true);
create policy movimiento_insercion on public.movimiento_stock
  for insert to authenticated with check (true);
-- Sin políticas de update ni delete (requisito 4.5).

create or replace function public.impedir_modificacion() returns trigger
language plpgsql as $$ begin raise exception 'movimiento_inmutable'; end $$;

create trigger movimiento_solo_lectura
  before update or delete on public.movimiento_stock
  for each row execute function public.impedir_modificacion();
```

El trigger es cinturón además de tirantes: la RLS no aplica a funciones
`security definer`, y varias de las nuestras lo son.

### El movimiento se genera solo

En lugar de confiar en que cada función se acuerde de insertar el movimiento, un
trigger sobre `producto` lo hace:

```sql
create or replace function public.registrar_movimiento_stock()
returns trigger language plpgsql as $$
begin
  if new.stock_actual is distinct from old.stock_actual then
    insert into public.movimiento_stock
      (producto_id, tipo, cantidad, stock_resultante, motivo, nota,
       costo_unitario_usd, venta_id, usuario_id)
    values (
      new.id,
      coalesce(current_setting('app.tipo_movimiento', true), 'ajuste')::tipo_movimiento,
      new.stock_actual - old.stock_actual,
      new.stock_actual,
      nullif(current_setting('app.motivo_ajuste', true), '')::motivo_ajuste,
      nullif(current_setting('app.nota', true), ''),
      nullif(current_setting('app.costo_unitario', true), '')::numeric,
      nullif(current_setting('app.venta_id', true), '')::uuid,
      coalesce(auth.uid(), current_setting('app.usuario_id', true)::uuid)
    );
  end if;
  return new;
end $$;

create trigger producto_movimiento after update on public.producto
  for each row execute function public.registrar_movimiento_stock();
```

Las funciones que mueven stock declaran el contexto antes de escribir:

```sql
perform set_config('app.tipo_movimiento', 'venta', true);
perform set_config('app.venta_id', v_venta.id::text, true);
```

El tercer argumento `true` hace la configuración **local a la transacción**: se
descarta al terminar, así que no se filtra a la siguiente operación de la misma
conexión. Omitirlo es el error que haría que un ajuste posterior quedara
etiquetado como venta.

## Vistas derivadas

```sql
create view public.producto_rotacion as
select
  p.id,
  p.nombre,
  coalesce(sum(vl.cantidad) filter (where v.creado_en > now() - interval '7 days'), 0)  as vendidos_7d,
  coalesce(sum(vl.cantidad) filter (where v.creado_en > now() - interval '30 days'), 0) as vendidos_30d,
  coalesce(sum(vl.cantidad) filter (where v.creado_en > now() - interval '90 days'), 0) as vendidos_90d,
  max(v.creado_en) as ultima_venta
from public.producto p
left join public.venta_linea vl on vl.producto_id = p.id
left join public.venta v on v.id = vl.venta_id and not v.anulada
group by p.id, p.nombre;
```

Los días de cobertura (requisito 6.3) se calculan sobre esta vista:

```sql
create view public.producto_cobertura as
select r.*, p.stock_actual, p.stock_minimo,
  case when r.vendidos_30d > 0
       then round(p.stock_actual / (r.vendidos_30d / 30.0), 1)
       else null end as dias_cobertura
from public.producto_rotacion r join public.producto p on p.id = r.id;
```

`dias_cobertura` nulo significa «sin ventas en 30 días»: no es cobertura infinita,
es un producto que no rota, y en la interfaz se muestra distinto.

Con 328 productos y un volumen de ventas de barrio, una vista normal basta. Si el
histórico crece hasta hacerla lenta, se convierte en vista materializada
refrescada cada noche; no se optimiza antes de necesitarlo.

### Cantidad sugerida de reposición

Requisito 3.5: `techo(vendidos_30d / 30 × 15)`, con piso en `stock_minimo`.
Quince días de cobertura es un compromiso razonable para una bodega que se
surte cada una o dos semanas. El número vive en una constante configurable, no
disperso en el código.

## Ajuste por lotes

Contar físicamente el inventario es una sesión larga: el dueño recorre los
anaqueles anotando. Aplicar cada corrección por separado dejaría el inventario
inconsistente a mitad del conteo.

```sql
create or replace function public.aplicar_ajustes(p_ajustes jsonb, p_motivo motivo_ajuste, p_nota text)
returns integer language plpgsql security definer set search_path = public as $$
```

Una transacción, todos los ajustes. La interfaz acumula las correcciones en una
lista local y las envía al final.

## Interfaz

```
pages/inventario/
  InventarioLista.vue      lista principal, orden por stock ascendente
  ProductoDetalle.vue      ficha con rotación y libro de movimientos
  AjusteStock.vue          sesión de conteo por lotes
  Reposicion.vue           modal de reposición individual
pages/alertas/
  AlertasStock.vue         críticos primero, reponer en un toque
```

`InventarioLista` reutiliza la virtualización del spec 03. En escritorio es tabla
con columnas ordenables; en móvil son tarjetas con el estado de stock destacado.

La cabecera muestra el valor del inventario (requisito 1.7):

```
Valor a costo    $1.284,50      Valor a venta    $1.892,30      Margen  32,1 %
```

Con la advertencia de que el valor a costo excluye los productos con costo nulo,
que hoy son los 328 importados del Excel. La interfaz indica cuántos productos
quedan fuera del cálculo, para que el número no engañe.

## Alertas en el Resumen

La pantalla de Resumen muestra una tarjeta con el conteo y los tres productos más
críticos, enlazando a la lista completa. El cálculo sale de una consulta única:

```sql
select count(*) filter (where stock_actual <= 0)            as agotados,
       count(*) filter (where stock_actual < stock_minimo)  as criticos,
       count(*) filter (where dias_cobertura < 7)           as por_agotarse
from public.producto_cobertura
where unidad_negocio = $1 and activo;
```

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El stock se desvía de la suma de movimientos | Consulta de reconciliación en CI y en Ajustes |
| `set_config` se filtra entre operaciones | Siempre con `is_local = true` |
| El conteo físico deja el inventario a medias | Ajuste por lotes en una transacción |
| Las vistas de rotación se vuelven lentas | Se materializan solo si hace falta, no antes |
| El valor a costo engaña por los costos nulos | Se indica cuántos productos quedan excluidos |
| La cantidad sugerida no aplica a productos nuevos | Piso en `stock_minimo` cuando no hay historial |
