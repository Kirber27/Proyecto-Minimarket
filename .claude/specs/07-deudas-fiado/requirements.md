# Deudas y fiado — Requisitos

## Introducción

En la bodega se fía. Hoy eso vive en la hoja `DEUDAS 2026`: 42 nombres y, en 13
de ellos, un texto escrito a mano como `"4,5+1,80+1,80+1refres pq+1,80+..."`.
No hay fechas, no hay saldo calculado, y en varios casos ni siquiera se sabe si
el número es en dólares o en bolívares.

Este spec convierte eso en un libro de cuentas por cobrar: cada consumo es una
línea con fecha y monto, cada abono también, y el saldo se calcula solo.

## Requisito 1 — Clientes

1. El sistema DEBE permitir crear, editar y desactivar clientes con nombre,
   teléfono opcional y nota opcional.
2. El nombre DEBE ser obligatorio.
3. El sistema DEBE advertir cuando se crea un cliente con un nombre ya existente,
   PERO DEBE permitir guardarlo. En la hoja original hay dos «JUAN», dos «PAOLA»,
   dos «FRANK» y dos «ELBIMAR»: son personas distintas.
4. Un cliente con movimientos NO DEBE poder eliminarse; SOLO desactivarse.
5. El sistema DEBE listar los clientes con su saldo actual, ordenados por saldo
   descendente.
6. El sistema DEBE ofrecer buscador por nombre, sin distinguir tildes.

## Requisito 2 — Registrar deuda

1. CUANDO una venta se cobra parcial o totalmente con el método Fiado, ENTONCES
   el sistema DEBE crear un movimiento de deuda por el monto no cubierto.
2. El sistema DEBE permitir registrar una deuda manual, sin venta asociada, para
   consumos que no pasaron por la caja.
3. Todo movimiento de deuda DEBE guardar: cliente, unidad de negocio, monto en
   USD, tasa aplicada, fecha, usuario y referencia a la venta cuando exista.
4. El sistema NO DEBE permitir registrar una deuda de monto cero o negativo.
5. CUANDO se anula una venta a fiado, ENTONCES el sistema DEBE revertir el
   movimiento de deuda correspondiente.

## Requisito 3 — Abonos

**Historia:** Como encargado quiero registrar cuando un cliente paga parte de lo
que debe, para que su saldo baje.

1. El sistema DEBE permitir registrar un abono indicando monto y método de pago.
2. El abono DEBE poder ingresarse en bolívares o en dólares.
3. CUANDO el abono supera el saldo pendiente, ENTONCES el sistema DEBE advertirlo
   y ofrecer registrar solo el saldo o dejar saldo a favor.
4. CUANDO un abono deja el saldo en cero, ENTONCES el sistema DEBE mostrar una
   confirmación de deuda saldada.
5. Los abonos DEBEN afectar el flujo de caja como ingreso del día en que se
   registran.
6. El sistema DEBE permitir anular un abono mal registrado; SOLO el rol `dueno`.

## Requisito 4 — Saldo y estado de cuenta

1. El saldo de un cliente DEBE calcularse como la suma de sus deudas menos la
   suma de sus abonos, en USD.
2. El sistema DEBE mostrar el saldo en ambas monedas, convirtiendo con la tasa
   vigente.
3. El sistema DEBE mostrar el estado de cuenta del cliente: todos sus
   movimientos en orden cronológico inverso, con saldo corrido.
4. CUANDO un movimiento proviene de una venta, ENTONCES el sistema DEBE permitir
   abrir el detalle de esa venta.
5. El sistema DEBE mostrar la antigüedad de la deuda más vieja sin saldar.
6. El sistema DEBE separar el saldo por unidad de negocio, y mostrar también el
   consolidado.

## Requisito 5 — Migrar las notas del Excel

**Historia:** Como dueño quiero revisar y confirmar las deudas que traía de la
planilla, porque ahí están escritas a mano y no siempre entiendo el monto.

1. El sistema DEBE importar los 42 clientes de la hoja `DEUDAS 2026`.
2. El sistema NO DEBE intentar interpretar automáticamente las notas de texto
   libre. Adivinar un saldo de fiado es peor que preguntar.
3. Los 13 registros con contenido DEBEN quedar marcados como pendientes de
   revisión, conservando el texto original.
4. El sistema DEBE ofrecer una bandeja de revisión donde el dueño ve la nota
   original y captura el monto confirmado.
5. CUANDO el dueño confirma un monto, ENTONCES el sistema DEBE crear el
   movimiento de deuda y quitar la marca de revisión.
6. El sistema DEBE permitir descartar un registro cuando la deuda ya no aplica.
7. Los registros pendientes de revisión NO DEBEN contar en el saldo total hasta
   confirmarse.
8. El sistema DEBE indicar cuántos registros quedan por revisar.

## Requisito 6 — Cobranza

1. El sistema DEBE mostrar el total por cobrar, por unidad de negocio y
   consolidado.
2. El sistema DEBE listar los clientes con deuda de más de 30 días.
3. El sistema DEBE ofrecer compartir el estado de cuenta de un cliente como
   texto, para enviarlo por mensajería.
4. El sistema NO DEBE enviar mensajes automáticamente; solo prepara el texto para
   que el usuario lo comparta.
5. CUANDO un cliente tiene saldo pendiente y se le va a vender de nuevo, ENTONCES
   la pantalla de venta DEBE mostrar su saldo actual al seleccionarlo.
