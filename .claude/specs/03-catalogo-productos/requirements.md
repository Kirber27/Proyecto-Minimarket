# Catálogo de productos — Requisitos

## Introducción

El catálogo: productos, categorías y unidades de negocio. Incluye la carga
inicial de los 328 productos extraídos del Excel y la importación de planillas
futuras.

Es la base de venta, inventario y reportes. Sin catálogo no hay nada más.

## Requisito 1 — Ver el catálogo

**Historia:** Como usuario quiero encontrar un producto rápido, para saber su
precio mientras el cliente espera.

1. El sistema DEBE listar los productos con nombre, categoría, precio en USD,
   equivalente en Bs. y stock actual.
2. CUANDO el usuario escribe en el buscador, ENTONCES el sistema DEBE filtrar por
   nombre, SKU y categoría, sin distinguir mayúsculas ni tildes.
3. CUANDO el usuario escribe «cafe», ENTONCES DEBEN aparecer los productos
   llamados «CAFÉ». La búsqueda no puede depender de que el usuario escriba las
   tildes.
4. El sistema DEBE ofrecer filtro por categoría mediante chips, con «Todas» como
   opción por defecto.
5. El sistema DEBE ofrecer ordenamiento por stock ascendente y por nombre
   alfabético.
6. CUANDO hay más de 100 productos en la lista, ENTONCES el sistema DEBE
   virtualizar el renderizado para mantener el desplazamiento fluido.
7. CUANDO ningún producto coincide con el filtro, ENTONCES el sistema DEBE
   mostrar un estado vacío con la acción de limpiar filtros.
8. El sistema DEBE filtrar por unidad de negocio activa.

## Requisito 2 — Crear y editar productos

**Historia:** Como dueño quiero dar de alta productos nuevos, para que el
mostrador pueda venderlos.

1. El formulario DEBE capturar: nombre, categoría, SKU, precio de venta en USD,
   costo en USD, stock inicial, stock mínimo, unidad de medida, unidad de negocio
   y estado activo.
2. Nombre y precio de venta DEBEN ser obligatorios; el resto opcionales.
3. CUANDO falta nombre o precio, ENTONCES el sistema DEBE mostrar «Falta nombre o
   precio de venta» sin guardar.
4. CUANDO el usuario introduce el precio de venta y el costo, ENTONCES el sistema
   DEBE mostrar el margen calculado en vivo, antes de guardar.
5. CUANDO el precio de venta es menor al costo, ENTONCES el sistema DEBE advertir
   que el margen es negativo, PERO DEBE permitir guardar.
6. El SKU DEBE ser único cuando se especifica; CUANDO se repite, ENTONCES el
   sistema DEBE indicar con qué producto choca.
7. CUANDO se genera automáticamente, el SKU DEBE derivarse del nombre en forma de
   slug.
8. Un producto con ventas registradas NO DEBE poder eliminarse; SOLO DEBE poder
   desactivarse.
9. CUANDO se cambia el precio de un producto, ENTONCES el sistema DEBE registrar
   el cambio en un historial con fecha, usuario, precio anterior y nuevo.
10. Los productos inactivos NO DEBEN aparecer en la pantalla de venta, PERO SÍ en
    inventario.

## Requisito 3 — Categorías

1. El sistema DEBE permitir crear, renombrar y desactivar categorías.
2. Cada categoría DEBE tener un matiz de color que tiñe sus productos en toda la
   interfaz.
3. CUANDO se crea una categoría sin matiz, ENTONCES el sistema DEBE asignar uno
   automáticamente, distinto de los ya usados.
4. Una categoría con productos asociados NO DEBE poder eliminarse; el sistema
   DEBE ofrecer reasignar esos productos a otra categoría.
5. El sistema DEBE mostrar cuántos productos tiene cada categoría.
6. Los nombres de categoría DEBEN ser únicos.

## Requisito 4 — Unidades de negocio

1. El sistema DEBE ofrecer las tres unidades: Bodega, Cerveza y Thais.
2. El usuario DEBE poder cambiar de unidad activa desde la cabecera, en cualquier
   pantalla.
3. CUANDO cambia la unidad activa, ENTONCES catálogo, inventario, caja, deudas y
   reportes DEBEN reflejar solo esa unidad.
4. La unidad activa DEBE persistir entre sesiones en el mismo dispositivo.
5. El sistema DEBE ofrecer una vista consolidada de las tres unidades SOLO en
   reportes.

## Requisito 5 — Carga inicial desde el Excel

**Historia:** Como dueño quiero que mis 328 productos ya estén cargados, para no
teclearlos uno por uno.

1. El seed DEBE cargar las 16 categorías y los 328 productos de `mock/`.
2. Los precios cargados DEBEN coincidir exactamente con la columna `$$` del
   Excel.
3. El stock inicial DEBE tomarse de la columna `CANTIDAD`; CUANDO la celda está
   vacía, ENTONCES el stock DEBE ser 0.
4. Los productos vendidos por peso (`QUESO`, `JAMON`, `MORTADELA`, `POLLO`,
   `CHULETA`, `CARNE MOLIDA`, `BISTEC`, `SALCHICHA`) DEBEN quedar con unidad `KG`.
5. El costo DEBE quedar nulo, porque el Excel no lo registra.
6. CUANDO un producto tiene el costo nulo, ENTONCES el sistema NO DEBE mostrar
   margen; DEBE mostrar «—» e invitar a completarlo.
7. El seed DEBE ser idempotente: correrlo dos veces NO DEBE duplicar filas.

## Requisito 6 — Importar planilla

**Historia:** Como dueño quiero cargar una planilla de precios nuevos, para
actualizar muchos productos de una vez.

1. El sistema DEBE aceptar archivos `.xlsx` y `.csv`.
2. El sistema DEBE mostrar una vista previa con el conteo de filas nuevas, filas
   a actualizar y filas con error, ANTES de aplicar nada.
3. CUANDO una fila tiene un SKU existente, ENTONCES el sistema DEBE actualizar
   ese producto en lugar de crear uno nuevo.
4. CUANDO una fila carece de nombre o precio, ENTONCES el sistema DEBE marcarla
   como error, indicar el número de fila, y continuar con las demás.
5. La importación DEBE aplicarse en una transacción: o entran todas las filas
   válidas, o ninguna.
6. CUANDO la importación termina, ENTONCES el sistema DEBE informar cuántos
   productos se crearon y cuántos se actualizaron.
7. La importación DEBE registrarse en el historial de precios como cualquier otro
   cambio.
