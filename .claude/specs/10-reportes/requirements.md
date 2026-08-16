# Reportes — Requisitos

## Introducción

Ver el negocio en el tiempo: cuánto se vendió por periodo, qué se vende más, qué
deja más margen, cómo va comparado con antes.

El prototipo define seis periodos (Diario, Semanal, Mensual, Trimestral,
Semestral, Anual) con gráfico de barras y comparación contra el periodo anterior.
El Excel no tiene nada de esto: es todo terreno nuevo.

## Requisito 1 — Ventas por periodo

**Historia:** Como dueño quiero comparar cómo voy contra el periodo anterior, para
saber si el negocio crece.

1. El sistema DEBE ofrecer los seis periodos: Diario, Semanal, Mensual,
   Trimestral, Semestral y Anual.
2. Para cada periodo el sistema DEBE mostrar el total vendido, el número de
   ventas y el ticket promedio.
3. El sistema DEBE mostrar un gráfico de barras con la desagregación adecuada al
   periodo: horas para Diario, días para Semanal, semanas para Mensual, meses
   para Trimestral y Semestral, trimestres para Anual.
4. El sistema DEBE mostrar la variación porcentual contra el periodo anterior
   equivalente.
5. CUANDO no hay datos del periodo anterior, ENTONCES el sistema NO DEBE mostrar
   una variación; DEBE indicar que no hay base de comparación.
6. La barra del periodo actual DEBE destacarse con el color de acento.
7. El sistema DEBE permitir elegir un rango de fechas personalizado.
8. Los reportes DEBEN filtrarse por unidad de negocio, con opción consolidada.

## Requisito 2 — Moneda en los reportes

1. El sistema DEBE ofrecer dos métricas distintas y etiquetadas:
   «convertido a la tasa de hoy» y «tal como se cobró».
2. «Convertido a la tasa de hoy» DEBE sumar en USD y convertir una sola vez.
3. «Tal como se cobró» DEBE sumar los bolívares de cada venta usando la tasa que
   se aplicó en su momento.
4. El sistema DEBE indicar qué tasa usó en cada reporte.
5. Por defecto el sistema DEBE mostrar los totales en USD, porque es la única
   base comparable entre periodos con tasas distintas.

## Requisito 3 — Productos más vendidos

1. El sistema DEBE listar los productos ordenados por unidades vendidas en el
   periodo.
2. El sistema DEBE ofrecer también el orden por monto vendido, que no es el mismo
   ranking.
3. El sistema DEBE mostrar una barra proporcional al más vendido.
4. El sistema DEBE permitir ver el detalle por categoría.
5. El sistema DEBE mostrar los productos que no vendieron nada en el periodo.

## Requisito 4 — Margen y rentabilidad

**Historia:** Como dueño quiero saber qué productos me dejan más ganancia, no solo
cuáles vendo más.

1. El sistema DEBE calcular el margen bruto por producto como precio de venta
   menos costo.
2. El sistema DEBE calcular el margen total del periodo.
3. CUANDO un producto tiene costo nulo, ENTONCES el sistema DEBE excluirlo del
   cálculo de margen e indicar cuántos productos quedaron fuera.
4. El sistema DEBE listar los productos por contribución total al margen, que es
   margen unitario por unidades vendidas.
5. El sistema DEBE alertar sobre los productos con margen negativo.
6. SOLO un usuario con rol `dueno` DEBE poder ver los reportes de margen.

## Requisito 5 — Ventas por método de pago

1. El sistema DEBE mostrar el desglose de ventas por método de pago en el
   periodo.
2. El sistema DEBE mostrar el porcentaje que representa cada método.
3. El sistema DEBE mostrar la evolución de cada método en el tiempo.
4. El sistema DEBE separar lo cobrado de lo fiado.

## Requisito 6 — Exportación

1. El sistema DEBE permitir exportar cualquier reporte a CSV.
2. La exportación DEBE incluir ambas monedas y la tasa usada.
3. El sistema DEBE permitir exportar el detalle de ventas de un rango, con una
   fila por línea de venta.
4. Los archivos exportados DEBEN nombrarse con el reporte, la unidad de negocio y
   el rango de fechas.

## Requisito 7 — Rendimiento

1. Un reporte de cualquier periodo DEBE cargar en menos de 2 segundos con un año
   de datos.
2. El sistema DEBE calcular las agregaciones en el servidor, no traer las ventas
   crudas al cliente.
3. CUANDO un reporte tarda más de 500 ms, ENTONCES el sistema DEBE mostrar un
   esqueleto de carga, no una pantalla en blanco.
