import { describe, expect, it } from 'vitest'

import { normalizarTexto, obtenerIniciales } from '@/lib/texto'

describe('normalizarTexto', () => {
  it('quita tildes', () => {
    expect(normalizarTexto('CAFÉ')).toBe('cafe')
  })

  it('pasa a minusculas', () => {
    expect(normalizarTexto('Harina P.A.N')).toBe('harina p.a.n')
  })

  it('deja intacto un texto ya normalizado', () => {
    expect(normalizarTexto('bocadillo guayaba')).toBe('bocadillo guayaba')
  })
})

describe('obtenerIniciales', () => {
  it('toma la primera letra de las dos primeras palabras', () => {
    expect(obtenerIniciales('Harina P.A.N')).toBe('HP')
  })

  it('toma las dos primeras letras si es una sola palabra', () => {
    expect(obtenerIniciales('Mayonesa')).toBe('MA')
  })

  it('ignora espacios de sobra entre palabras', () => {
    expect(obtenerIniciales('Coca  Cola')).toBe('CC')
  })

  it('devuelve vacio para un nombre vacio', () => {
    expect(obtenerIniciales('')).toBe('')
  })
})
