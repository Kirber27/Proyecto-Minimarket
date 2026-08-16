-- requisito 3.2: la reposicion registra proveedor opcional. No amerita una
-- columna propia (el libro ya tiene `nota` como texto libre) asi que viaja
-- ahi para las reposiciones.
--
-- Agregar un parametro cambia la firma, asi que create or replace crearia un
-- segundo overload en vez de reemplazar; se elimina el de 4 argumentos primero.
drop function if exists public.reponer_producto(uuid, numeric, numeric, boolean);

create or replace function public.reponer_producto(
  p_producto_id        uuid,
  p_cantidad           numeric,
  p_costo_unitario_usd numeric default null,
  p_actualizar_costo   boolean default false,
  p_proveedor          text default null
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
  if p_proveedor is not null and btrim(p_proveedor) <> '' then
    perform set_config('app.nota', p_proveedor, true);
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

revoke execute on function public.reponer_producto(uuid, numeric, numeric, boolean, text) from public;
grant execute on function public.reponer_producto(uuid, numeric, numeric, boolean, text) to authenticated;
