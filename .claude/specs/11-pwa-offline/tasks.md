# PWA y funcionamiento sin conexión — Tareas

- [ ] 1. Manifiesto e instalación
  - [ ] 1.1 Configurar `vite-plugin-pwa` en modo `injectManifest`
  - [ ] 1.2 Escribir el manifiesto con nombre, iconos, color de tema y `display: standalone`
  - [ ] 1.3 Generar los iconos de 192, 512 y 512 enmascarable
  - [ ] 1.4 Declarar `orientation: portrait`
  - [ ] 1.5 Construir el aviso propio de instalación capturando `beforeinstallprompt`
  - [ ] 1.6 Guardar el descarte y no volver a ofrecer en 30 días
  - [ ] 1.7 Verificar la instalación real en Android y en iOS
  - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [ ] 2. Service worker
  - [ ] 2.1 Escribir el service worker con el precache del shell
  - [ ] 2.2 Configurar network-first con respaldo para las consultas de datos
  - [ ] 2.3 Limpiar las cachés de versiones anteriores al activar
  - [ ] 2.4 Verificar que la app carga completa con la red desconectada
  - _Requisitos: 2.1, 2.2, 6.3_

- [ ] 3. Almacenamiento local
  - [ ] 3.1 Agregar `idb` y definir el esquema con los cinco almacenes
  - [ ] 3.2 Implementar la caché del catálogo con stale-while-revalidate
  - [ ] 3.3 Cachear categorías y clientes
  - [ ] 3.4 Guardar la marca de tiempo de la última sincronización en `meta`
  - [ ] 3.5 Implementar la purga del histórico de más de 7 días
  - _Requisitos: 2.3, 2.4, 7.2_

- [ ] 4. Detección de conexión
  - [ ] 4.1 Implementar `useConexion()` con los eventos `online` y `offline`
  - [ ] 4.2 Verificar la conectividad real con una petición ligera, no solo `navigator.onLine`
  - [ ] 4.3 Construir la banda de estado sin conexión con el conteo de pendientes
  - [ ] 4.4 Indicar la antigüedad de los datos cuando supera una hora
  - _Requisitos: 2.5, 2.6, 3.4_

- [ ] 5. Cola de operaciones
  - [ ] 5.1 Definir el tipo `OperacionPendiente` y el almacén con `autoIncrement`
  - [ ] 5.2 Implementar `encolar()` generando la llave de idempotencia al registrar
  - [ ] 5.3 Enrutar ventas, egresos y abonos por la cola cuando no hay conexión
  - [ ] 5.4 Deshabilitar tasa, productos, cierre de arqueo y anulación sin conexión, con la explicación
  - [ ] 5.5 Implementar el stock estimado descontando lo que hay en cola
  - [ ] 5.6 Marcar el stock como estimado en la interfaz mientras no hay conexión
  - [ ] 5.7 Mostrar las ventas encoladas en el resumen del día, marcadas como pendientes
  - [ ] 5.8 Verificar que la cola sobrevive al cierre de la app
  - _Requisitos: 3.1, 3.2, 3.3, 3.5, 3.6, 3.7, 3.8_

- [ ] 6. Sincronización
  - [ ] 6.1 Implementar `sincronizar()` recorriendo la cola en orden de clave
  - [ ] 6.2 Enviar cada operación con su llave de idempotencia sin regenerarla
  - [ ] 6.3 Implementar la clasificación entre error de red y error de negocio
  - [ ] 6.4 Implementar la espera creciente con tope de 5 minutos para errores de red
  - [ ] 6.5 Mover los errores de negocio a conflictos y continuar con las siguientes
  - [ ] 6.6 Disparar la sincronización con `online`, al abrir, tras cada operación y cada 60 s
  - [ ] 6.7 Implementar el botón de sincronizar manualmente
  - [ ] 6.8 Mostrar el toast con el resultado de la sincronización
  - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [ ] 7. Bandeja de conflictos
  - [ ] 7.1 Construir `Conflictos.vue` con operación, fecha y motivo
  - [ ] 7.2 Implementar reintentar una operación en conflicto
  - [ ] 7.3 Implementar descartar con confirmación
  - [ ] 7.4 Revertir el descuento de stock local al descartar una venta
  - [ ] 7.5 Mostrar el conteo de conflictos en el Resumen
  - [ ] 7.6 Verificar que nada caduca ni se descarta solo
  - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [ ] 8. Actualizaciones
  - [ ] 8.1 Implementar `onNeedRefresh` con el aviso de versión nueva
  - [ ] 8.2 Retener el aviso mientras haya carrito con líneas o arqueo en borrador
  - [ ] 8.3 Implementar la migración de la cola en el `upgrade` de IndexedDB
  - [ ] 8.4 Prueba: actualizar con operaciones pendientes las conserva
  - _Requisitos: 6.1, 6.2, 6.4_

- [ ] 9. Límites y cuota
  - [ ] 9.1 Advertir al superar 50 operaciones pendientes
  - [ ] 9.2 Manejar `QuotaExceededError` con el orden de purga definido
  - [ ] 9.3 Verificar que la cola nunca se purga
  - [ ] 9.4 Prueba: llenar la cuota y confirmar que las operaciones pendientes sobreviven
  - _Requisitos: 7.1, 7.2, 7.3_

- [ ] 10. Verificación
  - [ ] 10.1 Prueba E2E: desconectar → registrar 3 ventas → reconectar → las 3 entran una sola vez
  - [ ] 10.2 Prueba E2E: venta sin conexión sobre un producto agotado por otro dispositivo → va a conflictos
  - [ ] 10.3 Prueba E2E: respuesta perdida y reintento no duplica la venta
  - [ ] 10.4 Prueba manual en un Android de gama baja con la red intermitente
  - [ ] 10.5 Auditoría Lighthouse de PWA con puntaje instalable
  - _Requisitos: 3.2, 4.3, 5.2_
