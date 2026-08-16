# Inventario y alertas de stock — Tareas

- [ ] 1. Libro de movimientos
  - [ ] 1.1 Crear los enums `tipo_movimiento` y `motivo_ajuste`
  - [ ] 1.2 Crear `movimiento_stock` con `cantidad` con signo y `stock_resultante`
  - [ ] 1.3 Crear los índices por producto y por fecha
  - [ ] 1.4 Aplicar RLS de solo lectura e inserción, sin `update` ni `delete`
  - [ ] 1.5 Crear el trigger `impedir_modificacion`
  - [ ] 1.6 Implementar el trigger `registrar_movimiento_stock` sobre `producto`
  - [ ] 1.7 Actualizar `crear_venta` y `anular_venta` para declarar el contexto con `set_config(..., true)`
  - [ ] 1.8 Prueba pgTAP: intentar modificar un movimiento falla
  - [ ] 1.9 Prueba pgTAP: el contexto de una transacción no se filtra a la siguiente
  - _Requisitos: 4.1, 4.2, 4.5_

- [ ] 2. Reconciliación
  - [ ] 2.1 Escribir la consulta de reconciliación stock vs. suma de movimientos
  - [ ] 2.2 Agregarla como prueba de integridad en CI
  - [ ] 2.3 Exponerla como diagnóstico en Ajustes, visible solo al `dueno`
  - [ ] 2.4 Sembrar movimientos iniciales para el stock importado del Excel, tipo `importacion`
  - _Requisitos: 4.4_

- [ ] 3. Vistas de rotación
  - [ ] 3.1 Crear la vista `producto_rotacion` con 7, 30 y 90 días
  - [ ] 3.2 Crear la vista `producto_cobertura` con `dias_cobertura`
  - [ ] 3.3 Excluir las ventas anuladas de ambas vistas
  - [ ] 3.4 Implementar la consulta de productos sin ventas en 60 días
  - [ ] 3.5 Medir el tiempo de las vistas con datos de un año simulado
  - _Requisitos: 6.1, 6.2, 6.3, 6.4_

- [ ] 4. Lista de inventario
  - [ ] 4.1 Construir `InventarioLista.vue`: tabla en escritorio, tarjetas en móvil
  - [ ] 4.2 Ordenar por stock ascendente por defecto, con alternativa por nombre
  - [ ] 4.3 Mostrar el estado de stock con color **y** etiqueta de texto
  - [ ] 4.4 Incluir los inactivos, marcados como tales
  - [ ] 4.5 Mostrar «—» en el margen cuando el costo es nulo
  - [ ] 4.6 Construir la cabecera con valor a costo, valor a venta y margen
  - [ ] 4.7 Indicar cuántos productos quedan fuera del valor a costo
  - [ ] 4.8 Reutilizar buscador, chips de categoría y virtualización del spec 03
  - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

- [ ] 5. Ficha de producto
  - [ ] 5.1 Construir `ProductoDetalle.vue` con datos, rotación y cobertura
  - [ ] 5.2 Listar los movimientos en orden cronológico inverso
  - [ ] 5.3 Implementar filtros del libro por tipo, fecha y usuario
  - [ ] 5.4 Mostrar el gráfico de ventas de los últimos 30 días
  - _Requisitos: 4.3, 4.6, 6.1_

- [ ] 6. Ajustes de stock
  - [ ] 6.1 Implementar la RPC `aplicar_ajustes` transaccional
  - [ ] 6.2 Construir `AjusteStock.vue` como sesión de conteo acumulable
  - [ ] 6.3 Permitir ingresar cantidad nueva o diferencia
  - [ ] 6.4 Exigir motivo de la lista y nota obligatoria cuando el motivo es «Otro»
  - [ ] 6.5 Impedir stock negativo con validación en cliente y servidor
  - [ ] 6.6 Restringir la pantalla al rol `dueno`
  - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ] 7. Reposición
  - [ ] 7.1 Construir `Reposicion.vue` con cantidad, costo unitario y proveedor
  - [ ] 7.2 Ofrecer actualizar el costo del producto cuando el de la reposición difiere
  - [ ] 7.3 Implementar la cantidad sugerida: `techo(vendidos_30d / 30 × 15)` con piso en `stock_minimo`
  - [ ] 7.4 Extraer el factor de 15 días a una constante configurable
  - [ ] 7.5 Implementar «reponer todos los críticos» con la sugerencia por producto
  - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 8. Alertas
  - [ ] 8.1 Construir `AlertasStock.vue` ordenada de más crítico a menos
  - [ ] 8.2 Destacar los agotados en primer lugar
  - [ ] 8.3 Incluir «próximo a agotarse» por cobertura menor a 7 días
  - [ ] 8.4 Ofrecer reponer directamente desde cada alerta
  - [ ] 8.5 Calcular y ofrecer el stock mínimo sugerido por rotación
  - [ ] 8.6 Construir el estado vacío positivo
  - [ ] 8.7 Filtrar por unidad de negocio activa
  - [ ] 8.8 Agregar la tarjeta de alertas al Resumen, con los tres más críticos
  - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.4_

- [ ] 9. Verificación
  - [ ] 9.1 Prueba E2E: vender → el stock baja y aparece un movimiento tipo `venta`
  - [ ] 9.2 Prueba E2E: ajustar por merma → el movimiento queda con motivo y nota
  - [ ] 9.3 Prueba E2E: reponer desde una alerta → el producto sale de la lista
  - [ ] 9.4 Verificar que la reconciliación devuelve cero filas tras un día simulado de operación
  - _Requisitos: 4.1, 4.4, 5.4_
