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
