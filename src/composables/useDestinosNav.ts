import { computed, type ComputedRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useSesionStore } from '@/stores/sesion'

export interface DestinoNavResuelto {
  ruta: string
  etiqueta: string
  orden: number
  activo: boolean
}

/**
 * Construye la lista de destinos de una barra de navegacion filtrando
 * `router.getRoutes()` por la presencia de `meta.navMovil` o
 * `meta.navEscritorio`, ordenando por `orden`. Agregar un destino a la app es
 * agregar una ruta, no editar una lista aparte.
 *
 * Los destinos `meta.soloDueno` se ocultan para `mostrador`. Es una
 * comodidad de interfaz, no el control de acceso real: eso lo hace el guard
 * del router y la politica RLS (ver .claude/specs/02-autenticacion-acceso).
 */
export function useDestinosNav(
  tipo: 'navMovil' | 'navEscritorio',
): ComputedRef<DestinoNavResuelto[]> {
  const router = useRouter()
  const route = useRoute()
  const sesion = useSesionStore()

  return computed(() =>
    router
      .getRoutes()
      .filter(r => r.meta[tipo])
      .filter(r => !r.meta.soloDueno || sesion.esDueno)
      .map(r => ({
        ruta: r.path,
        etiqueta: r.meta[tipo]!.etiqueta,
        orden: r.meta[tipo]!.orden,
        activo: route.path === r.path,
      }))
      .sort((a, b) => a.orden - b.orden),
  )
}
