# Autenticación y control de acceso — Tareas

- [ ] 1. Esquema y políticas
  - [x] 1.1 Escribir `0002_auth.sql` con el enum `rol_usuario` y la tabla `perfil`
  - [x] 1.2 Implementar `public.rol_actual()` leyendo el rol desde el JWT
  - [x] 1.3 Crear las políticas RLS de `perfil` y verificar que no hay recursión
  - [x] 1.4 Crear el trigger que sincroniza `perfil.rol` con `app_metadata`
  - [x] 1.5 Escribir pruebas pgTAP: un `mostrador` no puede escribir en `perfil`
  - _Requisitos: 5.1, 6.1, 6.2, 6.3_

- [ ] 2. Ingreso con correo y contraseña
  - [x] 2.1 Crear `useSesionStore` con `iniciarConPassword`, `cerrar` y `esperarInicializacion`
  - [x] 2.2 Implementar `authService` sobre `supabase.auth`, traduciendo errores a códigos de dominio
  - [x] 2.3 Construir `PantallaIngreso.vue` con los campos, el interruptor de visibilidad y «Recordarme»
  - [x] 2.4 Validar formato de correo en cliente antes de llamar al servidor
  - [x] 2.5 Implementar el estado de carga que deshabilita el botón
  - [x] 2.6 Mapear los códigos de error a los mensajes de la tabla del diseño
  - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [ ] 3. Bloqueo de pantalla con PIN
  - [x] 3.1 Agregar `pin_hash`, `pin_intentos_fallidos` y `pin_bloqueado_hasta`, y la RPC `definir_pin`
  - [x] 3.2 Implementar la RPC `validar_pin` con el contador de fallos y el bloqueo de 5 minutos (`search_path` debe incluir `extensions`, donde vive `pgcrypto` en Supabase hosted)
  - [x] 3.3 Construir `TecladoPin.vue`: 4 posiciones, validación automática al cuarto dígito
  - [x] 3.4 Mostrar el boton "Bloquear ahora" en Ajustes solo si el dispositivo ya tiene PIN definido; construir `PantallaBloqueo.vue` en `/bloqueado`, forzada por el guard mientras `sesion.bloqueada` sea `true`
  - [x] 3.5 Limpiar los dígitos y mostrar el error cuando el PIN falla
  - [x] 3.6 Construir la pantalla de definición de PIN en Ajustes
  - [x] 3.7 Prueba pgTAP: 5 fallos bloquean, el sexto intento correcto sigue bloqueado
  - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [ ] 4. Recuperación de contraseña
  - [ ] 4.1 Implementar el envío con `resetPasswordForEmail`
  - [ ] 4.2 Construir las vistas `forgot` y `sent`
  - [ ] 4.3 Devolver la misma confirmación exista o no la cuenta
  - [ ] 4.4 Construir la pantalla de nueva contraseña que recibe el enlace
  - [ ] 4.5 Configurar la caducidad del enlace en 60 minutos
  - _Requisitos: 3.1, 3.2, 3.3, 3.4_

- [ ] 5. Sesión y guards
  - [x] 5.1 Configurar persistencia y renovación automática en el cliente
  - [x] 5.2 Implementar el guard global con `esperarInicializacion`
  - [x] 5.3 Conservar la ruta destino en `query.destino` y volver a ella tras ingresar
  - [ ] 5.4 Implementar `cerrar()` limpiando carrito y demás stores
  - [x] 5.5 Marcar `meta.soloDueno` en Productos, Categorías, Reportes y Usuarios. Ajustes
        NO lleva `soloDueno`: un `mostrador` también necesita entrar ahí para definir su
        propio PIN. La seccion "Usuarios" dentro de Ajustes se oculta con `v-if="sesion.esDueno"`,
        no con una restriccion de ruta
  - [x] 5.6 Redirigir y notificar cuando un `mostrador` toca una ruta restringida
  - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5, 5.4_

- [ ] 6. Administración de usuarios
  - [x] 6.1 Construir la pantalla de usuarios (solo `dueno`): listar, crear, desactivar
  - [x] 6.2 Crear usuarios vía Edge Function con `service_role`, nunca desde el cliente
  - [x] 6.3 Permitir cambiar el rol de un usuario existente
  - [x] 6.4 Impedir que el último `dueno` activo se desactive a sí mismo
  - _Requisitos: 5.1, 5.2, 5.3, 6.4_

- [ ] 7. Verificación
  - [ ] 7.1 Prueba manual: ingreso con contraseña → definir PIN → bloquear pantalla → desbloquear con PIN (verificado en vivo contra el proyecto real; falta automatizar en Playwright con credenciales de prueba)
  - [x] 7.2 Verificado en vivo: un `mostrador` no ve Productos/Categorías/Reportes/Usuarios en la navegación y rebota con aviso al entrar por URL
  - [x] 7.3 Verificar con `curl` sin token que ninguna tabla devuelve filas
  - [x] 7.4 Auditar el bundle: la clave `service_role` no aparece
  - _Requisitos: 5.5, 6.2, 6.4_
