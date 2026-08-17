import { supabase } from '@/lib/supabase'
import { ErrorDominio } from '@/lib/errorDominio'
import { aCentavos } from '@/lib/money'
import type {
  CategoriaEgreso,
  Egreso,
  FlujoCaja,
  MetodoPago,
  MovimientoCaja,
  OrigenMovimientoCaja,
  ResumenDia,
  SaldoMetodo,
  UnidadNegocio,
} from '@/types/dominio'
import type { Database } from '@/types/database'

type FilaEgreso = Database['public']['Tables']['egreso']['Row']
type FilaMovimiento = Database['public']['Views']['movimiento_caja']['Row']

function mapearEgreso(fila: FilaEgreso): Egreso {
  return {
    id: fila.id,
    unidadNegocio: fila.unidad_negocio,
    descripcion: fila.descripcion,
    montoUsd: aCentavos(fila.monto_usd),
    tasaAplicada: Number(fila.tasa_aplicada),
    categoria: fila.categoria,
    metodo: fila.metodo,
    referencia: fila.referencia,
    anulado: fila.anulado,
    anuladoMotivo: fila.anulado_motivo,
    creadoEn: fila.creado_en,
  }
}

function mapearMovimiento(fila: FilaMovimiento): MovimientoCaja {
  return {
    id: fila.id!,
    flujo: fila.flujo as FlujoCaja,
    origen: fila.origen as OrigenMovimientoCaja,
    documentoId: fila.documento_id!,
    clienteId: fila.cliente_id,
    unidadNegocio: fila.unidad_negocio!,
    concepto: fila.concepto!,
    metodo: fila.metodo!,
    categoria: fila.categoria as CategoriaEgreso | null,
    montoUsd: aCentavos(fila.monto_usd!),
    tasaAplicada: Number(fila.tasa_aplicada),
    creadoEn: fila.creado_en!,
  }
}

export interface FiltrosMovimientos {
  desde?: string
  hasta?: string
}

/** Movimientos del dia (o del rango dado), cronologico inverso (requisito 1.1). */
export async function listarMovimientos(
  negocio: UnidadNegocio,
  filtros: FiltrosMovimientos = {},
): Promise<MovimientoCaja[]> {
  let consulta = supabase
    .from('movimiento_caja')
    .select('*')
    .eq('unidad_negocio', negocio)
    .order('creado_en', { ascending: false })

  if (filtros.desde) consulta = consulta.gte('creado_en', filtros.desde)
  if (filtros.hasta) consulta = consulta.lt('creado_en', filtros.hasta)

  const { data, error } = await consulta
  if (error || !data) {
    throw new ErrorDominio(
      'caja.movimientos_fallidos',
      'No se pudo cargar el flujo de caja.',
    )
  }
  return data.map(mapearMovimiento)
}

/** Saldo por metodo de pago, desde el origen (requisito 3.1). */
export async function saldoPorMetodo(negocio: UnidadNegocio): Promise<SaldoMetodo[]> {
  const { data, error } = await supabase.rpc('saldo_caja', { p_negocio: negocio })
  if (error || !data) {
    throw new ErrorDominio('caja.saldo_fallido', 'No se pudo calcular el saldo de caja.')
  }
  return data.map(fila => ({
    metodo: fila.metodo,
    saldoUsd: aCentavos(fila.saldo_usd ?? 0),
  }))
}

export interface EgresoInput {
  unidadNegocio: UnidadNegocio
  descripcion: string
  montoUsd: number
  tasaAplicada: number
  categoria: CategoriaEgreso
  metodo: MetodoPago
  referencia?: string | null
}

export async function registrarEgreso(input: EgresoInput): Promise<Egreso> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('egreso')
    .insert({
      unidad_negocio: input.unidadNegocio,
      descripcion: input.descripcion,
      monto_usd: input.montoUsd,
      tasa_aplicada: input.tasaAplicada,
      categoria: input.categoria,
      metodo: input.metodo,
      referencia: input.referencia ?? null,
      usuario_id: user!.id,
    })
    .select('*')
    .single()

  if (error || !data) {
    const mensaje = error?.message.includes('row-level security')
      ? 'Solo el dueño puede registrar retiros o sueldos.'
      : 'No se pudo registrar el egreso.'
    throw new ErrorDominio('caja.egreso_no_registrado', mensaje)
  }
  return mapearEgreso(data)
}

export async function anularEgreso(id: string, motivo: string): Promise<void> {
  const { error } = await supabase.rpc('anular_egreso', { p_id: id, p_motivo: motivo })
  if (error) {
    const mensaje = error.message.includes('sin_permiso')
      ? 'Solo el dueño puede anular un egreso.'
      : 'No se pudo anular el egreso.'
    throw new ErrorDominio('caja.egreso_no_anulado', mensaje)
  }
}

function mapearResumen(json: Record<string, unknown>): ResumenDia {
  const serie = (json.serie7Dias as { fecha: string; vendidoUsd: number }[] | null) ?? []
  return {
    vendidoHoyUsd: aCentavos(json.vendidoHoyUsd as number),
    numeroVentas: json.numeroVentas as number,
    ticketPromedioUsd: aCentavos(json.ticketPromedioUsd as number),
    egresosHoyUsd: aCentavos(json.egresosHoyUsd as number),
    saldoActualUsd: aCentavos(json.saldoActualUsd as number),
    serie7Dias: serie.map(d => ({ fecha: d.fecha, vendidoUsd: aCentavos(d.vendidoUsd) })),
    mismoDiaSemanaAnteriorUsd: aCentavos(json.mismoDiaSemanaAnteriorUsd as number),
    productosEnAlerta: json.productosEnAlerta as number,
    porCobrarUsd: aCentavos(json.porCobrarUsd as number),
    pendientesRevision: json.pendientesRevision as number,
  }
}

/** Todo el resumen del dia en una sola llamada (requisito 5), para que la
 * pantalla de inicio no parpadee resolviendo consultas por separado.
 * `inicioDia` es medianoche local del dispositivo, no del servidor. */
export async function resumenDia(
  negocio: UnidadNegocio,
  inicioDia: Date,
): Promise<ResumenDia> {
  const { data, error } = await supabase.rpc('resumen_dia', {
    p_negocio: negocio,
    p_inicio_dia: inicioDia.toISOString(),
  })
  if (error || !data) {
    throw new ErrorDominio(
      'caja.resumen_fallido',
      'No se pudo cargar el resumen del día.',
    )
  }
  return mapearResumen(data as Record<string, unknown>)
}
