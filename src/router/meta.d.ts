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
  }
}
