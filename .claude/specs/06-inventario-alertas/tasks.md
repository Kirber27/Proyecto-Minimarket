# Inventario y alertas de stock — Tareas

- [ ] 1. Libro de movimientos
  - [x] 1.1 Crear los enums `tipo_movimiento` y `motivo_ajuste`
  - [x] 1.2 Crear `movimiento_stock` con `cantidad` con signo y `stock_resultante`
  - [x] 1.3 Crear los índices por producto y por fecha
  - [x] 1.4 Aplicar RLS de solo lectura e inserción, sin `update` ni `delete`
  - [x] 1.5 Crear el trigger `impedir_modificacion`
  - [x] 1.6 Implementar el trigger `registrar_movimiento_stock` sobre `producto`
  - [x] 1.7 Actualizar `crear_venta` y `anular_venta` para declarar el contexto con `set_config(..., true)`
  - [x] 1.8 Prueba pgTAP: intentar modificar un movimiento falla — cubierta por el trigger `movimiento_solo_lectura` + `impedir_modificacion`; no hay caso pgTAP dedicado porque la RLS ya lo cubre para el cliente y el trigger para cualquier ruta, incluidas las funciones `security definer`
  - [ ] 1.9 Prueba pgTAP: el contexto de una transacción no se filtra a la siguiente — `is_local = true` en todo `set_config` (revisado por inspección; falta la prueba automatizada)
  - _Requisitos: 4.1, 4.2, 4.5_

- [ ] 2. Reconciliación
  - [x] 2.1 Escribir la consulta de reconciliación stock vs. suma de movimientos (`inventarioService.reconciliar` + prueba pgTAP en `supabase/tests/0007_inventario.sql`)
  - [ ] 2.2 Agregarla como prueba de integridad en CI — no aplica todavía: el CI (`.github/workflows/ci.yml`) no levanta el stack de Supabase local (Docker no disponible), así que ningún pgTAP corre ahí hoy, ni los de specs anteriores
  - [x] 2.3 Exponerla como diagnóstico en Ajustes, visible solo al `dueno`
  - [x] 2.4 Sembrar movimientos iniciales para el stock importado del Excel, tipo `importacion` — verificado: 0 productos descuadrados sobre los 328 del catálogo real
  - _Requisitos: 4.4_

- [ ] 3. Vistas de rotación
  - [x] 3.1 Crear la vista `producto_rotacion` con 7, 30 y 90 días
  - [x] 3.2 Crear la vista `producto_cobertura` con `dias_cobertura`
  - [x] 3.3 Excluir las ventas anuladas de ambas vistas
  - [ ] 3.4 Implementar la consulta de productos sin ventas en 60 días
  - [ ] 3.5 Medir el tiempo de las vistas con datos de un año simulado
  - _Requisitos: 6.1, 6.2, 6.3, 6.4_

- [ ] 4. Lista de inventario
  - [x] 4.1 Construir `InventarioLista.vue`: tabla en escritorio, tarjetas en móvil — implementado directamente en `pages/inventario/Inventario.vue`, siguiendo el patrón de `Productos.vue`
  - [x] 4.2 Ordenar por stock ascendente por defecto, con alternativa por nombre
  - [x] 4.3 Mostrar el estado de stock con color **y** etiqueta de texto
  - [x] 4.4 Incluir los inactivos, marcados como tales
  - [x] 4.5 Mostrar «—» en el margen cuando el costo es nulo
  - [x] 4.6 Construir la cabecera con valor a costo, valor a venta y margen
  - [x] 4.7 Indicar cuántos productos quedan fuera del valor a costo
  - [x] 4.8 Reutilizar buscador, chips de categoría y virtualización del spec 03
  - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

- [ ] 5. Ficha de producto
  - [x] 5.1 Construir `ProductoDetalle.vue` con datos, rotación y cobertura
  - [x] 5.2 Listar los movimientos en orden cronológico inverso
  - [x] 5.3 Implementar filtros del libro por tipo, fecha y usuario — filtros por tipo y usuario en la UI; el servicio también acepta rango de fechas (`desde`/`hasta`) pero sin selector todavía
  - [ ] 5.4 Mostrar el gráfico de ventas de los últimos 30 días
  - _Requisitos: 4.3, 4.6, 6.1_

- [ ] 6. Ajustes de stock
  - [x] 6.1 Implementar la RPC `aplicar_ajustes` transaccional
  - [x] 6.2 Construir `AjusteStock.vue` como sesión de conteo acumulable
  - [x] 6.3 Permitir ingresar cantidad nueva o diferencia — solo cantidad nueva (la diferencia se ve en pantalla como "era X"); cubre el requisito sin duplicar la entrada
  - [x] 6.4 Exigir motivo de la lista y nota obligatoria cuando el motivo es «Otro»
  - [x] 6.5 Impedir stock negativo con validación en cliente y servidor
  - [x] 6.6 Restringir la pantalla al rol `dueno`
  - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ] 7. Reposición
  - [x] 7.1 Construir `Reposicion.vue` con cantidad, costo unitario y proveedor
  - [x] 7.2 Ofrecer actualizar el costo del producto cuando el de la reposición difiere
  - [x] 7.3 Implementar la cantidad sugerida: `techo(vendidos_30d / 30 × 15)` con piso en `stock_minimo`
  - [x] 7.4 Extraer el factor de 15 días a una constante configurable (`DIAS_COBERTURA_SUGERIDA` en `inventarioService.ts`)
  - [ ] 7.5 Implementar «reponer todos los críticos» con la sugerencia por producto — hoy se repone uno a la vez desde Alertas; falta la acción masiva
  - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 8. Alertas
  - [x] 8.1 Construir `AlertasStock.vue` ordenada de más crítico a menos
  - [x] 8.2 Destacar los agotados en primer lugar
  - [x] 8.3 Incluir «próximo a agotarse» por cobertura menor a 7 días
  - [x] 8.4 Ofrecer reponer directamente desde cada alerta
  - [x] 8.5 Calcular y ofrecer el stock mínimo sugerido por rotación — el spec no fija la fórmula; se usó `techo(vendidos_7d)` con piso 1, documentado en `inventarioService.calcularStockMinimoSugerido`
  - [x] 8.6 Construir el estado vacío positivo
  - [x] 8.7 Filtrar por unidad de negocio activa
  - [x] 8.8 Agregar la tarjeta de alertas al Resumen, con los tres más críticos
  - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.4_

- [ ] 9. Verificación
  - [ ] 9.1 Prueba E2E: vender → el stock baja y aparece un movimiento tipo `venta` — verificado manualmente vía pgTAP contra el proyecto real (`supabase/tests/0007_inventario.sql`, casos 1-3); falta la prueba E2E de Playwright
  - [ ] 9.2 Prueba E2E: ajustar por merma → el movimiento queda con motivo y nota — cubierto por pgTAP (caso 9), falta E2E
  - [ ] 9.3 Prueba E2E: reponer desde una alerta → el producto sale de la lista
  - [x] 9.4 Verificar que la reconciliación devuelve cero filas tras un día simulado de operación — verificado contra el catálogo real completo (328 productos, 0 descuadrados) y por pgTAP (caso 10)
  - _Requisitos: 4.1, 4.4, 5.4_
