// Estados de stock (ver .claude/steering/dominio.md). El color nunca es la
// unica senal: cada estado lleva tambien una etiqueta de texto.

export type EstadoStock = 'sin-stock' | 'critico' | 'bajo' | 'normal'

export interface InfoEstadoStock {
  estado: EstadoStock
  etiqueta: string
}

export function calcularEstadoStock(
  stockActual: number,
  stockMinimo: number,
): InfoEstadoStock {
  if (stockActual <= 0) return { estado: 'sin-stock', etiqueta: 'Sin stock' }
  if (stockActual < stockMinimo) return { estado: 'critico', etiqueta: 'Crítico' }
  if (stockActual < stockMinimo * 2) return { estado: 'bajo', etiqueta: 'Bajo' }
  return { estado: 'normal', etiqueta: 'Normal' }
}
