-- Pruebas pgTAP para crear_venta / anular_venta. Se corren con:
--   npx supabase test db supabase/tests --local
-- (requiere el stack local levantado: npx supabase start)
--
-- Verificadas tambien de forma ad-hoc contra el proyecto real con
-- `npx supabase db query -f ... --linked` dentro de una transaccion con
-- rollback, durante el desarrollo de este spec.

begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

insert into auth.users (id, email, raw_app_meta_data)
values ('00000000-0000-0000-0000-0000000000aa', 'prueba-venta@minimarket.test', '{"rol":"dueno"}');

-- Cliente de prueba para el caso de fiado, con id fijo para no necesitar
-- una variable de sesion.
insert into public.cliente (id, nombre)
values ('00000000-0000-0000-0000-0000000000cc', 'Cliente de prueba');

set local role authenticated;
set local request.jwt.claims to
  '{"sub":"00000000-0000-0000-0000-0000000000aa","app_metadata":{"rol":"dueno"}}';

-- Un producto conocido del seed: Harina P.A.N, $1.57, stock 21.

-- Caso 1: el total se calcula con el precio del servidor, no del cliente.
select public.crear_venta(
  jsonb_build_array(jsonb_build_object(
    'producto_id', (select id from public.producto where sku = 'harina-p-a-n'),
    'cantidad', 3)),
  jsonb_build_array(jsonb_build_object('metodo', 'efectivo-usd', 'monto_usd', 4.71)),
  'bodega', public.tasa_vigente(), null, 'idem-prueba-001'
);

select is(
  (select total_usd from public.venta where idempotencia = 'idem-prueba-001'),
  4.71::numeric,
  'el total se calcula con el precio del servidor'
);

-- Caso 2: reintentar con la misma idempotencia no duplica la venta.
select public.crear_venta(
  jsonb_build_array(jsonb_build_object(
    'producto_id', (select id from public.producto where sku = 'harina-p-a-n'),
    'cantidad', 3)),
  jsonb_build_array(jsonb_build_object('metodo', 'efectivo-usd', 'monto_usd', 4.71)),
  'bodega', public.tasa_vigente(), null, 'idem-prueba-001'
);

select is(
  (select count(*)::int from public.venta where idempotencia = 'idem-prueba-001'),
  1,
  'reintentar con la misma idempotencia no duplica la venta'
);

-- Caso 3: pedir mas unidades que el stock disponible.
select throws_matching(
  $$ select public.crear_venta(
       jsonb_build_array(jsonb_build_object(
         'producto_id', (select id from public.producto where sku = 'harina-p-a-n'),
         'cantidad', 999999)),
       jsonb_build_array(jsonb_build_object('metodo', 'efectivo-usd', 'monto_usd', 999999)),
       'bodega', public.tasa_vigente(), null, 'idem-prueba-002') $$,
  'stock_insuficiente',
  'pedir mas unidades que el stock disponible lanza stock_insuficiente'
);

-- Caso 4: una tasa distinta de la vigente.
select throws_matching(
  $$ select public.crear_venta(
       jsonb_build_array(jsonb_build_object(
         'producto_id', (select id from public.producto where sku = 'harina-p-a-n'),
         'cantidad', 1)),
       jsonb_build_array(jsonb_build_object('metodo', 'efectivo-usd', 'monto_usd', 1.57)),
       'bodega', 1.0, null, 'idem-prueba-003') $$,
  'tasa_desactualizada',
  'una tasa distinta de la vigente lanza tasa_desactualizada'
);

-- Caso 5: pago insuficiente y sin cliente para fiado.
select throws_matching(
  $$ select public.crear_venta(
       jsonb_build_array(jsonb_build_object(
         'producto_id', (select id from public.producto where sku = 'harina-p-a-n'),
         'cantidad', 2)),
       jsonb_build_array(jsonb_build_object('metodo', 'efectivo-usd', 'monto_usd', 1.00)),
       'bodega', public.tasa_vigente(), null, 'idem-prueba-004') $$,
  'pago_insuficiente',
  'un pago que no cubre el total y sin cliente lanza pago_insuficiente'
);

-- Caso 6: venta a fiado crea deuda por el monto no cubierto.
select public.crear_venta(
  jsonb_build_array(jsonb_build_object(
    'producto_id', (select id from public.producto where sku = 'harina-p-a-n'),
    'cantidad', 2)),
  jsonb_build_array(jsonb_build_object('metodo', 'efectivo-usd', 'monto_usd', 1.00)),
  'bodega', public.tasa_vigente(), '00000000-0000-0000-0000-0000000000cc', 'idem-prueba-005'
);

select is(
  (select saldo_usd from public.cliente_saldo
    where cliente_id = '00000000-0000-0000-0000-0000000000cc'),
  2.14::numeric,
  'una venta a fiado crea deuda por el monto no cubierto'
);

-- Caso 7 y 8: anular_venta devuelve el stock y revierte la deuda. Stock
-- esperado tras anular: 21 (seed) - 3 (caso 1) - 2 (caso 6) + 2 (anulado) = 18.
do $$
declare
  v_venta_id uuid;
begin
  select id into v_venta_id from public.venta where idempotencia = 'idem-prueba-005';
  perform public.anular_venta(v_venta_id, 'prueba pgTAP');
end $$;

select is(
  (select stock_actual from public.producto where sku = 'harina-p-a-n'),
  18::numeric,
  'anular_venta devuelve el stock exacto de la linea'
);

select is(
  (select coalesce(saldo_usd, 0) from public.cliente_saldo
    where cliente_id = '00000000-0000-0000-0000-0000000000cc'),
  0::numeric,
  'anular_venta revierte el movimiento de deuda de la venta a fiado'
);

select * from finish();
rollback;
