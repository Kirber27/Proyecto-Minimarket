import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import Resumen from '@/pages/resumen/Resumen.vue'
import VentaNueva from '@/pages/venta/VentaNueva.vue'

// Los titulos viven en meta, no en cada pagina, para que el layout los
// renderice sin que la pagina tenga que emitirlos. Las barras de navegacion
// se construyen filtrando router.getRoutes() por navMovil/navEscritorio y
// ordenando por `orden`: agregar un destino es agregar una ruta.
//
// Resumen y Venta se importan de forma estatica porque son las primeras
// pantallas en cargar. Todo lo demas usa import() diferido.

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'resumen',
    component: Resumen,
    meta: {
      titulo: 'Resumen',
      subtitulo: 'Como va el dia en el local',
      navMovil: { etiqueta: 'Inicio', orden: 1 },
      navEscritorio: { etiqueta: 'Resumen', orden: 1 },
    },
  },
  {
    path: '/venta',
    name: 'venta',
    component: VentaNueva,
    meta: {
      titulo: 'Registrar venta',
      subtitulo: 'Arma la venta y confirma en un toque',
      navMovil: { etiqueta: 'Vender', orden: 2 },
      navEscritorio: { etiqueta: 'Registrar venta', orden: 2 },
    },
  },
  {
    path: '/inventario',
    name: 'inventario',
    component: () => import('@/pages/inventario/Inventario.vue'),
    meta: {
      titulo: 'Inventario',
      subtitulo: 'Stock, precios y margen por producto',
      navMovil: { etiqueta: 'Stock', orden: 3 },
      navEscritorio: { etiqueta: 'Inventario', orden: 3 },
    },
  },
  {
    path: '/productos',
    name: 'productos',
    component: () => import('@/pages/productos/Productos.vue'),
    meta: {
      titulo: 'Productos',
      subtitulo: 'Catalogo, precios y unidades de negocio',
      navEscritorio: { etiqueta: 'Productos', orden: 4 },
      soloDueno: true,
    },
  },
  {
    path: '/categorias',
    name: 'categorias',
    component: () => import('@/pages/categorias/Categorias.vue'),
    meta: {
      titulo: 'Categorias',
      subtitulo: 'Agrupacion del catalogo',
      navEscritorio: { etiqueta: 'Categorias', orden: 5 },
      soloDueno: true,
    },
  },
  {
    path: '/reportes',
    name: 'reportes',
    component: () => import('@/pages/reportes/Reportes.vue'),
    meta: {
      titulo: 'Reportes',
      subtitulo: 'Ranking de productos y margen por periodo',
      navEscritorio: { etiqueta: 'Reportes', orden: 6 },
      soloDueno: true,
    },
  },
  {
    path: '/caja',
    name: 'caja',
    component: () => import('@/pages/caja/FlujoCaja.vue'),
    meta: {
      titulo: 'Flujo de caja',
      subtitulo: 'Ingresos, egresos y saldo',
      navMovil: { etiqueta: 'Caja', orden: 4 },
      navEscritorio: { etiqueta: 'Flujo de caja', orden: 7 },
    },
  },
  {
    path: '/alertas',
    name: 'alertas',
    component: () => import('@/pages/alertas/Alertas.vue'),
    meta: {
      titulo: 'Alertas de stock',
      subtitulo: 'Productos por reponer',
      navEscritorio: { etiqueta: 'Alertas de stock', orden: 8 },
    },
  },
  {
    path: '/deudas',
    name: 'deudas',
    component: () => import('@/pages/deudas/Deudas.vue'),
    meta: {
      titulo: 'Deudas',
      subtitulo: 'Clientes con saldo pendiente',
      navEscritorio: { etiqueta: 'Deudas', orden: 9 },
    },
  },
  {
    path: '/arqueo',
    name: 'arqueo',
    component: () => import('@/pages/arqueo/Arqueo.vue'),
    meta: {
      titulo: 'Arqueo de caja',
      subtitulo: 'Conteo por denominacion y cuadre',
      navEscritorio: { etiqueta: 'Arqueo', orden: 10 },
    },
  },
  {
    path: '/mas',
    name: 'mas',
    component: () => import('@/pages/mas/Mas.vue'),
    meta: {
      titulo: 'Mas opciones',
      navMovil: { etiqueta: 'Mas', orden: 5 },
    },
  },
  {
    path: '/ajustes',
    name: 'ajustes',
    component: () => import('@/pages/ajustes/Ajustes.vue'),
    meta: {
      titulo: 'Ajustes',
      subtitulo: 'Tasa del dia, PIN de acceso y preferencias',
      navEscritorio: { etiqueta: 'Ajustes', orden: 11 },
    },
  },
  {
    path: '/usuarios',
    name: 'usuarios',
    component: () => import('@/pages/usuarios/Usuarios.vue'),
    meta: {
      titulo: 'Usuarios',
      subtitulo: 'Cuentas del dueno y del mostrador',
      navEscritorio: { etiqueta: 'Usuarios', orden: 12 },
      soloDueno: true,
    },
  },
  {
    path: '/ingresar',
    name: 'ingresar',
    component: () => import('@/pages/auth/PantallaIngreso.vue'),
    meta: {
      titulo: 'Iniciar sesion',
      layout: 'auth',
      publica: true,
    },
  },
  {
    path: '/bloqueado',
    name: 'bloqueado',
    component: () => import('@/pages/auth/PantallaBloqueo.vue'),
    meta: {
      titulo: 'Pantalla bloqueada',
      layout: 'auth',
    },
  },
  {
    path: '/recuperar',
    name: 'recuperar',
    component: () => import('@/pages/auth/PantallaRecuperar.vue'),
    meta: {
      titulo: 'Recuperar contrasena',
      layout: 'auth',
      publica: true,
    },
  },
  {
    path: '/recuperar/enviado',
    name: 'recuperar-enviado',
    component: () => import('@/pages/auth/PantallaRecuperarEnviado.vue'),
    meta: {
      titulo: 'Enlace enviado',
      layout: 'auth',
      publica: true,
    },
  },
  {
    path: '/restablecer',
    name: 'restablecer',
    component: () => import('@/pages/auth/PantallaRestablecer.vue'),
    meta: {
      titulo: 'Nueva contrasena',
      layout: 'auth',
      publica: true,
    },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
