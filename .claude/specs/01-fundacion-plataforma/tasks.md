# Fundación de la plataforma — Tareas

- [ ] 1. Crear el proyecto base
  - [ ] 1.1 Inicializar Vite + Vue 3 + TypeScript en la raíz del repositorio
  - [ ] 1.2 Configurar `tsconfig` en modo `strict` con el alias `@/` → `src/`
  - [ ] 1.3 Replicar el alias en `vite.config.ts` y `vitest.config.ts`
  - [ ] 1.4 Configurar ESLint flat config + Prettier y el script `npm run lint`
  - [ ] 1.5 Agregar `.gitignore`, `.editorconfig` y `.nvmrc`
  - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 2. Montar el sistema de estilos
  - [ ] 2.1 Escribir `_variables.scss` con todos los tokens de `ui-ux.md`
  - [ ] 2.2 Escribir `_mixins.scss` con `tinte-bg()`, `tinte-fg()` y el mixin de corte responsive
  - [ ] 2.3 Escribir `_bootstrap.scss` mapeando tokens e importando solo los módulos en uso
  - [ ] 2.4 Descargar el subset de Inter a `public/fonts/` y declarar `@font-face` con `font-display: swap`
  - [ ] 2.5 Verificar en el build que no hay peticiones a dominios externos
  - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 3. Implementar la aritmética de dinero
  - [ ] 3.1 Escribir las pruebas de `money.ts` con la tabla de casos del diseño **antes** de la implementación
  - [ ] 3.2 Implementar `aCentavos`, `aUsd`, `sumar`, `multiplicar`
  - [ ] 3.3 Implementar `aBolivares` con redondeo único a entero
  - [ ] 3.4 Implementar `formatearUsd` y `formatearBs` con locale `es-VE`
  - [ ] 3.5 Confirmar 100 % de cobertura sobre el módulo
  - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 4. Conectar Supabase
  - [ ] 4.1 Crear el proyecto en Supabase y anotar URL y clave `anon`
  - [ ] 4.2 Escribir `src/lib/supabase.ts` con la validación de variables de entorno
  - [ ] 4.3 Crear `.env.example` sin valores reales y confirmar que `.env` está ignorado
  - [ ] 4.4 Inicializar `supabase/` local y escribir la migración `0001_base.sql`
  - [ ] 4.5 Configurar el script `npm run types` y generar `src/types/database.ts`
  - [ ] 4.6 Verificar que `npx supabase db reset` corre limpio
  - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2_

- [ ] 5. Construir layouts y navegación
  - [ ] 5.1 Implementar `useEsMovil` con `matchMedia`, con prueba unitaria
  - [ ] 5.2 Definir el enrutador con `meta.titulo`, `meta.subtitulo`, `navMovil` y `navEscritorio`
  - [ ] 5.3 Implementar `LayoutMovil` con barra inferior de cinco destinos y objetivos táctiles de 44 px
  - [ ] 5.4 Implementar `LayoutEscritorio` con barra lateral generada desde las rutas
  - [ ] 5.5 Implementar `LayoutAuth` (sin navegación) para las pantallas de acceso
  - [ ] 5.6 Marcar la ruta activa con estilo y `aria-current="page"`
  - [ ] 5.7 Envolver `RouterView` en `<KeepAlive include="VentaNueva">`
  - [ ] 5.8 Crear páginas vacías con su título para cada destino
  - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 6. Componentes de interfaz base
  - [ ] 6.1 `BotonPrimario` / `BotonSecundario` con estados cargando y deshabilitado
  - [ ] 6.2 `CampoTexto` y `CampoNumero` con etiqueta, error y `aria-describedby`
  - [ ] 6.3 `ModalBase` propio, con trampa de foco y cierre con `Escape`
  - [ ] 6.4 `ChipFiltro` para las barras de filtro por categoría
  - [ ] 6.5 `AvisoToast` con la duración de 2,2 s definida en `ui-ux.md`
  - [ ] 6.6 `EstadoVacio` con ranura para la acción de salida
  - _Requisitos: 2.2, 3.4_

- [ ] 7. Andamiaje de pruebas
  - [ ] 7.1 Configurar Vitest con entorno `happy-dom` y `@vue/test-utils`
  - [ ] 7.2 Configurar Playwright contra `npm run preview`
  - [ ] 7.3 Agregar `@axe-core/playwright` y una prueba de humo de accesibilidad
  - [ ] 7.4 Agregar el presupuesto de tamaño de bundle al script de build
  - [ ] 7.5 Configurar el workflow de CI: lint, test, build, e2e
  - _Requisitos: 6.3, 6.4_

- [ ] 8. Verificación de cierre
  - [ ] 8.1 Clonar en limpio y confirmar que `npm install && npm run dev` funciona
  - [ ] 8.2 Verificar el cambio de layout a 767 px y 768 px sin perder la ruta
  - [ ] 8.3 Confirmar que el chunk inicial está por debajo de 250 KB gzip
  - [ ] 8.4 Escribir el `README.md` con los pasos de puesta en marcha
  - _Requisitos: 1.1, 3.3_
