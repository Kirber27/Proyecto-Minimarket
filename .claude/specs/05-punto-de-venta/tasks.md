# Punto de venta — Tareas

- [ ] 1. Esquema de ventas
  - [ ] 1.1 Crear el enum `metodo_pago` y sembrar el catálogo desde `mock/metodos-pago.json`
  - [ ] 1.2 Crear `venta` con `correlativo`, `tasa_aplicada`, `anulada` e `idempotencia` única
  - [ ] 1.3 Crear `venta_linea` con `nombre_snapshot` y `precio_unitario_usd`
  - [ ] 1.4 Crear `venta_pago`
  - [ ] 1.5 Crear los índices por fecha y por unidad de negocio, filtrando anuladas
  - [ ] 1.6 Aplicar RLS: `mostrador` puede insertar, solo `dueno` puede anular
  - _Requisitos: 2.1, 3.5, 3.9, 5.1, 5.4_

- [ ] 2. Función `crear_venta`
  - [ ] 2.1 Implementar el corte por idempotencia que devuelve la venta existente
  - [ ] 2.2 Validar la tasa contra `tasa_vigente()` y lanzar `tasa_desactualizada`
  - [ ] 2.3 Bloquear productos con `for update` **en orden de `id`**
  - [ ] 2.4 Validar stock por línea y lanzar `stock_insuficiente` con nombre y cantidad
  - [ ] 2.5 Calcular el total leyendo precios del servidor, nunca del cliente
  - [ ] 2.6 Validar que los pagos cubren el total salvo que haya cliente para fiado
  - [ ] 2.7 Insertar venta, líneas y pagos, y descontar stock
  - [ ] 2.8 Llamar a `registrar_deuda` cuando queda saldo pendiente
  - [ ] 2.9 Pruebas pgTAP: idempotencia, stock insuficiente, tasa vieja, pago incompleto
  - [ ] 2.10 Prueba de concurrencia: dos sesiones vendiendo la última unidad, solo una gana
  - _Requisitos: 1.5, 2.7, 3.5, 3.6, 3.9_

- [ ] 3. Store del carrito
  - [ ] 3.1 Implementar `useCarritoStore` con líneas, pagos, cliente e idempotencia
  - [ ] 3.2 Implementar `totalUsd`, `pagadoUsd`, `faltaUsd`, `vueltoUsd`, `puedeConfirmar`
  - [ ] 3.3 Validar stock en el cliente al agregar, con el mensaje del requisito 1.5
  - [ ] 3.4 Renovar la llave de idempotencia solo en `reiniciar()`, no al reintentar
  - [ ] 3.5 Persistir el carrito en `localStorage` y restaurarlo al abrir
  - [ ] 3.6 Pruebas: total de 3 líneas, vuelto, y que `puedeConfirmar` exige cliente con fiado
  - _Requisitos: 1.4, 1.9, 2.3, 2.4, 2.5, 2.6, 3.8_

- [ ] 4. Cuadrícula de productos
  - [ ] 4.1 Construir `VentaNueva.vue` con cuadrícula responsive (2 col. móvil, 4–5 escritorio)
  - [ ] 4.2 Agregar al carrito con un toque, sin diálogo
  - [ ] 4.3 Mostrar cantidad y controles +/− en las tarjetas que ya están en el carrito
  - [ ] 4.4 Deshabilitar y etiquetar «Sin stock» las tarjetas con stock cero
  - [ ] 4.5 Implementar el diálogo de cantidad decimal para productos `KG`
  - [ ] 4.6 Reutilizar buscador y chips de categoría del spec 03
  - [ ] 4.7 Verificar que un toque responde en menos de 100 ms con los 328 productos
  - _Requisitos: 1.1, 1.2, 1.3, 1.6, 1.7, 1.8, 6.1, 6.2_

- [ ] 5. Panel del carrito
  - [ ] 5.1 Construir `PanelCarrito.vue`: adherido al fondo en móvil, columna fija en escritorio
  - [ ] 5.2 Implementar colapsar y expandir
  - [ ] 5.3 Listar líneas con nombre, cantidad, precio unitario y subtotal
  - [ ] 5.4 Mostrar unidades y total en ambas monedas
  - [ ] 5.5 Implementar vaciar carrito con confirmación
  - _Requisitos: 1.3, 1.9, 1.10, 1.11_

- [ ] 6. Cobro
  - [ ] 6.1 Construir `SelectorPago.vue` con los seis métodos
  - [ ] 6.2 Al tocar un método, agregar una línea de pago precargada con lo que falta
  - [ ] 6.3 Permitir editar el monto de cada línea y agregar más métodos
  - [ ] 6.4 Ingresar montos en Bs. y convertirlos a USD con la tasa vigente
  - [ ] 6.5 Mostrar lo que falta y el vuelto en vivo
  - [ ] 6.6 Exigir selección de cliente cuando se usa Fiado
  - [ ] 6.7 Preseleccionar el último método usado
  - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.8, 2.9_

- [ ] 7. Confirmación
  - [ ] 7.1 Implementar `ventasService.crear` llamando a la RPC
  - [ ] 7.2 Deshabilitar el botón mientras se envía
  - [ ] 7.3 Construir el panel de éxito con total, método y unidades, autocerrado a 2,4 s
  - [ ] 7.4 Vaciar el carrito y dejar la pantalla lista tras el éxito
  - [ ] 7.5 Conservar el carrito y señalar el producto exacto cuando el servidor rechaza
  - [ ] 7.6 Mapear los cinco códigos de error a los mensajes de la tabla del diseño
  - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.7, 3.8_

- [ ] 8. Ventas del día
  - [ ] 8.1 Construir `VentasDia.vue` con hora, total, método y número de productos
  - [ ] 8.2 Construir el detalle de venta con sus líneas
  - [ ] 8.3 Pasar `tasa_aplicada` a `PrecioDoble` en el detalle
  - [ ] 8.4 Implementar el estado vacío con la acción «Registrar venta»
  - _Requisitos: 4.1, 4.2, 4.3, 4.4_

- [ ] 9. Anulación
  - [ ] 9.1 Implementar la RPC `anular_venta` con devolución de stock y reversión de deuda
  - [ ] 9.2 Construir el diálogo de anulación con campo de motivo obligatorio
  - [ ] 9.3 Mostrar la acción solo al rol `dueno`
  - [ ] 9.4 Excluir las ventas anuladas de reportes y flujo de caja
  - [ ] 9.5 Advertir cuando la venta pertenece a un arqueo ya cerrado
  - [ ] 9.6 Prueba pgTAP: anular devuelve el stock exacto y revierte la deuda
  - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 10. Verificación
  - [ ] 10.1 Prueba E2E: venta de 3 productos con pago mixto, verificando stock y resumen
  - [ ] 10.2 Prueba E2E: venta a fiado crea la deuda del cliente
  - [ ] 10.3 Prueba E2E: doble toque en confirmar genera una sola venta
  - [ ] 10.4 Cronometrar el recorrido completo en móvil: debe quedar bajo 30 segundos
  - _Requisitos: 2.7, 3.5, 3.8, 6.1_
