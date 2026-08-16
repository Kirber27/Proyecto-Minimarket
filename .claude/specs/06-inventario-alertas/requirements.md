# Inventario y alertas de stock — Requisitos

## Introducción

Saber qué hay, qué falta y por qué cambió. El Excel tiene una columna `CANTIDAD`
que se edita a mano y una columna `RESTANTE` que quedó vacía; no hay forma de
saber si un faltante fue venta, merma o error de conteo.

Este spec agrega el libro de movimientos que da esa respuesta, más las alertas
que evitan quedarse sin lo que más se vende.

## Requisito 1 — Ver el inventario

**Historia:** Como dueño quiero ver el stock de todo mi catálogo ordenado por
urgencia, para saber qué comprar.

1. El sistema DEBE listar todos los productos con stock actual, stock mínimo,
   precio, costo y margen.
2. El sistema DEBE mostrar el estado de stock con color **y** etiqueta de texto,
   según los cuatro niveles de [dominio.md](../../steering/dominio.md).
3. Por defecto la lista DEBE ordenarse por stock ascendente, para que lo urgente
   quede arriba.
4. El sistema DEBE ofrecer ordenamiento alternativo por nombre.
5. El sistema DEBE incluir los productos inactivos, marcados como tales.
6. CUANDO el costo es nulo, ENTONCES el margen DEBE mostrarse como «—».
7. El sistema DEBE mostrar el valor total del inventario a precio de costo y a
   precio de venta.
8. El sistema DEBE ofrecer buscador y filtro por categoría.

## Requisito 2 — Ajustar stock

**Historia:** Como dueño quiero corregir el stock cuando cuento físicamente, para
que el sistema refleje la realidad.

1. El sistema DEBE permitir ajustar el stock de un producto indicando la cantidad
   nueva o la diferencia.
2. Todo ajuste DEBE requerir un motivo de una lista: Conteo físico, Merma,
   Vencimiento, Robo, Error de registro, Otro.
3. CUANDO el motivo es «Otro», ENTONCES el sistema DEBE exigir una nota escrita.
4. El sistema NO DEBE permitir dejar el stock en negativo.
5. SOLO un usuario con rol `dueno` DEBE poder ajustar stock.
6. El sistema DEBE permitir ajustar varios productos en una sesión de conteo, y
   aplicar todos los ajustes juntos.

## Requisito 3 — Reponer

1. El sistema DEBE ofrecer una acción rápida de reposición desde la lista de
   inventario y desde las alertas.
2. La reposición DEBE registrar cantidad, costo unitario y proveedor opcional.
3. CUANDO el costo unitario de la reposición difiere del costo registrado,
   ENTONCES el sistema DEBE ofrecer actualizar el costo del producto.
4. El sistema DEBE ofrecer «reponer todos los críticos» con una cantidad
   sugerida por producto.
5. La cantidad sugerida DEBE calcularse como el promedio de ventas de los últimos
   30 días multiplicado por 15 días, redondeado hacia arriba, con un mínimo del
   stock mínimo del producto.

## Requisito 4 — Libro de movimientos

**Historia:** Como dueño quiero saber por qué cambió el stock de un producto, para
detectar mermas o errores.

1. TODO cambio de stock DEBE registrar un movimiento con producto, tipo,
   cantidad, stock resultante, usuario, fecha y referencia al documento origen.
2. Los tipos DEBEN ser: venta, anulación de venta, reposición, ajuste,
   importación.
3. El sistema DEBE mostrar el historial de movimientos de un producto en orden
   cronológico inverso.
4. La suma de los movimientos de un producto DEBE reconciliar exactamente con su
   stock actual.
5. Los movimientos NO DEBEN poder editarse ni eliminarse.
6. El sistema DEBE permitir filtrar el libro por tipo, rango de fechas y usuario.

## Requisito 5 — Alertas

**Historia:** Como dueño quiero abrir la app y ver de inmediato qué falta
reponer.

1. El sistema DEBE listar los productos con stock por debajo de su mínimo,
   ordenados de más crítico a menos.
2. La pantalla de Resumen DEBE mostrar el conteo de productos en alerta.
3. CUANDO un producto llega a stock cero, ENTONCES DEBE aparecer en primer lugar
   con distinción visual de agotado.
4. El sistema DEBE permitir reponer directamente desde la alerta.
5. El sistema DEBE calcular el stock mínimo sugerido a partir de la rotación real
   del producto, y ofrecer aplicarlo.
6. CUANDO no hay productos en alerta, ENTONCES el sistema DEBE mostrar un estado
   vacío positivo.
7. Las alertas DEBEN filtrarse por unidad de negocio activa.

## Requisito 6 — Rotación

1. El sistema DEBE calcular, por producto, las unidades vendidas en los últimos
   7, 30 y 90 días.
2. El sistema DEBE identificar los productos sin ventas en los últimos 60 días.
3. El sistema DEBE calcular los días de cobertura restantes: stock actual
   dividido entre la venta diaria promedio.
4. CUANDO la cobertura es menor a 7 días, ENTONCES el producto DEBE marcarse
   como próximo a agotarse aunque su stock siga por encima del mínimo.
