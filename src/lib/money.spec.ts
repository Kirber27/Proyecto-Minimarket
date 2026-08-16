import { describe, expect, it } from 'vitest'

import {
  aBolivares,
  aCentavos,
  aUsd,
  formatearBs,
  formatearUsd,
  multiplicar,
  sumar,
} from '@/lib/money'

describe('aCentavos', () => {
  it('convierte el precio real de Harina P.A.N.', () => {
    expect(aCentavos(1.57)).toBe(157)
  })

  it('convierte el producto mas barato del catalogo (caramelo)', () => {
    expect(aCentavos(0.04)).toBe(4)
  })

  it('convierte el producto mas caro del catalogo (bistec)', () => {
    expect(aCentavos(13.0)).toBe(1300)
  })

  it('acepta un string decimal', () => {
    expect(aCentavos('1.57')).toBe(157)
  })

  it('evita el clasico 0.1 + 0.2 !== 0.3', () => {
    expect(aCentavos(0.1) + aCentavos(0.2)).toBe(30)
  })

  it('lanza si el valor no es un numero finito', () => {
    expect(() => aCentavos('no-es-numero')).toThrow()
  })
})

describe('aUsd', () => {
  it('es la inversa de aCentavos', () => {
    expect(aUsd(aCentavos(1.57))).toBe(1.57)
  })
})

describe('sumar', () => {
  it('suma una lista de montos en centavos', () => {
    expect(sumar(aCentavos(1.57), aCentavos(1.3), aCentavos(1.6))).toBe(447)
  })

  it('suma la lista vacia como cero', () => {
    expect(sumar()).toBe(0)
  })
})

describe('multiplicar', () => {
  it('evita el error de coma flotante 0.04 * 3', () => {
    expect(multiplicar(aCentavos(0.04), 3)).toBe(12)
  })

  it('redondea una sola vez para cantidades decimales (venta por KG)', () => {
    // Queso amarillo: $1.57 el kg, 2.6 kg -> 4.082 -> $4,08
    expect(multiplicar(aCentavos(1.57), 2.6)).toBe(408)
  })
})

describe('aBolivares', () => {
  it('coincide con CAMBIO BS. del Excel', () => {
    expect(aBolivares(aCentavos(1.57), 800)).toBe(1256)
  })

  it('suma antes de convertir, no convierte linea por linea', () => {
    const total = sumar(aCentavos(1.57), aCentavos(1.3), aCentavos(1.6))
    expect(aBolivares(total, 800)).toBe(3576)
  })
})

describe('formatearUsd', () => {
  it('formatea con coma decimal y simbolo pegado', () => {
    expect(formatearUsd(aCentavos(1.57))).toBe('$1,57')
  })

  it('rellena con cero cuando el centavo es unico', () => {
    expect(formatearUsd(aCentavos(0.04))).toBe('$0,04')
  })
})

describe('formatearBs', () => {
  it('formatea con separador de miles y sufijo, sin decimales', () => {
    expect(formatearBs(1256)).toBe('1.256 Bs.')
  })

  it('formatea montos grandes con varios separadores', () => {
    expect(formatearBs(1256000)).toBe('1.256.000 Bs.')
  })

  it('redondea a entero', () => {
    expect(formatearBs(1256.6)).toBe('1.257 Bs.')
  })

  it('antepone el signo en montos negativos (egresos)', () => {
    expect(formatearBs(-1256)).toBe('-1.256 Bs.')
  })
})
