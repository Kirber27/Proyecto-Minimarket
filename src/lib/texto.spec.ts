import { describe, expect, it } from 'vitest'

import { normalizarTexto } from '@/lib/texto'

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
