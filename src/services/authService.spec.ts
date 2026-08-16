import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase'
import { ErrorDominio } from '@/lib/errorDominio'
import {
  actualizarContrasena,
  cerrarSesion,
  definirPin,
  enviarRecuperacion,
  iniciarSesionConPassword,
  obtenerPerfil,
  validarPin,
} from '@/services/authService'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('iniciarSesionConPassword', () => {
  it('devuelve el usuario cuando las credenciales son validas', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: { id: 'u1', email: 'x@x.com' }, session: {} },
      error: null,
    } as never)

    const usuario = await iniciarSesionConPassword('x@x.com', 'clave')
    expect(usuario).toEqual({ id: 'u1', email: 'x@x.com' })
  })

  it('lanza ErrorDominio sin revelar si el correo existe (requisito 1.5)', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    } as never)

    await expect(iniciarSesionConPassword('x@x.com', 'mala')).rejects.toMatchObject({
      codigo: 'auth.credenciales_invalidas',
    })
  })
})

describe('cerrarSesion', () => {
  it('lanza ErrorDominio si supabase falla al cerrar sesion', async () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: { message: 'x' },
    } as never)
    await expect(cerrarSesion()).rejects.toBeInstanceOf(ErrorDominio)
  })

  it('no lanza si supabase cierra sesion sin error', async () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as never)
    await expect(cerrarSesion()).resolves.toBeUndefined()
  })
})

describe('enviarRecuperacion', () => {
  it('llama a resetPasswordForEmail con el correo dado', async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
      error: null,
    } as never)
    await enviarRecuperacion('duena@minimarket.com')
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'duena@minimarket.com',
      expect.objectContaining({ redirectTo: expect.stringContaining('/restablecer') }),
    )
  })
})

describe('actualizarContrasena', () => {
  it('lanza ErrorDominio cuando el enlace ya vencio', async () => {
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({
      error: { message: 'expired' },
    } as never)
    await expect(actualizarContrasena('nueva-clave-123')).rejects.toBeInstanceOf(
      ErrorDominio,
    )
  })
})

function mockFrom(data: unknown, error: unknown = null) {
  const single = vi.fn().mockResolvedValue({ data, error })
  const eq = vi.fn().mockReturnValue({ single })
  const select = vi.fn().mockReturnValue({ eq })
  vi.mocked(supabase.from).mockReturnValue({ select } as never)
}

describe('obtenerPerfil', () => {
  it('mapea la fila a Perfil', async () => {
    mockFrom({ id: 'u1', nombre: 'Duena', rol: 'dueno', activo: true })
    const perfil = await obtenerPerfil('u1')
    expect(perfil).toEqual({ id: 'u1', nombre: 'Duena', rol: 'dueno', activo: true })
  })

  it('lanza ErrorDominio si no encuentra el perfil', async () => {
    mockFrom(null, { message: 'no rows' })
    await expect(obtenerPerfil('desconocido')).rejects.toBeInstanceOf(ErrorDominio)
  })
})

describe('definirPin', () => {
  it('lanza ErrorDominio si la RPC rechaza el formato', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      error: { message: 'pin_formato_invalido' },
    } as never)
    await expect(definirPin('12')).rejects.toBeInstanceOf(ErrorDominio)
  })
})

describe('validarPin', () => {
  it('devuelve true cuando el PIN es correcto', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: true, error: null } as never)
    await expect(validarPin('1234')).resolves.toBe(true)
  })

  it('devuelve false cuando el PIN es incorrecto (sin lanzar)', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: false, error: null } as never)
    await expect(validarPin('0000')).resolves.toBe(false)
  })

  it('mapea el error de bloqueo a auth.pin_bloqueado (requisito 2.5)', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'pin_bloqueado' },
    } as never)

    await expect(validarPin('1234')).rejects.toMatchObject({
      codigo: 'auth.pin_bloqueado',
    })
  })
})
