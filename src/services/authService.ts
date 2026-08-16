import { supabase } from '@/lib/supabase'
import { ErrorDominio } from '@/lib/errorDominio'
import type { Perfil, RolUsuario } from '@/types/dominio'

export interface Usuario {
  id: string
  email: string | null
}

function mapearUsuario(usuario: { id: string; email?: string | null }): Usuario {
  return { id: usuario.id, email: usuario.email ?? null }
}

/** Inicia sesion con correo y contrasena. Lanza ErrorDominio si falla. */
export async function iniciarSesionConPassword(
  email: string,
  password: string,
): Promise<Usuario> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) {
    // Supabase devuelve el mismo error para "usuario no existe" y
    // "contrasena incorrecta": ya cumple el requisito 1.5 sin trabajo extra.
    throw new ErrorDominio(
      'auth.credenciales_invalidas',
      'Correo o contraseña incorrectos. Revisa e intenta de nuevo.',
    )
  }
  return mapearUsuario(data.user)
}

export async function cerrarSesion(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw new ErrorDominio('auth.cierre_fallido', 'No se pudo cerrar la sesión.')
  }
}

/**
 * Pide el enlace de recuperacion. Devuelve exito exista o no la cuenta
 * (requisito 3.2): Supabase ya no distingue el caso en la respuesta, asi que
 * no hay nada que ocultar aqui.
 */
export async function enviarRecuperacion(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/restablecer`,
  })
  if (error) {
    throw new ErrorDominio(
      'auth.recuperacion_fallida',
      'No se pudo enviar el enlace. Intenta de nuevo en unos minutos.',
    )
  }
}

/** Establece una nueva contrasena para la sesion de recuperacion activa. */
export async function actualizarContrasena(nuevaContrasena: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: nuevaContrasena })
  if (error) {
    throw new ErrorDominio(
      'auth.actualizacion_fallida',
      'No se pudo actualizar la contraseña. Pide un enlace nuevo.',
    )
  }
}

export async function obtenerPerfil(id: string): Promise<Perfil> {
  const { data, error } = await supabase
    .from('perfil')
    .select('id, nombre, rol, activo')
    .eq('id', id)
    .single()

  if (error || !data) {
    throw new ErrorDominio(
      'auth.perfil_no_encontrado',
      'No se encontró el perfil del usuario.',
    )
  }

  return {
    id: data.id as string,
    nombre: data.nombre as string,
    rol: data.rol as RolUsuario,
    activo: data.activo as boolean,
  }
}

/** Define o reemplaza el PIN del usuario autenticado. */
export async function definirPin(pin: string): Promise<void> {
  const { error } = await supabase.rpc('definir_pin', { p_pin: pin })
  if (!error) return

  if (error.message.includes('pin_formato_invalido')) {
    throw new ErrorDominio('auth.pin_formato_invalido', 'El PIN debe tener 4 dígitos.')
  }

  // Error inesperado: se registra para diagnostico, pero no se muestra el
  // texto crudo de Postgres al usuario (ver .claude/steering/tech.md).
  console.error('definirPin', error)
  throw new ErrorDominio(
    'auth.pin_no_guardado',
    'No se pudo guardar el PIN. Intenta de nuevo.',
  )
}

/**
 * Valida el PIN del usuario ya autenticado en este dispositivo. `false`
 * significa PIN incorrecto (requisito 2.4); una excepcion significa bloqueo
 * o que no hay PIN definido.
 */
export async function validarPin(pin: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('validar_pin', { p_pin: pin })

  if (error?.message.includes('pin_bloqueado')) {
    throw new ErrorDominio(
      'auth.pin_bloqueado',
      'Demasiados intentos. Usa tu contraseña o espera 5 minutos.',
    )
  }
  if (error) {
    throw new ErrorDominio(
      'auth.pin_no_definido',
      'Todavía no hay un PIN definido en este dispositivo.',
    )
  }

  return data === true
}
