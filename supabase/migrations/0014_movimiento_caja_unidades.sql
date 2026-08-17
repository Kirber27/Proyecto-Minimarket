-- Agrega "unidades" a movimiento_caja (spec 08) para poder armar el
-- concepto "Venta · N productos · Metodo" del dashboard del prototipo de
-- Claude Design, en vez de solo "Venta #142". Null para abono/egreso.
--
-- CREATE OR REPLACE VIEW exige que las columnas existentes conserven su
-- posicion; la columna nueva va al final, no junto a "concepto".
create or replace view public.movimiento_caja as
  select
    vp.id::text || '-vp'       as id,
    'ingreso'                  as flujo,
    'venta'                    as origen,
    v.id::text                 as documento_id,
    null::uuid                 as cliente_id,
    v.unidad_negocio,
    'Venta #' || v.correlativo as concepto,
    vp.metodo,
    null::categoria_egreso     as categoria,
    vp.monto_usd,
    v.tasa_aplicada,
    v.creado_en,
    v.unidades
  from public.venta_pago vp
  join public.venta v on v.id = vp.venta_id
  where not v.anulada and vp.metodo <> 'credito'

union all
  select
    dm.id::text || '-dm', 'ingreso', 'abono', dm.id::text, dm.cliente_id, dm.unidad_negocio,
    'Abono · ' || c.nombre, dm.metodo, null, dm.monto_usd, dm.tasa_aplicada, dm.creado_en,
    null::numeric
  from public.deuda_movimiento dm
  join public.cliente c on c.id = dm.cliente_id
  where dm.tipo = 'abono' and not dm.anulado

union all
  select
    e.id::text || '-eg', 'egreso', 'egreso', e.id::text, null::uuid, e.unidad_negocio,
    e.descripcion, e.metodo, e.categoria, e.monto_usd, e.tasa_aplicada, e.creado_en,
    null::numeric
  from public.egreso e
  where not e.anulado;
