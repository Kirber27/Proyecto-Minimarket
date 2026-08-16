# Stack técnico

## Elegido

| Capa | Herramienta | Versión objetivo |
| --- | --- | --- |
| Framework | Vue 3 (`<script setup>`, Composition API) | ^3.5 |
| Build | Vite | ^6 |
| Estado | Pinia (setup stores) | ^2.2 |
| Router | Vue Router | ^4.4 |
| Estilos | Bootstrap 5 + SCSS propio | ^5.3 |
| Backend | Supabase (Postgres + Auth + RLS + Realtime) | — |
| PWA | `vite-plugin-pwa` (Workbox) | ^0.21 |
| Tests | Vitest + Vue Test Utils; Playwright para E2E | — |
| Lint/format | ESLint (flat config) + Prettier | — |
| Lenguaje | TypeScript en modo `strict` | ^5.6 |

## Reglas no negociables

### Dinero

- **Nunca `number` de punto flotante para dinero.** Los montos en USD se guardan
  como `numeric(12,2)` en Postgres y se manipulan en el cliente como enteros de
  centavos (`number` de céntimos) o como string decimal. Hay un helper único en
  `src/lib/money.ts`; no se hace aritmética de dinero fuera de ahí.
- Los bolívares **no se persisten** en ventas ni productos. Se derivan del monto
  USD × tasa vigente al momento. La única excepción es el arqueo de caja, que
  guarda el conteo real de billetes Bs. porque es un hecho físico.

### Bootstrap + SCSS

- Se importa Bootstrap **por SCSS**, no el CSS compilado, para poder sobrescribir
  variables antes del `@import`. Estructura en `src/assets/scss/`.
- No se usa el JS de Bootstrap (`bootstrap.bundle.js`). Modales, dropdowns y
  offcanvas se implementan como componentes Vue propios. Mezclar el JS imperativo
  de Bootstrap con el DOM virtual de Vue causa nodos huérfanos.
- Las utilidades de Bootstrap (`d-flex`, `gap-*`, `text-*`) sí se usan libremente
  en templates. Lo que no se hace es escribir CSS suelto que duplique una utility
  existente.

### Supabase

- Todo acceso a datos pasa por un módulo en `src/services/`. Los componentes no
  importan el cliente de Supabase directamente, ni los stores llaman a
  `supabase.from()` sin pasar por un service.
- **RLS activo en todas las tablas desde el día uno.** Una tabla sin política es
  un bug de seguridad, no una tarea pendiente.
- Las operaciones que tocan varias tablas (confirmar una venta descuenta stock,
  inserta líneas, y quizá crea una deuda) van en una función `plpgsql` con
  `SECURITY INVOKER`, invocada por RPC. No se orquesta desde el cliente: un
  cliente que pierde señal a mitad deja los datos inconsistentes.
- Las migraciones viven en `supabase/migrations/` versionadas en git. Nada de
  cambiar el esquema desde el panel web sin bajar la migración.

### Pinia

- Setup stores (`defineStore('x', () => { ... })`), no option stores.
- Un store por agregado de dominio, no uno por pantalla.
- Los stores guardan estado y lo derivan; no formatean para la vista. El formato
  (símbolo de moneda, separadores) es responsabilidad de composables/componentes.

### TypeScript

- `strict: true`. Sin `any` implícito ni explícito; si algo es realmente
  desconocido se usa `unknown` y se estrecha.
- Los tipos de las tablas se **generan** desde Supabase
  (`supabase gen types typescript`) hacia `src/types/database.ts`. No se
  escriben a mano ni se editan.

## Estructura de carpetas

```
src/
  assets/scss/        _variables.scss, _mixins.scss, main.scss
  components/         componentes reutilizables (ui/, layout/, dominio/)
  composables/        useMoneda, useTasa, useSesion, useOnline...
  layouts/            LayoutMovil.vue, LayoutEscritorio.vue, LayoutAuth.vue
  lib/                money.ts, supabase.ts, fechas.ts
  pages/              una carpeta por módulo, ruta-a-archivo explícita
  router/
  services/           acceso a datos, uno por agregado
  stores/             Pinia
  types/              database.ts (generado) + tipos de dominio
supabase/
  migrations/
  functions/          Edge Functions si hacen falta
mock/                 seed extraído del Excel
.claude/
  steering/           este directorio
  specs/              specs por funcionalidad
```

## Comandos

```bash
npm run dev            # Vite dev server
npm run build          # build de producción
npm run preview        # sirve el build (única forma de probar la PWA)
npm run test           # Vitest en modo watch
npm run test:e2e       # Playwright
npm run lint           # ESLint
npm run types          # regenera src/types/database.ts desde Supabase
npx supabase start     # stack local de Supabase en Docker
npx supabase db reset  # recrea la BD local y aplica migraciones + seed
```

## Objetivos de rendimiento

Se mide en un Android de gama baja con 4G lento, que es el aparato real del
mostrador:

- First Contentful Paint < 2 s.
- La pantalla de venta responde a un toque en < 100 ms con 328 productos
  cargados. Si la lista se pone lenta, se virtualiza; no se pagina, porque
  paginar rompe el flujo de buscar-y-tocar.
- Bundle inicial < 250 KB gzip. Las rutas de administración se cargan con
  `import()` diferido.
