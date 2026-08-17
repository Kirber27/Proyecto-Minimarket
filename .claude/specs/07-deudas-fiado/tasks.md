# Deudas y fiado — Tareas

- [ ] 1. Esquema
  - [x] 1.1 Crear el enum `tipo_movimiento_deuda`
  - [x] 1.2 Crear `cliente` con `nombre_busqueda` generada
  - [x] 1.3 Crear `deuda_movimiento` con `check (monto_usd > 0)` y `tasa_aplicada`
  - [x] 1.4 Crear `deuda_por_revisar` como tabla separada
  - [x] 1.5 Crear los índices por cliente filtrando anulados
  - [x] 1.6 Aplicar RLS: cualquier usuario autenticado gestiona clientes (crear/editar,
        igual que ya podía vender) y registra deudas/abonos vía RPC; solo `dueno` anula
        abonos y resuelve la bandeja de revisión — verificado con pgTAP contra el
        proyecto real (`supabase/tests/0009_deudas.sql`)
  - _Requisitos: 1.1, 2.3, 2.4, 5.3_

- [ ] 2. Vista de saldo
  - [x] 2.1 Crear la vista `cliente_saldo` con saldo por unidad de negocio
  - [x] 2.2 Incluir `deuda_mas_antigua` y `ultimo_movimiento`
  - [x] 2.3 Excluir los movimientos anulados
  - [x] 2.4 Consolidado por cliente sumando las tres unidades — se calcula en
        `clienteService.listar()`, no como vista aparte (evita otra fuente de verdad
        para un cálculo trivial de sumar 3 filas)
  - [x] 2.5 Prueba pgTAP: deuda + abono + anulación dan el saldo correcto
  - _Requisitos: 4.1, 4.5, 4.6_

- [ ] 3. Migración desde el Excel
  - [x] 3.1 Sembrar los 42 clientes desde `mock/clientes.json` con su `origen`
  - [x] 3.2 Sembrar los 13 registros con contenido: 6 en `deuda_por_revisar` (texto
        libre) y 7 directo en `deuda_movimiento` (montos simples cuya columna de
        origen ya resuelve la moneda — ver la nota corregida en `mock/README.md` y
        en design.md)
  - [x] 3.3 Confirmar que `monto_sugerido` queda nulo en todos
  - [x] 3.4 Verificado contra el proyecto real: 42 clientes, 7 deudas confirmadas
        ($58,89), 6 pendientes de revisión, seed idempotente (reejecutado sin duplicar)
  - _Requisitos: 5.1, 5.2, 5.3, 5.7_

- [ ] 4. Clientes
  - [x] 4.1 Construir la lista de clientes ordenada por saldo descendente —
        integrada en `Deudas.vue` en vez de un `ClientesLista.vue` aparte, mismo
        criterio que Inventario.vue (cabecera + lista en una sola pantalla)
  - [x] 4.2 Implementar el formulario de cliente con nombre obligatorio
        (`ClienteFormulario.vue`)
  - [x] 4.3 Advertir nombre duplicado sin bloquear el guardado
  - [x] 4.4 Reemplazar eliminar por desactivar en clientes con movimientos
  - [x] 4.5 Implementar el buscador sin distinguir tildes
  - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [ ] 5. Registrar deudas
  - [x] 5.1 Implementar la RPC `registrar_deuda` tomando la unidad de negocio de la
        venta (ya existía desde el mini spec 07 del punto de venta)
  - [x] 5.2 Conectarla desde `crear_venta` cuando los pagos no cubren el total (idem)
  - [x] 5.3 Construir el formulario de deuda manual sin venta asociada — nueva RPC
        `registrar_deuda_manual` (0010_deuda_manual.sql): `registrar_deuda` exige un
        `venta_id` real y no sirve para este caso
  - [x] 5.4 Revertir el movimiento de deuda al anular una venta a fiado (ya existía)
  - [x] 5.5 Prueba pgTAP: venta a fiado → deuda creada → anulación → deuda revertida
        (ya existía en `supabase/tests/0006_ventas.sql`)
  - _Requisitos: 2.1, 2.2, 2.3, 2.5_

- [ ] 6. Abonos
  - [x] 6.1 Implementar la RPC `registrar_abono`
  - [x] 6.2 Construir `AbonoFormulario.vue` con monto y método de pago
  - [x] 6.3 Permitir ingresar el monto en Bs. o en USD
  - [x] 6.4 Implementar el diálogo de abono mayor al saldo, con las dos opciones
  - [x] 6.5 Mostrar la confirmación de deuda saldada al llegar a cero
  - [x] 6.6 Implementar la anulación de abonos, restringida al rol `dueno`
  - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.6_

- [ ] 7. Estado de cuenta
  - [x] 7.1 Construir `ClienteDetalle.vue` con los movimientos y saldo corrido
  - [x] 7.2 Calcular el saldo corrido recorriendo de más antiguo a más nuevo
  - [x] 7.3 Mostrar el saldo en ambas monedas (vía `PrecioDoble`)
  - [x] 7.4 Enlazar cada movimiento de venta a su detalle
  - [x] 7.5 Mostrar la antigüedad de la deuda más antigua — se usa para el filtro
        de morosos en `Deudas.vue`, no como campo aparte en la ficha
  - [x] 7.6 Separar el saldo por unidad de negocio y mostrar el consolidado
  - _Requisitos: 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 8. Bandeja de revisión
  - [x] 8.1 Construir `RevisionPendiente.vue` mostrando la nota original completa
  - [x] 8.2 Dejar el campo de monto vacío, sin sugerencia
  - [x] 8.3 Al confirmar, crear el movimiento de deuda y marcar el registro resuelto
  - [x] 8.4 Implementar la acción de descartar
  - [x] 8.5 Mostrar el contador de registros pendientes en Deudas y en el Resumen
  - [x] 8.6 Verificado: los pendientes viven en `deuda_por_revisar`, aparte de
        `deuda_movimiento`, así que no afectan `cliente_saldo` hasta confirmarse
  - _Requisitos: 5.2, 5.4, 5.5, 5.6, 5.7, 5.8_

- [ ] 9. Cobranza
  - [x] 9.1 Total por cobrar por unidad y consolidado, integrado en la cabecera de
        `Deudas.vue`
  - [x] 9.2 Listar los clientes con deuda de más de 30 días (chip «Morosos»)
  - [x] 9.3 Generar el texto del estado de cuenta
  - [x] 9.4 Implementar compartir con `navigator.share()` y respaldo a portapapeles
  - [x] 9.5 Mostrar el saldo del cliente al seleccionarlo en la pantalla de venta
        (ya existía en `SelectorCliente.vue` desde el mini spec 07)
  - _Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 10. Verificación
  - [ ] 10.1 Prueba E2E: venta a fiado → abono parcial → saldo correcto — verificado
        por partes vía pgTAP (venta a fiado en 0006, abono en 0009); falta el
        recorrido E2E de Playwright
  - [ ] 10.2 Prueba E2E: confirmar un registro de la bandeja aparece en el total por
        cobrar — verificado por pgTAP (`resolver_revision` suma al saldo), falta E2E
  - [ ] 10.3 Verificar que los abonos aparecen como ingreso en el flujo de caja —
        depende del spec 08, todavía no existe
  - [x] 10.4 Verificar que un `mostrador` no puede anular un abono — pgTAP
        (`anular_abono` exige `rol_actual() = 'dueno'`)
  - _Requisitos: 3.5, 3.6, 5.5_
