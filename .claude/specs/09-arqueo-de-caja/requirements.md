# Arqueo de caja — Requisitos

## Introducción

El cierre del día: contar los billetes que hay en la gaveta y compararlos con lo
que el sistema dice que debería haber.

Las hojas `MONEDA` y `KYC` son exactamente esto. `MONEDA` tiene dos bloques —
Bodega y Cerveza — con una tabla de denominaciones en bolívares (`5, 10, 20, 50,
100, 200, 500`) por cantidad, y otra en dólares (`1, 5, 10, 20, 50, 100`). En el
conteo real cargado hay 63 billetes de 100 Bs., 33 de 50 y 5 de 500, que suman
10.470 Bs.

`KYC` repite la misma estructura en bloques sueltos, aparentemente para conteos
de varios días o de varias personas.

## Requisito 1 — Conteo por denominación

**Historia:** Como dueño quiero contar los billetes por denominación, para saber
cuánto efectivo hay sin sumarlo a mano.

1. El sistema DEBE ofrecer una grilla con las denominaciones en Bs.: 5, 10, 20,
   50, 100, 200 y 500.
2. El sistema DEBE ofrecer una grilla con las denominaciones en USD: 1, 5, 10,
   20, 50 y 100.
3. Para cada denominación el usuario DEBE poder ingresar la cantidad de billetes.
4. El sistema DEBE calcular y mostrar el subtotal de cada denominación en vivo.
5. El sistema DEBE mostrar el total por moneda y el total combinado convertido a
   USD.
6. Las denominaciones DEBEN ser configurables, porque en Venezuela cambian con
   las reconversiones monetarias.
7. Los campos de cantidad DEBEN aceptar solo enteros no negativos.
8. El sistema DEBE permitir dejar denominaciones vacías, tratándolas como cero.

## Requisito 2 — Cuadre

**Historia:** Como dueño quiero saber si falta o sobra dinero, y cuánto.

1. El sistema DEBE mostrar el efectivo esperado según los movimientos de caja del
   periodo arqueado.
2. El sistema DEBE calcular la diferencia entre lo contado y lo esperado.
3. El sistema DEBE presentar la diferencia por separado para bolívares y dólares.
4. CUANDO la diferencia es cero, ENTONCES el sistema DEBE mostrar el cuadre como
   correcto.
5. CUANDO hay diferencia, ENTONCES el sistema DEBE indicar si es faltante o
   sobrante, con signo y color, además de la etiqueta de texto.
6. CUANDO la diferencia supera un umbral configurable, ENTONCES el sistema DEBE
   exigir una nota explicativa antes de cerrar.
7. El sistema DEBE mostrar el desglose de lo esperado por método de pago, para
   ayudar a encontrar el error.
8. El cuadre DEBE considerar solo los métodos marcados como efectivo; el dinero
   electrónico NO DEBE entrar al conteo físico.

## Requisito 3 — Cierre

1. El sistema DEBE permitir cerrar el arqueo, dejándolo inmutable.
2. Un arqueo cerrado NO DEBE poder editarse ni eliminarse.
3. CUANDO se cierra un arqueo, ENTONCES el sistema DEBE registrar fecha, usuario,
   unidad de negocio, totales contados, totales esperados, diferencias y nota.
4. El arqueo DEBE guardar la tasa vigente al momento del cierre.
5. El sistema DEBE permitir un arqueo por unidad de negocio y por día.
6. CUANDO ya existe un arqueo cerrado para esa unidad y ese día, ENTONCES el
   sistema DEBE impedir crear otro y ofrecer ver el existente.
7. SOLO un usuario con rol `dueno` DEBE poder cerrar un arqueo.
8. El sistema DEBE permitir guardar un arqueo en borrador y retomarlo después,
   porque contar la caja se interrumpe.

## Requisito 4 — Fondo de caja

**Historia:** Como dueño quiero descontar el fondo con el que abro la caja, para
que la diferencia refleje solo lo del día.

1. El sistema DEBE permitir registrar un fondo de caja inicial por unidad de
   negocio.
2. El efectivo esperado DEBE incluir el fondo inicial.
3. El sistema DEBE permitir registrar el retiro de la recaudación al cerrar,
   dejando el fondo para el día siguiente.
4. CUANDO se registra el retiro, ENTONCES el sistema DEBE crear un egreso de
   categoría Retiro por el monto retirado.

## Requisito 5 — Historial de arqueos

1. El sistema DEBE listar los arqueos pasados con fecha, unidad de negocio,
   diferencia y usuario.
2. El sistema DEBE permitir abrir el detalle de un arqueo cerrado con su conteo
   completo.
3. El sistema DEBE resaltar los arqueos con diferencia por encima del umbral.
4. El sistema DEBE mostrar la tendencia de diferencias en el tiempo, para
   detectar un faltante recurrente.
5. El detalle DEBE mostrar los bolívares con la tasa que estaba vigente al
   cerrar.

## Requisito 6 — Uso en el mostrador

1. La grilla de conteo DEBE poder usarse con una mano en un teléfono.
2. Los campos DEBEN avanzar al siguiente con la tecla de siguiente del teclado
   numérico.
3. El total DEBE permanecer visible mientras se cuenta, sin necesidad de
   desplazarse.
4. El sistema DEBE conservar el borrador ante un cierre accidental de la app.
