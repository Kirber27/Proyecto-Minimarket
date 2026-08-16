-- Pruebas pgTAP para inventario: movimientos automaticos, ajustes, reposicion.
-- Correr local: npx supabase test db supabase/tests --local
-- Verificado tambien ad-hoc contra el proyecto real con
-- `npx supabase db query -f ... --linked` dentro de una transaccion con rollback.

begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

insert into auth.users (id, email, raw_app_meta_data)
values ('00000000-0000-0000-0000-0000000000bb', 'prueba-inv@minimarket.test', '{"rol":"dueno"}');

set local role authenticated;
set local request.jwt.claims to
  '{"sub":"00000000-0000-0000-0000-0000000000bb","app_metadata":{"rol":"dueno"}}';

-- Producto conocido del seed: Harina P.A.N, stock 21.

-- Caso 1: una venta genera un movimiento tipo 'venta' con cantidad negativa.
select public.crear_venta(
  jsonb_build_array(jsonb_build_object(
    'producto_id', (select id from public.producto where sku = 'harina-p-a-n'),
    'cantidad', 2)),
  jsonb_build_array(jsonb_build_object('metodo', 'efectivo-usd', 'monto_usd', 3.14)),
  'bodega', public.tasa_vigente(), null, 'idem-inv-001'
);

select is(
  (select tipo::text from public.movimiento_stock
    where producto_id = (select id from public.producto where sku = 'harina-p-a-n')
    order by id desc limit 1),
  'venta',
  'crear_venta genera un movimiento tipo venta'
);

select is(
  (select cantidad from public.movimiento_stock
    where producto_id = (select id from public.producto where sku = 'harina-p-a-n')
    order by id desc limit 1),
  -2::numeric,
  'el movimiento de venta tiene cantidad negativa igual a lo vendido'
);

select is(
  (select venta_id from public.movimiento_stock
    where producto_id = (select id from public.producto where sku = 'harina-p-a-n')
    order by id desc limit 1),
  (select id from public.venta where idempotencia = 'idem-inv-001'),
  'el movimiento de venta queda enlazado a la venta'
);

-- Caso 2: anular la venta genera un movimiento tipo 'anulacion' positivo.
do $$
declare
  v_venta_id uuid;
begin
  select id into v_venta_id from public.venta where idempotencia = 'idem-inv-001';
  perform public.anular_venta(v_venta_id, 'prueba pgTAP inventario');
end $$;

select is(
  (select tipo::text from public.movimiento_stock
    where producto_id = (select id from public.producto where sku = 'harina-p-a-n')
    order by id desc limit 1),
  'anulacion',
  'anular_venta genera un movimiento tipo anulacion'
);

-- Caso 3: reponer_producto entra stock y puede actualizar el costo.
select public.reponer_producto(
  (select id from public.producto where sku = 'harina-p-a-n'), 10, 1.10, true
);

select is(
  (select stock_actual from public.producto where sku = 'harina-p-a-n'),
  31::numeric,
  'reponer_producto suma la cantidad repuesta al stock'
);

select is(
  (select costo_usd from public.producto where sku = 'harina-p-a-n'),
  1.10::numeric,
  'reponer_producto actualiza el costo cuando se pide'
);

-- Caso 4: aplicar_ajustes exige nota cuando el motivo es 'otro'.
select throws_matching(
  $$ select public.aplicar_ajustes(
       jsonb_build_array(jsonb_build_object(
         'producto_id', (select id from public.producto where sku = 'harina-p-a-n'),
         'cantidad_nueva', 5)),
       'otro', null) $$,
  'nota_requerida',
  'aplicar_ajustes exige nota cuando el motivo es otro'
);

-- Caso 5: aplicar_ajustes rechaza stock negativo.
select throws_matching(
  $$ select public.aplicar_ajustes(
       jsonb_build_array(jsonb_build_object(
         'producto_id', (select id from public.producto where sku = 'harina-p-a-n'),
         'cantidad_nueva', -1)),
       'conteo', null) $$,
  'stock_negativo',
  'aplicar_ajustes rechaza cantidad_nueva negativa'
);

-- Caso 6: aplicar_ajustes por conteo deja el movimiento correcto.
select public.aplicar_ajustes(
  jsonb_build_array(jsonb_build_object(
    'producto_id', (select id from public.producto where sku = 'harina-p-a-n'),
    'cantidad_nueva', 25)),
  'conteo', null
);

select is(
  (select tipo::text from public.movimiento_stock
    where producto_id = (select id from public.producto where sku = 'harina-p-a-n')
    order by id desc limit 1),
  'ajuste',
  'aplicar_ajustes genera un movimiento tipo ajuste'
);

-- Caso 7: reconciliacion (requisito 4.4) -- la suma de movimientos de CADA
-- producto debe cuadrar exactamente con su stock_actual, tras toda la
-- actividad de esta prueba.
select is(
  (select count(*)::int from public.producto p
     where p.stock_actual <> coalesce(
       (select sum(m.cantidad) from public.movimiento_stock m
          where m.producto_id = p.id), 0)),
  0,
  'la suma de movimientos de todo producto reconcilia con su stock_actual'
);

select * from finish();
rollback;
