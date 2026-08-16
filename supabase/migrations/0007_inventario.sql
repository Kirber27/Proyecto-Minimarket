-- Inventario y alertas de stock (ver .claude/specs/06-inventario-alertas/).

create type tipo_movimiento as enum
  ('venta', 'anulacion', 'reposicion', 'ajuste', 'importacion');

create type motivo_ajuste as enum
  ('conteo', 'merma', 'vencimiento', 'robo', 'error', 'otro');

create table public.movimiento_stock (
  id                 bigserial primary key,
  producto_id        uuid not null references public.producto(id),
  tipo               tipo_movimiento not null,
  cantidad           numeric(12,3) not null,   -- negativa para salidas
  stock_resultante   numeric(12,3) not null,
  motivo             motivo_ajuste,
  nota               text,
  costo_unitario_usd numeric(12,2),            -- solo en reposiciones
  venta_id           uuid references public.venta(id),
  usuario_id         uuid not null references public.perfil(id),
  creado_en          timestamptz not null default now()
);

create index movimiento_producto_idx on public.movimiento_stock (producto_id, creado_en desc);
create index movimiento_fecha_idx on public.movimiento_stock (creado_en desc);

alter table public.movimiento_stock enable row level security;

create policy movimiento_lectura on public.movimiento_stock
  for select to authenticated using (true);

create policy movimiento_insercion on public.movimiento_stock
  for insert to authenticated with check (true);

-- Sin politicas de update ni delete (requisito 4.5): son inmutables. El
-- trigger de abajo es cinturon ademas de tirantes, porque la RLS no aplica
-- dentro de funciones security definer (crear_venta, aplicar_ajustes...).
create or replace function public.impedir_modificacion() returns trigger
language plpgsql as $$ begin raise exception 'movimiento_inmutable'; end $$;

create trigger movimiento_solo_lectura
  before update or delete on public.movimiento_stock
  for each row execute function public.impedir_modificacion();

-- El movimiento se genera solo: en vez de confiar en que cada funcion se
-- acuerde de insertarlo, un trigger sobre producto lo hace. Las funciones
-- que mueven stock solo tienen que declarar el contexto con set_config(...,
-- true) ANTES de actualizar producto.stock_actual.
create or replace function public.registrar_movimiento_stock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.stock_actual is distinct from old.stock_actual then
    insert into public.movimiento_stock
      (producto_id, tipo, cantidad, stock_resultante, motivo, nota,
       costo_unitario_usd, venta_id, usuario_id)
    values (
      new.id,
      coalesce(current_setting('app.tipo_movimiento', true), 'ajuste')::tipo_movimiento,
      new.stock_actual - old.stock_actual,
      new.stock_actual,
      nullif(current_setting('app.motivo_ajuste', true), '')::motivo_ajuste,
      nullif(current_setting('app.nota', true), ''),
      nullif(current_setting('app.costo_unitario', true), '')::numeric,
      nullif(current_setting('app.venta_id', true), '')::uuid,
      coalesce(auth.uid(), nullif(current_setting('app.usuario_id', true), '')::uuid)
    );
  end if;
  return new;
end;
$$;

create trigger producto_movimiento after update on public.producto
  for each row execute function public.registrar_movimiento_stock();

-- Movimientos iniciales para el stock que ya trajo el seed del Excel
-- (requisito de reconciliacion: la suma de movimientos debe cuadrar con
-- stock_actual). El trigger de arriba solo dispara en UPDATE, no en el
-- INSERT del seed, asi que se siembra aparte, una sola vez.
insert into public.movimiento_stock
  (producto_id, tipo, cantidad, stock_resultante, usuario_id, creado_en)
select
  p.id, 'importacion', p.stock_actual, p.stock_actual,
  (select id from public.perfil where rol = 'dueno' order by creado_en limit 1),
  p.creado_en
from public.producto p
where p.stock_actual <> 0
  and not exists (select 1 from public.movimiento_stock m where m.producto_id = p.id)
  and exists (select 1 from public.perfil where rol = 'dueno');

-- Actualiza crear_venta / anular_venta para declarar el contexto del
-- movimiento antes de tocar stock_actual (requisito de la tarea 1.7).
create or replace function public.crear_venta(
  p_lineas       jsonb,
  p_pagos        jsonb,
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
  if p_idempotencia is not null then
    select * into v_venta from public.venta where idempotencia = p_idempotencia;
    if found then return v_venta; end if;
  end if;

  if jsonb_array_length(p_lineas) = 0 then
    raise exception 'carrito_vacio';
  end if;

  v_tasa := public.tasa_vigente();
  if v_tasa is null then
    raise exception 'sin_tasa';
  end if;
  if p_tasa_cliente is distinct from v_tasa then
    raise exception 'tasa_desactualizada' using detail = v_tasa::text;
  end if;

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

  select coalesce(sum((value->>'monto_usd')::numeric), 0) into v_pagado
    from jsonb_array_elements(p_pagos);
  if v_pagado < v_total and p_cliente_id is null then
    raise exception 'pago_insuficiente' using detail = (v_total - v_pagado)::text;
  end if;

  insert into public.venta
    (unidad_negocio, total_usd, tasa_aplicada, unidades, cliente_id, usuario_id, idempotencia)
  values
    (p_negocio, v_total, v_tasa, v_unidades, p_cliente_id, auth.uid(), p_idempotencia)
  returning * into v_venta;

  -- Contexto del movimiento: cada UPDATE de producto de aqui en adelante,
  -- dentro de esta transaccion, queda etiquetado como venta.
  perform set_config('app.tipo_movimiento', 'venta', true);
  perform set_config('app.venta_id', v_venta.id::text, true);

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

  if v_pagado < v_total then
    perform public.registrar_deuda(p_cliente_id, v_total - v_pagado, v_venta.id, v_tasa);
  end if;

  return v_venta;
end;
$$;

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

  perform set_config('app.tipo_movimiento', 'anulacion', true);
  perform set_config('app.venta_id', p_venta_id::text, true);

  for v_linea in select * from public.venta_linea where venta_id = p_venta_id
  loop
    update public.producto
      set stock_actual = stock_actual + v_linea.cantidad
      where id = v_linea.producto_id;
  end loop;

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

-- Ajuste por lotes: una sesion de conteo entera en una sola transaccion, asi
-- el inventario no queda a medias si algo falla al final.
create or replace function public.aplicar_ajustes(
  p_ajustes jsonb,       -- [{producto_id, cantidad_nueva}]
  p_motivo  motivo_ajuste,
  p_nota    text default null
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_item     jsonb;
  v_prod     public.producto;
  v_nueva    numeric(12,3);
  v_contador integer := 0;
begin
  if public.rol_actual() <> 'dueno' then
    raise exception 'sin_permiso';
  end if;
  if p_motivo = 'otro' and (p_nota is null or btrim(p_nota) = '') then
    raise exception 'nota_requerida';
  end if;

  perform set_config('app.tipo_movimiento', 'ajuste', true);
  perform set_config('app.motivo_ajuste', p_motivo::text, true);
  perform set_config('app.nota', coalesce(p_nota, ''), true);

  for v_item in
    select * from jsonb_array_elements(p_ajustes) order by (value->>'producto_id')::uuid
  loop
    select * into v_prod from public.producto
      where id = (v_item->>'producto_id')::uuid for update;
    if not found then
      raise exception 'producto_no_encontrado';
    end if;

    v_nueva := (v_item->>'cantidad_nueva')::numeric;
    if v_nueva < 0 then
      raise exception 'stock_negativo' using detail = v_prod.nombre;
    end if;

    if v_nueva is distinct from v_prod.stock_actual then
      update public.producto set stock_actual = v_nueva where id = v_prod.id;
      v_contador := v_contador + 1;
    end if;
  end loop;

  return v_contador;
end;
$$;

revoke execute on function public.aplicar_ajustes(jsonb, motivo_ajuste, text) from public;
grant execute on function public.aplicar_ajustes(jsonb, motivo_ajuste, text) to authenticated;

-- Reposicion individual: entra stock, y opcionalmente actualiza el costo.
create or replace function public.reponer_producto(
  p_producto_id       uuid,
  p_cantidad          numeric,
  p_costo_unitario_usd numeric default null,
  p_actualizar_costo  boolean default false
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.rol_actual() <> 'dueno' then
    raise exception 'sin_permiso';
  end if;
  if p_cantidad <= 0 then
    raise exception 'cantidad_invalida';
  end if;

  perform set_config('app.tipo_movimiento', 'reposicion', true);
  if p_costo_unitario_usd is not null then
    perform set_config('app.costo_unitario', p_costo_unitario_usd::text, true);
  end if;

  update public.producto
    set stock_actual = stock_actual + p_cantidad,
        costo_usd = case when p_actualizar_costo then p_costo_unitario_usd else costo_usd end
    where id = p_producto_id;

  if not found then
    raise exception 'producto_no_encontrado';
  end if;
end;
$$;

revoke execute on function public.reponer_producto(uuid, numeric, numeric, boolean) from public;
grant execute on function public.reponer_producto(uuid, numeric, numeric, boolean) to authenticated;

-- Vistas de rotacion y cobertura (requisitos 6.1-6.4).
create view public.producto_rotacion as
select
  p.id,
  p.nombre,
  coalesce(sum(vl.cantidad) filter (where v.creado_en > now() - interval '7 days'), 0)  as vendidos_7d,
  coalesce(sum(vl.cantidad) filter (where v.creado_en > now() - interval '30 days'), 0) as vendidos_30d,
  coalesce(sum(vl.cantidad) filter (where v.creado_en > now() - interval '90 days'), 0) as vendidos_90d,
  max(v.creado_en) as ultima_venta
from public.producto p
left join public.venta_linea vl on vl.producto_id = p.id
left join public.venta v on v.id = vl.venta_id and not v.anulada
group by p.id, p.nombre;

create view public.producto_cobertura as
select
  r.*,
  p.stock_actual, p.stock_minimo, p.unidad_negocio, p.activo,
  case when r.vendidos_30d > 0
       then round(p.stock_actual / (r.vendidos_30d / 30.0), 1)
       else null end as dias_cobertura
from public.producto_rotacion r
join public.producto p on p.id = r.id;
