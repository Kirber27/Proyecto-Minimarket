// Tipos de dominio, en camelCase (la base usa snake_case; el mapeo pasa por
// los services). Viven aparte de src/types/database.ts (generado) para que
// el resto de la app no dependa directamente de la forma de las filas.

import type { Centavos } from '@/lib/money'

export type RolUsuario = 'dueno' | 'mostrador'

export interface Perfil {
  id: string
  nombre: string
  rol: RolUsuario
  activo: boolean
}

export type UnidadNegocio = 'bodega' | 'cerveza' | 'thais'
export type UnidadMedida = 'UND' | 'KG' | 'LITRO' | 'PACK'

export interface Categoria {
  id: string
  nombre: string
  matiz: number
  unidadNegocio: UnidadNegocio
  orden: number
  activo: boolean
}

export interface Producto {
  id: string
  sku: string | null
  nombre: string
  categoriaId: string
  unidadNegocio: UnidadNegocio
  unidadMedida: UnidadMedida
  precioVentaUsd: Centavos
  costoUsd: Centavos | null
  stockActual: number
  stockMinimo: number
  activo: boolean
  origen: string | null
}

export interface ProductoInput {
  nombre: string
  categoriaId: string
  sku?: string | null
  unidadNegocio: UnidadNegocio
  unidadMedida: UnidadMedida
  precioVentaUsd: Centavos
  costoUsd: Centavos | null
  stockActual: number
  stockMinimo: number
  activo: boolean
}

export type MetodoPago =
  'efectivo-ves' | 'efectivo-usd' | 'punto' | 'pago-movil' | 'biopago' | 'credito'

export interface Cliente {
  id: string
  nombre: string
  telefono: string | null
  activo: boolean
  saldoUsd?: Centavos
}

export interface LineaVenta {
  id: number
  productoId: string
  nombreSnapshot: string
  cantidad: number
  precioUnitarioUsd: Centavos
  subtotalUsd: Centavos
}

export interface PagoVenta {
  metodo: MetodoPago
  montoUsd: Centavos
}

export interface Venta {
  id: string
  correlativo: number
  unidadNegocio: UnidadNegocio
  totalUsd: Centavos
  tasaAplicada: number
  unidades: number
  clienteId: string | null
  anulada: boolean
  anuladaMotivo: string | null
  creadoEn: string
  lineas?: LineaVenta[]
  pagos?: PagoVenta[]
}

export type TipoMovimiento =
  'venta' | 'anulacion' | 'reposicion' | 'ajuste' | 'importacion'

export type MotivoAjuste = 'conteo' | 'merma' | 'vencimiento' | 'robo' | 'error' | 'otro'

export interface MovimientoStock {
  id: number
  productoId: string
  tipo: TipoMovimiento
  cantidad: number
  stockResultante: number
  motivo: MotivoAjuste | null
  nota: string | null
  costoUnitarioUsd: Centavos | null
  ventaId: string | null
  usuarioId: string
  creadoEn: string
}

export interface ProductoCobertura {
  id: string
  nombre: string
  vendidos7d: number
  vendidos30d: number
  vendidos90d: number
  ultimaVenta: string | null
  stockActual: number
  stockMinimo: number
  unidadNegocio: UnidadNegocio
  activo: boolean
  diasCobertura: number | null
}
