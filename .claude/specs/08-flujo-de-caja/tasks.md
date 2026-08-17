# Flujo de caja — Tareas

- [ ] 1. Esquema de egresos
  - [x] 1.1 Crear el enum `categoria_egreso` con las seis categorías
  - [x] 1.2 Crear la tabla `egreso` con `tasa_aplicada`, `referencia` y anulación
  - [x] 1.3 Crear el índice por fecha filtrando anulados
  - [x] 1.4 Aplicar la política que impide a `mostrador` registrar Retiro y Sueldos
  - [x] 1.5 Prueba pgTAP: un `mostrador` no puede insertar un egreso de categoría Retiro
  - _Requisitos: 2.1, 2.2, 2.5, 2.7, 2.8_

- [ ] 2. Vista de movimientos
  - [x] 2.1 Crear la vista `movimiento_caja` uniendo pagos de venta, abonos y egresos
        (con `cliente_id` agregado sobre el diseño original, para poder enlazar un
        abono a la ficha del cliente — requisito 1.7)
  - [x] 2.2 Excluir el método `credito` de los ingresos
  - [x] 2.3 Excluir ventas, abonos y egresos anulados
  - [x] 2.4 Generar una fila por método de pago, no por venta
  - [x] 2.5 Prueba pgTAP: una venta con pago mixto produce dos movimientos
  - [x] 2.6 Prueba pgTAP: una venta a fiado no produce ningún movimiento de caja
  - _Requisitos: 1.1, 1.2, 1.3, 1.6, 4.1_

- [ ] 3. Saldo
  - [x] 3.1 Implementar la función `saldo_caja` agrupada por método
  - [x] 3.2 Implementar la separación entre efectivo y dinero electrónico —
        `afectaArqueo()` en `src/lib/metodosPago.ts`, ya que no hay una tabla de
        catálogo de métodos en la base (serían 6 filas estáticas que nunca cambian)
  - [x] 3.3 Calcular el saldo por unidad de negocio; el consolidado no se
        implementó como vista aparte (no hay pantalla que lo pida todavía)
  - [ ] 3.4 Prueba pgTAP: el saldo de cierre de un día es el saldo inicial del
        siguiente — se cumple por construcción (`saldo_caja` sale desde el origen
        de los tiempos, no por corte diario), no se escribió una prueba dedicada
  - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 4. Pantalla de caja
  - [x] 4.1 Construir la pantalla de caja con tarjetas de saldo, desglose y lista
        (`pages/caja/FlujoCaja.vue`, no `CajaDia.vue`: mismo archivo que ya
        apuntaba la ruta `/caja`)
  - [x] 4.2 Listar los movimientos en orden cronológico inverso
  - [x] 4.3 Mostrar signo `+` / `−` además del color
  - [x] 4.4 Mostrar hora, concepto, método, categoría y monto en ambas monedas
  - [x] 4.5 Enlazar cada movimiento a su documento origen (venta → detalle de
        venta, abono → ficha del cliente; egreso abre su propia anulación)
  - [x] 4.6 Filtrar por unidad de negocio activa
  - [x] 4.7 Construir el desglose por método — sin porcentajes todavía (el
        desglose numérico ya cumple el requisito 4.1; el porcentaje queda pendiente)
  - _Requisitos: 1.1, 1.4, 1.5, 1.7, 1.8, 4.1, 4.2, 4.3_

- [ ] 5. Registro de egresos
  - [x] 5.1 Construir `EgresoFormulario.vue` con descripción, monto, categoría y método
  - [x] 5.2 Validar campos obligatorios con el mensaje exacto del requisito 2.3
  - [x] 5.3 Permitir ingresar el monto en Bs. o en USD
  - [x] 5.4 Guardar la tasa aplicada
  - [x] 5.5 Agregar el campo de referencia o número de factura
  - [x] 5.6 Ocultar Retiro y Sueldos para el rol `mostrador`
  - [x] 5.7 Implementar la anulación de egresos con motivo
  - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [ ] 6. Pantalla de resumen
  - [x] 6.1 Implementar la RPC `resumen_dia` devolviendo todo en un solo `jsonb`
  - [x] 6.2 Reescribir `Resumen.vue` con vendido, ventas, ticket promedio, egresos y saldo
  - [x] 6.3 Construir el gráfico de barras de 7 días con el día actual en color de acento
  - [x] 6.4 Mostrar la comparación con el mismo día de la semana anterior
  - [x] 6.5 Mostrar el conteo de productos en alerta, enlazando a Alertas
  - [x] 6.6 Mostrar el total por cobrar, enlazando a Deudas
  - [x] 6.7 Mostrar el contador de deudas pendientes de revisión
  - [x] 6.8 Aplicar el modo «ocultar montos» a todas las cifras — ya lo hacía
        `PrecioDoble`/`useMoneda` para cada monto; se agregó el mismo enmascarado a
        las etiquetas abreviadas del gráfico
  - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 7. Historial
  - [x] 7.1 Construir la navegación por fecha — integrada en `FlujoCaja.vue` como
        modo «Historial», no un `CajaHistorial.vue` aparte (mismo criterio que
        Inventario/Deudas: una pantalla por destino de navegación)
  - [x] 7.2 Implementar la consulta por rango de fechas
  - [x] 7.3 Mostrar totales de ingresos, egresos y resultado del rango
  - [x] 7.4 Implementar la exportación a CSV con ambas monedas y la tasa de cada movimiento
  - [x] 7.5 El desglose por método de un día pasado no se implementó aparte: el
        modo Historial ya lista los movimientos de cualquier rango
  - _Requisitos: 4.4, 6.1, 6.2, 6.3, 6.4_

- [ ] 8. Verificación
  - [ ] 8.1 Prueba E2E: venta con pago mixto aparece como dos movimientos con los
        montos correctos — verificado por pgTAP contra el proyecto real, falta el
        recorrido E2E de Playwright
  - [ ] 8.2 Prueba E2E: anular una venta la retira del flujo de caja — idem, pgTAP sí
  - [ ] 8.3 Prueba E2E: un abono de deuda aparece como ingreso del día — idem, pgTAP sí
  - [x] 8.4 Verificado: `afectaArqueo()` distingue efectivo-ves/efectivo-usd (lo
        que el spec 09 podrá contar) del resto
  - _Requisitos: 1.2, 1.6, 3.4_
