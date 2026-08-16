-- Autenticacion y control de acceso (ver .claude/specs/02-autenticacion-acceso/).

create type rol_usuario as enum ('dueno', 'mostrador');

create table public.perfil (
  id                    uuid primary key references auth.users(id) on delete cascade,
  nombre                text not null,
  rol                   rol_usuario not null default 'mostrador',
  pin_hash              text,                     -- bcrypt, nunca el PIN en claro
  pin_intentos_fallidos int not null default 0,
  pin_bloqueado_hasta   timestamptz,
  activo                boolean not null default true,
  creado_en             timestamptz not null default now()
);

-- Rol del usuario actual, leido desde el JWT para evitar recursion en las
-- politicas: consultar public.perfil dentro de una politica sobre
-- public.perfil se llama a si misma indefinidamente.
create or replace function public.rol_actual() returns rol_usuario
language sql stable as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'rol')::rol_usuario,
    'mostrador'::rol_usuario
  );
$$;

alter table public.perfil enable row level security;

create policy perfil_propio on public.perfil
  for select to authenticated using (id = auth.uid());

create policy perfil_dueno_lee on public.perfil
  for select to authenticated using (public.rol_actual() = 'dueno');

create policy perfil_dueno_escribe on public.perfil
  for all to authenticated
  using (public.rol_actual() = 'dueno')
  with check (public.rol_actual() = 'dueno');

-- Sincroniza perfil.rol con auth.users.raw_app_metadata, que es lo que viaja
-- en el JWT. app_metadata no es editable por el usuario (a diferencia de
-- user_metadata), asi que un usuario no puede ascenderse a "dueno" desde el
-- cliente cambiando su propio perfil... salvo que ya sea dueno, que es quien
-- tiene permiso de escribir la tabla perfil.
create or replace function public.sincronizar_rol_app_metadata()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('rol', new.rol)
  where id = new.id;
  return new;
end;
$$;

create trigger perfil_sincroniza_rol
  after insert or update of rol on public.perfil
  for each row execute function public.sincronizar_rol_app_metadata();

-- Crea el perfil automaticamente cuando se crea un usuario en auth.users
-- (la Edge Function de creacion de usuarios inserta el nombre y rol reales
-- justo despues; este trigger es la red de seguridad para que nunca quede
-- un usuario de Auth sin fila en perfil).
create or replace function public.crear_perfil_para_nuevo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfil (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger usuario_crea_perfil
  after insert on auth.users
  for each row execute function public.crear_perfil_para_nuevo_usuario();

-- RPC: define o reemplaza el PIN del usuario autenticado. security definer
-- porque escribe pin_hash, columna que ninguna politica expone al cliente.
-- search_path incluye "extensions": en Supabase hosted, pgcrypto (crypt,
-- gen_salt) vive ahi, no en public.
create or replace function public.definir_pin(p_pin text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'pin_formato_invalido';
  end if;

  update public.perfil
  set pin_hash = crypt(p_pin, gen_salt('bf')),
      pin_intentos_fallidos = 0,
      pin_bloqueado_hasta = null
  where id = auth.uid();
end;
$$;

-- RPC: valida el PIN del usuario autenticado. 5 fallos consecutivos bloquean
-- el ingreso por PIN durante 5 minutos (requisito 2.5).
create or replace function public.validar_pin(p_pin text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare
  v_perfil public.perfil;
begin
  select * into v_perfil from public.perfil where id = auth.uid();

  if v_perfil.id is null or v_perfil.pin_hash is null then
    raise exception 'pin_no_definido';
  end if;

  if v_perfil.pin_bloqueado_hasta is not null and v_perfil.pin_bloqueado_hasta > now() then
    raise exception 'pin_bloqueado' using hint = v_perfil.pin_bloqueado_hasta::text;
  end if;

  if v_perfil.pin_hash = crypt(p_pin, v_perfil.pin_hash) then
    update public.perfil
    set pin_intentos_fallidos = 0, pin_bloqueado_hasta = null
    where id = auth.uid();
    return true;
  end if;

  update public.perfil
  set pin_intentos_fallidos = pin_intentos_fallidos + 1,
      pin_bloqueado_hasta = case
        when pin_intentos_fallidos + 1 >= 5 then now() + interval '5 minutes'
        else pin_bloqueado_hasta
      end
  where id = auth.uid();

  return false;
end;
$$;

-- Solo usuarios autenticados pueden invocar las RPC de PIN. Sin esto,
-- PostgreSQL concede EXECUTE a PUBLIC por defecto.
revoke execute on function public.definir_pin(text) from public;
revoke execute on function public.validar_pin(text) from public;
grant execute on function public.definir_pin(text) to authenticated;
grant execute on function public.validar_pin(text) to authenticated;

-- Impide desactivar o cambiarle el rol al ultimo "dueno" activo (requisito
-- 6.4). Vive en la base, no solo en la interfaz: un mostrador con acceso
-- directo a la API no debe poder dejar la tienda sin dueno.
create or replace function public.evitar_quitar_ultimo_dueno()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_otros_duenos_activos int;
begin
  if old.rol = 'dueno' and old.activo = true
     and (new.rol <> 'dueno' or new.activo = false) then
    select count(*) into v_otros_duenos_activos
    from public.perfil
    where rol = 'dueno' and activo = true and id <> old.id;

    if v_otros_duenos_activos = 0 then
      raise exception 'ultimo_dueno_activo';
    end if;
  end if;
  return new;
end;
$$;

create trigger perfil_protege_ultimo_dueno
  before update of rol, activo on public.perfil
  for each row execute function public.evitar_quitar_ultimo_dueno();
