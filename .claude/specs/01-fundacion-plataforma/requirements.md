# Fundación de la plataforma — Requisitos

## Introducción

Levanta el esqueleto sobre el que se construye todo lo demás: proyecto Vite +
Vue 3 + TypeScript, sistema de estilos con Bootstrap y SCSS, los dos layouts
(móvil y escritorio), el enrutador, el cliente de Supabase, la aritmética de
dinero y el andamiaje de pruebas.

Ninguna funcionalidad de negocio entra aquí. El criterio de terminado es que un
desarrollador pueda clonar, instalar, levantar y ver una pantalla vacía con la
navegación correcta en ambas superficies.

## Requisito 1 — Proyecto ejecutable

**Historia:** Como desarrollador quiero clonar el repositorio y levantarlo con
dos comandos, para empezar a trabajar sin configuración manual.

Criterios de aceptación:

1. CUANDO se ejecuta `npm install && npm run dev` en un clon limpio, ENTONCES el
   sistema DEBE servir la aplicación en `localhost` sin errores de consola.
2. CUANDO se ejecuta `npm run build`, ENTONCES el sistema DEBE producir un build
   de producción sin advertencias de TypeScript.
3. El proyecto DEBE usar TypeScript en modo `strict`.
4. CUANDO un archivo importa desde `@/`, ENTONCES el alias DEBE resolver a
   `src/` tanto en Vite como en `tsc` y en Vitest.
5. CUANDO se ejecuta `npm run lint`, ENTONCES ESLint y Prettier DEBEN correr sin
   errores sobre todo `src/`.

## Requisito 2 — Sistema de estilos

**Historia:** Como desarrollador quiero que Bootstrap herede la paleta del
diseño, para no pelear con sus colores por defecto en cada componente.

1. Bootstrap DEBE importarse desde SCSS, con las variables propias definidas
   ANTES del `@import` de Bootstrap.
2. El sistema DEBE definir todos los tokens de
   [ui-ux.md](../../steering/ui-ux.md) en `src/assets/scss/_variables.scss`.
3. El sistema NO DEBE incluir el bundle JavaScript de Bootstrap.
4. La fuente Inter DEBE servirse desde `public/fonts/`; el sistema NO DEBE hacer
   peticiones a dominios externos para tipografía.
5. CUANDO se compila el CSS, ENTONCES DEBE incluir solo los módulos de Bootstrap
   en uso (reboot, grid, utilities, forms, buttons), no la hoja completa.

## Requisito 3 — Layouts y navegación

**Historia:** Como usuario quiero una navegación adaptada a mi pantalla, para
alcanzar lo que necesito sin buscar.

1. CUANDO el ancho de la ventana es menor a 768 px, ENTONCES el sistema DEBE
   renderizar `LayoutMovil` con la barra inferior de cinco destinos.
2. CUANDO el ancho es 768 px o mayor, ENTONCES el sistema DEBE renderizar
   `LayoutEscritorio` con la barra lateral completa.
3. CUANDO el usuario redimensiona la ventana cruzando el corte de 768 px,
   ENTONCES el sistema DEBE cambiar de layout SIN perder el estado de la página
   ni la ruta actual.
4. CUANDO una ruta está activa, ENTONCES el elemento de navegación
   correspondiente DEBE marcarse visualmente y con `aria-current="page"`.
5. Cada página DEBE recibir su título y subtítulo desde la definición de la ruta,
   usando los textos de [ui-ux.md](../../steering/ui-ux.md).
6. Las rutas de administración DEBEN cargarse con `import()` diferido.

## Requisito 4 — Aritmética de dinero

**Historia:** Como dueño quiero que los totales cuadren al céntimo, porque de eso
depende que la caja cierre.

1. El sistema DEBE representar internamente los montos USD como enteros de
   céntimos.
2. CUANDO se suma una lista de montos, ENTONCES el sistema DEBE redondear una
   sola vez al final, no en cada término.
3. CUANDO se convierte USD a Bs., ENTONCES el sistema DEBE multiplicar por la
   tasa y redondear a entero.
4. CUANDO se formatea un monto USD, ENTONCES el sistema DEBE producir
   `$1,57` (locale `es-VE`, dos decimales).
5. CUANDO se formatea un monto Bs., ENTONCES el sistema DEBE producir
   `1.256 Bs.` (sin decimales, separador de miles con punto).
6. El sistema NO DEBE exponer ninguna función que haga aritmética de dinero fuera
   de `src/lib/money.ts`.

## Requisito 5 — Cliente de Supabase y tipos

**Historia:** Como desarrollador quiero un único punto de acceso a la base, para
que cambiar credenciales o interceptar peticiones sea un cambio en un archivo.

1. El sistema DEBE exportar una única instancia del cliente desde
   `src/lib/supabase.ts`.
2. Las credenciales DEBEN leerse de variables `VITE_SUPABASE_*`; el sistema NO
   DEBE contener claves en el código fuente.
3. CUANDO falta una variable de entorno requerida, ENTONCES el sistema DEBE
   fallar al arrancar con un mensaje que nombre la variable ausente.
4. El repositorio DEBE incluir `.env.example` con todas las variables y sin
   valores reales.
5. Los tipos de la base DEBEN generarse a `src/types/database.ts` mediante
   `npm run types`; el archivo DEBE estar marcado como generado.

## Requisito 6 — Base de datos local y pruebas

1. `npx supabase start` DEBE levantar un Postgres local con las migraciones
   aplicadas.
2. `npx supabase db reset` DEBE recrear la base y cargar el seed desde `mock/`.
3. `npm run test` DEBE ejecutar Vitest con al menos las pruebas de
   `src/lib/money.ts` en verde.
4. `npm run test:e2e` DEBE ejecutar Playwright contra el build de preview.
