import type { Router } from 'vue-router'

import { notificar } from '@/composables/useNotificaciones'
import { useSesionStore } from '@/stores/sesion'

/**
 * Guard global de autenticacion y rol. Espera a que la sesion se restaure
 * antes de decidir (evita el parpadeo de mandar al login a alguien que si
 * tenia sesion). Las rutas publicas se declaran con `meta.publica: true`;
 * las restringidas al dueno, con `meta.soloDueno: true`.
 */
export function registrarGuardDeSesion(router: Router): void {
  router.beforeEach(async to => {
    const sesion = useSesionStore()
    await sesion.esperarInicializacion()

    if (to.meta.publica) return true

    if (!sesion.autenticado) {
      return { name: 'ingresar', query: { destino: to.fullPath } }
    }

    if (sesion.bloqueada && to.name !== 'bloqueado') {
      return { name: 'bloqueado' }
    }

    if (to.meta.soloDueno && !sesion.esDueno) {
      notificar('No tienes permiso para esa sección')
      return { name: 'resumen' }
    }

    return true
  })
}
