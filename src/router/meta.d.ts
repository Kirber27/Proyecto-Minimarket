import 'vue-router'

interface DestinoNav {
  etiqueta: string
  orden: number
}

declare module 'vue-router' {
  interface RouteMeta {
    titulo: string
    subtitulo?: string
    layout?: 'auth'
    navMovil?: DestinoNav
    navEscritorio?: DestinoNav
    /** No requiere sesion. Sin esto, el guard exige autenticacion. */
    publica?: boolean
    /** Solo el rol `dueno` puede entrar; `mostrador` rebota a resumen. */
    soloDueno?: boolean
  }
}
