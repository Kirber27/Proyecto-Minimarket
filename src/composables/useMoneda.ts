import { computed, ref, type ComputedRef } from 'vue'

import { aBolivares, formatearBs, formatearUsd, type Centavos } from '@/lib/money'

// Interruptor global para el modo "montos ocultos" (ver .claude/steering/ui-ux.md):
// enmascara las cifras cuando hay clientes mirando la pantalla del mostrador.
const montosOcultos = ref(false)

const MASCARA = '••••'

export interface MontoFormateado {
  usd: ComputedRef<string>
  bs: ComputedRef<string>
}

/**
 * Formatea un monto en centavos USD a las dos representaciones que se
 * muestran juntas (`$1,57` / `1.256 Bs.`), respetando el modo de montos
 * ocultos. La tasa la resuelve quien llama (spec 04 aporta el store de tasa).
 */
export function useMoneda(monto: Centavos, tasa: number): MontoFormateado {
  const usd = computed(() => (montosOcultos.value ? MASCARA : formatearUsd(monto)))
  const bs = computed(() =>
    montosOcultos.value ? MASCARA : formatearBs(aBolivares(monto, tasa)),
  )

  return { usd, bs }
}

export function useMontosOcultos() {
  function alternar(): void {
    montosOcultos.value = !montosOcultos.value
  }

  return { montosOcultos, alternar }
}
