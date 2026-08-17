-- Pruebas pgTAP para arqueo de caja: conteo, cuadre, cierre e inmutabilidad.
-- Correr local: npx supabase test db supabase/tests --local
-- Verificado tambien ad-hoc contra el proyecto real con
-- `npx supabase db query -f ... --linked` dentro de una transaccion con
-- rollback, durante el desarrollo de este spec.

begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'prueba-arqueo@minimarket.test', '{"rol":"dueno"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'prueba-arqueo-mostrador@minimarket.test', '{"rol":"mostrador"}');

-- Caso 1: la seed trae las 13 denominaciones (7 Bs. + 6 USD).
select is(
  (select count(*)::int from public.denominacion),
  13,
  'la seed trae las 13 denominaciones (7 Bs. + 6 USD)'
);

set local role authenticated;
set local request.jwt.claims to
  '{"sub":"00000000-0000-0000-0000-0000000000a2","app_metadata":{"rol":"mostrador"}}';

-- Caso 2: un mostrador puede crear un borrador de arqueo (requisito 6: contar
-- en el mostrador).
insert into public.arqueo (unidad_negocio, fecha, fondo_inicial_usd, usuario_id)
values ('bodega', current_date, 10.00, '00000000-0000-0000-0000-0000000000a2');

select is(
  (select count(*)::int from public.arqueo
    where unidad_negocio = 'bodega' and fecha = current_date and estado = 'borrador'),
  1,
  'un mostrador puede crear un borrador de arqueo'
);

-- Caso 3: un mostrador no puede insertar un arqueo ya cerrado directamente.
select throws_matching(
  $$ insert into public.arqueo (unidad_negocio, fecha, estado, usuario_id)
     values ('cerveza', current_date, 'cerrado', '00000000-0000-0000-0000-0000000000a2') $$,
  'row-level security',
  'un mostrador no puede insertar un arqueo con estado cerrado directamente'
);

-- Caso 4: el conteo de la hoja MONEDA da 10.470 Bs. (5x500+63x100+33x50+1x20).
insert into public.arqueo_detalle (arqueo_id, denominacion_id, cantidad)
select
  (select id from public.arqueo where unidad_negocio = 'bodega' and fecha = current_date and estado = 'borrador'),
  d.id,
  case d.valor
    when 500 then 5
    when 100 then 63
    when 50 then 33
    when 20 then 1
    else 0
  end
from public.denominacion d where d.moneda = 'VES';

-- Caso 5: un mostrador no puede cerrar el arqueo.
select throws_matching(
  $$ select public.cerrar_arqueo(
       (select id from public.arqueo where unidad_negocio = 'bodega' and fecha = current_date and estado = 'borrador'),
       current_date::timestamptz, current_date::timestamptz + interval '1 day') $$,
  'sin_permiso',
  'un mostrador no puede cerrar un arqueo'
);

set local request.jwt.claims to
  '{"sub":"00000000-0000-0000-0000-0000000000a1","app_metadata":{"rol":"dueno"}}';

-- Caso 6: efectivo_esperado ignora punto y pago-movil, solo cuenta efectivo.
-- Se compara contra una base "antes", por si el proyecto ya tiene ventas
-- reales de hoy (el dueno lo esta probando en el navegador en paralelo).
do $$
declare
  v_base_usd numeric;
begin
  select coalesce(monto_usd, 0) into v_base_usd
  from public.efectivo_esperado(
    'bodega', date_trunc('day', now()), date_trunc('day', now()) + interval '1 day')
  where moneda = 'USD';

  perform set_config('mm.base_usd_esperado', coalesce(v_base_usd, 0)::text, true);
end $$;

-- Una venta con pago mixto: parte efectivo-usd, parte punto.
select public.crear_venta(
  jsonb_build_array(jsonb_build_object(
    'producto_id', (select id from public.producto where sku = 'harina-p-a-n'),
    'cantidad', 2)),
  jsonb_build_array(
    jsonb_build_object('metodo', 'efectivo-usd', 'monto_usd', 1.00),
    jsonb_build_object('metodo', 'punto', 'monto_usd', 2.14)
  ),
  'bodega', public.tasa_vigente(), null, 'idem-arqueo-001'
);

select is(
  (select round(coalesce(monto_usd, 0) - current_setting('mm.base_usd_esperado')::numeric, 2)
   from public.efectivo_esperado(
     'bodega', date_trunc('day', now()), date_trunc('day', now()) + interval '1 day')
   where moneda = 'USD'),
  1.00::numeric,
  'efectivo_esperado solo suma el efectivo de la venta, no el punto de venta'
);

-- Caso 7: cerrar_arqueo exige nota cuando la diferencia supera el umbral
-- ($1.00 por defecto): lo contado en Bs. no cuadra con nada esperado hoy.
select throws_matching(
  $$ select public.cerrar_arqueo(
       (select id from public.arqueo where unidad_negocio = 'bodega' and fecha = current_date and estado = 'borrador'),
       date_trunc('day', now()), date_trunc('day', now()) + interval '1 day') $$,
  'nota_requerida',
  'cerrar_arqueo exige nota cuando la diferencia supera el umbral'
);

-- Caso 8: con nota, cierra y congela contado_ves en 10.470.
select public.cerrar_arqueo(
  (select id from public.arqueo where unidad_negocio = 'bodega' and fecha = current_date and estado = 'borrador'),
  date_trunc('day', now()), date_trunc('day', now()) + interval '1 day',
  'sobrante de prueba pgTAP', 5.00
);

select is(
  (select contado_ves from public.arqueo
    where unidad_negocio = 'bodega' and fecha = current_date and estado = 'cerrado'),
  10470.00::numeric,
  'cerrar_arqueo congela el contado en Bs. (5x500+63x100+33x50+1x20=10.470)'
);

-- Caso 9: el retiro crea un egreso de categoria retiro.
select ok(
  (select count(*)::int from public.egreso
    where unidad_negocio = 'bodega' and categoria = 'retiro' and monto_usd = 5.00) >= 1,
  'cerrar_arqueo con retiro crea un egreso de categoria retiro'
);

-- Caso 10: un arqueo cerrado es inmutable. La RLS (using estado='borrador')
-- ya bloquea el UPDATE en silencio -- 0 filas, sin excepcion, mismo caso que
-- el UPDATE bloqueado de perfil en supabase/tests/0002_auth.sql -- asi que se
-- verifica que la nota no cambio, no que haya lanzado una excepcion.
update public.arqueo set nota = 'intento de editar'
  where unidad_negocio = 'bodega' and fecha = current_date and estado = 'cerrado';

select isnt(
  (select nota from public.arqueo
    where unidad_negocio = 'bodega' and fecha = current_date and estado = 'cerrado'),
  'intento de editar',
  'un arqueo cerrado no puede editarse (la RLS bloquea el UPDATE en silencio)'
);

-- Caso 11: tampoco su detalle.
update public.arqueo_detalle set cantidad = 999
  where arqueo_id = (select id from public.arqueo
                      where unidad_negocio = 'bodega' and fecha = current_date and estado = 'cerrado');

select isnt(
  (select cantidad from public.arqueo_detalle
    where arqueo_id = (select id from public.arqueo
                        where unidad_negocio = 'bodega' and fecha = current_date and estado = 'cerrado')
      and denominacion_id = (select id from public.denominacion where moneda = 'VES' and valor = 500)),
  999,
  'el detalle de un arqueo cerrado tampoco puede editarse'
);

-- Caso 12: no se puede cerrar dos arqueos el mismo dia y unidad de negocio.
insert into public.arqueo (unidad_negocio, fecha, usuario_id)
values ('bodega', current_date, '00000000-0000-0000-0000-0000000000a1');

select throws_like(
  $$ select public.cerrar_arqueo(
       (select id from public.arqueo
          where unidad_negocio = 'bodega' and fecha = current_date and estado = 'borrador'),
       date_trunc('day', now()), date_trunc('day', now()) + interval '1 day', 'segundo cierre') $$,
  '%arqueo_unico_cerrado%',
  'no se puede cerrar un segundo arqueo del mismo dia y unidad de negocio'
);

select * from finish();
rollback;
