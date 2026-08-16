# Reportes — Tareas

- [ ] 1. Agregación en el servidor
  - [ ] 1.1 Implementar `reporte_ventas` con granularidad parametrizable
  - [ ] 1.2 Devolver `total_usd` y `total_ves_historico` en la misma consulta
  - [ ] 1.3 Aceptar `p_negocio` nulo como consolidado
  - [ ] 1.4 Excluir las ventas anuladas
  - [ ] 1.5 Crear los índices `venta_reporte_idx` y `venta_linea_producto_idx`
  - [ ] 1.6 Generar un año de datos sintéticos y medir cada periodo
  - _Requisitos: 1.1, 1.3, 2.2, 2.3, 7.1, 7.2_

- [ ] 2. Periodos y comparación
  - [ ] 2.1 Implementar el cálculo de rango y granularidad para los seis periodos
  - [ ] 2.2 Implementar el cálculo del periodo anterior equivalente
  - [ ] 2.3 Rellenar los cubos vacíos con ceros antes de graficar
  - [ ] 2.4 Mostrar «Sin base de comparación» cuando el periodo anterior no tiene datos
  - [ ] 2.5 Implementar el selector de rango de fechas personalizado
  - [ ] 2.6 Pruebas: la serie de un periodo con días sin ventas mantiene la alineación
  - _Requisitos: 1.1, 1.3, 1.4, 1.5, 1.7_

- [ ] 3. Gráfico de barras
  - [ ] 3.1 Implementar `GraficoBarras.vue` como SVG propio, sin dependencias
  - [ ] 3.2 Destacar la última barra con el color de acento
  - [ ] 3.3 Mostrar el valor abreviado encima y la etiqueta debajo
  - [ ] 3.4 Hacerlo accesible: tabla de datos alternativa para lector de pantalla
  - [ ] 3.5 Verificar que se lee bien a 375 px de ancho
  - _Requisitos: 1.3, 1.6_

- [ ] 4. Pantalla de reportes
  - [ ] 4.1 Construir `Reportes.vue` con el selector de los seis periodos
  - [ ] 4.2 Construir las tarjetas de total vendido, ventas y ticket promedio
  - [ ] 4.3 Mostrar la variación con flecha además del color
  - [ ] 4.4 Implementar el conmutador entre «convertido a hoy» y «tal como se cobró»
  - [ ] 4.5 Indicar qué tasa se usó
  - [ ] 4.6 Filtrar por unidad de negocio con opción consolidada
  - [ ] 4.7 Mostrar esqueleto de carga a partir de 500 ms
  - _Requisitos: 1.2, 1.4, 1.6, 1.8, 2.1, 2.4, 2.5, 7.3_

- [ ] 5. Reporte de productos
  - [ ] 5.1 Implementar `reporte_productos` con unidades, monto y margen
  - [ ] 5.2 Calcular el margen con `venta_linea.precio_unitario_usd`, no con el precio actual
  - [ ] 5.3 Construir el ranking con barra proporcional al más vendido
  - [ ] 5.4 Implementar el conmutador entre orden por unidades y por monto
  - [ ] 5.5 Implementar el desglose por categoría
  - [ ] 5.6 Listar los productos sin ventas en el periodo
  - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 6. Margen y rentabilidad
  - [ ] 6.1 Implementar `reporte_margen` con verificación de rol en la función
  - [ ] 6.2 Excluir del cálculo los productos con costo nulo
  - [ ] 6.3 Indicar cuántos productos quedaron fuera y por qué
  - [ ] 6.4 Ordenar por contribución total al margen
  - [ ] 6.5 Alertar sobre los productos con margen negativo
  - [ ] 6.6 Marcar la ruta con `meta.soloDueno` y ocultarla de la navegación del `mostrador`
  - [ ] 6.7 Anotar `costo_snapshot` en `venta_linea` como trabajo futuro
  - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 7. Métodos de pago
  - [ ] 7.1 Implementar la agregación por método en el periodo
  - [ ] 7.2 Mostrar el porcentaje de cada método
  - [ ] 7.3 Construir el gráfico de evolución por método
  - [ ] 7.4 Separar lo cobrado de lo fiado
  - _Requisitos: 5.1, 5.2, 5.3, 5.4_

- [ ] 8. Exportación
  - [ ] 8.1 Implementar la generación de CSV en el cliente
  - [ ] 8.2 Incluir la fila de cabecera con tasa y fecha de generación
  - [ ] 8.3 Incluir ambas monedas en cada fila
  - [ ] 8.4 Implementar el detalle de ventas por línea, paginado en bloques de 5.000
  - [ ] 8.5 Nombrar los archivos con reporte, unidad de negocio y rango
  - _Requisitos: 6.1, 6.2, 6.3, 6.4_

- [ ] 9. Verificación
  - [ ] 9.1 Verificar que cada periodo carga en menos de 2 s con un año de datos
  - [ ] 9.2 Prueba: los dos totales de moneda difieren cuando la tasa cambió en el periodo
  - [ ] 9.3 Prueba: un `mostrador` no puede llamar a `reporte_margen`
  - [ ] 9.4 Verificar la accesibilidad del gráfico con lector de pantalla
  - _Requisitos: 2.1, 4.6, 7.1_
