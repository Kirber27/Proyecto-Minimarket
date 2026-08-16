# Catálogo de productos — Diseño

## Esquema

`supabase/migrations/0003_catalogo.sql`:

```sql
create table public.categoria (
  id             text primary key,          -- slug: 'viveres', 'galletas'
  nombre         text not null unique,
  matiz          smallint not null default 265 check (matiz between 0 and 360),
  unidad_negocio unidad_negocio not null default 'bodega',
  orden          smallint not null default 0,
  activo         boolean not null default true,
  creado_en      timestamptz not null default now()
);

create table public.producto (
  id               uuid primary key default gen_random_uuid(),
  sku              text unique,
  nombre           text not null,
  nombre_busqueda  text generated always as (public.normalizar(nombre)) stored,
  categoria_id     text not null references public.categoria(id),
  unidad_negocio   unidad_negocio not null default 'bodega',
  unidad_medida    unidad_medida not null default 'UND',
  precio_venta_usd numeric(12,2) not null check (precio_venta_usd >= 0),
  costo_usd        numeric(12,2) check (costo_usd >= 0),   -- nulo: el Excel no lo trae
  stock_actual     numeric(12,3) not null default 0,
  stock_minimo     numeric(12,3) not null default 5,
  activo           boolean not null default true,
  origen           text,                    -- 'BODEGA!B4', trazabilidad al Excel
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now()
);

create index producto_busqueda_idx on public.producto
  using gin (nombre_busqueda gin_trgm_ops);
create index producto_categoria_idx on public.producto (categoria_id, activo);
create index producto_negocio_idx   on public.producto (unidad_negocio, activo);

create table public.precio_historial (
  id             bigserial primary key,
  producto_id    uuid not null references public.producto(id) on delete cascade,
  precio_anterior numeric(12,2),
  precio_nuevo    numeric(12,2) not null,
  costo_anterior  numeric(12,2),
  costo_nuevo     numeric(12,2),
  usuario_id      uuid references public.perfil(id),
  motivo          text,                     -- 'manual' | 'importacion'
  creado_en       timestamptz not null default now()
);
```

### Búsqueda sin tildes

El requisito 1.3 (buscar «cafe» y encontrar «CAFÉ») se resuelve en la base, no en
el cliente: filtrar 328 productos en JavaScript funcionaría, pero la misma
búsqueda tiene que servir para el autocompletado de la venta y para reportes.

```sql
create extension if not exists unaccent;
create extension if not exists pg_trgm;

create or replace function public.normalizar(t text) returns text
language sql immutable strict parallel safe as $$
  select lower(public.unaccent('public.unaccent'::regdictionary, t));
$$;
```

`unaccent` debe invocarse con el diccionario explícito porque la versión de un
argumento no es `immutable`, y una columna generada exige una función `immutable`.
Es el error que rompe la migración si se escribe `unaccent(t)` a secas.

La columna `nombre_busqueda` se calcula sola y el índice GIN con `gin_trgm_ops`
hace que `nombre_busqueda like '%cafe%'` use índice en vez de escanear la tabla.

### Historial de precios automático

```sql
create or replace function public.registrar_cambio_precio()
returns trigger language plpgsql as $$
begin
  if new.precio_venta_usd is distinct from old.precio_venta_usd
     or new.costo_usd is distinct from old.costo_usd then
    insert into public.precio_historial
      (producto_id, precio_anterior, precio_nuevo, costo_anterior, costo_nuevo, usuario_id, motivo)
    values (new.id, old.precio_venta_usd, new.precio_venta_usd,
            old.costo_usd, new.costo_usd, auth.uid(),
            coalesce(current_setting('app.motivo', true), 'manual'));
  end if;
  new.actualizado_en = now();
  return new;
end $$;

create trigger producto_precio_historial before update on public.producto
  for each row execute function public.registrar_cambio_precio();
```

Al ser un trigger, el requisito 2.9 se cumple también para la importación masiva
y para cualquier cambio futuro, sin que nadie tenga que acordarse de llamarlo.

## Políticas

```sql
-- Todos leen el catálogo
create policy producto_lectura on public.producto
  for select to authenticated using (true);

-- Solo el dueño lo modifica (requisito 5.3 del spec de autenticación)
create policy producto_escritura on public.producto
  for all to authenticated
  using (auth.rol_actual() = 'dueno') with check (auth.rol_actual() = 'dueno');
```

`stock_actual` es la excepción: lo escribe la función `crear_venta` del spec 05,
que corre como `security definer` y por tanto no pasa por esta política.

## Seed

`supabase/seed.sql` se genera desde `mock/` con un script, no se escribe a mano.
La idempotencia (requisito 5.7) sale del `on conflict`:

```sql
insert into public.categoria (id, nombre, matiz, orden) values
  ('viveres','Víveres',60,1), ('granos','Granos',85,2), ...
on conflict (id) do update set nombre = excluded.nombre, matiz = excluded.matiz;

insert into public.producto (sku, nombre, categoria_id, unidad_medida,
                             precio_venta_usd, stock_actual, stock_minimo, origen) values
  ('harina-p-a-n','Harina P.A.N','viveres','UND',1.57,21,5,'BODEGA!B4'), ...
on conflict (sku) do update set
  nombre = excluded.nombre,
  precio_venta_usd = excluded.precio_venta_usd;
```

El `on conflict` actualiza en vez de ignorar, así que reejecutar el seed tras
corregir un precio en el Excel propaga la corrección.

## Componentes

```
pages/productos/
  ProductosLista.vue      tabla en escritorio, tarjetas en móvil
  ProductoFormulario.vue  modal de alta/edición
  ProductosImportar.vue   asistente de 3 pasos
pages/categorias/
  CategoriasLista.vue
components/dominio/
  TarjetaProducto.vue     usada en venta e inventario
  FilaProducto.vue        fila de tabla en escritorio
  ChipCategoria.vue       teñido con el matiz de la categoría
  SelectorNegocio.vue     va en la cabecera de ambos layouts
  PrecioDoble.vue         USD grande, Bs. debajo en $tenue
```

`PrecioDoble` es el componente que hace cumplir la regla de moneda dual en toda
la app: cualquier monto se muestra con él, y así no hay dos formas distintas de
pintar un precio.

## Store

```ts
export const useCatalogoStore = defineStore('catalogo', () => {
  const productos  = ref<Producto[]>([])
  const categorias = ref<Categoria[]>([])
  const negocio    = ref<UnidadNegocio>(leerPreferencia() ?? 'bodega')

  const porCategoria = computed(() => agruparPor(productos.value, 'categoriaId'))
  const activos = computed(() =>
    productos.value.filter(p => p.activo && p.unidadNegocio === negocio.value))

  function buscar(texto: string, categoria = 'Todas') { /* filtra en memoria */ }
  async function cargar() { /* catalogoService.listar(negocio.value) */ }
  async function guardar(p: ProductoInput) { /* ... */ }
  return { productos, categorias, negocio, porCategoria, activos, buscar, cargar, guardar }
})
```

El catálogo completo (328 filas, ~60 KB en JSON) se carga una vez al iniciar
sesión y se filtra en memoria. Ir al servidor por cada tecla del buscador sería
inútil con este volumen, y encima rompe la búsqueda sin conexión. La búsqueda en
memoria normaliza con `String.prototype.normalize('NFD')` para replicar el
comportamiento de `normalizar()` del servidor.

La lista se virtualiza a partir de 100 elementos con un composable propio de
ventana de desplazamiento; no se agrega una dependencia por esto.

## Importación

Asistente de tres pasos:

1. **Archivo** — se sube y se parsea en el cliente con `xlsx` cargado bajo
   demanda (`import('xlsx')`), para no meter la librería en el bundle inicial.
2. **Mapeo** — el usuario asocia columnas del archivo a campos del producto. Se
   proponen automáticamente por nombre de encabezado (`PRODUCTO` → nombre,
   `$$` → precio, `CANTIDAD` → stock).
3. **Vista previa** — tabla con tres pestañas: nuevas, a actualizar, con error.
   Cada error indica el número de fila del archivo original.

La aplicación se hace en una sola RPC `importar_productos(filas jsonb)`, que
corre en una transacción y devuelve `{creados, actualizados}`. La atomicidad del
requisito 6.5 es la razón de que sea una RPC y no un bucle de `upsert` desde el
cliente.

Antes de aplicar, se ejecuta `set_config('app.motivo', 'importacion', true)` para
que el trigger de historial etiquete correctamente los cambios.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `unaccent` no es `immutable` y rompe la columna generada | Se invoca con el diccionario explícito (`'public.unaccent'::regdictionary`) |
| 328 tarjetas en móvil hacen lento el desplazamiento | Virtualización a partir de 100 elementos |
| Importar sin querer sobrescribe precios buenos | Vista previa obligatoria + historial que permite auditar y revertir |
| Cambiar de unidad de negocio recarga todo | El catálogo se carga completo y se filtra en memoria |
| SKU derivado del nombre colisiona en productos parecidos | Sufijo numérico automático, ya aplicado en la extracción |
