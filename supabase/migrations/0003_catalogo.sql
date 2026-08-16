-- Catalogo de productos (ver .claude/specs/03-catalogo-productos/).

create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- unaccent no es immutable invocado como unaccent(t) a secas (depende de la
-- configuracion de sesion), y una columna generada exige una funcion
-- immutable. Se invoca con el diccionario explicito para evitarlo.
--
-- A diferencia de pgcrypto (preinstalada por Supabase en el schema
-- "extensions"), cuando esta migracion crea unaccent/pg_trgm por primera vez
-- quedan en "public" -- el search_path de la conexion que corre la
-- migracion. Verificado contra el proyecto real antes de escribir esto.
create or replace function public.normalizar(t text) returns text
language sql immutable strict parallel safe as $$
  select lower(public.unaccent('public.unaccent'::regdictionary, t));
$$;

create table public.categoria (
  id             text primary key,          -- slug: 'viveres', 'galletas'
  nombre         text not null unique,
  matiz          smallint not null default 265 check (matiz between 0 and 360),
  unidad_negocio unidad_negocio not null default 'bodega',
  orden          smallint not null default 0,
  activo         boolean not null default true,
  creado_en      timestamptz not null default now()
);

create table public.producto (
  id               uuid primary key default gen_random_uuid(),
  sku              text unique,
  nombre           text not null,
  nombre_busqueda  text generated always as (public.normalizar(nombre)) stored,
  categoria_id     text not null references public.categoria(id),
  unidad_negocio   unidad_negocio not null default 'bodega',
  unidad_medida    unidad_medida not null default 'UND',
  precio_venta_usd numeric(12,2) not null check (precio_venta_usd >= 0),
  costo_usd        numeric(12,2) check (costo_usd >= 0),   -- nulo: el Excel no lo trae
  stock_actual     numeric(12,3) not null default 0,
  stock_minimo     numeric(12,3) not null default 5,
  activo           boolean not null default true,
  origen           text,                    -- 'BODEGA!B4', trazabilidad al Excel
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now()
);

create index producto_busqueda_idx on public.producto
  using gin (nombre_busqueda gin_trgm_ops);
create index producto_categoria_idx on public.producto (categoria_id, activo);
create index producto_negocio_idx   on public.producto (unidad_negocio, activo);

create table public.precio_historial (
  id              bigserial primary key,
  producto_id     uuid not null references public.producto(id) on delete cascade,
  precio_anterior numeric(12,2),
  precio_nuevo    numeric(12,2) not null,
  costo_anterior  numeric(12,2),
  costo_nuevo     numeric(12,2),
  usuario_id      uuid references public.perfil(id),
  motivo          text,                     -- 'manual' | 'importacion'
  creado_en       timestamptz not null default now()
);

-- Registra automaticamente cualquier cambio de precio/costo, incluida la
-- importacion masiva del spec (requisito 2.9 y 6.7): nadie tiene que
-- acordarse de llamarlo, corre solo.
create or replace function public.registrar_cambio_precio()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.precio_venta_usd is distinct from old.precio_venta_usd
     or new.costo_usd is distinct from old.costo_usd then
    insert into public.precio_historial
      (producto_id, precio_anterior, precio_nuevo, costo_anterior, costo_nuevo, usuario_id, motivo)
    values (new.id, old.precio_venta_usd, new.precio_venta_usd,
            old.costo_usd, new.costo_usd, auth.uid(),
            coalesce(current_setting('app.motivo', true), 'manual'));
  end if;
  new.actualizado_en = now();
  return new;
end $$;

create trigger producto_precio_historial before update on public.producto
  for each row execute function public.registrar_cambio_precio();

alter table public.categoria enable row level security;
alter table public.producto enable row level security;
alter table public.precio_historial enable row level security;

-- Todos los autenticados leen el catalogo; solo el dueno lo modifica
-- (ver el "patron de politica reutilizable" en
-- .claude/specs/02-autenticacion-acceso/design.md). stock_actual es la
-- excepcion: lo escribe crear_venta() del spec 05, que corre security
-- definer y no pasa por esta politica.
create policy categoria_lectura on public.categoria
  for select to authenticated using (true);

create policy categoria_escritura on public.categoria
  for all to authenticated
  using (public.rol_actual() = 'dueno')
  with check (public.rol_actual() = 'dueno');

create policy producto_lectura on public.producto
  for select to authenticated using (true);

create policy producto_escritura on public.producto
  for all to authenticated
  using (public.rol_actual() = 'dueno')
  with check (public.rol_actual() = 'dueno');

create policy precio_historial_lectura on public.precio_historial
  for select to authenticated using (public.rol_actual() = 'dueno');

-- precio_historial no lleva politica de escritura para el cliente: solo lo
-- escribe el trigger, que es security definer.
