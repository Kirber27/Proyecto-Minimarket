-- Fundacion de la plataforma: solo lo transversal. Cada spec agrega su propia
-- migracion sobre esta base (ver .claude/specs/01-fundacion-plataforma/design.md).

create extension if not exists "pgcrypto";

create type unidad_negocio as enum ('bodega', 'cerveza', 'thais');
create type moneda as enum ('USD', 'VES');
create type unidad_medida as enum ('UND', 'KG', 'LITRO', 'PACK');

create table public.negocio (
  id unidad_negocio primary key,
  nombre text not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

insert into public.negocio (id, nombre) values
  ('bodega', 'Bodega'),
  ('cerveza', 'Cerveza'),
  ('thais', 'Thais');

alter table public.negocio enable row level security;

-- Sin politica de escritura a proposito: son tres filas fijas que se cambian
-- por migracion, no desde la aplicacion.
create policy negocio_lectura on public.negocio
  for select to authenticated using (true);
