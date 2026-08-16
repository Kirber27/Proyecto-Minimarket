import { ref } from 'vue'

export interface Notificacion {
  id: number
  mensaje: string
}

const notificaciones = ref<Notificacion[]>([])
let siguienteId = 1

/** Encola un aviso breve (toast de 2,2s, ver .claude/steering/ui-ux.md). */
export function notificar(mensaje: string): void {
  notificaciones.value.push({ id: siguienteId++, mensaje })
}

function quitar(id: number): void {
  notificaciones.value = notificaciones.value.filter(n => n.id !== id)
}

export function useNotificaciones() {
  return { notificaciones, quitar }
}
