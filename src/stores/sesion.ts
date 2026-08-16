import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { establecerRecordarSesion, supabase } from '@/lib/supabase'
import { ErrorDominio } from '@/lib/errorDominio'
import {
  marcarDispositivoConocido,
  olvidarDispositivo,
} from '@/composables/useDispositivo'
import {
  cerrarSesion,
  iniciarSesionConPassword,
  obtenerPerfil,
  validarPin,
  type Usuario,
} from '@/services/authService'

export const useSesionStore = defineStore('sesion', () => {
  const usuario = ref<Usuario | null>(null)
  const perfil = ref<Awaited<ReturnType<typeof obtenerPerfil>> | null>(null)
  const cargando = ref(true)
  // Bloqueo de pantalla (candado con PIN): NO toca la sesion de Supabase.
  // Cerrar sesion de verdad revoca el refresh token en el servidor, asi que
  // no queda nada que un PIN pueda "reabrir" (ver requisito 2.7). El PIN
  // sirve para bloquear/desbloquear una sesion que sigue viva.
  const bloqueada = ref(false)

  const autenticado = computed(() => usuario.value !== null)
  const esDueno = computed(() => perfil.value?.rol === 'dueno')

  let inicializacion: Promise<void> | null = null

  function limpiar(): void {
    usuario.value = null
    perfil.value = null
  }

  async function cargarPerfil(id: string): Promise<void> {
    perfil.value = await obtenerPerfil(id)
  }

  async function inicializar(): Promise<void> {
    const { data } = await supabase.auth.getSession()
    if (data.session?.user) {
      usuario.value = { id: data.session.user.id, email: data.session.user.email ?? null }
      await cargarPerfil(data.session.user.id)
    }
    cargando.value = false

    supabase.auth.onAuthStateChange((_evento, session) => {
      if (session?.user) {
        usuario.value = { id: session.user.id, email: session.user.email ?? null }
        void cargarPerfil(session.user.id)
      } else {
        limpiar()
      }
    })
  }

  /**
   * Espera a que la sesion se restaure desde el storage local antes de dejar
   * pasar la primera navegacion. Sin esto, el guard del router manda al
   * login a un usuario que en realidad si tenia sesion (parpadeo).
   */
  function esperarInicializacion(): Promise<void> {
    if (!inicializacion) inicializacion = inicializar()
    return inicializacion
  }

  async function iniciarConPassword(
    email: string,
    password: string,
    recordarme = true,
  ): Promise<void> {
    establecerRecordarSesion(recordarme)
    const usr = await iniciarSesionConPassword(email, password)
    usuario.value = usr
    await cargarPerfil(usr.id)
    marcarDispositivoConocido()
  }

  /** Bloquea la pantalla. La sesion de Supabase sigue intacta. */
  function bloquear(): void {
    bloqueada.value = true
  }

  /** Desbloquea con el PIN del usuario ya autenticado en este dispositivo. */
  async function desbloquear(pin: string): Promise<void> {
    const correcto = await validarPin(pin)
    if (!correcto) {
      throw new ErrorDominio('auth.pin_invalido', 'PIN incorrecto. Intenta otra vez.')
    }
    bloqueada.value = false
  }

  async function cerrar(): Promise<void> {
    await cerrarSesion()
    limpiar()
    bloqueada.value = false
    olvidarDispositivo()
  }

  return {
    usuario,
    perfil,
    cargando,
    bloqueada,
    autenticado,
    esDueno,
    esperarInicializacion,
    iniciarConPassword,
    bloquear,
    desbloquear,
    cerrar,
  }
})
