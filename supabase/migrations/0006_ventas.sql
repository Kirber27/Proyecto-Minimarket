-- Punto de venta (ver .claude/specs/05-punto-de-venta/).

create type metodo_pago as enum
  ('efectivo-ves', 'efectivo-usd', 'punto', 'pago-movil', 'biopago', 'credito');

create table public.venta (
  id             uuid primary key default gen_random_uuid(),
  correlativo    bigint generated always as identity,
  unidad_negocio unidad_negocio not null,
  total_usd      numeric(12,2) not null check (total_usd >= 0),
  tasa_aplicada  numeric(16,4) not null,
  unidades       numeric(12,3) not null,
  cliente_id     uuid references public.cliente(id),
  usuario_id     uuid not null references public.perfil(id),
  anulada        boolean not null default false,
  anulada_en     timestamptz,
  anulada_por    uuid references public.perfil(id),
  anulada_motivo text,
  idempotencia   text unique,          -- uuid generado en el cliente
  creado_en      timestamptz not null default now()
);

create table public.venta_linea (
  id                  bigserial primary key,
  venta_id            uuid not null references public.venta(id) on delete cascade,
  producto_id         uuid not null references public.producto(id),
  nombre_snapshot     text not null,       -- el nombre al momento de vender
  cantidad            numeric(12,3) not null check (cantidad > 0),
  precio_unitario_usd numeric(12,2) not null,
  subtotal_usd        numeric(12,2) not null
);

create table public.venta_pago (
  id        bigserial primary key,
  venta_id  uuid not null references public.venta(id) on delete cascade,
  metodo    metodo_pago not null,
  monto_usd numeric(12,2) not null check (monto_usd > 0)
);

create index venta_fecha_idx on public.venta (creado_en desc) where not anulada;
create index venta_negocio_idx on public.venta (unidad_negocio, creado_en desc);
create index venta_linea_venta_idx on public.venta_linea (venta_id);
create index venta_pago_venta_idx on public.venta_pago (venta_id);

-- deuda_movimiento.venta_id se creo en 0005_clientes_deudas_base.sql sin FK
-- (venta todavia no existia) y sin "metodo" (metodo_pago todavia no
-- existia). Se completa aqui.
alter table public.deuda_movimiento
  add constraint deuda_movimiento_venta_id_fkey
  foreign key (venta_id) references public.venta(id);

alter table public.deuda_movimiento
  add column metodo metodo_pago;  -- solo se usa en abonos (spec 07)

alter table public.venta enable row level security;
alter table public.venta_linea enable row level security;
alter table public.venta_pago enable row level security;

create policy venta_lectura on public.venta
  for select to authenticated using (true);

-- mostrador SI puede insertar ventas (a diferencia del patron
-- lectura-todos/escritura-dueno de las demas tablas): vender es su trabajo.
-- Solo dueno puede anular (comprobado tambien dentro de anular_venta()).
create policy venta_insercion on public.venta
  for insert to authenticated with check (true);

create policy venta_anulacion on public.venta
  for update to authenticated
  using (public.rol_actual() = 'dueno')
  with check (public.rol_actual() = 'dueno');

create policy venta_linea_lectura on public.venta_linea
  for select to authenticated using (true);

create policy venta_linea_insercion on public.venta_linea
  for insert to authenticated with check (true);

create policy venta_pago_lectura on public.venta_pago
  for select to authenticated using (true);

create policy venta_pago_insercion on public.venta_pago
  for insert to authenticated with check (true);

-- registrar_deuda(): crea_venta() la llama cuando los pagos no cubren el
-- total. Vive aqui (no en 0005) porque lee public.venta.
create or replace function public.registrar_deuda(
  p_cliente_id uuid,
  p_monto      numeric,
  p_venta_id   uuid,
  p_tasa       numeric
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_negocio unidad_negocio;
  v_id      bigint;
begin
  if p_cliente_id is null then
    raise exception 'cliente_requerido';
  end if;
  if p_monto <= 0 then
    raise exception 'monto_invalido';
  end if;

  select unidad_negocio into v_negocio from public.venta where id = p_venta_id;

  insert into public.deuda_movimiento
    (cliente_id, unidad_negocio, tipo, monto_usd, tasa_aplicada, venta_id, usuario_id)
  values (p_cliente_id, v_negocio, 'deuda', p_monto, p_tasa, p_venta_id, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.registrar_deuda(uuid, numeric, uuid, numeric) from public;
grant execute on function public.registrar_deuda(uuid, numeric, uuid, numeric) to authenticated;

-- La funcion central: todo el requisito 3.5 (atomicidad) vive aqui, una sola
-- transaccion. security definer porque escribe producto.stock_actual, que la
-- politica de RLS reserva al dueno; esta funcion es el unico camino
-- autorizado para que un mostrador mueva stock.
create or replace function public.crear_venta(
  p_lineas       jsonb,     -- [{producto_id, cantidad}]
  p_pagos        jsonb,     -- [{metodo, monto_usd}]
  p_negocio      unidad_negocio,
  p_tasa_cliente numeric,
  p_cliente_id   uuid default null,
  p_idempotencia text default null
) returns public.venta
language plpgsql security definer set search_path = public as $$
declare
  v_venta    public.venta;
  v_linea    jsonb;
  v_pago     jsonb;
  v_prod     public.producto;
  v_cantidad numeric(12,3);
  v_total    numeric(12,2) := 0;
  v_unidades numeric(12,3) := 0;
  v_pagado   numeric(12,2) := 0;
  v_tasa     numeric(16,4);
begin
  -- 0. Idempotencia: si ya existe, devolver la misma venta sin repetir nada.
  if p_idempotencia is not null then
    select * into v_venta from public.venta where idempotencia = p_idempotencia;
    if found then return v_venta; end if;
  end if;

  if jsonb_array_length(p_lineas) = 0 then
    raise exception 'carrito_vacio';
  end if;

  -- 1. La tasa que el cliente cree vigente tiene que coincidir con la real.
  v_tasa := public.tasa_vigente();
  if v_tasa is null then
    raise exception 'sin_tasa';
  end if;
  if p_tasa_cliente is distinct from v_tasa then
    raise exception 'tasa_desactualizada' using detail = v_tasa::text;
  end if;

  -- 2. Bloquear los productos en orden de id (evita interbloqueos entre dos
  --    cajas vendiendo los mismos productos en orden distinto), validar
  --    stock y acumular el total con el precio del SERVIDOR, no del cliente.
  for v_linea in
    select * from jsonb_array_elements(p_lineas) order by (value->>'producto_id')::uuid
  loop
    select * into v_prod from public.producto
      where id = (v_linea->>'producto_id')::uuid for update;

    if not found then
      raise exception 'producto_no_encontrado';
    end if;

    v_cantidad := (v_linea->>'cantidad')::numeric;
    if v_cantidad <= 0 then
      raise exception 'cantidad_invalida';
    end if;
    if v_prod.stock_actual < v_cantidad then
      raise exception 'stock_insuficiente'
        using detail = v_prod.nombre, hint = v_prod.stock_actual::text;
    end if;

    v_total := v_total + round(v_prod.precio_venta_usd * v_cantidad, 2);
    v_unidades := v_unidades + v_cantidad;
  end loop;

  -- 3. Los pagos tienen que cubrir el total, salvo lo que vaya a fiado.
  select coalesce(sum((value->>'monto_usd')::numeric), 0) into v_pagado
    from jsonb_array_elements(p_pagos);
  if v_pagado < v_total and p_cliente_id is null then
    raise exception 'pago_insuficiente' using detail = (v_total - v_pagado)::text;
  end if;

  -- 4. Insertar la venta, sus lineas y pagos, y descontar stock.
  insert into public.venta
    (unidad_negocio, total_usd, tasa_aplicada, unidades, cliente_id, usuario_id, idempotencia)
  values
    (p_negocio, v_total, v_tasa, v_unidades, p_cliente_id, auth.uid(), p_idempotencia)
  returning * into v_venta;

  for v_linea in select * from jsonb_array_elements(p_lineas)
  loop
    select * into v_prod from public.producto where id = (v_linea->>'producto_id')::uuid;
    v_cantidad := (v_linea->>'cantidad')::numeric;

    insert into public.venta_linea
      (venta_id, producto_id, nombre_snapshot, cantidad, precio_unitario_usd, subtotal_usd)
    values (
      v_venta.id, v_prod.id, v_prod.nombre, v_cantidad, v_prod.precio_venta_usd,
      round(v_prod.precio_venta_usd * v_cantidad, 2)
    );

    update public.producto
      set stock_actual = stock_actual - v_cantidad
      where id = v_prod.id;
  end loop;

  for v_pago in select * from jsonb_array_elements(p_pagos)
  loop
    insert into public.venta_pago (venta_id, metodo, monto_usd)
    values (v_venta.id, (v_pago->>'metodo')::metodo_pago, (v_pago->>'monto_usd')::numeric);
  end loop;

  -- 5. Si quedo saldo sin cubrir, se va a fiado.
  if v_pagado < v_total then
    perform public.registrar_deuda(p_cliente_id, v_total - v_pagado, v_venta.id, v_tasa);
  end if;

  return v_venta;
end;
$$;

revoke execute on function public.crear_venta(
  jsonb, jsonb, unidad_negocio, numeric, uuid, text
) from public;
grant execute on function public.crear_venta(
  jsonb, jsonb, unidad_negocio, numeric, uuid, text
) to authenticated;

-- Anular: no se borra nada (requisito 5.4). Los indices de reportes ya
-- filtran "where not anulada", asi que la venta desaparece de los totales
-- sin desaparecer del historial.
create or replace function public.anular_venta(p_venta_id uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_venta public.venta;
  v_linea record;
begin
  if public.rol_actual() <> 'dueno' then
    raise exception 'sin_permiso';
  end if;

  select * into v_venta from public.venta where id = p_venta_id for update;
  if not found then
    raise exception 'venta_no_encontrada';
  end if;
  if v_venta.anulada then
    raise exception 'venta_ya_anulada';
  end if;
  if p_motivo is null or btrim(p_motivo) = '' then
    raise exception 'motivo_requerido';
  end if;

  -- Devolver el stock de cada linea.
  for v_linea in select * from public.venta_linea where venta_id = p_venta_id
  loop
    update public.producto
      set stock_actual = stock_actual + v_linea.cantidad
      where id = v_linea.producto_id;
  end loop;

  -- Revertir el movimiento de deuda, si la venta se fio.
  update public.deuda_movimiento
    set anulado = true
    where venta_id = p_venta_id and tipo = 'deuda';

  update public.venta
    set anulada = true,
        anulada_en = now(),
        anulada_por = auth.uid(),
        anulada_motivo = p_motivo
    where id = p_venta_id;
end;
$$;

revoke execute on function public.anular_venta(uuid, text) from public;
grant execute on function public.anular_venta(uuid, text) to authenticated;
