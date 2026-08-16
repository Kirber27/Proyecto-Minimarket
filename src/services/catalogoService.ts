import { supabase } from '@/lib/supabase'
import { ErrorDominio } from '@/lib/errorDominio'
import { aCentavos, aUsd, type Centavos } from '@/lib/money'
import { generarSlug } from '@/lib/slug'
import type { Categoria, Producto, ProductoInput } from '@/types/dominio'
import type { Database } from '@/types/database'

type FilaProducto = Database['public']['Tables']['producto']['Row']
type FilaCategoria = Database['public']['Tables']['categoria']['Row']

function mapearProducto(fila: FilaProducto): Producto {
  return {
    id: fila.id,
    sku: fila.sku,
    nombre: fila.nombre,
    categoriaId: fila.categoria_id,
    unidadNegocio: fila.unidad_negocio,
    unidadMedida: fila.unidad_medida,
    precioVentaUsd: aCentavos(fila.precio_venta_usd),
    costoUsd: fila.costo_usd === null ? null : aCentavos(fila.costo_usd),
    stockActual: fila.stock_actual,
    stockMinimo: fila.stock_minimo,
    activo: fila.activo,
    origen: fila.origen,
  }
}

function mapearCategoria(fila: FilaCategoria): Categoria {
  return {
    id: fila.id,
    nombre: fila.nombre,
    matiz: fila.matiz,
    unidadNegocio: fila.unidad_negocio,
    orden: fila.orden,
    activo: fila.activo,
  }
}

function centavosANumero(monto: Centavos): number {
  return aUsd(monto)
}

export interface Catalogo {
  productos: Producto[]
  categorias: Categoria[]
}

export async function listar(): Promise<Catalogo> {
  const [productosRes, categoriasRes] = await Promise.all([
    supabase.from('producto').select('*').order('nombre'),
    supabase.from('categoria').select('*').order('orden'),
  ])

  if (productosRes.error || categoriasRes.error) {
    throw new ErrorDominio('catalogo.carga_fallida', 'No se pudo cargar el catálogo.')
  }

  return {
    productos: productosRes.data.map(mapearProducto),
    categorias: categoriasRes.data.map(mapearCategoria),
  }
}

async function productoConSku(sku: string): Promise<Producto | null> {
  const { data } = await supabase
    .from('producto')
    .select('*')
    .eq('sku', sku)
    .maybeSingle()
  return data ? mapearProducto(data) : null
}

async function lanzarErrorDeGuardado(error: {
  code?: string
  message: string
}): Promise<never> {
  if (error.code === '23505') {
    throw new ErrorDominio(
      'catalogo.sku_duplicado',
      'Ese SKU ya lo usa otro producto. Elige uno distinto.',
    )
  }
  throw new ErrorDominio('catalogo.guardado_fallido', 'No se pudo guardar el producto.')
}

export async function crear(input: ProductoInput): Promise<Producto> {
  const { data, error } = await supabase
    .from('producto')
    .insert({
      nombre: input.nombre,
      categoria_id: input.categoriaId,
      sku: input.sku ?? null,
      unidad_negocio: input.unidadNegocio,
      unidad_medida: input.unidadMedida,
      precio_venta_usd: centavosANumero(input.precioVentaUsd),
      costo_usd: input.costoUsd === null ? null : centavosANumero(input.costoUsd),
      stock_actual: input.stockActual,
      stock_minimo: input.stockMinimo,
      activo: input.activo,
    })
    .select('*')
    .single()

  if (error || !data) return lanzarErrorDeGuardado(error!)
  return mapearProducto(data)
}

export async function actualizar(id: string, input: ProductoInput): Promise<Producto> {
  const { data, error } = await supabase
    .from('producto')
    .update({
      nombre: input.nombre,
      categoria_id: input.categoriaId,
      sku: input.sku ?? null,
      unidad_negocio: input.unidadNegocio,
      unidad_medida: input.unidadMedida,
      precio_venta_usd: centavosANumero(input.precioVentaUsd),
      costo_usd: input.costoUsd === null ? null : centavosANumero(input.costoUsd),
      stock_actual: input.stockActual,
      stock_minimo: input.stockMinimo,
      activo: input.activo,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) return lanzarErrorDeGuardado(error!)
  return mapearProducto(data)
}

/** Un producto nunca se elimina (requisito 2.8): solo se desactiva. */
export async function desactivar(id: string): Promise<void> {
  const { error } = await supabase.from('producto').update({ activo: false }).eq('id', id)
  if (error) {
    throw new ErrorDominio(
      'catalogo.desactivacion_fallida',
      'No se pudo desactivar el producto.',
    )
  }
}

/** Busca el producto que ya usa un SKU, para indicar con cual choca (requisito 2.6). */
export async function buscarConflictoDeSku(
  sku: string,
  idAExcluir?: string,
): Promise<Producto | null> {
  const producto = await productoConSku(sku)
  if (!producto || producto.id === idAExcluir) return null
  return producto
}

// Matices espaciados en la rueda de color, para que dos categorias nuevas
// seguidas no salgan pegadas de tono.
const PALETA_MATICES = [265, 60, 240, 200, 40, 175, 330, 85, 20, 300, 150, 110]

/** Un matiz distinto de los ya usados (requisito 3.3). */
async function matizNoUsado(): Promise<number> {
  const { data } = await supabase.from('categoria').select('matiz')
  const usados = new Set((data ?? []).map(fila => fila.matiz))
  const libre = PALETA_MATICES.find(matiz => !usados.has(matiz))
  if (libre !== undefined) return libre
  return Math.floor(Math.random() * 361)
}

export interface CategoriaInput {
  nombre: string
  unidadNegocio: Categoria['unidadNegocio']
  matiz?: number
}

export async function crearCategoria(input: CategoriaInput): Promise<Categoria> {
  const id = generarSlug(input.nombre)

  const matiz = input.matiz ?? (await matizNoUsado())

  const { data, error } = await supabase
    .from('categoria')
    .insert({
      id,
      nombre: input.nombre,
      unidad_negocio: input.unidadNegocio,
      matiz,
    })
    .select('*')
    .single()

  if (error || !data) {
    const mensaje =
      error?.code === '23505'
        ? 'Ya existe una categoría con ese nombre.'
        : 'No se pudo crear la categoría.'
    throw new ErrorDominio('catalogo.categoria_no_creada', mensaje)
  }
  return mapearCategoria(data)
}

/** Desactiva una categoria que no tiene productos asociados (requisito 3.4). */
export async function desactivarCategoria(id: string): Promise<void> {
  const { error } = await supabase
    .from('categoria')
    .update({ activo: false })
    .eq('id', id)
  if (error) {
    throw new ErrorDominio(
      'catalogo.categoria_no_desactivada',
      'No se pudo desactivar la categoría.',
    )
  }
}

export async function renombrarCategoria(id: string, nombre: string): Promise<void> {
  const { error } = await supabase.from('categoria').update({ nombre }).eq('id', id)
  if (error) {
    const mensaje =
      error.code === '23505'
        ? 'Ya existe una categoría con ese nombre.'
        : 'No se pudo renombrar la categoría.'
    throw new ErrorDominio('catalogo.categoria_no_renombrada', mensaje)
  }
}

export async function contarProductosPorCategoria(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('producto').select('categoria_id')
  if (error || !data) {
    throw new ErrorDominio(
      'catalogo.conteo_fallido',
      'No se pudo contar los productos por categoría.',
    )
  }
  const conteo: Record<string, number> = {}
  for (const fila of data) {
    conteo[fila.categoria_id] = (conteo[fila.categoria_id] ?? 0) + 1
  }
  return conteo
}

export async function reasignarYDesactivarCategoria(
  idOrigen: string,
  idDestino: string,
): Promise<void> {
  const { error: errorReasignar } = await supabase
    .from('producto')
    .update({ categoria_id: idDestino })
    .eq('categoria_id', idOrigen)
  if (errorReasignar) {
    throw new ErrorDominio(
      'catalogo.reasignacion_fallida',
      'No se pudieron reasignar los productos.',
    )
  }

  const { error: errorDesactivar } = await supabase
    .from('categoria')
    .update({ activo: false })
    .eq('id', idOrigen)
  if (errorDesactivar) {
    throw new ErrorDominio(
      'catalogo.categoria_no_desactivada',
      'No se pudo desactivar la categoría.',
    )
  }
}
