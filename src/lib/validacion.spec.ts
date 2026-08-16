import { describe, expect, it } from 'vitest'

import { esCorreoValido } from '@/lib/validacion'

describe('esCorreoValido', () => {
  it.each(['dueno@minimarket.com', 'a@b.co', 'nombre.apellido@dominio.com.ve'])(
    'acepta %s',
    correo => {
      expect(esCorreoValido(correo)).toBe(true)
    },
  )

  it.each([
    '',
    'sin-arroba',
    '@sin-usuario.com',
    'sin-dominio@',
    'con espacio@dominio.com',
  ])('rechaza %s', correo => {
    expect(esCorreoValido(correo)).toBe(false)
  })
})
