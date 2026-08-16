# Fundación de la plataforma — Diseño

## Estructura inicial

```
.
├─ .env.example
├─ index.html
├─ vite.config.ts
├─ vitest.config.ts
├─ playwright.config.ts
├─ eslint.config.js
├─ tsconfig.json          # references a app y node
├─ public/fonts/          # Inter subset woff2
├─ src/
│  ├─ main.ts
│  ├─ App.vue
│  ├─ assets/scss/
│  │   ├─ _variables.scss     tokens propios
│  │   ├─ _mixins.scss
│  │   ├─ _bootstrap.scss     variables → import parcial de Bootstrap
│  │   └─ main.scss           entrada única
│  ├─ layouts/
│  │   ├─ LayoutMovil.vue
│  │   ├─ LayoutEscritorio.vue
│  │   └─ LayoutAuth.vue
│  ├─ components/ui/          BotonPrimario, CampoTexto, ModalBase, ChipFiltro…
│  ├─ composables/
│  │   ├─ useEsMovil.ts
│  │   └─ useMoneda.ts
│  ├─ lib/
│  │   ├─ money.ts
│  │   ├─ supabase.ts
│  │   └─ fechas.ts
│  ├─ router/index.ts
│  ├─ pages/                  una carpeta por módulo
│  └─ types/database.ts       generado
└─ supabase/
   ├─ config.toml
   ├─ migrations/
   └─ seed.sql
```

## Estilos

`_bootstrap.scss` es el único archivo que toca Bootstrap:

```scss
@use 'variables' as v;

// 1. Mapear nuestros tokens a las variables de Bootstrap
$primary:       v.$acento;
$body-bg:       v.$fondo;
$body-color:    v.$tinta;
$border-radius: v.$radio-md;
$font-family-sans-serif: 'Inter', system-ui, sans-serif;

// 2. Solo los módulos que usamos
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/maps';
@import 'bootstrap/scss/mixins';
@import 'bootstrap/scss/root';
@import 'bootstrap/scss/reboot';
@import 'bootstrap/scss/grid';
@import 'bootstrap/scss/forms';
@import 'bootstrap/scss/buttons';
@import 'bootstrap/scss/utilities/api';
```

Se omiten `modal`, `dropdown`, `offcanvas`, `carousel`, `accordion`: los
implementamos como componentes Vue (ver [tech.md](../../steering/tech.md)).

## Layouts

`App.vue` decide el layout una sola vez, por composable:

```vue
<script setup lang="ts">
import { useEsMovil } from '@/composables/useEsMovil'
const esMovil = useEsMovil()
</script>

<template>
  <component :is="esMovil ? LayoutMovil : LayoutEscritorio">
    <RouterView v-slot="{ Component, route }">
      <KeepAlive :include="['VentaNueva']">
        <component :is="Component" :key="route.path" />
      </KeepAlive>
    </RouterView>
  </component>
</template>
```

`useEsMovil` usa `matchMedia('(min-width: 768px)')` con un listener, no el evento
`resize`: `matchMedia` dispara solo al cruzar el corte, `resize` dispara en cada
píxel.

`<KeepAlive include="VentaNueva">` es lo que cumple el criterio 3.3: al cambiar
de layout Vue desmonta el árbol, y sin esto se perdería el carrito a medio armar.
La lista se mantiene corta a propósito.

## Enrutador

Los títulos viven en `meta`, no dentro de cada página, para que el layout los
renderice sin que la página tenga que emitirlos:

```ts
{
  path: '/venta',
  name: 'venta',
  component: () => import('@/pages/venta/VentaNueva.vue'),
  meta: {
    titulo: 'Registrar venta',
    subtitulo: 'Arma la venta y confirma en un toque',
    navMovil: { etiqueta: 'Vender', orden: 2 },
    navEscritorio: { etiqueta: 'Registrar venta', orden: 2 },
  },
}
```

Las barras de navegación se construyen filtrando `router.getRoutes()` por la
presencia de `navMovil` / `navEscritorio` y ordenando por `orden`. Agregar un
destino es agregar una ruta, no editar dos listas.

Resumen (`/`) y Venta (`/venta`) se importan de forma estática porque son las
primeras pantallas en cargar. Todo lo demás va con `import()`.

## `lib/money.ts`

La API completa. Un `Centavos` es un `number` entero con marca de tipo, para que
el compilador impida sumar un monto crudo con uno ya convertido:

```ts
export type Centavos = number & { readonly __marca: 'centavos' }

export function aCentavos(usd: number | string): Centavos
export function aUsd(c: Centavos): number
export function sumar(...montos: Centavos[]): Centavos
export function multiplicar(monto: Centavos, cantidad: number): Centavos
export function aBolivares(monto: Centavos, tasa: number): number  // entero
export function formatearUsd(monto: Centavos): string              // "$1,57"
export function formatearBs(bolivares: number): string             // "1.256 Bs."
```

`multiplicar` es donde vive el redondeo delicado: una línea de 3 unidades de un
producto de `$0,04` no puede dar `$0,13`. Se multiplica en centavos enteros y se
redondea con `Math.round`, no con truncamiento.

`aBolivares` redondea a entero **al final**. Un carrito de 10 líneas convierte el
total, nunca línea por línea; la diferencia acumulada llega a varios bolívares.

### Casos de prueba obligatorios

| Entrada | Esperado | Por qué |
| --- | --- | --- |
| `aCentavos(1.57)` | `157` | precio real de Harina P.A.N |
| `aCentavos(0.04)` | `4` | caramelo, el producto más barato del catálogo |
| `aBolivares(157, 800)` | `1256` | coincide con `CAMBIO BS.` del Excel |
| `multiplicar(4, 3)` | `12` | evita el error de coma flotante `0.04*3 = 0.12000000000000001` |
| `aBolivares(sumar(157, 130, 160), 800)` | `3576` | suma antes de convertir |
| `aCentavos(0.1) + aCentavos(0.2)` | `30` | el clásico `0.1 + 0.2 !== 0.3` |

## Cliente de Supabase

```ts
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. Copia .env.example a .env'
  )
}
export const supabase = createClient<Database>(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, storage: localStorage },
})
```

La clave `anon` es pública por diseño: es la RLS la que protege los datos, no el
secreto de la clave. La `service_role` **nunca** entra al bundle del cliente.

## Migración inicial

`supabase/migrations/0001_base.sql` crea solo lo transversal; cada spec agrega su
propia migración:

```sql
create extension if not exists "pgcrypto";

create type unidad_negocio as enum ('bodega', 'cerveza', 'thais');
create type moneda        as enum ('USD', 'VES');
create type unidad_medida as enum ('UND', 'KG', 'LITRO', 'PACK');

create table public.negocio (
  id          unidad_negocio primary key,
  nombre      text not null,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);
insert into public.negocio (id, nombre) values
  ('bodega','Bodega'), ('cerveza','Cerveza'), ('thais','Thais');

alter table public.negocio enable row level security;
create policy negocio_lectura on public.negocio
  for select to authenticated using (true);
```

`negocio` no tiene política de escritura a propósito: son tres filas fijas que se
cambian por migración.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Cambiar de layout desmonta el carrito | `<KeepAlive>` sobre `VentaNueva`, con prueba E2E que redimensiona |
| `oklch` no soportado en navegadores viejos | PostCSS con respaldo automático a `rgb()`; el objetivo es Chrome/Android ≥ 111 |
| El bundle de Bootstrap crece sin control | Import parcial + presupuesto de tamaño en CI |
| Los tipos generados quedan desfasados del esquema | `npm run types` en el hook de pre-commit cuando cambia `supabase/migrations/` |
