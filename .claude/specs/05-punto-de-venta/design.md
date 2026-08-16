# Punto de venta — Diseño

## Esquema

`supabase/migrations/0005_ventas.sql`:

```sql
create type metodo_pago as enum
  ('efectivo-ves','efectivo-usd','punto','pago-movil','biopago','credito');

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
  id            bigserial primary key,
  venta_id      uuid not null references public.venta(id) on delete cascade,
  producto_id   uuid not null references public.producto(id),
  nombre_snapshot text not null,       -- el nombre al momento de vender
  cantidad      numeric(12,3) not null check (cantidad > 0),
  precio_unitario_usd numeric(12,2) not null,
  subtotal_usd  numeric(12,2) not null
);

create table public.venta_pago (
  id         bigserial primary key,
  venta_id   uuid not null references public.venta(id) on delete cascade,
  metodo     metodo_pago not null,
  monto_usd  numeric(12,2) not null check (monto_usd > 0)
);

create index venta_fecha_idx on public.venta (creado_en desc) where not anulada;
create index venta_negocio_idx on public.venta (unidad_negocio, creado_en desc);
```

`nombre_snapshot` guarda el nombre del producto al momento de la venta. Si dentro
de seis meses «HARINA P.A.N» se renombra, el recibo viejo tiene que seguir
diciendo lo que decía. Lo mismo vale para `precio_unitario_usd`.

`idempotencia` es la defensa contra el doble registro: el cliente genera un UUID
al abrir el carrito y lo envía al confirmar. Si la respuesta se pierde y el
cliente reintenta, el `unique` rechaza el segundo intento y la RPC devuelve la
venta ya creada en lugar de duplicarla. Esto es lo que hace segura la
sincronización sin conexión del spec 11.

## La función `crear_venta`

Todo el requisito 3.5 (atomicidad) vive aquí. Una función, una transacción:

```sql
create or replace function public.crear_venta(
  p_lineas        jsonb,   -- [{producto_id, cantidad}]
  p_pagos         jsonb,   -- [{metodo, monto_usd}]
  p_negocio       unidad_negocio,
  p_tasa_cliente  numeric,
  p_cliente_id    uuid default null,
  p_idempotencia  text default null
) returns public.venta
language plpgsql security definer set search_path = public as $$
declare
  v_venta   public.venta;
  v_linea   jsonb;
  v_prod    public.producto;
  v_total   numeric(12,2) := 0;
  v_pagado  numeric(12,2) := 0;
  v_tasa    numeric(16,4);
begin
  -- 0. Idempotencia: si ya existe, devolver la misma venta
  if p_idempotencia is not null then
    select * into v_venta from public.venta where idempotencia = p_idempotencia;
    if found then return v_venta; end if;
  end if;

  -- 1. La tasa del cliente tiene que ser la vigente (requisito 5.4 del spec 04)
  v_tasa := public.tasa_vigente();
  if v_tasa is null then raise exception 'sin_tasa'; end if;
  if p_tasa_cliente is distinct from v_tasa then
    raise exception 'tasa_desactualizada' using detail = v_tasa::text;
  end if;

  -- 2. Bloquear los productos en orden de id para evitar interbloqueos entre
  --    dos cajas vendiendo los mismos artículos al mismo tiempo
  for v_linea in
    select * from jsonb_array_elements(p_lineas)
    order by (value->>'producto_id')::uuid
  loop
    select * into v_prod from public.producto
      where id = (v_linea->>'producto_id')::uuid for update;

    if v_prod.stock_actual < (v_linea->>'cantidad')::numeric then
      raise exception 'stock_insuficiente'
        using detail = v_prod.nombre, hint = v_prod.stock_actual::text;
    end if;
    v_total := v_total + v_prod.precio_venta_usd * (v_linea->>'cantidad')::numeric;
  end loop;

  -- 3. Los pagos tienen que cubrir el total, salvo lo que vaya a fiado
  select coalesce(sum((value->>'monto_usd')::numeric), 0) into v_pagado
    from jsonb_array_elements(p_pagos);
  if v_pagado < v_total and p_cliente_id is null then
    raise exception 'pago_insuficiente';
  end if;

  -- 4. Insertar venta, líneas y pagos; descontar stock
  ...
  -- 5. Si quedó saldo, crear el movimiento de deuda (spec 07)
  if v_pagado < v_total then
    perform public.registrar_deuda(p_cliente_id, v_total - v_pagado, v_venta.id, v_tasa);
  end if;

  return v_venta;
end $$;
```

Dos decisiones que importan:

**`for update` en orden de `id`.** Dos cajas vendiendo simultáneamente los mismos
dos productos en orden distinto se bloquearían mutuamente. Ordenar por `id` antes
de bloquear elimina esa posibilidad.

**El precio se lee del servidor, no del cliente.** El cliente envía qué producto y
cuánta cantidad; el precio lo pone `crear_venta` desde la tabla. Un cliente
manipulado no puede vender a un precio inventado.

`security definer` es necesario porque la función escribe `producto.stock_actual`,
que la política de RLS reserva al `dueno`. La función es el único camino
autorizado para que un `mostrador` mueva stock.

## Anulación

```sql
create or replace function public.anular_venta(p_venta_id uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.rol_actual() <> 'dueno' then raise exception 'sin_permiso'; end if;
  -- devolver stock, revertir deuda, marcar anulada
end $$;
```

No se borra nada (requisito 5.4). Los índices de reportes ya filtran
`where not anulada`, así que la venta anulada desaparece de los totales sin
desaparecer del historial.

## Estado en el cliente

```ts
export const useCarritoStore = defineStore('carrito', () => {
  const lineas   = ref<LineaCarrito[]>([])
  const pagos    = ref<LineaPago[]>([])
  const clienteId = ref<string | null>(null)
  const idempotencia = ref(crypto.randomUUID())
  const enviando = ref(false)

  const totalUsd  = computed(() => sumar(...lineas.value.map(l => l.subtotalUsd)))
  const pagadoUsd = computed(() => sumar(...pagos.value.map(p => p.montoUsd)))
  const faltaUsd  = computed(() => Math.max(totalUsd.value - pagadoUsd.value, 0))
  const vueltoUsd = computed(() => Math.max(pagadoUsd.value - totalUsd.value, 0))
  const puedeConfirmar = computed(() =>
    lineas.value.length > 0 && !enviando.value &&
    (faltaUsd.value === 0 || clienteId.value !== null))

  function agregar(producto: Producto, cantidad = 1) { /* valida stock local */ }
  async function confirmar() { /* ventasService.crear(...) */ }
  function reiniciar() { idempotencia.value = crypto.randomUUID(); /* ... */ }
  return { /* ... */ }
})
```

`idempotencia` se renueva en `reiniciar()`, no en cada confirmación: si el primer
envío falló por red, el reintento tiene que llevar el **mismo** UUID para que el
servidor lo reconozca.

La validación de stock también ocurre en el cliente (requisito 1.5) para dar
respuesta inmediata, pero no es la que manda: el servidor revalida (requisito
3.6) porque el stock local puede estar desactualizado.

## Disposición

**Móvil.** Cuadrícula de 2 columnas ocupando la pantalla; panel de carrito
adherido al fondo, colapsable, mostrando unidades y total. Expandido cubre dos
tercios de la pantalla con las líneas y el selector de pago.

**Escritorio.** Cuadrícula de 4–5 columnas a la izquierda, carrito fijo a la
derecha en una columna de 380 px, siempre visible.

Ambas usan `VentaNueva.vue`; lo único que cambia es la clase del contenedor.

## Selector de pago

```
┌─────────────────────────────────────┐
│ Total          $12,40    9.920 Bs.  │
├─────────────────────────────────────┤
│ [Efectivo Bs.] [Efectivo $] [Punto] │
│ [Pago móvil]   [Biopago]  [Fiado]   │
├─────────────────────────────────────┤
│ Efectivo Bs.     8.000 Bs.   $10,00 │
│ Pago móvil       1.920 Bs.    $2,40 │
│                                     │
│ Falta                        $0,00  │
├─────────────────────────────────────┤
│         Confirmar venta             │
└─────────────────────────────────────┘
```

Tocar un método agrega una línea de pago precargada con lo que falta. Eso cubre
el caso común (un solo método) en un toque, y el mixto se logra editando el monto
de la primera línea y tocando un segundo método.

Los montos en Bs. se teclean en bolívares y se convierten a USD para almacenar
(requisito 2.8): nadie en el mostrador piensa «esto son 10 dólares», piensa
«me dio ocho mil».

## Errores

| Código | Mensaje |
| --- | --- |
| `stock_insuficiente` | No hay stock suficiente de [producto]. Quedan [n]. |
| `tasa_desactualizada` | La tasa cambió a [nueva]. Revisa el total y confirma otra vez. |
| `sin_tasa` | Registra la tasa del día para poder vender. |
| `pago_insuficiente` | Falta cubrir [monto]. Completa el pago o elige un cliente para fiado. |
| `sin_permiso` | Solo el dueño puede anular ventas. |

Los mensajes nombran el producto y la cantidad concretos, no dicen «error de
stock» (ver [structure.md](../../steering/structure.md)).

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Doble toque crea dos ventas | Botón deshabilitado al enviar + llave de idempotencia |
| Dos cajas venden el último producto | `for update` con bloqueo de fila en el servidor |
| Interbloqueo entre dos ventas concurrentes | Bloqueo en orden de `id` |
| Cliente manipulado envía precios falsos | El precio se lee del servidor |
| Perder el carrito al recargar | Se persiste en `localStorage` con la llave de idempotencia |
| Anular una venta de un arqueo cerrado descuadra el cierre | Advertencia previa (requisito 5.6) |
