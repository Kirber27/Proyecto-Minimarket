# Arqueo de caja — Tareas

- [ ] 1. Esquema
  - [x] 1.1 Crear la tabla `denominacion` — sembrada con `insert` directo en la
        migración (son 13 filas fijas), no generada desde `mock/denominaciones.json`
        vía `generar_seed.py` como los demás catálogos
  - [x] 1.2 Crear la tabla `arqueo` con estado, contados, esperados y diferencias
  - [x] 1.3 Crear el índice único parcial de un arqueo cerrado por unidad y día
  - [x] 1.4 Crear `arqueo_detalle` con `check (cantidad >= 0)` y unicidad por denominación
  - [x] 1.5 Crear los triggers `impedir_editar_arqueo_cerrado` (arqueo) y
        `impedir_editar_detalle_cerrado` (arqueo_detalle, no estaba en el diseño
        original: el detalle necesitaba la misma protección)
  - [x] 1.6 Aplicar RLS: todos leen y guardan borradores; el cierre no es un
        `UPDATE` con RLS por rol, sino la RPC `cerrar_arqueo` (`security definer`,
        valida `dueno` adentro) — ver la nota en design.md
  - [x] 1.7 Prueba pgTAP: editar un arqueo cerrado falla — verificado que la fila
        no cambia (la RLS bloquea el UPDATE en silencio, 0 filas, sin excepción;
        mismo caso que el UPDATE de perfil en el spec 02)
  - _Requisitos: 1.1, 1.2, 1.6, 3.2, 3.5, 3.7_

- [ ] 2. Efectivo esperado
  - [x] 2.1 La columna `afecta_arqueo` no se agregó a ningún catálogo de métodos de
        pago (esa tabla no existe, ver spec 08): `efectivo_esperado` filtra
        listando `efectivo-ves`/`efectivo-usd` directamente
  - [x] 2.2 Implementar la función `efectivo_esperado` filtrando por esos dos métodos
  - [x] 2.3 Sumar el fondo inicial convertido a la tasa del arqueo
  - [ ] 2.4 Desglose de lo esperado por método — hoy el desglose solo separa Bs./USD
        (que ya es la ayuda de diagnóstico principal), no un renglón por cada
        método de pago
  - [x] 2.5 Prueba pgTAP: Punto no entra en el esperado (verificado con delta,
        no valor absoluto, por si el proyecto real ya tiene ventas de hoy)
  - _Requisitos: 2.1, 2.7, 2.8, 4.2_

- [ ] 3. Grilla de conteo
  - [x] 3.1 Construir la grilla de conteo, de mayor a menor denominación —
        integrada en `pages/arqueo/Arqueo.vue`, no un `ArqueoNuevo.vue` aparte
  - [x] 3.2 Calcular el subtotal por denominación en vivo
  - [x] 3.3 Aceptar solo enteros no negativos, tratando vacío como cero
  - [x] 3.4 Mostrar el total por moneda y el total combinado en USD, separado del cuadre
  - [x] 3.5 Aplicar `inputmode="numeric"` y `enterkeyhint="next"`
  - [x] 3.6 Fijar la barra de total al pie (`position: sticky` arriba, visible
        durante el desplazamiento de la grilla)
  - [ ] 3.7 Verificar el uso con una mano en 375 px — pendiente de prueba manual
        en dispositivo real
  - [x] 3.8 Verificado con pgTAP: el conteo de la hoja `MONEDA`
        (5×500 + 63×100 + 33×50 + 1×20) da exactamente 10.470
  - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8, 6.1, 6.2, 6.3_

- [ ] 4. Cuadre
  - [x] 4.1 Calcular las diferencias por separado para Bs. y USD
  - [x] 4.2 Mostrar el cuadre correcto cuando la diferencia es cero
  - [x] 4.3 Indicar faltante o sobrante con signo (palabra), color **y** etiqueta de texto
  - [ ] 4.4 El desglose de lo esperado como ayuda de diagnóstico queda en Bs./USD
        (ver tarea 2.4), no por método individual
  - [x] 4.5 Implementar el umbral configurable que hace obligatoria la nota — vive
        en `negocio.umbral_diferencia_usd`, editable desde Ajustes (dueño)
  - [x] 4.6 Verificado con pgTAP: la comparación usa el mayor de los dos
        desfases por separado (Bs. y USD convertidos a USD), no la suma —
        un sobrante grande en una moneda no tapa un faltante en la otra
  - _Requisitos: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [ ] 5. Borrador y cierre
  - [x] 5.1 Guardar el borrador localmente (Vue reactivo) en cada cambio
  - [x] 5.2 Sincronizar el borrador al servidor con rebote de 2 s
  - [x] 5.3 Restaurar el borrador al reabrir la pantalla (se busca en el servidor,
        no en `localStorage`: el arqueo ya es la fuente de verdad y varias
        personas pueden retomar el conteo desde dispositivos distintos)
  - [x] 5.4 Construir el diálogo de cierre con el resumen y la nota
  - [x] 5.5 Implementar la RPC `cerrar_arqueo` que congela totales, diferencias y
        tasa — recalcula el contado desde `arqueo_detalle` en vez de confiar en
        las columnas cacheadas por el cliente
  - [x] 5.6 Restringir el cierre al rol `dueno`
  - [x] 5.7 Impedir un segundo arqueo cerrado del mismo día (el índice único lo
        garantiza; el mensaje de error lo traduce el servicio) y ofrecer ver el
        existente
  - _Requisitos: 3.1, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 6.4_

- [ ] 6. Fondo de caja y retiro
  - [x] 6.1 El fondo de caja se captura al iniciar cada arqueo (columna
        `fondo_inicial_usd`), no como un ajuste aparte por unidad de negocio
  - [x] 6.2 Incluir el fondo en el efectivo esperado
  - [x] 6.3 Ofrecer registrar el retiro al cerrar — campo libre en el diálogo de
        cierre, sin sugerencia automática (para no inducir un monto equivocado)
  - [x] 6.4 Crear el egreso de categoría `retiro` por el monto retirado
  - [ ] 6.5 Verificar que el saldo del día siguiente arranca en el fondo —
        pendiente de probar en un segundo día real
  - _Requisitos: 4.1, 4.2, 4.3, 4.4_

- [ ] 7. Historial
  - [x] 7.1 Construir la navegación por fecha — modo «Historial» dentro de
        `Arqueo.vue`, mismo criterio que Inventario/Deudas/Caja
  - [x] 7.2 Resaltar los arqueos por encima del umbral
  - [x] 7.3 Construir `ArqueoDetalle.vue` con el conteo completo
  - [x] 7.4 Mostrar los bolívares con la tasa guardada en el arqueo
  - [x] 7.5 Construir el gráfico de tendencia de los últimos 30 arqueos
  - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 8. Verificación
  - [ ] 8.1 Prueba E2E: día con ventas en efectivo y por Punto → solo el
        efectivo entra al esperado — verificado por pgTAP contra el proyecto
        real, falta el recorrido E2E de Playwright
  - [ ] 8.2 Prueba E2E: contar, cuadrar con diferencia, escribir nota y cerrar —
        idem, pgTAP sí
  - [ ] 8.3 Prueba E2E: cerrar la app a mitad del conteo y recuperar el borrador
  - [x] 8.4 Verificado con pgTAP: un `mostrador` cuenta (inserta borrador, agrega
        detalle) pero `cerrar_arqueo` le rechaza con `sin_permiso`
  - _Requisitos: 2.8, 3.7, 3.8, 6.4_
