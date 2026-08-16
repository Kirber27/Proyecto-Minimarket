import { aBolivares, formatearBs, formatearUsd, type Centavos } from '@/lib/money'
import { useTasaStore } from '@/stores/tasa'
import { usePreferenciasStore } from '@/stores/preferencias'

const MASCARA = '•••'

/**
 * Punto unico donde la interfaz convierte USD a Bs. y aplica el enmascarado
 * de "montos ocultos" (requisito 3.4 del spec 04): asi no hay forma de
 * olvidarlo en una pantalla nueva.
 */
export function useMoneda() {
  const tasa = useTasaStore()
  const preferencias = usePreferenciasStore()

  /** Bs. para un monto, con la tasa vigente. `null` si todavia no hay tasa. */
  function bs(usd: Centavos): number | null {
    return tasa.valor === null ? null : aBolivares(usd, tasa.valor)
  }

  function mostrarUsd(usd: Centavos): string {
    return preferencias.ocultarMontos ? MASCARA : formatearUsd(usd)
  }

  function mostrarBs(usd: Centavos): string {
    if (preferencias.ocultarMontos) return MASCARA
    const valor = bs(usd)
    return valor === null ? '—' : formatearBs(valor)
  }

  return { bs, mostrarUsd, mostrarBs }
}
