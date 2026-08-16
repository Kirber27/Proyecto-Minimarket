# Flujo de caja — Requisitos

## Introducción

Cuánto entró, cuánto salió, cuánto queda. La hoja `MONEDA` tiene los totales por
método de pago (`PUNTO 19.930`, `PAGO MOVIL 287.000`) separados por Bodega y
Cerveza, pero no registra los egresos ni el saldo acumulado.

Este spec cubre el libro diario de movimientos de dinero. El conteo físico de
billetes es el spec 09.

## Requisito 1 — Movimientos del día

**Historia:** Como dueño quiero ver todo lo que entró y salió hoy, para saber si
el día fue bueno.

1. El sistema DEBE listar los movimientos del día en orden cronológico inverso,
   combinando ingresos y egresos.
2. Los ingresos DEBEN incluir las ventas y los abonos de deuda.
3. Los egresos DEBEN incluir los registros manuales de salida de dinero.
4. Cada movimiento DEBE mostrar hora, concepto, método de pago, categoría y monto
   en ambas monedas.
5. Los ingresos DEBEN distinguirse de los egresos con signo `+` / `−` **y** con
   color, nunca solo con color.
6. Las ventas anuladas NO DEBEN aparecer.
7. El sistema DEBE permitir abrir el detalle del documento origen de cada
   movimiento.
8. El sistema DEBE filtrar por unidad de negocio activa.

## Requisito 2 — Registrar egresos

1. El formulario DEBE capturar descripción, monto, categoría y método de pago.
2. Las categorías DEBEN ser: Proveedor, Insumos, Servicios, Sueldos, Retiro y
   Otro.
3. Descripción y monto DEBEN ser obligatorios; CUANDO falta alguno, ENTONCES el
   sistema DEBE mostrar «Completa descripción y monto».
4. El monto DEBE poder ingresarse en bolívares o en dólares.
5. El egreso DEBE guardar la tasa aplicada.
6. El sistema DEBE permitir adjuntar una nota con el número de factura o
   referencia.
7. SOLO un usuario con rol `dueno` DEBE poder registrar egresos de categoría
   Retiro y Sueldos.
8. El sistema DEBE permitir anular un egreso mal registrado, conservando el
   registro marcado como anulado.

## Requisito 3 — Saldo

1. El sistema DEBE mostrar el saldo actual como saldo inicial más ingresos menos
   egresos.
2. El saldo inicial de un día DEBE ser el saldo de cierre del día anterior.
3. El sistema DEBE mostrar el desglose del saldo por método de pago.
4. El sistema DEBE distinguir el efectivo (que está físicamente en la gaveta) del
   dinero electrónico (que está en cuentas).
5. El saldo DEBE calcularse por unidad de negocio, con vista consolidada
   disponible.

## Requisito 4 — Totales por método de pago

**Historia:** Como dueño quiero ver cuánto entró por Punto, Pago móvil y Biopago
por separado, para conciliar con los estados de cuenta.

1. El sistema DEBE totalizar los ingresos del día agrupados por método de pago.
2. El desglose DEBE replicar la estructura de la hoja `MONEDA`: totales por
   método y por unidad de negocio.
3. El sistema DEBE mostrar qué porcentaje del total representa cada método.
4. El sistema DEBE permitir consultar el desglose de cualquier día pasado.

## Requisito 5 — Resumen del día

1. La pantalla de Resumen DEBE mostrar: total vendido hoy, número de ventas,
   ticket promedio, total de egresos y saldo actual.
2. El sistema DEBE mostrar un gráfico de barras de los últimos 7 días, con el día
   actual destacado.
3. El sistema DEBE mostrar la comparación con el mismo día de la semana anterior.
4. El sistema DEBE mostrar el conteo de productos en alerta de stock.
5. El sistema DEBE mostrar el total por cobrar en fiado.
6. CUANDO el modo «ocultar montos» está activo, ENTONCES todas las cifras del
   Resumen DEBEN enmascararse.

## Requisito 6 — Historial

1. El sistema DEBE permitir navegar a cualquier día pasado y ver sus movimientos.
2. El sistema DEBE permitir consultar un rango de fechas.
3. El sistema DEBE mostrar el total de ingresos, egresos y resultado del rango.
4. El sistema DEBE permitir exportar el rango a CSV.
