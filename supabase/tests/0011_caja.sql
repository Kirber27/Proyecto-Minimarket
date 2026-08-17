-- Pruebas pgTAP para flujo de caja: vista movimiento_caja, saldo_caja,
-- egresos y su anulacion, resumen_dia. Correr local:
--   npx supabase test db supabase/tests --local
-- Verificado tambien ad-hoc contra el proyecto real con
-- `npx supabase db query -f ... --linked` dentro de una transaccion con
-- rollback, durante el desarrollo de este spec.

begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000ca', 'prueba-caja@minimarket.test', '{"rol":"dueno"}'),
  ('00000000-0000-0000-0000-0000000000cb', 'prueba-caja-mostrador@minimarket.test', '{"rol":"mostrador"}');

set local role authenticated;
set local request.jwt.claims to
  '{"sub":"00000000-0000-0000-0000-0000000000ca","app_metadata":{"rol":"dueno"}}';

-- Caso 1: una venta con pago mixto produce dos movimientos de caja.
select public.crear_venta(
  jsonb_build_array(jsonb_build_object(
    'producto_id', (select id from public.producto where sku = 'harina-p-a-n'),
    'cantidad', 4)),
  jsonb_build_array(
    jsonb_build_object('metodo', 'efectivo-usd', 'monto_usd', 3.00),
    jsonb_build_object('metodo', 'pago-movil', 'monto_usd', 3.28)
  ),
  'bodega', public.tasa_vigente(), null, 'idem-caja-001'
);

select is(
  (select count(*)::int from public.movimiento_caja
    where documento_id = (select id::text from public.venta where idempotencia = 'idem-caja-001')),
  2,
  'una venta con pago mixto produce dos movimientos de caja'
);

-- Caso 2: una venta a fiado no produce ningun movimiento de caja.
-- crear_venta no genera una fila venta_pago con metodo 'credito': un pago
-- vacio mas un cliente registra el 100% como deuda (ver 0006_ventas.sql).
select public.crear_venta(
  jsonb_build_array(jsonb_build_object(
    'producto_id', (select id from public.producto where sku = 'harina-p-a-n'),
    'cantidad', 1)),
  '[]'::jsonb,
  'bodega', public.tasa_vigente(),
  (select id from public.cliente limit 1), 'idem-caja-002'
);

select is(
  (select count(*)::int from public.movimiento_caja
    where documento_id = (select id::text from public.venta where idempotencia = 'idem-caja-002')),
  0,
  'una venta a fiado no produce ningun movimiento de caja'
);

-- Caso 3: anular la venta la retira de movimiento_caja.
do $$
declare
  v_venta_id uuid;
begin
  select id into v_venta_id from public.venta where idempotencia = 'idem-caja-001';
  perform public.anular_venta(v_venta_id, 'prueba pgTAP caja');
end $$;

select is(
  (select count(*)::int from public.movimiento_caja
    where documento_id = (select id::text from public.venta where idempotencia = 'idem-caja-001')),
  0,
  'anular una venta la retira del flujo de caja'
);

-- Caso 4: un abono aparece como ingreso en movimiento_caja, con cliente_id.
select public.registrar_deuda_manual(
  (select id from public.cliente limit 1), 'bodega', 10.00, 'prueba caja'
);
select public.registrar_abono(
  (select id from public.cliente limit 1), 'bodega', 4.00, 'pago-movil', 'prueba caja'
);

select is(
  (select count(*)::int from public.movimiento_caja
    where origen = 'abono' and flujo = 'ingreso'
      and cliente_id = (select id from public.cliente limit 1)
      and monto_usd = 4.00),
  1,
  'un abono aparece como ingreso de caja, enlazado al cliente'
);

-- Caso 5: un mostrador no puede registrar un egreso de categoria retiro.
set local request.jwt.claims to
  '{"sub":"00000000-0000-0000-0000-0000000000cb","app_metadata":{"rol":"mostrador"}}';

select throws_matching(
  $$ insert into public.egreso
       (unidad_negocio, descripcion, monto_usd, tasa_aplicada, categoria, metodo, usuario_id)
     values (
       'bodega', 'retiro de prueba', 20, 1, 'retiro', 'efectivo-usd',
       '00000000-0000-0000-0000-0000000000cb') $$,
  'row-level security',
  'un mostrador no puede insertar un egreso de categoria retiro'
);

-- Caso 6: un mostrador si puede registrar un egreso de categoria insumos.
select lives_ok(
  $$ insert into public.egreso
       (unidad_negocio, descripcion, monto_usd, tasa_aplicada, categoria, metodo, usuario_id)
     values (
       'bodega', 'bolsas', 5, 1, 'insumos', 'efectivo-usd',
       '00000000-0000-0000-0000-0000000000cb') $$,
  'un mostrador puede insertar un egreso que no sea retiro ni sueldos'
);

set local request.jwt.claims to
  '{"sub":"00000000-0000-0000-0000-0000000000ca","app_metadata":{"rol":"dueno"}}';

-- Caso 7: el egreso aparece como salida en movimiento_caja.
select is(
  (select count(*)::int from public.movimiento_caja
    where origen = 'egreso' and flujo = 'egreso' and concepto = 'bolsas'),
  1,
  'un egreso aparece como salida en movimiento_caja'
);

-- Caso 8: anular_egreso saca el egreso de movimiento_caja.
select public.anular_egreso(
  (select id from public.egreso where descripcion = 'bolsas'), 'prueba pgTAP'
);

select is(
  (select count(*)::int from public.movimiento_caja
    where origen = 'egreso' and concepto = 'bolsas'),
  0,
  'anular_egreso retira el egreso del flujo de caja'
);

-- Caso 9: no se puede anular el mismo egreso dos veces.
select throws_matching(
  $$ select public.anular_egreso(
       (select id from public.egreso where descripcion = 'bolsas'), 'segundo intento') $$,
  'egreso_no_encontrado_o_ya_anulado',
  'anular_egreso no permite anular el mismo egreso dos veces'
);

-- Caso 10: un mostrador no puede anular un egreso.
insert into public.egreso
  (unidad_negocio, descripcion, monto_usd, tasa_aplicada, categoria, metodo, usuario_id)
values (
  'bodega', 'otro insumo', 8, public.tasa_vigente(), 'insumos', 'efectivo-usd',
  '00000000-0000-0000-0000-0000000000ca'
);

set local request.jwt.claims to
  '{"sub":"00000000-0000-0000-0000-0000000000cb","app_metadata":{"rol":"mostrador"}}';

select throws_matching(
  $$ select public.anular_egreso(
       (select id from public.egreso where descripcion = 'otro insumo'), 'motivo') $$,
  'sin_permiso',
  'un mostrador no puede anular un egreso'
);

set local request.jwt.claims to
  '{"sub":"00000000-0000-0000-0000-0000000000ca","app_metadata":{"rol":"dueno"}}';

-- Caso 11: resumen_dia devuelve numero_ventas y egresos_hoy coherentes con
-- lo insertado en esta transaccion (todo con creado_en = now(), cae en hoy).
select is(
  (public.resumen_dia('bodega', date_trunc('day', now()))->>'numeroVentas')::int >= 1,
  true,
  'resumen_dia cuenta al menos la venta de esta prueba'
);

select * from finish();
rollback;
