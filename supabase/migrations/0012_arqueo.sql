-- Arqueo de caja (ver .claude/specs/09-arqueo-de-caja/).

create table public.denominacion (
  id     bigserial primary key,
  moneda moneda not null,
  valor  numeric(12,2) not null,
  activa boolean not null default true,
  orden  smallint not null,
  unique (moneda, valor)
);

insert into public.denominacion (moneda, valor, orden) values
  ('VES', 5, 1), ('VES', 10, 2), ('VES', 20, 3), ('VES', 50, 4),
  ('VES', 100, 5), ('VES', 200, 6), ('VES', 500, 7),
  ('USD', 1, 1), ('USD', 5, 2), ('USD', 10, 3), ('USD', 20, 4), ('USD', 50, 5), ('USD', 100, 6);

alter table public.denominacion enable row level security;
create policy denominacion_lectura on public.denominacion for select to authenticated using (true);
create policy denominacion_escritura on public.denominacion for all to authenticated
  using (public.rol_actual() = 'dueno') with check (public.rol_actual() = 'dueno');

create table public.arqueo (
  id                uuid primary key default gen_random_uuid(),
  unidad_negocio    unidad_negocio not null,
  fecha             date not null,
  estado            text not null default 'borrador' check (estado in ('borrador', 'cerrado')),
  fondo_inicial_usd numeric(12,2) not null default 0,
  contado_ves       numeric(14,2) not null default 0,
  contado_usd       numeric(12,2) not null default 0,
  esperado_ves      numeric(14,2),
  esperado_usd      numeric(12,2),
  diferencia_ves    numeric(14,2),
  diferencia_usd    numeric(12,2),
  tasa_aplicada     numeric(16,4),
  nota              text,
  usuario_id        uuid not null references public.perfil(id),
  cerrado_en        timestamptz,
  cerrado_por       uuid references public.perfil(id),
  creado_en         timestamptz not null default now()
);

-- Un solo arqueo cerrado por unidad y dia (requisito 3.5, 3.6); varios
-- borradores no molestan a nadie (requisito 3.8: contar se interrumpe).
create unique index arqueo_unico_cerrado
  on public.arqueo (unidad_negocio, fecha) where estado = 'cerrado';
create index arqueo_borradores_idx
  on public.arqueo (unidad_negocio, fecha) where estado = 'borrador';

create table public.arqueo_detalle (
  id              bigserial primary key,
  arqueo_id       uuid not null references public.arqueo(id) on delete cascade,
  denominacion_id bigint not null references public.denominacion(id),
  cantidad        integer not null check (cantidad >= 0),
  unique (arqueo_id, denominacion_id)
);

-- Arqueos cerrados inmutables (requisito 3.2), mismo patron que
-- movimiento_stock (spec 06).
create or replace function public.impedir_editar_arqueo_cerrado() returns trigger
language plpgsql as $$
begin
  if old.estado = 'cerrado' then raise exception 'arqueo_cerrado'; end if;
  return new;
end;
$$;

create trigger arqueo_inmutable before update or delete on public.arqueo
  for each row execute function public.impedir_editar_arqueo_cerrado();

create or replace function public.impedir_editar_detalle_cerrado() returns trigger
language plpgsql as $$
begin
  if exists (
    select 1 from public.arqueo a
    where a.id = coalesce(new.arqueo_id, old.arqueo_id) and a.estado = 'cerrado'
  ) then
    raise exception 'arqueo_cerrado';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger arqueo_detalle_inmutable
  before insert or update or delete on public.arqueo_detalle
  for each row execute function public.impedir_editar_detalle_cerrado();

alter table public.arqueo enable row level security;
alter table public.arqueo_detalle enable row level security;

create policy arqueo_lectura on public.arqueo for select to authenticated using (true);

-- Cualquiera cuenta (requisito 6: uso en el mostrador); nadie puede insertar
-- ni actualizar un arqueo ya en estado 'cerrado' desde el cliente -- eso solo
-- lo hace cerrar_arqueo(), security definer, mas abajo.
create policy arqueo_insercion on public.arqueo
  for insert to authenticated with check (estado = 'borrador');
create policy arqueo_actualizacion on public.arqueo
  for update to authenticated using (estado = 'borrador') with check (estado = 'borrador');

create policy arqueo_detalle_lectura on public.arqueo_detalle for select to authenticated using (true);
create policy arqueo_detalle_escritura on public.arqueo_detalle
  for all to authenticated
  using (exists (select 1 from public.arqueo a where a.id = arqueo_id and a.estado = 'borrador'))
  with check (exists (select 1 from public.arqueo a where a.id = arqueo_id and a.estado = 'borrador'));

-- Umbral configurable de diferencia (requisito 2.6). No hay tabla de
-- configuracion general todavia; vive en negocio, por unidad, junto a lo
-- demas que ya es "una fila fija que edita el dueno" (ver 0001_base.sql).
alter table public.negocio add column umbral_diferencia_usd numeric(10,2) not null default 1.00;

create policy negocio_actualizacion on public.negocio
  for update to authenticated
  using (public.rol_actual() = 'dueno') with check (public.rol_actual() = 'dueno');

-- Efectivo esperado (requisito 2.1, 2.8): solo los metodos que estan
-- fisicamente en la gaveta. El diseno original se apoya en una columna
-- afecta_arqueo de "el catalogo de metodos de pago", pero ese catalogo no es
-- una tabla en esta base (son 6 filas fijas que nunca cambian, ver
-- src/lib/metodosPago.ts): el filtro se hace listando los metodos aqui.
--
-- p_desde/p_hasta los calcula el cliente (medianoche local del dispositivo),
-- igual que resumen_dia (spec 08): "el dia" es una nocion del mostrador, no
-- del servidor UTC.
create or replace function public.efectivo_esperado(
  p_negocio unidad_negocio, p_desde timestamptz, p_hasta timestamptz
) returns table (moneda moneda, monto_usd numeric)
language sql stable as $$
  select
    case when mc.metodo = 'efectivo-usd' then 'USD'::moneda else 'VES'::moneda end,
    sum(case when mc.flujo = 'ingreso' then mc.monto_usd else -mc.monto_usd end)
  from public.movimiento_caja mc
  where mc.unidad_negocio = p_negocio
    and mc.creado_en >= p_desde and mc.creado_en < p_hasta
    and mc.metodo in ('efectivo-ves', 'efectivo-usd')
  group by 1;
$$;

-- Cierre (requisito 3): congela contado, esperado, diferencias y tasa.
-- Recalcula "contado" desde arqueo_detalle en vez de confiar en las columnas
-- contado_ves/contado_usd que el cliente sincronizo: esas son un cache para
-- pintar la pantalla, la fuente de verdad al cerrar es la denominacion por
-- denominacion.
create or replace function public.cerrar_arqueo(
  p_arqueo_id     uuid,
  p_desde_dia     timestamptz,
  p_hasta_dia     timestamptz,
  p_nota          text default null,
  p_monto_retiro  numeric default null
) returns public.arqueo
language plpgsql security definer set search_path = public as $$
declare
  v_arqueo        public.arqueo;
  v_contado_ves   numeric(14,2);
  v_contado_usd   numeric(12,2);
  v_esperado_ves  numeric(14,2);
  v_esperado_usd  numeric(12,2);
  v_tasa          numeric(16,4);
begin
  if public.rol_actual() <> 'dueno' then
    raise exception 'sin_permiso';
  end if;

  select * into v_arqueo from public.arqueo where id = p_arqueo_id for update;
  if not found then
    raise exception 'arqueo_no_encontrado';
  end if;
  if v_arqueo.estado = 'cerrado' then
    raise exception 'arqueo_cerrado';
  end if;

  v_tasa := public.tasa_vigente();
  if v_tasa is null then
    raise exception 'sin_tasa';
  end if;

  select
    coalesce(sum(d.cantidad * den.valor) filter (where den.moneda = 'VES'), 0),
    coalesce(sum(d.cantidad * den.valor) filter (where den.moneda = 'USD'), 0)
    into v_contado_ves, v_contado_usd
  from public.arqueo_detalle d
  join public.denominacion den on den.id = d.denominacion_id
  where d.arqueo_id = p_arqueo_id;

  select
    coalesce(sum(monto_usd) filter (where moneda = 'VES'), 0),
    coalesce(sum(monto_usd) filter (where moneda = 'USD'), 0)
    into v_esperado_ves, v_esperado_usd
  from public.efectivo_esperado(v_arqueo.unidad_negocio, p_desde_dia, p_hasta_dia);

  -- El esperado en Bs. son ventas/abonos en Bs. mas el fondo con el que se
  -- abrio, convertidos a la tasa del cierre (requisito 4.2). El esperado en
  -- USD no lleva fondo aparte: el fondo se cuenta en la moneda en que se
  -- entrego, y en esta bodega el fondo es en bolivares.
  v_esperado_ves := (v_esperado_ves * v_tasa) + (v_arqueo.fondo_inicial_usd * v_tasa);

  -- Requisito 2.6: la nota es obligatoria si CUALQUIERA de las dos monedas,
  -- por separado, se pasa del umbral (equivalente en USD para comparar).
  if greatest(
       abs((v_contado_ves - v_esperado_ves) / nullif(v_tasa, 0)),
       abs(v_contado_usd - v_esperado_usd)
     ) > (select umbral_diferencia_usd from public.negocio where id = v_arqueo.unidad_negocio)
     and (p_nota is null or btrim(p_nota) = '')
  then
    raise exception 'nota_requerida';
  end if;

  update public.arqueo set
    contado_ves = v_contado_ves,
    contado_usd = v_contado_usd,
    esperado_ves = v_esperado_ves,
    esperado_usd = v_esperado_usd,
    diferencia_ves = v_contado_ves - v_esperado_ves,
    diferencia_usd = v_contado_usd - v_esperado_usd,
    tasa_aplicada = v_tasa,
    nota = p_nota,
    estado = 'cerrado',
    cerrado_en = now(),
    cerrado_por = auth.uid()
  where id = p_arqueo_id
  returning * into v_arqueo;

  -- Retiro de la recaudacion (requisito 4.3, 4.4): un egreso categoria
  -- retiro, para que el flujo de caja del spec 08 lo refleje sin logica
  -- adicional. El fondo que queda para manana es lo contado menos el retiro.
  if p_monto_retiro is not null and p_monto_retiro > 0 then
    insert into public.egreso
      (unidad_negocio, descripcion, monto_usd, tasa_aplicada, categoria, metodo, usuario_id)
    values (
      v_arqueo.unidad_negocio, 'Retiro de caja - arqueo ' || v_arqueo.fecha,
      p_monto_retiro, v_tasa, 'retiro', 'efectivo-usd', auth.uid()
    );
  end if;

  return v_arqueo;
end;
$$;

revoke execute on function public.cerrar_arqueo(uuid, timestamptz, timestamptz, text, numeric) from public;
grant execute on function public.cerrar_arqueo(uuid, timestamptz, timestamptz, text, numeric) to authenticated;
