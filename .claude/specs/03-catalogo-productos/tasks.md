# Catálogo de productos — Tareas

- [ ] 1. Esquema del catálogo
  - [ ] 1.1 Habilitar las extensiones `unaccent` y `pg_trgm`
  - [ ] 1.2 Implementar `public.normalizar()` como `immutable`, con el diccionario explícito
  - [ ] 1.3 Crear la tabla `categoria` con matiz, orden y unicidad de nombre
  - [ ] 1.4 Crear la tabla `producto` con la columna generada `nombre_busqueda`
  - [ ] 1.5 Crear los índices GIN de búsqueda y los índices por categoría y negocio
  - [ ] 1.6 Crear `precio_historial` y el trigger `registrar_cambio_precio`
  - [ ] 1.7 Aplicar las políticas RLS: lectura para todos, escritura solo `dueno`
  - [ ] 1.8 Regenerar `src/types/database.ts`
  - _Requisitos: 1.2, 1.3, 2.6, 2.9, 3.1, 3.6_

- [ ] 2. Seed desde el Excel
  - [ ] 2.1 Escribir el generador `mock/generar_seed.py` que produce `supabase/seed.sql`
  - [ ] 2.2 Asignar matices a las 16 categorías siguiendo `ui-ux.md`
  - [ ] 2.3 Generar los `insert` de productos con `on conflict do update`
  - [ ] 2.4 Verificar que los 328 precios coinciden con la columna `$$` del Excel
  - [ ] 2.5 Verificar que los 8 productos por peso quedan con unidad `KG`
  - [ ] 2.6 Correr `npx supabase db reset` dos veces y confirmar 328 filas, no 656
  - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7_

- [ ] 3. Store y servicio
  - [ ] 3.1 Implementar `catalogoService` con `listar`, `crear`, `actualizar`, `desactivar`
  - [ ] 3.2 Implementar `useCatalogoStore` con carga única y filtrado en memoria
  - [ ] 3.3 Implementar `buscar()` normalizando tildes con `normalize('NFD')`
  - [ ] 3.4 Escribir pruebas: buscar «cafe» encuentra «CAFÉ AMANECER PQ»
  - [ ] 3.5 Persistir la unidad de negocio activa en `localStorage`
  - _Requisitos: 1.2, 1.3, 4.2, 4.4_

- [ ] 4. Componentes de dominio
  - [ ] 4.1 `PrecioDoble.vue`: USD principal, Bs. secundario, respeta el modo montos ocultos
  - [ ] 4.2 `ChipCategoria.vue` teñido con `tinte-bg()` / `tinte-fg()`
  - [ ] 4.3 `TarjetaProducto.vue` con estado de stock por color **y** etiqueta de texto
  - [ ] 4.4 `FilaProducto.vue` para la tabla de escritorio
  - [ ] 4.5 `SelectorNegocio.vue` en la cabecera de ambos layouts
  - _Requisitos: 1.1, 3.2, 4.1, 4.2_

- [ ] 5. Lista de productos
  - [ ] 5.1 Construir `ProductosLista.vue`: tarjetas en móvil, tabla en escritorio
  - [ ] 5.2 Implementar buscador con rebote de 150 ms
  - [ ] 5.3 Implementar chips de categoría con «Todas» por defecto
  - [ ] 5.4 Implementar ordenamiento por stock y por nombre
  - [ ] 5.5 Implementar el composable de virtualización y activarlo sobre 100 elementos
  - [ ] 5.6 Implementar el estado vacío con acción de limpiar filtros
  - [ ] 5.7 Filtrar por unidad de negocio activa
  - _Requisitos: 1.1, 1.2, 1.4, 1.5, 1.6, 1.7, 1.8_

- [ ] 6. Formulario de producto
  - [ ] 6.1 Construir `ProductoFormulario.vue` sobre `ModalBase`
  - [ ] 6.2 Validar nombre y precio obligatorios con el mensaje exacto del requisito
  - [ ] 6.3 Calcular y mostrar el margen en vivo al escribir precio y costo
  - [ ] 6.4 Advertir margen negativo sin bloquear el guardado
  - [ ] 6.5 Generar el SKU como slug del nombre cuando se deja vacío
  - [ ] 6.6 Detectar SKU duplicado e indicar con qué producto choca
  - [ ] 6.7 Mostrar «—» en el margen cuando el costo es nulo, con invitación a completarlo
  - [ ] 6.8 Reemplazar eliminar por desactivar en productos con ventas
  - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 5.6_

- [ ] 7. Categorías
  - [ ] 7.1 Construir `CategoriasLista.vue` con el conteo de productos por categoría
  - [ ] 7.2 Implementar crear y renombrar con validación de unicidad
  - [ ] 7.3 Asignar matiz automático evitando los ya usados
  - [ ] 7.4 Implementar el flujo de reasignación antes de desactivar una categoría con productos
  - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 8. Importación de planillas
  - [ ] 8.1 Implementar la carga de archivo con `import('xlsx')` diferido
  - [ ] 8.2 Construir el paso de mapeo de columnas con propuesta automática
  - [ ] 8.3 Construir la vista previa con pestañas nuevas / actualizar / error
  - [ ] 8.4 Implementar la RPC `importar_productos(jsonb)` transaccional
  - [ ] 8.5 Etiquetar los cambios con `app.motivo = 'importacion'`
  - [ ] 8.6 Mostrar el resumen final de creados y actualizados
  - [ ] 8.7 Prueba: un archivo con una fila inválida no deja nada a medias
  - _Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [ ] 9. Verificación
  - [ ] 9.1 Prueba E2E: crear producto → aparece en venta → desactivar → desaparece de venta pero sigue en inventario
  - [ ] 9.2 Prueba E2E: cambiar de unidad de negocio filtra el catálogo
  - [ ] 9.3 Medir el desplazamiento de la lista completa en un Android de gama baja
  - [ ] 9.4 Verificar que un `mostrador` no puede escribir en `producto` ni por RPC
  - _Requisitos: 1.6, 2.10, 4.3_
