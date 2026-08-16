import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import * as tasaService from '@/services/tasaService'
import type { Tasa } from '@/services/tasaService'

const HORAS_PARA_DESACTUALIZADA = 24

/**
 * Alcance minimo del spec 04 (ver .claude/specs/04-tasa-y-moneda/), lo
 * necesario para que PrecioDoble.vue del catalogo (spec 03) tenga una tasa
 * real. Quedan pendientes: Realtime, historial completo, el modal de
 * registro con confirmacion de variacion >20%, y el aviso en la cabecera.
 */
export const useTasaStore = defineStore('tasa', () => {
  const vigente = ref<Tasa | null>(null)
  const cargando = ref(true)

  const valor = computed(() => vigente.value?.valor ?? null)
  const disponible = computed(() => valor.value !== null)

  const horasDeAntiguedad = computed(() => {
    if (!vigente.value) return null
    const transcurrido = Date.now() - new Date(vigente.value.vigenteDesde).getTime()
    return transcurrido / (1000 * 60 * 60)
  })

  const desactualizada = computed(
    () => (horasDeAntiguedad.value ?? 0) > HORAS_PARA_DESACTUALIZADA,
  )

  async function cargar(): Promise<void> {
    cargando.value = true
    try {
      vigente.value = await tasaService.obtenerVigente()
    } finally {
      cargando.value = false
    }
  }

  async function registrar(nuevoValor: number, nota?: string): Promise<void> {
    vigente.value = await tasaService.registrar(nuevoValor, nota)
  }

  return {
    vigente,
    cargando,
    valor,
    disponible,
    desactualizada,
    horasDeAntiguedad,
    cargar,
    registrar,
  }
})
