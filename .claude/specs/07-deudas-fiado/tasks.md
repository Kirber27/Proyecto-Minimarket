# Deudas y fiado — Tareas

- [ ] 1. Esquema
  - [ ] 1.1 Crear el enum `tipo_movimiento_deuda`
  - [ ] 1.2 Crear `cliente` con `nombre_busqueda` generada
  - [ ] 1.3 Crear `deuda_movimiento` con `check (monto_usd > 0)` y `tasa_aplicada`
  - [ ] 1.4 Crear `deuda_por_revisar` como tabla separada
  - [ ] 1.5 Crear los índices por cliente filtrando anulados
  - [ ] 1.6 Aplicar RLS: `mostrador` inserta deudas y abonos, solo `dueno` anula
  - _Requisitos: 1.1, 2.3, 2.4, 5.3_

- [ ] 2. Vista de saldo
  - [ ] 2.1 Crear la vista `cliente_saldo` con saldo por unidad de negocio
  - [ ] 2.2 Incluir `deuda_mas_antigua` y `ultimo_movimiento`
  - [ ] 2.3 Excluir los movimientos anulados
  - [ ] 2.4 Crear la vista consolidada de saldo por cliente sumando las tres unidades
  - [ ] 2.5 Prueba pgTAP: deuda + abono + anulación dan el saldo correcto
  - _Requisitos: 4.1, 4.5, 4.6_

- [ ] 3. Migración desde el Excel
  - [ ] 3.1 Sembrar los 42 clientes desde `mock/clientes.json` con su `origen`
  - [ ] 3.2 Sembrar los 13 registros con contenido en `deuda_por_revisar`
  - [ ] 3.3 Confirmar que `monto_sugerido` queda nulo en todos
  - [ ] 3.4 Verificar que el total por cobrar arranca en cero
  - _Requisitos: 5.1, 5.2, 5.3, 5.7_

- [ ] 4. Clientes
  - [ ] 4.1 Construir `ClientesLista.vue` ordenada por saldo descendente
  - [ ] 4.2 Implementar el formulario de cliente con nombre obligatorio
  - [ ] 4.3 Advertir nombre duplicado sin bloquear el guardado
  - [ ] 4.4 Reemplazar eliminar por desactivar en clientes con movimientos
  - [ ] 4.5 Implementar el buscador sin distinguir tildes
  - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [ ] 5. Registrar deudas
  - [ ] 5.1 Implementar la RPC `registrar_deuda` tomando la unidad de negocio de la venta
  - [ ] 5.2 Conectarla desde `crear_venta` cuando los pagos no cubren el total
  - [ ] 5.3 Construir el formulario de deuda manual sin venta asociada
  - [ ] 5.4 Revertir el movimiento de deuda al anular una venta a fiado
  - [ ] 5.5 Prueba pgTAP: venta a fiado → deuda creada → anulación → deuda revertida
  - _Requisitos: 2.1, 2.2, 2.3, 2.5_

- [ ] 6. Abonos
  - [ ] 6.1 Implementar la RPC `registrar_abono`
  - [ ] 6.2 Construir `AbonoFormulario.vue` con monto y método de pago
  - [ ] 6.3 Permitir ingresar el monto en Bs. o en USD
  - [ ] 6.4 Implementar el diálogo de abono mayor al saldo, con las dos opciones
  - [ ] 6.5 Mostrar la confirmación de deuda saldada al llegar a cero
  - [ ] 6.6 Implementar la anulación de abonos, restringida al rol `dueno`
  - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.6_

- [ ] 7. Estado de cuenta
  - [ ] 7.1 Construir `ClienteDetalle.vue` con los movimientos en orden inverso
  - [ ] 7.2 Calcular el saldo corrido recorriendo de más antiguo a más nuevo
  - [ ] 7.3 Mostrar el saldo en ambas monedas
  - [ ] 7.4 Enlazar cada movimiento de venta a su detalle
  - [ ] 7.5 Mostrar la antigüedad de la deuda más antigua
  - [ ] 7.6 Separar el saldo por unidad de negocio y mostrar el consolidado
  - _Requisitos: 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 8. Bandeja de revisión
  - [ ] 8.1 Construir `RevisionPendiente.vue` mostrando la nota original completa
  - [ ] 8.2 Dejar el campo de monto vacío, sin sugerencia
  - [ ] 8.3 Al confirmar, crear el movimiento de deuda y marcar el registro resuelto
  - [ ] 8.4 Implementar la acción de descartar
  - [ ] 8.5 Mostrar el contador de registros pendientes en Deudas y en el Resumen
  - [ ] 8.6 Verificar que los pendientes no afectan el total por cobrar
  - _Requisitos: 5.2, 5.4, 5.5, 5.6, 5.7, 5.8_

- [ ] 9. Cobranza
  - [ ] 9.1 Construir `DeudasResumen.vue` con el total por cobrar
  - [ ] 9.2 Listar los clientes con deuda de más de 30 días
  - [ ] 9.3 Generar el texto del estado de cuenta
  - [ ] 9.4 Implementar compartir con `navigator.share()` y respaldo a portapapeles
  - [ ] 9.5 Mostrar el saldo del cliente al seleccionarlo en la pantalla de venta
  - _Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 10. Verificación
  - [ ] 10.1 Prueba E2E: venta a fiado → abono parcial → saldo correcto
  - [ ] 10.2 Prueba E2E: confirmar un registro de la bandeja aparece en el total por cobrar
  - [ ] 10.3 Verificar que los abonos aparecen como ingreso en el flujo de caja
  - [ ] 10.4 Verificar que un `mostrador` no puede anular un abono
  - _Requisitos: 3.5, 3.6, 5.5_
