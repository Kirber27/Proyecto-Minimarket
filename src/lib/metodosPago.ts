// Catalogo de metodos de pago. No hay tabla en la base para esto (serian 6
// filas estaticas que nunca cambian para este negocio): vive aqui, igual que
// mock/metodos-pago.json, que es su fuente.

import type { MetodoPago } from '@/types/dominio'

export const ETIQUETAS_METODO: Record<MetodoPago, string> = {
  'efectivo-ves': 'Efectivo Bs.',
  'efectivo-usd': 'Efectivo $',
  punto: 'Punto',
  'pago-movil': 'Pago móvil',
  biopago: 'Biopago',
  credito: 'Fiado',
}

/** Requisito 3.4: solo el efectivo esta fisicamente en la gaveta y puede
 * contarse en el arqueo (spec 09); el resto es dinero en cuentas. */
const METODOS_EFECTIVO = new Set<MetodoPago>(['efectivo-ves', 'efectivo-usd'])

export function afectaArqueo(metodo: MetodoPago): boolean {
  return METODOS_EFECTIVO.has(metodo)
}
