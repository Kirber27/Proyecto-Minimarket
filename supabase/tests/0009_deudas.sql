-- Pruebas pgTAP para deudas y fiado: abonos, anulacion de abonos, bandeja de
-- revision. Correr local: npx supabase test db supabase/tests --local
-- Verificado tambien ad-hoc contra el proyecto real con
-- `npx supabase db query -f ... --linked` dentro de una transaccion con
-- rollback, durante el desarrollo de este spec.

begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000dd', 'prueba-deudas@minimarket.test', '{"rol":"dueno"}'),
  ('00000000-0000-0000-0000-0000000000ee', 'prueba-mostrador@minimarket.test', '{"rol":"mostrador"}');

insert into public.cliente (id, nombre) values
  ('00000000-0000-0000-0000-0000000000ce', 'Cliente de prueba deudas');

-- deuda_movimiento y deuda_por_revisar no tienen politica de insert directa
-- para el cliente (solo entran via las funciones security definer o el
-- seed), asi que el setup de estos datos de prueba se hace aqui, antes de
-- bajar a rol authenticated.
insert into public.deuda_movimiento
  (cliente_id, unidad_negocio, tipo, monto_usd, tasa_aplicada, usuario_id)
values (
  '00000000-0000-0000-0000-0000000000ce', 'bodega', 'deuda', 10.00,
  public.tasa_vigente(), '00000000-0000-0000-0000-0000000000dd'
);

insert into public.deuda_por_revisar (cliente_id, unidad_negocio, nota_original, origen)
values
  ('00000000-0000-0000-0000-0000000000ce', 'bodega', '1,20+4 texto de prueba', 'PRUEBA!Z1'),
  ('00000000-0000-0000-0000-0000000000ce', 'bodega', 'ya no aplica', 'PRUEBA!Z2');

-- Caso 1: un mostrador (no solo el dueno) puede crear un cliente (requisito
-- 1: gestion de clientes es operativa de mostrador, igual que vender).
set local role authenticated;
set local request.jwt.claims to
  '{"sub":"00000000-0000-0000-0000-0000000000ee","app_metadata":{"rol":"mostrador"}}';

select lives_ok(
  $$ insert into public.cliente (nombre) values ('Cliente creado por mostrador') $$,
  'un mostrador puede crear un cliente, no es exclusivo de dueno'
);

set local request.jwt.claims to
  '{"sub":"00000000-0000-0000-0000-0000000000dd","app_metadata":{"rol":"dueno"}}';

-- Caso 2: registrar_abono rechaza monto cero o negativo.
select throws_matching(
  $$ select public.registrar_abono(
       '00000000-0000-0000-0000-0000000000ce', 'bodega', 0, 'efectivo-usd') $$,
  'monto_invalido',
  'registrar_abono rechaza un monto de cero'
);

-- Caso 3: registrar_abono crea el movimiento y baja el saldo (10 - 4 = 6).
select public.registrar_abono(
  '00000000-0000-0000-0000-0000000000ce', 'bodega', 4.00, 'pago-movil', 'primer abono'
);

select is(
  (select saldo_usd from public.cliente_saldo
    where cliente_id = '00000000-0000-0000-0000-0000000000ce' and unidad_negocio = 'bodega'),
  6.00::numeric,
  'registrar_abono baja el saldo del cliente'
);

-- Caso 4: anular_abono revierte el saldo a como estaba (10.00).
select public.anular_abono(
  (select id from public.deuda_movimiento
     where cliente_id = '00000000-0000-0000-0000-0000000000ce' and tipo = 'abono'
     order by id desc limit 1),
  'prueba pgTAP'
);

select is(
  (select saldo_usd from public.cliente_saldo
    where cliente_id = '00000000-0000-0000-0000-0000000000ce' and unidad_negocio = 'bodega'),
  10.00::numeric,
  'anular_abono revierte el saldo a como estaba antes del abono'
);

-- Caso 5: anular_abono no deja anular dos veces.
select throws_matching(
  $$ select public.anular_abono(
       (select id from public.deuda_movimiento
          where cliente_id = '00000000-0000-0000-0000-0000000000ce' and tipo = 'abono'
          order by id desc limit 1),
       'segundo intento') $$,
  'movimiento_ya_anulado',
  'anular_abono no permite anular el mismo abono dos veces'
);

-- Caso 6: bandeja de revision -- resolver_revision crea la deuda y quita la
-- marca (10.00 + 5.30 = 15.30).
select public.resolver_revision(
  (select id from public.deuda_por_revisar where origen = 'PRUEBA!Z1'), 5.30
);

select is(
  (select resuelto from public.deuda_por_revisar where origen = 'PRUEBA!Z1'),
  true,
  'resolver_revision marca la nota como resuelta'
);

select is(
  (select saldo_usd from public.cliente_saldo
    where cliente_id = '00000000-0000-0000-0000-0000000000ce' and unidad_negocio = 'bodega'),
  15.30::numeric,
  'resolver_revision suma el monto confirmado al saldo'
);

-- Caso 7: no se puede resolver dos veces la misma nota.
select throws_matching(
  $$ select public.resolver_revision(
       (select id from public.deuda_por_revisar where origen = 'PRUEBA!Z1'), 1) $$,
  'revision_ya_resuelta',
  'resolver_revision rechaza una nota ya resuelta'
);

-- Caso 8: descartar_revision resuelve sin crear movimiento (requisito 5.6).
select public.descartar_revision(
  (select id from public.deuda_por_revisar where origen = 'PRUEBA!Z2')
);

select is(
  (select resuelto from public.deuda_por_revisar where origen = 'PRUEBA!Z2'),
  true,
  'descartar_revision marca la nota como resuelta sin crear deuda'
);

select is(
  (select saldo_usd from public.cliente_saldo
    where cliente_id = '00000000-0000-0000-0000-0000000000ce' and unidad_negocio = 'bodega'),
  15.30::numeric,
  'descartar_revision no cambia el saldo del cliente'
);

select * from finish();
rollback;
