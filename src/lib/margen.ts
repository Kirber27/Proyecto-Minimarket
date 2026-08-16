// Margen de venta. Vive aparte de money.ts porque no es una operacion
// monetaria (no suma ni convierte montos): es un porcentaje derivado.

import { aUsd, type Centavos } from '@/lib/money'

/** Margen porcentual, o null si no hay costo registrado (requisito 1.6). */
export function calcularMargen(
  precioVentaUsd: Centavos,
  costoUsd: Centavos | null,
): number | null {
  if (costoUsd === null || precioVentaUsd === 0) return null
  return ((aUsd(precioVentaUsd) - aUsd(costoUsd)) / aUsd(precioVentaUsd)) * 100
}

export function formatearMargen(margen: number | null): string {
  if (margen === null) return '—'
  return `${margen.toFixed(1)}%`
}
