import { describe, expect, it } from 'vitest'

import { calcularEstadoStock } from '@/lib/stock'

describe('calcularEstadoStock', () => {
  it('sin stock cuando es cero o negativo', () => {
    expect(calcularEstadoStock(0, 5).estado).toBe('sin-stock')
    expect(calcularEstadoStock(-1, 5).estado).toBe('sin-stock')
  })

  it('critico cuando esta por debajo del minimo', () => {
    expect(calcularEstadoStock(3, 5).estado).toBe('critico')
  })

  it('bajo cuando esta entre el minimo y el doble del minimo', () => {
    expect(calcularEstadoStock(5, 5).estado).toBe('bajo')
    expect(calcularEstadoStock(9, 5).estado).toBe('bajo')
  })

  it('normal cuando llega al doble del minimo o mas', () => {
    expect(calcularEstadoStock(10, 5).estado).toBe('normal')
    expect(calcularEstadoStock(50, 5).estado).toBe('normal')
  })

  it('cada estado trae una etiqueta de texto, no solo color', () => {
    expect(calcularEstadoStock(0, 5).etiqueta).toBe('Sin stock')
    expect(calcularEstadoStock(3, 5).etiqueta).toBe('Crítico')
    expect(calcularEstadoStock(5, 5).etiqueta).toBe('Bajo')
    expect(calcularEstadoStock(10, 5).etiqueta).toBe('Normal')
  })
})
