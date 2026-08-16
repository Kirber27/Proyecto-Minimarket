# Autenticación y control de acceso — Tareas

- [ ] 1. Esquema y políticas
  - [ ] 1.1 Escribir `0002_auth.sql` con el enum `rol_usuario` y la tabla `perfil`
  - [ ] 1.2 Implementar `auth.rol_actual()` leyendo el rol desde el JWT
  - [ ] 1.3 Crear las políticas RLS de `perfil` y verificar que no hay recursión
  - [ ] 1.4 Crear el trigger que sincroniza `perfil.rol` con `app_metadata`
  - [ ] 1.5 Escribir pruebas pgTAP: un `mostrador` no puede escribir en `perfil`
  - _Requisitos: 5.1, 6.1, 6.2, 6.3_

- [ ] 2. Ingreso con correo y contraseña
  - [ ] 2.1 Crear `useSesionStore` con `iniciarConPassword`, `cerrar` y `esperarInicializacion`
  - [ ] 2.2 Implementar `authService` sobre `supabase.auth`, traduciendo errores a códigos de dominio
  - [ ] 2.3 Construir `PantallaIngreso.vue` con los campos, el interruptor de visibilidad y «Recordarme»
  - [ ] 2.4 Validar formato de correo en cliente antes de llamar al servidor
  - [ ] 2.5 Implementar el estado de carga que deshabilita el botón
  - [ ] 2.6 Mapear los códigos de error a los mensajes de la tabla del diseño
  - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [ ] 3. Ingreso con PIN
  - [ ] 3.1 Agregar `pin_hash` y `pin_bloqueado_hasta`, y la RPC `definir_pin`
  - [ ] 3.2 Implementar la RPC `validar_pin` con el contador de fallos y el bloqueo de 5 minutos
  - [ ] 3.3 Construir `TecladoPin.vue`: 4 posiciones, validación automática al cuarto dígito
  - [ ] 3.4 Mostrar el selector de modo solo si hay refresh token y PIN definido
  - [ ] 3.5 Limpiar los dígitos y mostrar el error cuando el PIN falla
  - [ ] 3.6 Construir la pantalla de definición de PIN en Ajustes
  - [ ] 3.7 Prueba pgTAP: 5 fallos bloquean, el sexto intento correcto sigue bloqueado
  - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [ ] 4. Recuperación de contraseña
  - [ ] 4.1 Implementar el envío con `resetPasswordForEmail`
  - [ ] 4.2 Construir las vistas `forgot` y `sent`
  - [ ] 4.3 Devolver la misma confirmación exista o no la cuenta
  - [ ] 4.4 Construir la pantalla de nueva contraseña que recibe el enlace
  - [ ] 4.5 Configurar la caducidad del enlace en 60 minutos
  - _Requisitos: 3.1, 3.2, 3.3, 3.4_

- [ ] 5. Sesión y guards
  - [ ] 5.1 Configurar persistencia y renovación automática en el cliente
  - [ ] 5.2 Implementar el guard global con `esperarInicializacion`
  - [ ] 5.3 Conservar la ruta destino en `query.destino` y volver a ella tras ingresar
  - [ ] 5.4 Implementar `cerrar()` limpiando carrito y demás stores
  - [ ] 5.5 Marcar `meta.soloDueno` en Productos, Categorías, Reportes, Ajustes y Usuarios
  - [ ] 5.6 Redirigir y notificar cuando un `mostrador` toca una ruta restringida
  - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5, 5.4_

- [ ] 6. Administración de usuarios
  - [ ] 6.1 Construir la pantalla de usuarios (solo `dueno`): listar, crear, desactivar
  - [ ] 6.2 Crear usuarios vía Edge Function con `service_role`, nunca desde el cliente
  - [ ] 6.3 Permitir cambiar el rol de un usuario existente
  - [ ] 6.4 Impedir que el último `dueno` activo se desactive a sí mismo
  - _Requisitos: 5.1, 5.2, 5.3, 6.4_

- [ ] 7. Verificación
  - [ ] 7.1 Prueba E2E: ingreso con contraseña → definir PIN → cerrar sesión → ingreso con PIN
  - [ ] 7.2 Prueba E2E: un `mostrador` no ve Productos en la navegación y no puede llegar por URL
  - [ ] 7.3 Verificar con `curl` sin token que ninguna tabla devuelve filas
  - [ ] 7.4 Auditar el bundle: la clave `service_role` no aparece
  - _Requisitos: 5.5, 6.2, 6.4_
