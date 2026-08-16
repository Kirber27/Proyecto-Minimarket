import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

const CLAVE_OCULTAR_MONTOS = 'mm_ocultar_montos'

function leerPreferenciaGuardada(): boolean {
  return localStorage.getItem(CLAVE_OCULTAR_MONTOS) === '1'
}

/**
 * Preferencias de interfaz que no son datos de negocio. Por ahora solo el
 * modo "montos ocultos" (ver .claude/steering/ui-ux.md): enmascara las
 * cifras cuando hay clientes mirando la pantalla del mostrador.
 */
export const usePreferenciasStore = defineStore('preferencias', () => {
  const ocultarMontos = ref(leerPreferenciaGuardada())

  watch(ocultarMontos, valor => {
    localStorage.setItem(CLAVE_OCULTAR_MONTOS, valor ? '1' : '0')
  })

  function alternarOcultarMontos(): void {
    ocultarMontos.value = !ocultarMontos.value
  }

  return { ocultarMontos, alternarOcultarMontos }
})
