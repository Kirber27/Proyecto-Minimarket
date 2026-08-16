# PWA y funcionamiento sin conexión — Requisitos

## Introducción

La app se instala en el teléfono y sigue funcionando cuando se cae la señal. En
una bodega de barrio eso no es un lujo: la conexión se va, y las ventas no
esperan.

Este spec cubre el manifiesto, el service worker, la cola de operaciones
pendientes y la resolución de conflictos al reconectar.

## Requisito 1 — Instalación

**Historia:** Como encargado quiero tener la app en la pantalla de inicio, para
abrirla como cualquier otra aplicación.

1. La app DEBE incluir un manifiesto válido con nombre, nombre corto, iconos,
   color de tema y `display: standalone`.
2. La app DEBE incluir iconos de 192, 512 y 512 enmascarable.
3. CUANDO el navegador ofrece instalar, ENTONCES el sistema DEBE mostrar un aviso
   propio con la invitación, descartable.
4. CUANDO el usuario descarta el aviso, ENTONCES el sistema NO DEBE volver a
   mostrarlo en 30 días.
5. La app instalada DEBE abrir sin barra de direcciones del navegador.
6. La app DEBE declarar `orientation: portrait` en móvil.

## Requisito 2 — Carga sin conexión

1. El shell de la aplicación (HTML, CSS, JS, fuentes, iconos) DEBE precargarse en
   la instalación del service worker.
2. CUANDO no hay conexión, ENTONCES la app DEBE cargar completa desde la caché.
3. El catálogo de productos, categorías y clientes DEBE cachearse localmente tras
   la primera carga.
4. CUANDO no hay conexión, ENTONCES el usuario DEBE poder consultar precios,
   stock y saldos de clientes con los últimos datos conocidos.
5. El sistema DEBE indicar de forma visible cuándo está sin conexión.
6. El sistema DEBE indicar la antigüedad de los datos cacheados cuando supera una
   hora.

## Requisito 3 — Operaciones sin conexión

**Historia:** Como encargado quiero seguir vendiendo aunque se caiga internet,
porque el cliente ya está en el mostrador.

1. CUANDO no hay conexión, ENTONCES el sistema DEBE permitir registrar ventas.
2. Las ventas registradas sin conexión DEBEN encolarse localmente con toda su
   información, incluida la llave de idempotencia.
3. El sistema DEBE descontar el stock localmente para que las ventas siguientes
   validen contra el stock real estimado.
4. El sistema DEBE mostrar el número de operaciones pendientes de sincronizar.
5. El sistema DEBE permitir registrar egresos y abonos sin conexión.
6. El sistema NO DEBE permitir sin conexión: cambiar la tasa, modificar
   productos, cerrar arqueos ni anular ventas. Son operaciones que dependen del
   estado real del servidor.
7. Las ventas encoladas DEBEN aparecer en el resumen del día, marcadas como
   pendientes.
8. La cola DEBE sobrevivir al cierre de la app y al reinicio del dispositivo.

## Requisito 4 — Sincronización

1. CUANDO se recupera la conexión, ENTONCES el sistema DEBE sincronizar la cola
   automáticamente.
2. Las operaciones DEBEN enviarse en el orden en que se registraron.
3. Cada operación DEBE enviarse con su llave de idempotencia, para que un reenvío
   no duplique.
4. CUANDO una operación se sincroniza con éxito, ENTONCES DEBE salir de la cola.
5. CUANDO una operación falla por un error de red, ENTONCES DEBE permanecer en la
   cola y reintentarse con espera creciente.
6. CUANDO una operación falla por un error de negocio, ENTONCES DEBE moverse a
   una bandeja de conflictos para revisión manual, y la sincronización DEBE
   continuar con las siguientes.
7. El sistema DEBE informar el resultado de la sincronización: cuántas entraron y
   cuántas quedaron en conflicto.
8. El sistema DEBE permitir forzar la sincronización manualmente.

## Requisito 5 — Conflictos

**Historia:** Como dueño quiero saber qué ventas no se pudieron registrar y por
qué, para arreglarlas.

1. La bandeja de conflictos DEBE mostrar la operación, la fecha en que se
   registró y el motivo del rechazo.
2. El motivo más probable es stock insuficiente: otro dispositivo vendió lo mismo
   mientras este estaba sin conexión.
3. El sistema DEBE permitir reintentar una operación en conflicto tras corregir
   la causa.
4. El sistema DEBE permitir descartar una operación en conflicto, con
   confirmación.
5. CUANDO se descarta una venta encolada, ENTONCES el sistema DEBE revertir el
   descuento de stock local.
6. El sistema DEBE mostrar el conteo de conflictos en el Resumen mientras existan.
7. Los conflictos NO DEBEN descartarse automáticamente ni caducar solos.

## Requisito 6 — Actualizaciones

1. CUANDO hay una versión nueva de la app, ENTONCES el sistema DEBE avisar al
   usuario y ofrecer recargar.
2. El sistema NO DEBE recargar automáticamente mientras haya un carrito con
   líneas o un arqueo en borrador.
3. El service worker DEBE limpiar las cachés de versiones anteriores al activarse.
4. CUANDO una versión nueva cambia el formato de la cola local, ENTONCES el
   sistema DEBE migrar las operaciones pendientes, nunca descartarlas.

## Requisito 7 — Límites

1. El sistema DEBE advertir cuando la cola supera 50 operaciones pendientes.
2. El sistema NO DEBE cachear datos indefinidamente: el histórico de ventas
   cacheado DEBE limitarse a los últimos 7 días.
3. El sistema DEBE manejar el error de cuota de almacenamiento agotada sin perder
   la cola de operaciones.
