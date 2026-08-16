# Tasa de cambio y moneda dual — Requisitos

## Introducción

El corazón del negocio: los precios se definen en dólares y se cobran en
bolívares a la tasa del día. Hoy eso vive en una sola celda del Excel (`G2 = 800`)
que se edita a mano y recalcula toda la hoja.

Este spec cubre registrar la tasa, mostrar ambas monedas en toda la app, y
manejar el caso incómodo: la tasa cambió mientras había una venta a medio armar.

## Requisito 1 — Registrar la tasa del día

**Historia:** Como dueño quiero actualizar la tasa cada mañana, para que todos los
precios en bolívares salgan correctos.

1. El sistema DEBE permitir registrar una tasa con fecha y valor de bolívares por
   dólar.
2. El campo de tasa DEBE ser accesible desde la cabecera en cualquier pantalla,
   sin navegar a Ajustes.
3. CUANDO se guarda una tasa nueva, ENTONCES el sistema DEBE recalcular
   inmediatamente todos los montos en bolívares visibles, sin recargar la página.
4. El sistema DEBE conservar el historial completo de tasas; una tasa nueva NO
   DEBE sobrescribir la anterior.
5. CUANDO ya existe una tasa para la fecha de hoy, ENTONCES el sistema DEBE
   preguntar si se corrige la existente o se registra una nueva versión.
6. La tasa DEBE ser mayor que cero; CUANDO no lo es, ENTONCES el sistema DEBE
   rechazarla con «La tasa debe ser mayor que cero».
7. CUANDO la tasa nueva difiere en más de 20 % de la anterior, ENTONCES el
   sistema DEBE pedir confirmación explícita antes de guardar.
8. SOLO un usuario con rol `dueno` DEBE poder cambiar la tasa.

## Requisito 2 — Tasa vigente

1. El sistema DEBE considerar tasa vigente la más reciente por fecha y hora de
   registro.
2. CUANDO no existe ninguna tasa, ENTONCES el sistema DEBE bloquear el registro
   de ventas y mostrar «Registra la tasa del día para poder vender».
3. CUANDO la tasa vigente tiene más de 24 horas, ENTONCES el sistema DEBE
   mostrar un aviso persistente en la cabecera, PERO DEBE permitir seguir
   operando.
4. El sistema DEBE mostrar la tasa vigente y su antigüedad en la cabecera.

## Requisito 3 — Moneda dual en la interfaz

**Historia:** Como usuario quiero ver siempre las dos monedas, porque el precio lo
pienso en dólares pero el cliente paga en bolívares.

1. TODO monto mostrado DEBE presentar el valor en USD y su equivalente en Bs.
2. El USD DEBE ser la cifra principal y el Bs. la secundaria, salvo en el arqueo
   de caja, donde manda el bolívar porque es el billete que se cuenta.
3. Los montos en USD DEBEN formatearse como `$1,57` y los de Bs. como
   `1.256 Bs.`, en locale `es-VE`.
4. CUANDO el modo «ocultar montos» está activo, ENTONCES el sistema DEBE
   enmascarar ambas cifras con `•••`.
5. El sistema NO DEBE mostrar decimales en los montos en bolívares.
6. La conversión DEBE aplicarse al total, no a cada línea. CUANDO un carrito
   tiene varias líneas, ENTONCES el total en Bs. DEBE ser
   `redondear(total_usd × tasa)`, no la suma de los bolívares de cada línea.

## Requisito 4 — Tasa histórica en documentos

**Historia:** Como dueño quiero que una venta de la semana pasada siga mostrando
los bolívares que realmente se cobraron.

1. CUANDO se confirma una venta, ENTONCES el sistema DEBE guardar la tasa
   aplicada junto con la venta.
2. CUANDO se consulta una venta pasada, ENTONCES el sistema DEBE mostrar los
   bolívares calculados con la tasa guardada, NO con la tasa actual.
3. El sistema NO DEBE almacenar el monto en bolívares de la venta; DEBE
   recalcularlo desde `total_usd × tasa_aplicada`.
4. Lo mismo DEBE aplicar a egresos y a movimientos de deuda.

## Requisito 5 — Cambio de tasa durante una venta

**Historia:** Como encargado quiero que si la tasa cambia mientras armo el
carrito, se me avise en vez de cobrar de menos.

1. CUANDO cambia la tasa vigente y hay un carrito con líneas, ENTONCES el sistema
   DEBE mostrar un aviso indicando la tasa anterior y la nueva.
2. CUANDO se confirma la venta, ENTONCES el sistema DEBE aplicar la tasa vigente
   en ese momento, NO la que estaba al agregar el primer producto.
3. La validación de tasa DEBE ocurrir también en el servidor: el cliente envía la
   tasa que creía vigente y el servidor la compara con la real.
4. CUANDO la tasa enviada por el cliente no coincide con la vigente, ENTONCES el
   servidor DEBE rechazar la operación con `tasa_desactualizada` y devolver la
   tasa correcta para que el cliente reintente.

## Requisito 6 — Conversión con la tasa correcta en reportes

1. Los reportes que agregan ventas de varios días DEBEN sumar en USD y convertir
   una sola vez con la tasa vigente, para que las comparaciones entre periodos
   sean consistentes.
2. El sistema DEBE indicar en cada reporte qué tasa se usó para la conversión.
3. CUANDO un reporte muestra un total histórico en bolívares «tal como se cobró»,
   ENTONCES DEBE sumar los bolívares de cada venta con su tasa propia, y DEBE
   etiquetarse distinto del anterior para que no se confundan.
