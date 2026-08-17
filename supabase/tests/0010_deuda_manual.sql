-- Pruebas pgTAP para registrar_deuda_manual (requisito 2.2: deuda sin venta
-- asociada). Correr local: npx supabase test db supabase/tests --local
-- Verificado tambien ad-hoc contra el proyecto real con
-- `npx supabase db query -f ... --linked` dentro de una transaccion con
-- rollback, durante el desarrollo de este spec.

begin;
create extension if not exists pgtap with schema extensions;

select plan(2);

insert into auth.users (id, email, raw_app_meta_data)
values ('00000000-0000-0000-0000-0000000000fa', 'prueba-deuda-manual@minimarket.test', '{"rol":"dueno"}');

insert into public.cliente (id, nombre) values
  ('00000000-0000-0000-0000-0000000000cf', 'Cliente deuda manual');

set local role authenticated;
set local request.jwt.claims to
  '{"sub":"00000000-0000-0000-0000-0000000000fa","app_metadata":{"rol":"dueno"}}';

select public.registrar_deuda_manual(
  '00000000-0000-0000-0000-0000000000cf', 'bodega', 7.50, 'fio sin pasar por caja'
);

select is(
  (select saldo_usd from public.cliente_saldo
    where cliente_id = '00000000-0000-0000-0000-0000000000cf' and unidad_negocio = 'bodega'),
  7.50::numeric,
  'registrar_deuda_manual crea una deuda sin venta asociada'
);

select throws_matching(
  $$ select public.registrar_deuda_manual(
       '00000000-0000-0000-0000-0000000000cf', 'bodega', -1, null) $$,
  'monto_invalido',
  'registrar_deuda_manual rechaza un monto negativo'
);

select * from finish();
rollback;
