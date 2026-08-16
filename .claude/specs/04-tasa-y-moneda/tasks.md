# Tasa de cambio y moneda dual — Tareas

- [ ] 1. Esquema de tasas
  - [ ] 1.1 Crear `tasa_cambio` con `check (valor > 0)` e índice por `vigente_desde desc`
  - [ ] 1.2 Implementar `public.tasa_vigente()` con desempate por `id desc`
  - [ ] 1.3 Aplicar RLS: lectura para todos, `insert` solo `dueno`, sin `update` ni `delete`
  - [ ] 1.4 Sembrar la tasa inicial de 800 desde `mock/tasa-cambio.json`
  - [ ] 1.5 Prueba pgTAP: `update` sobre una tasa es rechazado
  - _Requisitos: 1.4, 1.6, 1.8, 2.1_

- [ ] 2. Store de tasa
  - [ ] 2.1 Implementar `tasaService` con `obtenerVigente`, `registrar`, `historial`
  - [ ] 2.2 Implementar `useTasaStore` con `vigente`, `disponible` y `desactualizada`
  - [ ] 2.3 Implementar `suscribir()` sobre el canal Realtime de `tasa_cambio`
  - [ ] 2.4 Cancelar la suscripción al cerrar sesión
  - [ ] 2.5 Prueba: al llegar un evento Realtime, `valor` se actualiza sin recargar
  - _Requisitos: 1.3, 2.1, 2.3, 5.1_

- [ ] 3. Composable y componentes de moneda
  - [ ] 3.1 Implementar `useMoneda()` con `bs`, `mostrarUsd`, `mostrarBs`
  - [ ] 3.2 Centralizar el enmascarado de «ocultar montos» dentro del composable
  - [ ] 3.3 Implementar `PrecioDoble.vue` con `tasaFija`, `tamano` e `invertido`
  - [ ] 3.4 Reemplazar todo formateo de moneda suelto por `PrecioDoble`
  - [ ] 3.5 Prueba: el total en Bs. de un carrito de 3 líneas es `redondear(total × tasa)`, no la suma por línea
  - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 4. Interfaz de la tasa
  - [ ] 4.1 Construir `IndicadorTasa.vue` en la cabecera con valor y antigüedad
  - [ ] 4.2 Construir el modal de registro de tasa, accesible desde la cabecera
  - [ ] 4.3 Ocultar la acción de editar para el rol `mostrador`
  - [ ] 4.4 Implementar la confirmación de variación mayor al 20 % con el ejemplo de producto
  - [ ] 4.5 Implementar el diálogo de «corregir la de hoy o registrar nueva»
  - [ ] 4.6 Mostrar la banda de aviso cuando la tasa supera las 24 horas
  - [ ] 4.7 Bloquear la pantalla de venta cuando no hay ninguna tasa, con el mensaje del requisito 2.2
  - [ ] 4.8 Construir la vista de historial de tasas
  - _Requisitos: 1.1, 1.2, 1.5, 1.7, 1.8, 2.2, 2.3, 2.4_

- [ ] 5. Tasa histórica en documentos
  - [ ] 5.1 Agregar `tasa_aplicada` a `venta`, `egreso` y `deuda_movimiento`
  - [ ] 5.2 Poblarla en el momento de crear cada documento
  - [ ] 5.3 Pasar `tasaFija` a `PrecioDoble` en todas las vistas de detalle histórico
  - [ ] 5.4 Verificar que no existe ninguna columna `total_ves` persistida
  - [ ] 5.5 Prueba E2E: crear venta → cambiar la tasa → el detalle de la venta conserva los Bs. originales
  - _Requisitos: 4.1, 4.2, 4.3, 4.4_

- [ ] 6. Validación servidor-cliente
  - [ ] 6.1 Agregar el parámetro `p_tasa_cliente` a `crear_venta` y la comparación contra `tasa_vigente()`
  - [ ] 6.2 Devolver la tasa correcta en el `detail` del error `tasa_desactualizada`
  - [ ] 6.3 Atrapar el error en el cliente, actualizar el store y mostrar el aviso comparativo
  - [ ] 6.4 Ofrecer reintentar con un toque, sin reintentar automáticamente
  - [ ] 6.5 Prueba E2E: armar carrito → cambiar la tasa desde otra sesión → confirmar → aparece el aviso
  - _Requisitos: 5.1, 5.2, 5.3, 5.4_

- [ ] 7. Reportes
  - [ ] 7.1 Implementar la métrica «convertido a tasa de hoy»: suma en USD, una conversión
  - [ ] 7.2 Implementar la métrica «tal como se cobró»: suma de Bs. con la tasa de cada venta
  - [ ] 7.3 Etiquetar ambas de forma distinguible en la interfaz
  - [ ] 7.4 Indicar en cada reporte qué tasa se usó
  - _Requisitos: 6.1, 6.2, 6.3_
