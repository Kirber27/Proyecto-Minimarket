-- Agrega el total de la semana anterior a resumen_dia() (spec 08), para
-- mostrar el delta de la tarjeta "Semana" del dashboard (diseno de
-- Claude Design). 0011_caja.sql ya esta aplicada; esto reemplaza la funcion
-- entera porque plpgsql no permite agregar una sola linea a una funcion
-- existente.
create or replace function public.resumen_dia(
  p_negocio unidad_negocio,
  p_inicio_dia timestamptz default date_trunc('day', now())
) returns jsonb
language plpgsql stable set search_path = public as $$
declare
  v_fin_dia timestamptz := p_inicio_dia + interval '1 day';
  v_vendido_hoy       numeric;
  v_numero_ventas     integer;
  v_egresos_hoy       numeric;
  v_saldo_actual      numeric;
  v_serie             jsonb;
  v_mismo_dia_semana  numeric;
  v_semana_actual     numeric;
  v_semana_anterior   numeric;
  v_en_alerta         integer;
  v_por_cobrar        numeric;
  v_pendientes        integer := 0;
begin
  select coalesce(sum(total_usd), 0), count(*)
    into v_vendido_hoy, v_numero_ventas
    from public.venta
    where unidad_negocio = p_negocio and not anulada
      and creado_en >= p_inicio_dia and creado_en < v_fin_dia;

  select coalesce(sum(monto_usd), 0) into v_egresos_hoy
    from public.egreso
    where unidad_negocio = p_negocio and not anulado
      and creado_en >= p_inicio_dia and creado_en < v_fin_dia;

  select coalesce(sum(saldo_usd), 0) into v_saldo_actual
    from public.saldo_caja(p_negocio);

  select jsonb_agg(jsonb_build_object('fecha', dia::date, 'vendidoUsd', vendido) order by dia)
    into v_serie
  from (
    select
      gs.dia,
      coalesce((
        select sum(v.total_usd) from public.venta v
        where v.unidad_negocio = p_negocio and not v.anulada
          and v.creado_en >= gs.dia and v.creado_en < gs.dia + interval '1 day'
      ), 0) as vendido
    from generate_series(p_inicio_dia - interval '6 days', p_inicio_dia, interval '1 day') as gs(dia)
  ) serie;

  select coalesce(sum(total_usd), 0) into v_mismo_dia_semana
    from public.venta
    where unidad_negocio = p_negocio and not anulada
      and creado_en >= p_inicio_dia - interval '7 days'
      and creado_en < v_fin_dia - interval '7 days';

  -- Semana actual: los 7 dias que ya vienen en v_serie, sumados aqui en vez
  -- de en el cliente para que el numero salga de una sola fuente.
  select coalesce(sum(total_usd), 0) into v_semana_actual
    from public.venta
    where unidad_negocio = p_negocio and not anulada
      and creado_en >= p_inicio_dia - interval '6 days' and creado_en < v_fin_dia;

  select coalesce(sum(total_usd), 0) into v_semana_anterior
    from public.venta
    where unidad_negocio = p_negocio and not anulada
      and creado_en >= p_inicio_dia - interval '13 days'
      and creado_en < p_inicio_dia - interval '6 days';

  select count(*) into v_en_alerta
    from public.producto_cobertura
    where unidad_negocio = p_negocio and activo
      and (stock_actual < stock_minimo or (dias_cobertura is not null and dias_cobertura < 7));

  select coalesce(sum(saldo_usd), 0) into v_por_cobrar
    from public.cliente_saldo
    where unidad_negocio = p_negocio and saldo_usd > 0;

  if public.rol_actual() = 'dueno' then
    select count(*) into v_pendientes
      from public.deuda_por_revisar
      where unidad_negocio = p_negocio and not resuelto;
  end if;

  return jsonb_build_object(
    'vendidoHoyUsd', v_vendido_hoy,
    'numeroVentas', v_numero_ventas,
    'ticketPromedioUsd', case when v_numero_ventas > 0
      then round(v_vendido_hoy / v_numero_ventas, 2) else 0 end,
    'egresosHoyUsd', v_egresos_hoy,
    'saldoActualUsd', v_saldo_actual,
    'serie7Dias', coalesce(v_serie, '[]'::jsonb),
    'mismoDiaSemanaAnteriorUsd', v_mismo_dia_semana,
    'semanaActualUsd', v_semana_actual,
    'semanaAnteriorUsd', v_semana_anterior,
    'productosEnAlerta', v_en_alerta,
    'porCobrarUsd', v_por_cobrar,
    'pendientesRevision', v_pendientes
  );
end;
$$;
