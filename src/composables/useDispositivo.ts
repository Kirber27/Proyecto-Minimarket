// Marca liviana en localStorage para decidir si se ofrece el modo PIN
// (requisito 2.7: solo en un dispositivo donde ya se inicio sesion con
// contrasena y donde el perfil tiene un PIN definido). No es la fuente de
// verdad: la RPC validar_pin es quien realmente autoriza.

const CLAVE_CONOCIDO = 'mm_dispositivo_conocido'
const CLAVE_PIN_DEFINIDO = 'mm_pin_definido'

export function marcarDispositivoConocido(): void {
  localStorage.setItem(CLAVE_CONOCIDO, '1')
}

export function marcarPinDefinido(): void {
  localStorage.setItem(CLAVE_PIN_DEFINIDO, '1')
}

/** Se llama al cerrar sesion: sin refresh token valido, el PIN no sirve. */
export function olvidarDispositivo(): void {
  localStorage.removeItem(CLAVE_CONOCIDO)
  localStorage.removeItem(CLAVE_PIN_DEFINIDO)
}

export function tieneModoPinDisponible(): boolean {
  return (
    localStorage.getItem(CLAVE_CONOCIDO) === '1' &&
    localStorage.getItem(CLAVE_PIN_DEFINIDO) === '1'
  )
}
