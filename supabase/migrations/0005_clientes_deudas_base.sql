-- Base minima de clientes y deudas (ver .claude/specs/07-deudas-fiado/),
-- adelantada como dependencia real del punto de venta (spec 05): crear_venta
-- necesita una tabla cliente y una funcion registrar_deuda() para que el
-- metodo de pago "Fiado" funcione. Mismo patron que 0004_tasa.sql con el
-- spec 04: alcance minimo, no el spec completo.
--
-- Quedan pendientes para el spec 07 completo: deuda_por_revisar (bandeja de
-- notas del Excel), registrar_abono(), y las pantallas de gestion de
-- clientes/estado de cuenta.

create type tipo_movimiento_deuda as enum ('deuda', 'abono', 'ajuste');

create table public.cliente (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  nombre_busqueda text generated always as (public.normalizar(nombre)) stored,
  telefono        text,
  nota            text,
  activo          boolean not null default true,
  origen          text,
  creado_en       timestamptz not null default now()
);

create index cliente_busqueda_idx on public.cliente using gin (nombre_busqueda gin_trgm_ops);

create table public.deuda_movimiento (
  id             bigserial primary key,
  cliente_id     uuid not null references public.cliente(id),
  unidad_negocio unidad_negocio not null,
  tipo           tipo_movimiento_deuda not null,
  monto_usd      numeric(12,2) not null check (monto_usd > 0),
  tasa_aplicada  numeric(16,4) not null,
  -- "metodo" (solo para abonos) se agrega en 0006_ventas.sql via alter table:
  -- el tipo metodo_pago no existe todavia en esta migracion.
  venta_id       uuid,                 -- fk se agrega en 0006_ventas.sql, cuando exista venta
  nota           text,
  anulado        boolean not null default false,
  usuario_id     uuid not null references public.perfil(id),
  creado_en      timestamptz not null default now()
);

create index deuda_cliente_idx on public.deuda_movimiento (cliente_id, creado_en desc)
  where not anulado;

-- El saldo nunca se guarda como columna: una columna persistida se
-- desincroniza en cuanto una operacion falla a la mitad.
create view public.cliente_saldo as
select
  c.id as cliente_id,
  c.nombre,
  m.unidad_negocio,
  coalesce(sum(m.monto_usd) filter (where m.tipo = 'deuda'), 0)
    - coalesce(sum(m.monto_usd) filter (where m.tipo = 'abono'), 0) as saldo_usd,
  min(m.creado_en) filter (where m.tipo = 'deuda') as deuda_mas_antigua,
  max(m.creado_en) as ultimo_movimiento
from public.cliente c
left join public.deuda_movimiento m on m.cliente_id = c.id and not m.anulado
group by c.id, c.nombre, m.unidad_negocio;

alter table public.cliente enable row level security;
alter table public.deuda_movimiento enable row level security;

create policy cliente_lectura on public.cliente
  for select to authenticated using (true);

create policy cliente_escritura on public.cliente
  for all to authenticated
  using (public.rol_actual() = 'dueno')
  with check (public.rol_actual() = 'dueno');

create policy deuda_movimiento_lectura on public.deuda_movimiento
  for select to authenticated using (true);

-- Sin politica de insert/update directa para deuda_movimiento: solo entra
-- via registrar_deuda(), que es security definer (mismo patron que
-- stock_actual en 0003_catalogo.sql). registrar_deuda() se define en
-- 0006_ventas.sql, porque lee public.venta, que todavia no existe aqui.
