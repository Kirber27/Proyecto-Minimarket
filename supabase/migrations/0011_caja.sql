-- Flujo de caja (ver .claude/specs/08-flujo-de-caja/). La caja se deriva de
-- venta_pago y deuda_movimiento, que ya existen; lo unico nuevo aqui es la
-- tabla de egresos, mas la vista y las funciones que arman "cuanto entro,
-- cuanto salio, cuanto queda" a partir de datos que ya viven en otro lado.

create type categoria_egreso as enum
  ('proveedor', 'insumos', 'servicios', 'sueldos', 'retiro', 'otro');

create table public.egreso (
  id             uuid primary key default gen_random_uuid(),
  unidad_negocio unidad_negocio not null,
  descripcion    text not null,
  monto_usd      numeric(12,2) not null check (monto_usd > 0),
  tasa_aplicada  numeric(16,4) not null,
  categoria      categoria_egreso not null default 'otro',
  metodo         metodo_pago not null,
  referencia     text,
  anulado        boolean not null default false,
  anulado_en     timestamptz,
  anulado_por    uuid references public.perfil(id),
  anulado_motivo text,
  usuario_id     uuid not null references public.perfil(id),
  creado_en      timestamptz not null default now()
);

create index egreso_fecha_idx on public.egreso (creado_en desc) where not anulado;

alter table public.egreso enable row level security;

create policy egreso_lectura on public.egreso
  for select to authenticated using (true);

-- Requisito 2.7: la restriccion vive en la politica, no solo en el
-- formulario. Ocultar Retiro/Sueldos al mostrador en la interfaz es una
-- cortesia; lo que de verdad lo impide es esto.
create policy egreso_insercion on public.egreso
  for insert to authenticated with check (
    public.rol_actual() = 'dueno' or categoria not in ('retiro', 'sueldos')
  );

-- Sin politica de update: la anulacion (unico cambio permitido despues de
-- creado) pasa por anular_egreso(), security definer, mismo patron que
-- anular_venta/anular_abono. Asi ningun cliente puede reescribir un egreso
-- ya guardado, ni siquiera el dueno desde una llamada directa a la tabla.

-- Vista unificada de movimientos de caja (requisito 1.1). Se agrega
-- cliente_id (no esta en el diseno original) para poder enlazar un abono a
-- la ficha del cliente (requisito 1.7); en ventas y egresos queda null.
-- documento_id es text, no uuid: venta.id y egreso.id son uuid pero
-- deuda_movimiento.id es bigint (bigserial), y UNION exige el mismo tipo en
-- cada columna. El frontend decide como interpretarlo segun `origen`.
create view public.movimiento_caja as
  select
    vp.id::text || '-vp'       as id,
    'ingreso'                  as flujo,
    'venta'                    as origen,
    v.id::text                 as documento_id,
    null::uuid                 as cliente_id,
    v.unidad_negocio,
    'Venta #' || v.correlativo as concepto,
    vp.metodo,
    null::categoria_egreso     as categoria,
    vp.monto_usd,
    v.tasa_aplicada,
    v.creado_en
  from public.venta_pago vp
  join public.venta v on v.id = vp.venta_id
  where not v.anulada and vp.metodo <> 'credito'  -- el fiado no mueve dinero

union all
  select
    dm.id::text || '-dm', 'ingreso', 'abono', dm.id::text, dm.cliente_id, dm.unidad_negocio,
    'Abono · ' || c.nombre, dm.metodo, null, dm.monto_usd, dm.tasa_aplicada, dm.creado_en
  from public.deuda_movimiento dm
  join public.cliente c on c.id = dm.cliente_id
  where dm.tipo = 'abono' and not dm.anulado

union all
  select
    e.id::text || '-eg', 'egreso', 'egreso', e.id::text, null::uuid, e.unidad_negocio,
    e.descripcion, e.metodo, e.categoria, e.monto_usd, e.tasa_aplicada, e.creado_en
  from public.egreso e
  where not e.anulado;

-- Saldo por metodo de pago, desde el origen de los tiempos (requisito 3.1,
-- 3.2): asi el saldo inicial de un dia es, por construccion, el cierre del
-- anterior, sin un proceso nocturno que lo copie y pueda fallar.
create or replace function public.saldo_caja(
  p_negocio unidad_negocio, p_hasta timestamptz default now()
) returns table (metodo metodo_pago, saldo_usd numeric)
language sql stable as $$
  select metodo,
         sum(case when flujo = 'ingreso' then monto_usd else -monto_usd end)
  from public.movimiento_caja
  where unidad_negocio = p_negocio and creado_en <= p_hasta
  group by metodo;
$$;

create or replace function public.anular_egreso(p_id uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.rol_actual() <> 'dueno' then
    raise exception 'sin_permiso';
  end if;
  if p_motivo is null or btrim(p_motivo) = '' then
    raise exception 'motivo_requerido';
  end if;

  update public.egreso
    set anulado = true, anulado_en = now(), anulado_por = auth.uid(), anulado_motivo = p_motivo
    where id = p_id and not anulado;

  if not found then
    raise exception 'egreso_no_encontrado_o_ya_anulado';
  end if;
end;
$$;

revoke execute on function public.anular_egreso(uuid, text) from public;
grant execute on function public.anular_egreso(uuid, text) to authenticated;

-- Resumen del dia en una sola llamada (requisito 5): evita que la pantalla
-- de inicio parpadee mientras resuelve cinco consultas por separado.
-- p_inicio_dia lo calcula el cliente (medianoche local del dispositivo), no
-- el servidor: Supabase hospedado corre en UTC y "hoy" es una nocion local
-- del mostrador, no del servidor.
create or replace function public.resumen_dia(
  p_negocio unidad_negocio,
  p_inicio_dia timestamptz default date_trunc('day', now())
) returns jsonb
language plpgsql stable set search_path = public as $$
declare
  v_fin_dia timestamptz := p_inicio_dia + interval '1 day';
  v_vendido_hoy      numeric;
  v_numero_ventas    integer;
  v_egresos_hoy      numeric;
  v_saldo_actual     numeric;
  v_serie            jsonb;
  v_semana_anterior  numeric;
  v_en_alerta        integer;
  v_por_cobrar       numeric;
  v_pendientes       integer := 0;
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

  select coalesce(sum(total_usd), 0) into v_semana_anterior
    from public.venta
    where unidad_negocio = p_negocio and not anulada
      and creado_en >= p_inicio_dia - interval '7 days'
      and creado_en < v_fin_dia - interval '7 days';

  select count(*) into v_en_alerta
    from public.producto_cobertura
    where unidad_negocio = p_negocio and activo
      and (stock_actual < stock_minimo or (dias_cobertura is not null and dias_cobertura < 7));

  select coalesce(sum(saldo_usd), 0) into v_por_cobrar
    from public.cliente_saldo
    where unidad_negocio = p_negocio and saldo_usd > 0;

  -- La bandeja de revision es solo del dueno (mismo alcance que su RLS): un
  -- mostrador no debe ver el conteo tampoco por esta via.
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
    'mismoDiaSemanaAnteriorUsd', v_semana_anterior,
    'productosEnAlerta', v_en_alerta,
    'porCobrarUsd', v_por_cobrar,
    'pendientesRevision', v_pendientes
  );
end;
$$;
