# Autenticación y control de acceso — Requisitos

## Introducción

Acceso a la app con dos modos: correo y contraseña (uso administrativo) y PIN de
4 dígitos (uso de mostrador, donde escribir una contraseña larga entre clientes
no es viable). Incluye recuperación por correo, roles y las políticas RLS que
protegen todas las tablas.

Nadie se registra solo. Las cuentas las crea el dueño desde administración.

## Requisito 1 — Ingreso con correo y contraseña

**Historia:** Como dueño quiero entrar con mi correo y contraseña, para acceder a
toda la administración.

1. CUANDO el usuario envía credenciales válidas, ENTONCES el sistema DEBE
   autenticarlo y llevarlo a `/` (Resumen).
2. CUANDO el correo no tiene formato válido, ENTONCES el sistema DEBE mostrar
   «El correo no tiene un formato válido» SIN llamar al servidor.
3. CUANDO falta el correo o la contraseña, ENTONCES el sistema DEBE mostrar
   «Ingresa tu correo y contraseña».
4. CUANDO las credenciales son incorrectas, ENTONCES el sistema DEBE mostrar
   «Correo o contraseña incorrectos. Revisa e intenta de nuevo.»
5. El mensaje de error NO DEBE revelar si el correo existe o no.
6. MIENTRAS la petición está en curso, el sistema DEBE deshabilitar el botón y
   mostrar estado de carga.
7. El usuario DEBE poder alternar la visibilidad de la contraseña.

## Requisito 2 — Ingreso con PIN

**Historia:** Como encargado de mostrador quiero entrar con un PIN de 4 dígitos,
para volver a la venta en dos segundos.

1. El sistema DEBE ofrecer un teclado numérico en pantalla de 4 posiciones.
2. CUANDO se ingresa el cuarto dígito, ENTONCES el sistema DEBE validar
   automáticamente, sin botón de confirmar.
3. CUANDO el PIN es correcto, ENTONCES el sistema DEBE autenticar y navegar a `/`.
4. CUANDO el PIN es incorrecto, ENTONCES el sistema DEBE limpiar los cuatro
   dígitos y mostrar «PIN incorrecto. Intenta otra vez.»
5. CUANDO se acumulan 5 intentos fallidos, ENTONCES el sistema DEBE bloquear el
   ingreso por PIN durante 5 minutos y ofrecer el ingreso por contraseña.
6. El sistema NO DEBE almacenar el PIN en claro en ningún lugar, ni en la base ni
   en el dispositivo.
7. El modo PIN SOLO DEBE estar disponible en un dispositivo donde ya se inició
   sesión con contraseña al menos una vez.

## Requisito 3 — Recuperación de contraseña

1. CUANDO el usuario pide recuperar y el correo es válido, ENTONCES el sistema
   DEBE enviar el enlace y mostrar la pantalla de confirmación.
2. El sistema DEBE mostrar la misma confirmación exista o no la cuenta.
3. CUANDO el correo tiene formato inválido, ENTONCES el sistema DEBE mostrar
   «Ingresa un correo válido para enviarte el enlace» sin llamar al servidor.
4. El enlace de recuperación DEBE caducar a los 60 minutos.

## Requisito 4 — Sesión

1. CUANDO el usuario marca «Recordarme», ENTONCES la sesión DEBE persistir entre
   cierres del navegador.
2. CUANDO el token expira, ENTONCES el sistema DEBE renovarlo de forma
   transparente si el refresh token sigue vigente.
3. CUANDO la renovación falla, ENTONCES el sistema DEBE llevar a la pantalla de
   ingreso conservando la ruta destino para volver a ella tras autenticar.
4. CUANDO el usuario cierra sesión, ENTONCES el sistema DEBE limpiar el estado
   local, incluido el carrito en curso.
5. CUANDO un usuario no autenticado abre una ruta protegida, ENTONCES el sistema
   DEBE redirigir a `/ingresar`.

## Requisito 5 — Roles y permisos

**Historia:** Como dueño quiero que el mostrador no pueda cambiar precios ni ver
los reportes de margen, para separar responsabilidades.

1. El sistema DEBE soportar los roles `dueno` y `mostrador`.
2. Un usuario con rol `mostrador` DEBE poder: registrar ventas, consultar
   inventario, registrar deudas y abonos, y hacer arqueos.
3. Un usuario con rol `mostrador` NO DEBE poder: crear o editar productos,
   cambiar precios, cambiar la tasa, ver reportes de margen, ni administrar
   usuarios.
4. CUANDO un usuario `mostrador` intenta abrir una ruta restringida, ENTONCES el
   sistema DEBE redirigir a `/` y mostrar «No tienes permiso para esa sección».
5. La restricción DEBE aplicarse también en la base de datos vía RLS, no solo en
   el enrutador. Ocultar un botón no es un control de acceso.

## Requisito 6 — Protección de datos (RLS)

1. TODA tabla del esquema `public` DEBE tener RLS habilitado.
2. CUANDO una petición llega sin sesión válida, ENTONCES la base NO DEBE
   devolver ninguna fila de ninguna tabla de negocio.
3. Las políticas de escritura DEBEN verificar el rol del usuario mediante una
   función `auth.rol_actual()` marcada `stable`.
4. El sistema NO DEBE incluir la clave `service_role` en el bundle del cliente.
