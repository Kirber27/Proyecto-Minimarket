-- Pruebas pgTAP para 0002_auth.sql. Se corren con:
--   npx supabase test db supabase/tests --local
-- (requiere el stack local levantado: npx supabase start)

begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

-- Dos usuarios de prueba, insertados directamente como el rol postgres
-- (bypassa RLS: aqui estamos preparando datos, no probando politicas).
insert into auth.users (id, email, raw_app_meta_data)
values
  ('00000000-0000-0000-0000-000000000001', 'duena@minimarket.test', '{"rol":"dueno"}'),
  ('00000000-0000-0000-0000-000000000002', 'mostrador@minimarket.test', '{"rol":"mostrador"}');

update public.perfil set rol = 'dueno' where id = '00000000-0000-0000-0000-000000000001';
update public.perfil set rol = 'mostrador' where id = '00000000-0000-0000-0000-000000000002';

-- El trigger `usuario_crea_perfil` ya crea la fila de perfil al insertar en
-- auth.users; confirmamos que quedo con el rol correcto.
select is(
  (select rol::text from public.perfil where id = '00000000-0000-0000-0000-000000000001'),
  'dueno',
  'el perfil de la duena tiene rol dueno'
);

-- --- Requisito 5 / 6: un mostrador no puede escribir en perfil ---

set local role authenticated;
set local request.jwt.claims to
  '{"sub":"00000000-0000-0000-0000-000000000002","app_metadata":{"rol":"mostrador"}}';

select is(public.rol_actual()::text, 'mostrador', 'public.rol_actual() lee el rol del JWT');

-- Una politica RLS bloqueada por USING en un UPDATE no lanza excepcion: el
-- UPDATE "tiene exito" pero afecta 0 filas, en silencio. Por eso se verifica
-- que el valor NO cambio, no que la sentencia haya fallado.
update public.perfil set nombre = 'hackeado'
  where id = '00000000-0000-0000-0000-000000000002';

reset role;

select isnt(
  (select nombre from public.perfil where id = '00000000-0000-0000-0000-000000000002'),
  'hackeado',
  'un mostrador no puede escribir su propio perfil (la RLS bloquea el UPDATE en silencio)'
);

-- --- Requisito 2.5 / 3.7: 5 fallos bloquean, el sexto intento correcto
--     sigue bloqueado durante la ventana de 5 minutos ---

update public.perfil
set pin_hash = crypt('1234', gen_salt('bf'))
where id = '00000000-0000-0000-0000-000000000002';

set local role authenticated;
set local request.jwt.claims to
  '{"sub":"00000000-0000-0000-0000-000000000002","app_metadata":{"rol":"mostrador"}}';

do $$
begin
  for i in 1..5 loop
    perform public.validar_pin('0000'); -- PIN incorrecto a proposito
  end loop;
end $$;

select ok(
  (select pin_bloqueado_hasta > now() from public.perfil
   where id = '00000000-0000-0000-0000-000000000002'),
  '5 fallos consecutivos dejan pin_bloqueado_hasta en el futuro'
);

select throws_ok(
  $$ select public.validar_pin('1234') $$, -- PIN correcto, pero sigue bloqueado
  'pin_bloqueado',
  'el sexto intento, aunque correcto, sigue bloqueado dentro de la ventana'
);

reset role;

-- Fuera de la ventana de bloqueo, el PIN correcto vuelve a funcionar y
-- limpia el contador.
update public.perfil
set pin_bloqueado_hasta = now() - interval '1 second'
where id = '00000000-0000-0000-0000-000000000002';

set local role authenticated;
set local request.jwt.claims to
  '{"sub":"00000000-0000-0000-0000-000000000002","app_metadata":{"rol":"mostrador"}}';

select ok(
  public.validar_pin('1234'),
  'pasada la ventana de bloqueo, el PIN correcto vuelve a autenticar'
);

reset role;

select * from finish();
rollback;
