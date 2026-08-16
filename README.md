# Proyecto Minimarket

App de gestión para un minimarket / bodega en Venezuela. Reemplaza la planilla
`CONTROL DE VENTAS.xlsx` que se lleva a mano hoy.

Web y móvil desde una sola base de código: Vue 3 + Vite + Pinia + Bootstrap/SCSS
sobre Supabase, empaquetada como PWA instalable que funciona sin conexión.

> Estado: en desarrollo. El spec 01 (fundación de la plataforma) está montado:
> proyecto ejecutable, sistema de estilos, aritmética de dinero, layouts y
> navegación. Falta conectar un proyecto Supabase real y construir la
> funcionalidad de negocio (specs 02 en adelante).

## Qué hay en el repositorio

```
.claude/
  steering/     decisiones transversales: producto, stack, dominio, interfaz, pruebas
  specs/        11 specs, cada uno con requirements.md, design.md y tasks.md
mock/           datos reales extraídos del Excel, listos como seed
src/            aplicación Vue 3 + TypeScript
supabase/       migraciones y seed locales
e2e/            pruebas Playwright
```

Empieza por [`.claude/specs/README.md`](.claude/specs/README.md), que tiene el índice
y el orden sugerido de implementación.

## Puesta en marcha

Requiere Node 20 (ver [`.nvmrc`](.nvmrc)).

```bash
npm install
cp .env.example .env      # completa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev                # http://localhost:5173
```

Sin un proyecto Supabase configurado, `npm run dev` falla al arrancar con un
mensaje que nombra la variable de entorno que falta — es intencional (ver
[requisito 5.3](.claude/specs/01-fundacion-plataforma/requirements.md)). Para
levantar Supabase en local hace falta Docker:

```bash
npx supabase start         # stack local de Postgres + Auth
npx supabase db reset       # aplica supabase/migrations/ y supabase/seed.sql
npm run types               # regenera src/types/database.ts
```

Otros comandos:

```bash
npm run build       # build de producción
npm run preview     # sirve el build (única forma de probar la PWA)
npm run test         # Vitest en modo watch
npm run test:e2e    # Playwright, contra npm run preview
npm run lint         # ESLint + Prettier
```

## Decisiones tomadas

- **Moneda dual USD/Bs.** El precio se define en dólares; los bolívares se
  derivan de la tasa vigente, que cambia a diario. Nunca al revés.
- **PWA responsive**, no app nativa. Instalable, funciona sin señal.
- **Tres unidades de negocio**: Bodega, Cerveza y Thais.
- **El fiado es de primera clase.** Cada consumo es una línea con monto y fecha,
  no una nota en una celda.

El detalle está en [`.claude/steering/dominio.md`](.claude/steering/dominio.md).

## Datos de partida

Del Excel salieron 328 productos, 16 categorías, 42 clientes y la estructura de
arqueo por denominación. Ver [`mock/README.md`](mock/README.md), que también
documenta lo que el Excel **no** tiene (precio de compra) y lo que quedó
pendiente de revisión (las deudas escritas a mano).

## Diseño

Prototipo en Claude Design:
[App minimarket](https://claude.ai/design/p/4b19f958-21e0-4894-b148-c1fb9fc13304).
Los tokens, layouts y textos de pantalla están transcritos en
[`.claude/steering/ui-ux.md`](.claude/steering/ui-ux.md), junto con las pantallas que
el prototipo todavía no cubre.
