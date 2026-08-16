-- Tasa de cambio y moneda dual (ver .claude/specs/04-tasa-y-moneda/).
--
-- Alcance minimo para desbloquear PrecioDoble.vue del catalogo (spec 03):
-- tabla, tasa_vigente() y RLS. Quedan pendientes para el spec 04 completo:
-- Realtime, el modal de registro con confirmacion de variacion >20%, el
-- aviso de tasa vieja en la cabecera, tasa_aplicada en venta/egreso, y la
-- validacion servidor-cliente en crear_venta (spec 05).

create table public.tasa_cambio (
  id             bigserial primary key,
  moneda_base    moneda not null default 'USD',
  moneda_destino moneda not null default 'VES',
  valor          numeric(16,4) not null check (valor > 0),
  vigente_desde  timestamptz not null default now(),
  usuario_id     uuid references public.perfil(id),
  nota           text,
  creado_en      timestamptz not null default now()
);

create index tasa_vigente_idx on public.tasa_cambio (vigente_desde desc);

-- Tabla de solo-insercion: nunca se hace update, ni para "corregir" la de
-- hoy. Corregir es insertar una fila nueva con vigente_desde posterior, asi
-- una venta pasada sigue apuntando a la tasa que realmente se cobro.
create or replace function public.tasa_vigente() returns numeric
language sql stable as $$
  select valor from public.tasa_cambio
  where vigente_desde <= now()
  order by vigente_desde desc, id desc
  limit 1;
$$;

alter table public.tasa_cambio enable row level security;

create policy tasa_lectura on public.tasa_cambio
  for select to authenticated using (true);

create policy tasa_escritura on public.tasa_cambio
  for insert to authenticated
  with check (public.rol_actual() = 'dueno');

-- Sin politicas de update ni delete: la tabla es inmutable por diseno.
