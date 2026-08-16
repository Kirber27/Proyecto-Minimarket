import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}))

import {
  calcularCantidadSugerida,
  calcularStockMinimoSugerido,
  contarAlertas,
} from '@/services/inventarioService'
import type { ProductoCobertura } from '@/types/dominio'

describe('calcularCantidadSugerida', () => {
  it('techo(vendidos_30d / 30 x 15) (requisito 3.5)', () => {
    // 30 vendidos en 30 dias = 1/dia -> 15 dias sugeridos
    expect(calcularCantidadSugerida(30, 0)).toBe(15)
  })

  it('nunca baja del stock minimo del producto', () => {
    expect(calcularCantidadSugerida(0, 10)).toBe(10)
  })

  it('redondea hacia arriba', () => {
    expect(calcularCantidadSugerida(1, 0)).toBe(1) // ceil(1/30*15) = ceil(0.5) = 1
  })
})

describe('calcularStockMinimoSugerido', () => {
  it('redondea hacia arriba la demanda de la ultima semana', () => {
    expect(calcularStockMinimoSugerido(3.2)).toBe(4)
  })

  it('nunca sugiere cero (piso de 1)', () => {
    expect(calcularStockMinimoSugerido(0)).toBe(1)
  })
})

function producto(overrides: Partial<ProductoCobertura>): ProductoCobertura {
  return {
    id: 'p1',
    nombre: 'Producto',
    vendidos7d: 0,
    vendidos30d: 0,
    vendidos90d: 0,
    ultimaVenta: null,
    stockActual: 10,
    stockMinimo: 5,
    unidadNegocio: 'bodega',
    activo: true,
    diasCobertura: null,
    ...overrides,
  }
}

describe('contarAlertas', () => {
  it('cuenta agotados, criticos y proximos a agotarse por separado', () => {
    const productos = [
      producto({ id: 'agotado', stockActual: 0 }),
      producto({ id: 'critico', stockActual: 2, stockMinimo: 5 }),
      producto({ id: 'proximo', stockActual: 20, stockMinimo: 5, diasCobertura: 3 }),
      producto({ id: 'normal', stockActual: 20, stockMinimo: 5, diasCobertura: 30 }),
    ]

    expect(contarAlertas(productos, 'bodega')).toEqual({
      agotados: 1,
      criticos: 1,
      porAgotarse: 1,
    })
  })

  it('filtra por unidad de negocio activa e ignora inactivos', () => {
    const productos = [
      producto({ id: 'otra-unidad', stockActual: 0, unidadNegocio: 'thais' }),
      producto({ id: 'inactivo', stockActual: 0, activo: false }),
    ]

    expect(contarAlertas(productos, 'bodega')).toEqual({
      agotados: 0,
      criticos: 0,
      porAgotarse: 0,
    })
  })
})
