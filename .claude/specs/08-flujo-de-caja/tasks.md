# Flujo de caja — Tareas

- [ ] 1. Esquema de egresos
  - [ ] 1.1 Crear el enum `categoria_egreso` con las seis categorías
  - [ ] 1.2 Crear la tabla `egreso` con `tasa_aplicada`, `referencia` y anulación
  - [ ] 1.3 Crear el índice por fecha filtrando anulados
  - [ ] 1.4 Aplicar la política que impide a `mostrador` registrar Retiro y Sueldos
  - [ ] 1.5 Prueba pgTAP: un `mostrador` no puede insertar un egreso de categoría Retiro
  - _Requisitos: 2.1, 2.2, 2.5, 2.7, 2.8_

- [ ] 2. Vista de movimientos
  - [ ] 2.1 Crear la vista `movimiento_caja` uniendo pagos de venta, abonos y egresos
  - [ ] 2.2 Excluir el método `credito` de los ingresos
  - [ ] 2.3 Excluir ventas, abonos y egresos anulados
  - [ ] 2.4 Generar una fila por método de pago, no por venta
  - [ ] 2.5 Prueba pgTAP: una venta con pago mixto produce dos movimientos
  - [ ] 2.6 Prueba pgTAP: una venta a fiado no produce ningún movimiento de caja
  - _Requisitos: 1.1, 1.2, 1.3, 1.6, 4.1_

- [ ] 3. Saldo
  - [ ] 3.1 Implementar la función `saldo_caja` agrupada por método
  - [ ] 3.2 Implementar la separación entre efectivo y dinero electrónico usando `afecta_arqueo`
  - [ ] 3.3 Calcular el saldo por unidad de negocio y el consolidado
  - [ ] 3.4 Prueba pgTAP: el saldo de cierre de un día es el saldo inicial del siguiente
  - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 4. Pantalla de caja
  - [ ] 4.1 Construir `CajaDia.vue` con tarjetas de saldo, desglose y lista
  - [ ] 4.2 Listar los movimientos en orden cronológico inverso
  - [ ] 4.3 Mostrar signo `+` / `−` además del color
  - [ ] 4.4 Mostrar hora, concepto, método, categoría y monto en ambas monedas
  - [ ] 4.5 Enlazar cada movimiento a su documento origen
  - [ ] 4.6 Filtrar por unidad de negocio activa
  - [ ] 4.7 Construir el desglose por método con porcentajes
  - _Requisitos: 1.1, 1.4, 1.5, 1.7, 1.8, 4.1, 4.2, 4.3_

- [ ] 5. Registro de egresos
  - [ ] 5.1 Construir `EgresoFormulario.vue` con descripción, monto, categoría y método
  - [ ] 5.2 Validar campos obligatorios con el mensaje exacto del requisito 2.3
  - [ ] 5.3 Permitir ingresar el monto en Bs. o en USD
  - [ ] 5.4 Guardar la tasa aplicada
  - [ ] 5.5 Agregar el campo de referencia o número de factura
  - [ ] 5.6 Ocultar Retiro y Sueldos para el rol `mostrador`
  - [ ] 5.7 Implementar la anulación de egresos con motivo
  - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [ ] 6. Pantalla de resumen
  - [ ] 6.1 Implementar la RPC `resumen_dia` devolviendo todo en un solo `jsonb`
  - [ ] 6.2 Construir `Resumen.vue` con vendido, ventas, ticket promedio, egresos y saldo
  - [ ] 6.3 Construir el gráfico de barras de 7 días con el día actual en color de acento
  - [ ] 6.4 Mostrar la comparación con el mismo día de la semana anterior
  - [ ] 6.5 Mostrar el conteo de productos en alerta, enlazando a Alertas
  - [ ] 6.6 Mostrar el total por cobrar, enlazando a Deudas
  - [ ] 6.7 Mostrar el contador de deudas pendientes de revisión
  - [ ] 6.8 Aplicar el modo «ocultar montos» a todas las cifras
  - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 7. Historial
  - [ ] 7.1 Construir `CajaHistorial.vue` con navegación por fecha
  - [ ] 7.2 Implementar la consulta por rango de fechas
  - [ ] 7.3 Mostrar totales de ingresos, egresos y resultado del rango
  - [ ] 7.4 Implementar la exportación a CSV con ambas monedas y la tasa de cada movimiento
  - [ ] 7.5 Permitir consultar el desglose por método de cualquier día pasado
  - _Requisitos: 4.4, 6.1, 6.2, 6.3, 6.4_

- [ ] 8. Verificación
  - [ ] 8.1 Prueba E2E: venta con pago mixto aparece como dos movimientos con los montos correctos
  - [ ] 8.2 Prueba E2E: anular una venta la retira del flujo de caja
  - [ ] 8.3 Prueba E2E: un abono de deuda aparece como ingreso del día
  - [ ] 8.4 Verificar que el saldo de efectivo coincide con lo que el spec 09 espera contar
  - _Requisitos: 1.2, 1.6, 3.4_
