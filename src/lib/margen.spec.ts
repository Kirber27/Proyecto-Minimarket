import { describe, expect, it } from 'vitest'

import { aCentavos } from '@/lib/money'
import { calcularMargen, formatearMargen } from '@/lib/margen'

describe('calcularMargen', () => {
  it('calcula el porcentaje de margen entre precio y costo', () => {
    expect(calcularMargen(aCentavos(2), aCentavos(1))).toBeCloseTo(50)
  })

  it('es null cuando no hay costo registrado (requisito 1.6)', () => {
    expect(calcularMargen(aCentavos(2), null)).toBeNull()
  })

  it('puede ser negativo cuando el precio queda por debajo del costo', () => {
    expect(calcularMargen(aCentavos(1), aCentavos(2))).toBeCloseTo(-100)
  })
})

describe('formatearMargen', () => {
  it('formatea el porcentaje con un decimal', () => {
    expect(formatearMargen(50)).toBe('50.0%')
  })

  it('muestra guion cuando el margen es null', () => {
    expect(formatearMargen(null)).toBe('—')
  })
})
