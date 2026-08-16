import { supabase } from '@/lib/supabase'
import { ErrorDominio } from '@/lib/errorDominio'
import type { Perfil, RolUsuario } from '@/types/dominio'

export async function listarUsuarios(): Promise<Perfil[]> {
  const { data, error } = await supabase
    .from('perfil')
    .select('id, nombre, rol, activo')
    .order('nombre')

  if (error) {
    throw new ErrorDominio(
      'usuarios.listado_fallido',
      'No se pudo cargar la lista de usuarios.',
    )
  }

  return (data ?? []).map(fila => ({
    id: fila.id,
    nombre: fila.nombre,
    rol: fila.rol,
    activo: fila.activo,
  }))
}

export async function cambiarRol(id: string, rol: RolUsuario): Promise<void> {
  const { error } = await supabase.from('perfil').update({ rol }).eq('id', id)
  if (error) {
    const mensaje = error.message.includes('ultimo_dueno_activo')
      ? 'No puedes quitarle el rol de dueño al último dueño activo.'
      : 'No se pudo actualizar el rol.'
    throw new ErrorDominio('usuarios.rol_no_actualizado', mensaje)
  }
}

export async function desactivarUsuario(id: string): Promise<void> {
  const { error } = await supabase.from('perfil').update({ activo: false }).eq('id', id)
  if (error) {
    const mensaje = error.message.includes('ultimo_dueno_activo')
      ? 'No puedes desactivar al último dueño activo.'
      : 'No se pudo desactivar el usuario.'
    throw new ErrorDominio('usuarios.desactivacion_fallida', mensaje)
  }
}

export interface CrearUsuarioInput {
  nombre: string
  email: string
  rol: RolUsuario
}

/**
 * Crea un usuario via la Edge Function `crear-usuario`, que es quien usa la
 * clave service_role. El cliente nunca crea usuarios directamente (ver
 * .claude/specs/02-autenticacion-acceso/design.md).
 */
export async function crearUsuario(input: CrearUsuarioInput): Promise<void> {
  const { error } = await supabase.functions.invoke('crear-usuario', { body: input })
  if (!error) return

  // FunctionsHttpError trae la Response cruda en `context`; se lee el cuerpo
  // para diagnostico, pero al usuario se le muestra un mensaje traducido
  // (ver .claude/steering/tech.md).
  let detalle: unknown = error.message
  if ('context' in error && error.context instanceof Response) {
    detalle = await error.context.clone().text()
  }
  console.error('crearUsuario', detalle)

  throw new ErrorDominio('usuarios.creacion_fallida', 'No se pudo crear el usuario.')
}
