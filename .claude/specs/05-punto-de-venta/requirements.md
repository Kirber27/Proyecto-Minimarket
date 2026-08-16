# Punto de venta — Requisitos

## Introducción

La pantalla más usada de la app. El encargado arma un carrito tocando productos,
elige cómo paga el cliente y confirma. Todo tiene que caber en una mano, en menos
de 30 segundos, con el cliente esperando.

Es también la operación más delicada: confirmar una venta descuenta stock, mueve
la caja y puede crear una deuda. O pasa todo, o no pasa nada.

## Requisito 1 — Armar el carrito

**Historia:** Como encargado quiero agregar productos con un toque, para no perder
tiempo entre cliente y cliente.

1. El sistema DEBE mostrar una cuadrícula de productos activos con nombre, precio
   en ambas monedas y stock.
2. CUANDO el usuario toca un producto, ENTONCES el sistema DEBE agregar una
   unidad al carrito, SIN abrir ningún diálogo.
3. CUANDO un producto ya está en el carrito, ENTONCES su tarjeta DEBE mostrar la
   cantidad y controles de aumentar y disminuir.
4. CUANDO la cantidad llega a cero, ENTONCES la línea DEBE eliminarse del
   carrito.
5. CUANDO el usuario intenta agregar más unidades que el stock disponible,
   ENTONCES el sistema DEBE impedirlo y avisar «Sin stock suficiente de
   [producto]».
6. CUANDO un producto tiene stock cero, ENTONCES su tarjeta DEBE mostrarse
   deshabilitada con la etiqueta «Sin stock».
7. Para productos con unidad `KG`, el sistema DEBE permitir ingresar una cantidad
   decimal con hasta 3 decimales en lugar de sumar de uno en uno.
8. El sistema DEBE ofrecer buscador y filtro por categoría sobre la cuadrícula.
9. El carrito DEBE mostrar en todo momento el número de unidades y el total en
   ambas monedas.
10. El usuario DEBE poder colapsar y expandir el panel del carrito para ver más
    productos.
11. El usuario DEBE poder vaciar el carrito completo con una acción, con
    confirmación.

## Requisito 2 — Cobrar

**Historia:** Como encargado quiero registrar cómo pagó el cliente, incluyendo
pagos combinados, porque casi nadie paga todo con un solo método.

1. El sistema DEBE ofrecer los seis métodos: Efectivo Bs., Efectivo $, Punto,
   Pago móvil, Biopago y Fiado.
2. El sistema DEBE permitir **pago mixto**: varias líneas de pago con método y
   monto en una misma venta.
3. El sistema DEBE mostrar en vivo cuánto falta por cubrir del total.
4. CUANDO la suma de los pagos supera el total, ENTONCES el sistema DEBE calcular
   y mostrar el vuelto en la moneda del último pago.
5. CUANDO la suma de los pagos es menor al total y no se eligió Fiado, ENTONCES
   el sistema NO DEBE permitir confirmar.
6. CUANDO se elige el método Fiado, ENTONCES el sistema DEBE exigir que se
   seleccione un cliente.
7. CUANDO se confirma una venta con Fiado, ENTONCES el sistema DEBE crear el
   movimiento de deuda correspondiente por el monto no cubierto.
8. Los montos de pago en Bs. DEBEN poder ingresarse directamente en bolívares y
   convertirse a USD con la tasa vigente.
9. El sistema DEBE recordar el último método usado como preselección.

## Requisito 3 — Confirmar la venta

1. Del carrito lleno a la venta guardada DEBE haber exactamente un botón.
2. El sistema NO DEBE pedir confirmación con un diálogo de «¿está seguro?».
3. CUANDO la venta se guarda, ENTONCES el sistema DEBE mostrar un panel de éxito
   con total, método y unidades, que se cierra solo a los 2,4 segundos.
4. CUANDO la venta se guarda, ENTONCES el sistema DEBE vaciar el carrito y dejar
   la pantalla lista para la venta siguiente.
5. La operación DEBE ser atómica: descontar stock, crear la venta con sus líneas
   y pagos, y crear la deuda si corresponde, todo o nada.
6. CUANDO otro dispositivo vendió el mismo producto entre que se cargó la
   pantalla y se confirmó, ENTONCES el servidor DEBE validar el stock real y
   rechazar la venta si ya no alcanza.
7. CUANDO la venta se rechaza, ENTONCES el sistema DEBE conservar el carrito
   intacto e indicar exactamente qué producto falló.
8. MIENTRAS la venta se envía, el botón DEBE deshabilitarse para evitar el doble
   registro por doble toque.
9. Cada venta DEBE guardar la tasa aplicada y la unidad de negocio activa.

## Requisito 4 — Ventas del día

1. El sistema DEBE listar las ventas del día con hora, total, método y número de
   productos.
2. El usuario DEBE poder abrir el detalle de una venta y ver sus líneas.
3. El detalle DEBE mostrar los bolívares con la tasa que se aplicó en su momento.
4. CUANDO no hay ventas hoy, ENTONCES el sistema DEBE mostrar un estado vacío con
   la acción «Registrar venta».

## Requisito 5 — Anular una venta

**Historia:** Como dueño quiero anular una venta mal registrada, para que el stock
y la caja vuelvan a cuadrar.

1. SOLO un usuario con rol `dueno` DEBE poder anular ventas.
2. CUANDO se anula una venta, ENTONCES el sistema DEBE devolver el stock de cada
   línea.
3. CUANDO se anula una venta con Fiado, ENTONCES el sistema DEBE revertir también
   el movimiento de deuda.
4. La anulación NO DEBE borrar la venta; DEBE marcarla como anulada, con fecha,
   usuario y motivo.
5. Las ventas anuladas NO DEBEN contar en reportes ni en el flujo de caja.
6. CUANDO la venta pertenece a un arqueo de caja ya cerrado, ENTONCES el sistema
   DEBE advertirlo antes de anular, porque el cierre dejará de cuadrar.

## Requisito 6 — Rendimiento

1. La cuadrícula DEBE responder a un toque en menos de 100 ms con los 328
   productos cargados.
2. El sistema DEBE funcionar con el catálogo en memoria, sin ir al servidor por
   cada búsqueda.
3. CUANDO se confirma una venta sin conexión, ENTONCES el sistema DEBE encolarla
   localmente y sincronizarla después, según el spec 11.
