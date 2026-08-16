import { supabase } from '@/lib/supabase'
import { ErrorDominio } from '@/lib/errorDominio'
import { aCentavos, type Centavos } from '@/lib/money'
import type {
  MotivoAjuste,
  MovimientoStock,
  ProductoCobertura,
  UnidadNegocio,
} from '@/types/dominio'
import type { Database } from '@/types/database'

type FilaMovimiento = Database['public']['Tables']['movimiento_stock']['Row']
type FilaCobertura = Database['public']['Views']['producto_cobertura']['Row']

function mapearMovimiento(fila: FilaMovimiento): MovimientoStock {
  return {
    id: fila.id,
    productoId: fila.producto_id,
    tipo: fila.tipo,
    cantidad: fila.cantidad,
    stockResultante: fila.stock_resultante,
    motivo: fila.motivo,
    nota: fila.nota,
    costoUnitarioUsd:
      fila.costo_unitario_usd === null ? null : aCentavos(fila.costo_unitario_usd),
    ventaId: fila.venta_id,
    usuarioId: fila.usuario_id,
    creadoEn: fila.creado_en,
  }
}

function mapearCobertura(fila: FilaCobertura): ProductoCobertura {
  return {
    id: fila.id!,
    nombre: fila.nombre!,
    vendidos7d: fila.vendidos_7d ?? 0,
    vendidos30d: fila.vendidos_30d ?? 0,
    vendidos90d: fila.vendidos_90d ?? 0,
    ultimaVenta: fila.ultima_venta,
    stockActual: fila.stock_actual ?? 0,
    stockMinimo: fila.stock_minimo ?? 0,
    unidadNegocio: fila.unidad_negocio!,
    activo: fila.activo ?? true,
    diasCobertura: fila.dias_cobertura,
  }
}

/** Rotación y cobertura de todo el catálogo (requisito 6). */
export async function listarCobertura(): Promise<ProductoCobertura[]> {
  const { data, error } = await supabase.from('producto_cobertura').select('*')
  if (error || !data) {
    throw new ErrorDominio(
      'inventario.cobertura_fallida',
      'No se pudo cargar la rotación.',
    )
  }
  return data.map(mapearCobertura)
}

export interface FiltrosMovimientos {
  tipo?: string
  desde?: string
  hasta?: string
  usuarioId?: string
}

/** Libro de movimientos de un producto, cronológico inverso (requisito 4.3). */
export async function listarMovimientos(
  productoId: string,
  filtros: FiltrosMovimientos = {},
): Promise<MovimientoStock[]> {
  let consulta = supabase
    .from('movimiento_stock')
    .select('*')
    .eq('producto_id', productoId)
    .order('creado_en', { ascending: false })

  if (filtros.tipo)
    consulta = consulta.eq('tipo', filtros.tipo as MovimientoStock['tipo'])
  if (filtros.desde) consulta = consulta.gte('creado_en', filtros.desde)
  if (filtros.hasta) consulta = consulta.lte('creado_en', filtros.hasta)
  if (filtros.usuarioId) consulta = consulta.eq('usuario_id', filtros.usuarioId)

  const { data, error } = await consulta
  if (error || !data) {
    throw new ErrorDominio(
      'inventario.movimientos_fallidos',
      'No se pudo cargar el historial.',
    )
  }
  return data.map(mapearMovimiento)
}

export interface AjusteInput {
  productoId: string
  cantidadNueva: number
}

/** Aplica una sesión de conteo completa en una sola transacción (requisito 2.6). */
export async function aplicarAjustes(
  ajustes: AjusteInput[],
  motivo: MotivoAjuste,
  nota: string | null,
): Promise<number> {
  const { data, error } = await supabase.rpc('aplicar_ajustes', {
    p_ajustes: ajustes.map(a => ({
      producto_id: a.productoId,
      cantidad_nueva: a.cantidadNueva,
    })),
    p_motivo: motivo,
    p_nota: nota ?? undefined,
  })

  if (error || data === null) {
    const mensaje = error?.message.includes('nota_requerida')
      ? 'Escribe una nota cuando el motivo es "Otro".'
      : error?.message.includes('stock_negativo')
        ? 'Ese ajuste dejaría el stock en negativo.'
        : error?.message.includes('sin_permiso')
          ? 'Solo el dueño puede ajustar stock.'
          : 'No se pudo aplicar el ajuste.'
    throw new ErrorDominio('inventario.ajuste_fallido', mensaje)
  }
  return data
}

export interface ReposicionInput {
  productoId: string
  cantidad: number
  costoUnitarioUsd?: Centavos | null
  actualizarCosto?: boolean
  proveedor?: string | null
}

export async function reponer(input: ReposicionInput): Promise<void> {
  const { error } = await supabase.rpc('reponer_producto', {
    p_producto_id: input.productoId,
    p_cantidad: input.cantidad,
    p_costo_unitario_usd:
      input.costoUnitarioUsd != null ? input.costoUnitarioUsd / 100 : undefined,
    p_actualizar_costo: input.actualizarCosto ?? false,
    p_proveedor: input.proveedor?.trim() || undefined,
  })
  if (error) {
    const mensaje = error.message.includes('sin_permiso')
      ? 'Solo el dueño puede reponer stock.'
      : error.message.includes('cantidad_invalida')
        ? 'La cantidad debe ser mayor a cero.'
        : 'No se pudo registrar la reposición.'
    throw new ErrorDominio('inventario.reposicion_fallida', mensaje)
  }
}

/** Ventana usada para sugerir el stock mínimo: demanda real de la última
 * semana (requisito 5.5). No es la misma constante que la reposición: el
 * mínimo es el punto de alarma, más corto que el objetivo de reposición. */
export function calcularStockMinimoSugerido(vendidos7d: number): number {
  return Math.max(Math.ceil(vendidos7d), 1)
}

export async function actualizarStockMinimo(
  productoId: string,
  nuevoMinimo: number,
): Promise<void> {
  const { error } = await supabase
    .from('producto')
    .update({ stock_minimo: nuevoMinimo })
    .eq('id', productoId)
  if (error) {
    throw new ErrorDominio(
      'inventario.stock_minimo_no_actualizado',
      'No se pudo actualizar el stock mínimo.',
    )
  }
}

/** Días de cobertura objetivo al sugerir cuánto reponer (requisito 3.5). */
export const DIAS_COBERTURA_SUGERIDA = 15

/** techo(vendidos_30d / 30 × 15), con piso en stock_minimo (requisito 3.5). */
export function calcularCantidadSugerida(
  vendidos30d: number,
  stockMinimo: number,
): number {
  const sugerida = Math.ceil((vendidos30d / 30) * DIAS_COBERTURA_SUGERIDA)
  return Math.max(sugerida, stockMinimo)
}

export interface ConteoAlertas {
  agotados: number
  criticos: number
  porAgotarse: number
}

/** Conteo de alertas para la tarjeta de Resumen (requisito 5.2). */
export function contarAlertas(
  productos: ProductoCobertura[],
  negocio: UnidadNegocio,
): ConteoAlertas {
  const activos = productos.filter(p => p.activo && p.unidadNegocio === negocio)
  return {
    agotados: activos.filter(p => p.stockActual <= 0).length,
    criticos: activos.filter(p => p.stockActual > 0 && p.stockActual < p.stockMinimo)
      .length,
    porAgotarse: activos.filter(p => p.diasCobertura !== null && p.diasCobertura < 7)
      .length,
  }
}

/** Diagnóstico de reconciliación: productos donde el stock no cuadra con la suma
 * de movimientos (requisito 4.4). Solo para el panel de Ajustes del dueño. */
export async function reconciliar(): Promise<
  { productoId: string; stockActual: number; sumaMovimientos: number }[]
> {
  const { data: productos, error: errorProductos } = await supabase
    .from('producto')
    .select('id, stock_actual')
  const { data: movimientos, error: errorMovimientos } = await supabase
    .from('movimiento_stock')
    .select('producto_id, cantidad')

  if (errorProductos || errorMovimientos || !productos || !movimientos) {
    throw new ErrorDominio(
      'inventario.reconciliacion_fallida',
      'No se pudo verificar la reconciliación.',
    )
  }

  const sumas = new Map<string, number>()
  for (const m of movimientos) {
    sumas.set(m.producto_id, (sumas.get(m.producto_id) ?? 0) + m.cantidad)
  }

  return productos
    .filter(p => Math.abs(p.stock_actual - (sumas.get(p.id) ?? 0)) > 0.001)
    .map(p => ({
      productoId: p.id,
      stockActual: p.stock_actual,
      sumaMovimientos: sumas.get(p.id) ?? 0,
    }))
}
