# Arqueo de caja — Tareas

- [ ] 1. Esquema
  - [ ] 1.1 Crear la tabla `denominacion` y sembrarla desde `mock/denominaciones.json`
  - [ ] 1.2 Crear la tabla `arqueo` con estado, contados, esperados y diferencias
  - [ ] 1.3 Crear el índice único parcial de un arqueo cerrado por unidad y día
  - [ ] 1.4 Crear `arqueo_detalle` con `check (cantidad >= 0)` y unicidad por denominación
  - [ ] 1.5 Crear el trigger `impedir_editar_arqueo_cerrado`
  - [ ] 1.6 Aplicar RLS: todos leen, `mostrador` guarda borradores, solo `dueno` cierra
  - [ ] 1.7 Prueba pgTAP: editar un arqueo cerrado falla
  - _Requisitos: 1.1, 1.2, 1.6, 3.2, 3.5, 3.7_

- [ ] 2. Efectivo esperado
  - [ ] 2.1 Agregar la columna `afecta_arqueo` al catálogo de métodos de pago
  - [ ] 2.2 Implementar la función `efectivo_esperado` filtrando por `afecta_arqueo`
  - [ ] 2.3 Sumar el fondo inicial convertido a la tasa del arqueo
  - [ ] 2.4 Implementar el desglose de lo esperado por método
  - [ ] 2.5 Prueba pgTAP: Punto y Pago móvil no entran en el esperado
  - _Requisitos: 2.1, 2.7, 2.8, 4.2_

- [ ] 3. Grilla de conteo
  - [ ] 3.1 Construir `ArqueoNuevo.vue` con las dos grillas, de mayor a menor denominación
  - [ ] 3.2 Calcular el subtotal por denominación en vivo
  - [ ] 3.3 Aceptar solo enteros no negativos, tratando vacío como cero
  - [ ] 3.4 Mostrar el total por moneda y el total combinado en USD, claramente separado del cuadre
  - [ ] 3.5 Aplicar `inputmode="numeric"` y `enterkeyhint="next"`
  - [ ] 3.6 Fijar la barra de total al pie, visible durante el desplazamiento
  - [ ] 3.7 Verificar el uso con una mano en 375 px
  - [ ] 3.8 Prueba: el conteo de la hoja `MONEDA` (5×500 + 63×100 + 33×50 + 1×20) da 10.470
  - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8, 6.1, 6.2, 6.3_

- [ ] 4. Cuadre
  - [ ] 4.1 Calcular las diferencias por separado para Bs. y USD
  - [ ] 4.2 Mostrar el cuadre correcto cuando la diferencia es cero
  - [ ] 4.3 Indicar faltante o sobrante con signo, color **y** etiqueta de texto
  - [ ] 4.4 Mostrar el desglose de lo esperado por método como ayuda de diagnóstico
  - [ ] 4.5 Implementar el umbral configurable que hace obligatoria la nota
  - [ ] 4.6 Prueba: sobrante en Bs. y faltante en USD se muestran por separado, no compensados
  - _Requisitos: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [ ] 5. Borrador y cierre
  - [ ] 5.1 Guardar el borrador en `localStorage` en cada cambio
  - [ ] 5.2 Sincronizar el borrador al servidor con rebote de 2 s
  - [ ] 5.3 Restaurar el borrador al reabrir la pantalla
  - [ ] 5.4 Construir el diálogo de cierre con el resumen y la nota
  - [ ] 5.5 Implementar la RPC de cierre que congela totales, diferencias y tasa
  - [ ] 5.6 Restringir el cierre al rol `dueno`
  - [ ] 5.7 Impedir un segundo arqueo cerrado del mismo día y ofrecer ver el existente
  - _Requisitos: 3.1, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 6.4_

- [ ] 6. Fondo de caja y retiro
  - [ ] 6.1 Agregar el ajuste de fondo de caja por unidad de negocio
  - [ ] 6.2 Incluir el fondo en el efectivo esperado
  - [ ] 6.3 Ofrecer registrar el retiro al cerrar, sugiriendo lo contado menos el fondo
  - [ ] 6.4 Crear el egreso de categoría `retiro` por el monto retirado
  - [ ] 6.5 Verificar que el saldo del día siguiente arranca en el fondo
  - _Requisitos: 4.1, 4.2, 4.3, 4.4_

- [ ] 7. Historial
  - [ ] 7.1 Construir `ArqueoHistorial.vue` con fecha, unidad, diferencia y usuario
  - [ ] 7.2 Resaltar los arqueos por encima del umbral
  - [ ] 7.3 Construir `ArqueoDetalle.vue` con el conteo completo
  - [ ] 7.4 Mostrar los bolívares con la tasa guardada en el arqueo
  - [ ] 7.5 Construir el gráfico de tendencia de los últimos 30 arqueos
  - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 8. Verificación
  - [ ] 8.1 Prueba E2E: día con ventas en efectivo y por Punto → solo el efectivo entra al esperado
  - [ ] 8.2 Prueba E2E: contar, cuadrar con diferencia, escribir nota y cerrar
  - [ ] 8.3 Prueba E2E: cerrar la app a mitad del conteo y recuperar el borrador
  - [ ] 8.4 Verificar que un `mostrador` puede contar pero no cerrar
  - _Requisitos: 2.8, 3.7, 3.8, 6.4_
