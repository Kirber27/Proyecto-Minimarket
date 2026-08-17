-- Deudas y fiado, completo (ver .claude/specs/07-deudas-fiado/). La base
-- minima (cliente, deuda_movimiento, cliente_saldo, registrar_deuda) ya se
-- creo en 0005_clientes_deudas_base.sql y 0006_ventas.sql como dependencia
-- del punto de venta; aqui se completa: bandeja de revision, abonos y su
-- anulacion, y el permiso de escritura de clientes para ambos roles.

-- requisito 1: cualquier usuario autenticado gestiona clientes en el
-- mostrador (crear/editar/desactivar), igual que ya puede registrar ventas.
-- Solo la anulacion de abonos queda restringida a dueno (requisito 3.6).
drop policy cliente_escritura on public.cliente;

create policy cliente_escritura on public.cliente
  for insert to authenticated with check (true);

create policy cliente_actualizacion on public.cliente
  for update to authenticated using (true) with check (true);

-- Idempotencia del seed y trazabilidad contra la planilla original.
create unique index cliente_origen_uidx on public.cliente (origen)
  where origen is not null;

-- Auditoria de anulacion, simetrica con venta.anulada_* (0006_ventas.sql).
alter table public.deuda_movimiento
  add column anulado_en     timestamptz,
  add column anulado_por    uuid references public.perfil(id),
  add column anulado_motivo text;

-- Notas heredadas del Excel, pendientes de que el dueno confirme el monto
-- (requisito 5). Tabla aparte, no una bandera en deuda_movimiento: asi un
-- registro sin confirmar no puede colarse por accidente en el saldo, porque
-- vive en otro lugar y ninguna consulta de saldo tiene que acordarse de
-- filtrarlo.
create table public.deuda_por_revisar (
  id             bigserial primary key,
  cliente_id     uuid not null references public.cliente(id),
  unidad_negocio unidad_negocio not null,
  nota_original  text not null,
  monto_sugerido numeric(12,2),        -- siempre null: no se adivina
  resuelto       boolean not null default false,
  origen         text not null,
  creado_en      timestamptz not null default now()
);

create unique index deuda_por_revisar_origen_uidx on public.deuda_por_revisar (origen);
create index deuda_por_revisar_pendientes_idx on public.deuda_por_revisar (creado_en)
  where not resuelto;

alter table public.deuda_por_revisar enable row level security;

-- Solo el dueno ve y resuelve la bandeja (requisito 5.4: "el dueno ve la
-- nota"; es el unico que puede leer la letra de la planilla original).
create policy deuda_por_revisar_lectura on public.deuda_por_revisar
  for select to authenticated using (public.rol_actual() = 'dueno');

-- Sin politica de insert/update para el cliente: entra por el seed (que
-- corre con privilegios de postgres) y se resuelve via las funciones de
-- abajo, ambas security definer.

create or replace function public.registrar_abono(
  p_cliente_id uuid,
  p_negocio    unidad_negocio,
  p_monto      numeric,
  p_metodo     metodo_pago,
  p_nota       text default null
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_id   bigint;
  v_tasa numeric(16,4);
begin
  if p_monto <= 0 then
    raise exception 'monto_invalido';
  end if;

  v_tasa := public.tasa_vigente();
  if v_tasa is null then
    raise exception 'sin_tasa';
  end if;

  insert into public.deuda_movimiento
    (cliente_id, unidad_negocio, tipo, monto_usd, tasa_aplicada, metodo, nota, usuario_id)
  values
    (p_cliente_id, p_negocio, 'abono', p_monto, v_tasa, p_metodo, p_nota, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

-- Anular un abono mal registrado (requisito 3.6): solo dueno. Se reversa
-- marcando `anulado`, igual que un movimiento de deuda de una venta anulada
-- (nunca se edita ni se borra: es un libro contable).
create or replace function public.anular_abono(p_movimiento_id bigint, p_motivo text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_movimiento public.deuda_movimiento;
begin
  if public.rol_actual() <> 'dueno' then
    raise exception 'sin_permiso';
  end if;
  if p_motivo is null or btrim(p_motivo) = '' then
    raise exception 'motivo_requerido';
  end if;

  select * into v_movimiento from public.deuda_movimiento
    where id = p_movimiento_id for update;

  if not found then
    raise exception 'movimiento_no_encontrado';
  end if;
  if v_movimiento.tipo <> 'abono' then
    raise exception 'no_es_abono';
  end if;
  if v_movimiento.anulado then
    raise exception 'movimiento_ya_anulado';
  end if;

  update public.deuda_movimiento
    set anulado = true,
        anulado_en = now(),
        anulado_por = auth.uid(),
        anulado_motivo = p_motivo
    where id = p_movimiento_id;
end;
$$;

-- Confirmar una nota de la bandeja de revision (requisito 5.5): crea el
-- movimiento de deuda con el monto que el dueno capturo, a la tasa vigente
-- de hoy (la planilla no traia tasa historica), y quita la marca.
create or replace function public.resolver_revision(p_id bigint, p_monto numeric)
returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_fila public.deuda_por_revisar;
  v_tasa numeric(16,4);
  v_id   bigint;
begin
  if public.rol_actual() <> 'dueno' then
    raise exception 'sin_permiso';
  end if;
  if p_monto <= 0 then
    raise exception 'monto_invalido';
  end if;

  select * into v_fila from public.deuda_por_revisar where id = p_id for update;
  if not found then
    raise exception 'revision_no_encontrada';
  end if;
  if v_fila.resuelto then
    raise exception 'revision_ya_resuelta';
  end if;

  v_tasa := public.tasa_vigente();
  if v_tasa is null then
    raise exception 'sin_tasa';
  end if;

  insert into public.deuda_movimiento
    (cliente_id, unidad_negocio, tipo, monto_usd, tasa_aplicada, nota, usuario_id)
  values (
    v_fila.cliente_id, v_fila.unidad_negocio, 'deuda', p_monto, v_tasa,
    'Confirmado de la planilla (' || v_fila.origen || '): ' || v_fila.nota_original,
    auth.uid()
  ) returning id into v_id;

  update public.deuda_por_revisar set resuelto = true where id = p_id;

  return v_id;
end;
$$;

-- Descartar una nota cuando la deuda ya no aplica (requisito 5.6): resuelve
-- la bandeja sin crear movimiento.
create or replace function public.descartar_revision(p_id bigint)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.rol_actual() <> 'dueno' then
    raise exception 'sin_permiso';
  end if;

  update public.deuda_por_revisar set resuelto = true where id = p_id;
  if not found then
    raise exception 'revision_no_encontrada';
  end if;
end;
$$;

revoke execute on function public.registrar_abono(uuid, unidad_negocio, numeric, metodo_pago, text) from public;
grant execute on function public.registrar_abono(uuid, unidad_negocio, numeric, metodo_pago, text) to authenticated;

revoke execute on function public.anular_abono(bigint, text) from public;
grant execute on function public.anular_abono(bigint, text) to authenticated;

revoke execute on function public.resolver_revision(bigint, numeric) from public;
grant execute on function public.resolver_revision(bigint, numeric) to authenticated;

revoke execute on function public.descartar_revision(bigint) from public;
grant execute on function public.descartar_revision(bigint) to authenticated;
