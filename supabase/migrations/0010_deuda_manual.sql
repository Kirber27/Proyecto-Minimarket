-- requisito 2.2: registrar una deuda manual, sin venta asociada, para
-- consumos que no pasaron por la caja. `registrar_deuda()` (0006_ventas.sql)
-- no sirve para esto: exige un venta_id real, porque lee la unidad de
-- negocio de la venta (select ... from public.venta v where v.id = p_venta_id
-- inserta cero filas si p_venta_id es null, sin avisar).
create or replace function public.registrar_deuda_manual(
  p_cliente_id uuid,
  p_negocio    unidad_negocio,
  p_monto      numeric,
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
    (cliente_id, unidad_negocio, tipo, monto_usd, tasa_aplicada, nota, usuario_id)
  values
    (p_cliente_id, p_negocio, 'deuda', p_monto, v_tasa, p_nota, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.registrar_deuda_manual(uuid, unidad_negocio, numeric, text) from public;
grant execute on function public.registrar_deuda_manual(uuid, unidad_negocio, numeric, text) to authenticated;
