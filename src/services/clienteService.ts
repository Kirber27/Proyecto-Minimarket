import { supabase } from '@/lib/supabase'
import { ErrorDominio } from '@/lib/errorDominio'
import { aCentavos } from '@/lib/money'
import type {
  Cliente,
  DeudaMovimiento,
  DeudaPorRevisar,
  MetodoPago,
  UnidadNegocio,
} from '@/types/dominio'
import type { Database } from '@/types/database'

type FilaCliente = Database['public']['Tables']['cliente']['Row']
type FilaSaldo = Database['public']['Views']['cliente_saldo']['Row']
type FilaMovimiento = Database['public']['Tables']['deuda_movimiento']['Row']
type FilaRevision = Database['public']['Tables']['deuda_por_revisar']['Row']

function mapearCliente(fila: FilaCliente): Cliente {
  return {
    id: fila.id,
    nombre: fila.nombre,
    telefono: fila.telefono,
    nota: fila.nota,
    activo: fila.activo,
  }
}

function mapearMovimiento(fila: FilaMovimiento): DeudaMovimiento {
  return {
    id: fila.id,
    clienteId: fila.cliente_id,
    unidadNegocio: fila.unidad_negocio,
    tipo: fila.tipo,
    montoUsd: aCentavos(fila.monto_usd),
    tasaAplicada: Number(fila.tasa_aplicada),
    metodo: fila.metodo,
    ventaId: fila.venta_id,
    nota: fila.nota,
    anulado: fila.anulado,
    anuladoMotivo: fila.anulado_motivo,
    creadoEn: fila.creado_en,
  }
}

function mapearRevision(
  fila: FilaRevision,
  nombrePorCliente: Map<string, string>,
): DeudaPorRevisar {
  return {
    id: fila.id,
    clienteId: fila.cliente_id,
    clienteNombre: nombrePorCliente.get(fila.cliente_id),
    unidadNegocio: fila.unidad_negocio,
    notaOriginal: fila.nota_original,
    resuelto: fila.resuelto,
    origen: fila.origen,
    creadoEn: fila.creado_en,
  }
}

/** Todos los clientes activos, con saldo consolidado y por unidad de negocio
 * (requisitos 1.5, 4.6), ordenados por saldo consolidado descendente. */
export async function listar(): Promise<Cliente[]> {
  const [clientesRes, saldosRes] = await Promise.all([
    supabase.from('cliente').select('*').eq('activo', true).order('nombre'),
    supabase.from('cliente_saldo').select('*'),
  ])

  if (clientesRes.error) {
    throw new ErrorDominio(
      'clientes.carga_fallida',
      'No se pudo cargar la lista de clientes.',
    )
  }

  const saldosPorCliente = new Map<string, FilaSaldo[]>()
  for (const fila of saldosRes.data ?? []) {
    if (!fila.cliente_id) continue
    const lista = saldosPorCliente.get(fila.cliente_id) ?? []
    lista.push(fila)
    saldosPorCliente.set(fila.cliente_id, lista)
  }

  const clientes = clientesRes.data.map(fila => {
    const cliente = mapearCliente(fila)
    const saldos = saldosPorCliente.get(fila.id) ?? []
    const saldosPorNegocio: Cliente['saldosPorNegocio'] = {}
    let totalUsd = 0
    let masAntigua: string | null = null

    for (const s of saldos) {
      if (!s.unidad_negocio) continue
      saldosPorNegocio[s.unidad_negocio] = aCentavos(s.saldo_usd ?? 0)
      totalUsd += s.saldo_usd ?? 0
      if (s.deuda_mas_antigua && (!masAntigua || s.deuda_mas_antigua < masAntigua)) {
        masAntigua = s.deuda_mas_antigua
      }
    }

    cliente.saldosPorNegocio = saldosPorNegocio
    cliente.saldoUsd = aCentavos(totalUsd)
    cliente.deudaMasAntigua = masAntigua
    return cliente
  })

  return clientes.sort((a, b) => (b.saldoUsd ?? 0) - (a.saldoUsd ?? 0))
}

/** Clientes activos con su saldo en la unidad de negocio dada (selector de
 * fiado en el punto de venta). */
export async function listarConSaldo(unidadNegocio: UnidadNegocio): Promise<Cliente[]> {
  const [clientesRes, saldosRes] = await Promise.all([
    supabase.from('cliente').select('*').eq('activo', true).order('nombre'),
    supabase
      .from('cliente_saldo')
      .select('cliente_id, saldo_usd')
      .eq('unidad_negocio', unidadNegocio),
  ])

  if (clientesRes.error) {
    throw new ErrorDominio(
      'clientes.carga_fallida',
      'No se pudo cargar la lista de clientes.',
    )
  }

  const saldoPorCliente = new Map(
    (saldosRes.data ?? []).map(s => [s.cliente_id, s.saldo_usd ?? 0]),
  )

  return clientesRes.data.map(fila => {
    const cliente = mapearCliente(fila)
    cliente.saldoUsd = aCentavos(saldoPorCliente.get(fila.id) ?? 0)
    return cliente
  })
}

export async function obtener(id: string): Promise<Cliente> {
  const [clienteRes, saldosRes] = await Promise.all([
    supabase.from('cliente').select('*').eq('id', id).single(),
    supabase.from('cliente_saldo').select('*').eq('cliente_id', id),
  ])

  if (clienteRes.error || !clienteRes.data) {
    throw new ErrorDominio('clientes.no_encontrado', 'No se encontró el cliente.')
  }

  const cliente = mapearCliente(clienteRes.data)
  const saldosPorNegocio: Cliente['saldosPorNegocio'] = {}
  let totalUsd = 0
  let masAntigua: string | null = null

  for (const s of saldosRes.data ?? []) {
    if (!s.unidad_negocio) continue
    saldosPorNegocio[s.unidad_negocio] = aCentavos(s.saldo_usd ?? 0)
    totalUsd += s.saldo_usd ?? 0
    if (s.deuda_mas_antigua && (!masAntigua || s.deuda_mas_antigua < masAntigua)) {
      masAntigua = s.deuda_mas_antigua
    }
  }

  cliente.saldosPorNegocio = saldosPorNegocio
  cliente.saldoUsd = aCentavos(totalUsd)
  cliente.deudaMasAntigua = masAntigua
  return cliente
}

export interface ClienteInput {
  nombre: string
  telefono?: string | null
  nota?: string | null
}

/** Busca clientes activos con el mismo nombre, para advertir sin bloquear
 * (requisito 1.3: puede haber homónimos legítimos). */
export async function buscarHomonimos(nombre: string): Promise<Cliente[]> {
  const { data } = await supabase
    .from('cliente')
    .select('*')
    .eq('activo', true)
    .ilike('nombre', nombre.trim())
  return (data ?? []).map(mapearCliente)
}

export async function crear(input: ClienteInput): Promise<Cliente> {
  const { data, error } = await supabase
    .from('cliente')
    .insert({
      nombre: input.nombre.trim(),
      telefono: input.telefono?.trim() || null,
      nota: input.nota?.trim() || null,
    })
    .select('*')
    .single()

  if (error || !data) {
    throw new ErrorDominio('clientes.creacion_fallida', 'No se pudo crear el cliente.')
  }
  return mapearCliente(data)
}

export async function crearRapido(nombre: string): Promise<Cliente> {
  return crear({ nombre })
}

export async function actualizar(id: string, input: ClienteInput): Promise<Cliente> {
  const { data, error } = await supabase
    .from('cliente')
    .update({
      nombre: input.nombre.trim(),
      telefono: input.telefono?.trim() || null,
      nota: input.nota?.trim() || null,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) {
    throw new ErrorDominio(
      'clientes.actualizacion_fallida',
      'No se pudo actualizar el cliente.',
    )
  }
  return mapearCliente(data)
}

/** Un cliente con movimientos no se elimina, solo se desactiva (requisito 1.4). */
export async function desactivar(id: string): Promise<void> {
  const { error } = await supabase.from('cliente').update({ activo: false }).eq('id', id)
  if (error) {
    throw new ErrorDominio(
      'clientes.desactivacion_fallida',
      'No se pudo desactivar el cliente.',
    )
  }
}

/** Estado de cuenta: todos los movimientos del cliente, cronológico inverso
 * (requisito 4.3). El saldo corrido se calcula en el cliente (Vue). */
export async function listarMovimientos(clienteId: string): Promise<DeudaMovimiento[]> {
  const { data, error } = await supabase
    .from('deuda_movimiento')
    .select('*')
    .eq('cliente_id', clienteId)
    .eq('anulado', false)
    .order('creado_en', { ascending: false })

  if (error || !data) {
    throw new ErrorDominio(
      'clientes.movimientos_fallidos',
      'No se pudo cargar el estado de cuenta.',
    )
  }
  return data.map(mapearMovimiento)
}

function mensajeErrorAbono(codigo: string): string {
  if (codigo.includes('monto_invalido')) return 'El monto debe ser mayor a cero.'
  if (codigo.includes('sin_tasa'))
    return 'Registra la tasa del día antes de registrar abonos.'
  return 'No se pudo registrar el abono.'
}

export async function registrarAbono(
  clienteId: string,
  negocio: UnidadNegocio,
  montoUsd: number,
  metodo: MetodoPago,
  nota?: string,
): Promise<void> {
  const { error } = await supabase.rpc('registrar_abono', {
    p_cliente_id: clienteId,
    p_negocio: negocio,
    p_monto: montoUsd,
    p_metodo: metodo,
    p_nota: nota || undefined,
  })
  if (error) {
    throw new ErrorDominio('clientes.abono_fallido', mensajeErrorAbono(error.message))
  }
}

/** Anular un abono mal registrado (requisito 3.6): solo dueño. */
export async function anularAbono(movimientoId: number, motivo: string): Promise<void> {
  const { error } = await supabase.rpc('anular_abono', {
    p_movimiento_id: movimientoId,
    p_motivo: motivo,
  })
  if (error) {
    const mensaje = error.message.includes('sin_permiso')
      ? 'Solo el dueño puede anular un abono.'
      : 'No se pudo anular el abono.'
    throw new ErrorDominio('clientes.abono_no_anulado', mensaje)
  }
}

/** Deuda manual, sin venta asociada (requisito 2.2). */
export async function registrarDeudaManual(
  clienteId: string,
  negocio: UnidadNegocio,
  montoUsd: number,
  nota?: string,
): Promise<void> {
  const { error } = await supabase.rpc('registrar_deuda_manual', {
    p_cliente_id: clienteId,
    p_negocio: negocio,
    p_monto: montoUsd,
    p_nota: nota || undefined,
  })
  if (error) {
    throw new ErrorDominio(
      'clientes.deuda_manual_fallida',
      error.message.includes('monto_invalido')
        ? 'El monto debe ser mayor a cero.'
        : 'No se pudo registrar la deuda.',
    )
  }
}

/** Bandeja de revisión de las notas del Excel (requisito 5.4), solo dueño. */
export async function listarPendientesRevision(): Promise<DeudaPorRevisar[]> {
  const { data, error } = await supabase
    .from('deuda_por_revisar')
    .select('*')
    .eq('resuelto', false)
    .order('creado_en')

  if (error || !data) {
    throw new ErrorDominio(
      'clientes.revision_fallida',
      'No se pudo cargar la bandeja de revisión.',
    )
  }
  if (data.length === 0) return []

  const { data: clientes } = await supabase
    .from('cliente')
    .select('id, nombre')
    .in('id', [...new Set(data.map(d => d.cliente_id))])

  const nombrePorCliente = new Map((clientes ?? []).map(c => [c.id, c.nombre]))
  return data.map(fila => mapearRevision(fila, nombrePorCliente))
}

export async function resolverRevision(id: number, montoUsd: number): Promise<void> {
  const { error } = await supabase.rpc('resolver_revision', {
    p_id: id,
    p_monto: montoUsd,
  })
  if (error) {
    throw new ErrorDominio(
      'clientes.revision_no_resuelta',
      error.message.includes('monto_invalido')
        ? 'El monto debe ser mayor a cero.'
        : 'No se pudo confirmar la deuda.',
    )
  }
}

export async function descartarRevision(id: number): Promise<void> {
  const { error } = await supabase.rpc('descartar_revision', { p_id: id })
  if (error) {
    throw new ErrorDominio(
      'clientes.revision_no_descartada',
      'No se pudo descartar el registro.',
    )
  }
}
