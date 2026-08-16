import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
  establecerRecordarSesion: vi.fn(),
}))

vi.mock('@/services/authService', () => ({
  iniciarSesionConPassword: vi.fn(),
  cerrarSesion: vi.fn(),
  obtenerPerfil: vi.fn(),
  validarPin: vi.fn(),
}))

vi.mock('@/composables/useDispositivo', () => ({
  marcarDispositivoConocido: vi.fn(),
  olvidarDispositivo: vi.fn(),
}))

import { supabase } from '@/lib/supabase'
import * as authService from '@/services/authService'
import * as dispositivo from '@/composables/useDispositivo'
import { ErrorDominio } from '@/lib/errorDominio'
import { useSesionStore } from '@/stores/sesion'

const perfilDuena = { id: 'u1', nombre: 'Duena', rol: 'dueno' as const, activo: true }

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: null },
  } as never)
})

describe('esperarInicializacion', () => {
  it('deja cargando en false y sin sesion cuando no hay session guardada', async () => {
    const sesion = useSesionStore()
    expect(sesion.cargando).toBe(true)

    await sesion.esperarInicializacion()

    expect(sesion.cargando).toBe(false)
    expect(sesion.autenticado).toBe(false)
  })

  it('restaura la sesion si getSession devuelve un usuario (evita el parpadeo)', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'x@x.com' } } },
    } as never)
    vi.mocked(authService.obtenerPerfil).mockResolvedValue(perfilDuena)

    const sesion = useSesionStore()
    await sesion.esperarInicializacion()

    expect(sesion.autenticado).toBe(true)
    expect(sesion.esDueno).toBe(true)
  })

  it('solo inicializa una vez aunque se llame varias veces', async () => {
    const sesion = useSesionStore()
    await Promise.all([sesion.esperarInicializacion(), sesion.esperarInicializacion()])
    expect(supabase.auth.getSession).toHaveBeenCalledTimes(1)
  })
})

describe('iniciarConPassword', () => {
  it('guarda usuario y perfil, y marca el dispositivo como conocido', async () => {
    vi.mocked(authService.iniciarSesionConPassword).mockResolvedValue({
      id: 'u1',
      email: 'x@x.com',
    })
    vi.mocked(authService.obtenerPerfil).mockResolvedValue(perfilDuena)

    const sesion = useSesionStore()
    await sesion.iniciarConPassword('x@x.com', 'clave')

    expect(sesion.autenticado).toBe(true)
    expect(sesion.perfil).toEqual(perfilDuena)
    expect(dispositivo.marcarDispositivoConocido).toHaveBeenCalled()
  })
})

describe('bloquear / desbloquear', () => {
  it('bloquear pone bloqueada en true sin tocar la sesion', () => {
    const sesion = useSesionStore()
    sesion.bloquear()
    expect(sesion.bloqueada).toBe(true)
  })

  it('desbloquear con PIN correcto pone bloqueada en false', async () => {
    vi.mocked(authService.validarPin).mockResolvedValue(true)

    const sesion = useSesionStore()
    sesion.bloquear()
    await sesion.desbloquear('1234')

    expect(sesion.bloqueada).toBe(false)
  })

  it('lanza auth.pin_invalido cuando validarPin devuelve false, sin desbloquear', async () => {
    vi.mocked(authService.validarPin).mockResolvedValue(false)

    const sesion = useSesionStore()
    sesion.bloquear()
    await expect(sesion.desbloquear('0000')).rejects.toMatchObject({
      codigo: 'auth.pin_invalido',
    })
    expect(sesion.bloqueada).toBe(true)
  })

  it('propaga el bloqueo por intentos como ErrorDominio', async () => {
    vi.mocked(authService.validarPin).mockRejectedValue(
      new ErrorDominio('auth.pin_bloqueado', 'bloqueado'),
    )

    const sesion = useSesionStore()
    await expect(sesion.desbloquear('1234')).rejects.toMatchObject({
      codigo: 'auth.pin_bloqueado',
    })
  })
})

describe('cerrar', () => {
  it('limpia el estado y olvida el dispositivo', async () => {
    vi.mocked(authService.iniciarSesionConPassword).mockResolvedValue({
      id: 'u1',
      email: 'x@x.com',
    })
    vi.mocked(authService.obtenerPerfil).mockResolvedValue(perfilDuena)
    vi.mocked(authService.cerrarSesion).mockResolvedValue(undefined)

    const sesion = useSesionStore()
    await sesion.iniciarConPassword('x@x.com', 'clave')
    sesion.bloquear()
    await sesion.cerrar()

    expect(sesion.autenticado).toBe(false)
    expect(sesion.perfil).toBeNull()
    expect(sesion.bloqueada).toBe(false)
    expect(dispositivo.olvidarDispositivo).toHaveBeenCalled()
  })
})
