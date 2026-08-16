import { supabase } from '@/lib/supabase'
import { ErrorDominio } from '@/lib/errorDominio'
import { aCentavos, aUsd, type Centavos } from '@/lib/money'
import type {
  LineaVenta,
  MetodoPago,
  PagoVenta,
  UnidadNegocio,
  Venta,
} from '@/types/dominio'
import type { Database } from '@/types/database'

type FilaVenta = Database['public']['Tables']['venta']['Row']
type FilaVentaLinea = Database['public']['Tables']['venta_linea']['Row']
type FilaVentaPago = Database['public']['Tables']['venta_pago']['Row']

function mapearVenta(fila: FilaVenta): Venta {
  return {
    id: fila.id,
    correlativo: fila.correlativo,
    unidadNegocio: fila.unidad_negocio,
    totalUsd: aCentavos(fila.total_usd),
    tasaAplicada: Number(fila.tasa_aplicada),
    unidades: fila.unidades,
    clienteId: fila.cliente_id,
    anulada: fila.anulada,
    anuladaMotivo: fila.anulada_motivo,
    creadoEn: fila.creado_en,
  }
}

function mapearLinea(fila: FilaVentaLinea): LineaVenta {
  return {
    id: fila.id,
    productoId: fila.producto_id,
    nombreSnapshot: fila.nombre_snapshot,
    cantidad: fila.cantidad,
    precioUnitarioUsd: aCentavos(fila.precio_unitario_usd),
    subtotalUsd: aCentavos(fila.subtotal_usd),
  }
}

function mapearPago(fila: FilaVentaPago): PagoVenta {
  return { metodo: fila.metodo, montoUsd: aCentavos(fila.monto_usd) }
}

export interface LineaCarritoInput {
  productoId: string
  cantidad: number
}

export interface PagoInput {
  metodo: MetodoPago
  montoUsd: Centavos
}

export interface CrearVentaInput {
  lineas: LineaCarritoInput[]
  pagos: PagoInput[]
  unidadNegocio: UnidadNegocio
  tasaCliente: number
  clienteId?: string | null
  idempotencia: string
}

/** Mensajes exactos del diseño (ver .claude/specs/05-punto-de-venta/design.md). */
function mensajeError(codigo: string, detalle?: string, hint?: string): string {
  switch (true) {
    case codigo.includes('stock_insuficiente'):
      return `No hay stock suficiente de ${detalle ?? 'ese producto'}. Quedan ${hint ?? '0'}.`
    case codigo.includes('tasa_desactualizada'):
      return `La tasa cambió a ${detalle ?? 'una nueva'}. Revisa el total y confirma otra vez.`
    case codigo.includes('sin_tasa'):
      return 'Registra la tasa del día para poder vender.'
    case codigo.includes('pago_insuficiente'):
      return `Falta cubrir $${detalle ?? ''}. Completa el pago o elige un cliente para fiado.`
    case codigo.includes('carrito_vacio'):
      return 'El carrito está vacío.'
    default:
      return 'No se pudo registrar la venta. Intenta de nuevo.'
  }
}

export async function crear(input: CrearVentaInput): Promise<Venta> {
  const { data, error } = await supabase.rpc('crear_venta', {
    p_lineas: input.lineas.map(l => ({
      producto_id: l.productoId,
      cantidad: l.cantidad,
    })),
    p_pagos: input.pagos.map(p => ({ metodo: p.metodo, monto_usd: aUsd(p.montoUsd) })),
    p_negocio: input.unidadNegocio,
    p_tasa_cliente: input.tasaCliente,
    p_cliente_id: input.clienteId ?? undefined,
    p_idempotencia: input.idempotencia,
  })

  if (error || !data) {
    const mensaje = mensajeError(error?.message ?? '', error?.details, error?.hint)
    const codigo = error?.message.includes('stock_insuficiente')
      ? 'venta.stock_insuficiente'
      : error?.message.includes('tasa_desactualizada')
        ? 'venta.tasa_desactualizada'
        : error?.message.includes('sin_tasa')
          ? 'venta.sin_tasa'
          : error?.message.includes('pago_insuficiente')
            ? 'venta.pago_insuficiente'
            : 'venta.no_creada'
    throw new ErrorDominio(codigo, mensaje)
  }

  return mapearVenta(data)
}

/** Ventas del dia con sus pagos (requisito 4.1: hora, total, metodo y unidades). */
export async function listarDelDia(unidadNegocio: UnidadNegocio): Promise<Venta[]> {
  const inicioDelDia = new Date()
  inicioDelDia.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('venta')
    .select('*')
    .eq('unidad_negocio', unidadNegocio)
    .eq('anulada', false)
    .gte('creado_en', inicioDelDia.toISOString())
    .order('creado_en', { ascending: false })

  if (error) {
    throw new ErrorDominio(
      'venta.listado_fallido',
      'No se pudo cargar las ventas del día.',
    )
  }

  const ventas = data.map(mapearVenta)
  if (ventas.length === 0) return ventas

  const { data: pagos } = await supabase
    .from('venta_pago')
    .select('*')
    .in(
      'venta_id',
      ventas.map(v => v.id),
    )

  const pagosPorVenta = new Map<string, ReturnType<typeof mapearPago>[]>()
  for (const fila of pagos ?? []) {
    const lista = pagosPorVenta.get(fila.venta_id) ?? []
    lista.push(mapearPago(fila))
    pagosPorVenta.set(fila.venta_id, lista)
  }

  for (const venta of ventas) {
    venta.pagos = pagosPorVenta.get(venta.id) ?? []
  }
  return ventas
}

export async function obtenerDetalle(id: string): Promise<Venta> {
  const [ventaRes, lineasRes, pagosRes] = await Promise.all([
    supabase.from('venta').select('*').eq('id', id).single(),
    supabase.from('venta_linea').select('*').eq('venta_id', id),
    supabase.from('venta_pago').select('*').eq('venta_id', id),
  ])

  if (ventaRes.error || !ventaRes.data) {
    throw new ErrorDominio('venta.no_encontrada', 'No se encontró la venta.')
  }

  const venta = mapearVenta(ventaRes.data)
  venta.lineas = (lineasRes.data ?? []).map(mapearLinea)
  venta.pagos = (pagosRes.data ?? []).map(mapearPago)
  return venta
}

export async function anular(id: string, motivo: string): Promise<void> {
  const { error } = await supabase.rpc('anular_venta', {
    p_venta_id: id,
    p_motivo: motivo,
  })
  if (error) {
    const mensaje = error.message.includes('sin_permiso')
      ? 'Solo el dueño puede anular ventas.'
      : 'No se pudo anular la venta.'
    throw new ErrorDominio('venta.no_anulada', mensaje)
  }
}
