// Servicio minimo de clientes: lo justo para elegir un cliente al fiar en el
// punto de venta (spec 05). El spec 07 completo (crear/editar clientes,
// estado de cuenta, abonos, bandeja de revision) llega despues.

import { supabase } from '@/lib/supabase'
import { ErrorDominio } from '@/lib/errorDominio'
import { aCentavos } from '@/lib/money'
import type { Cliente, UnidadNegocio } from '@/types/dominio'

/** Clientes activos con su saldo en la unidad de negocio dada. */
export async function listarConSaldo(unidadNegocio: UnidadNegocio): Promise<Cliente[]> {
  const [clientesRes, saldosRes] = await Promise.all([
    supabase
      .from('cliente')
      .select('id, nombre, telefono, activo')
      .eq('activo', true)
      .order('nombre'),
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

  return clientesRes.data.map(fila => ({
    id: fila.id,
    nombre: fila.nombre,
    telefono: fila.telefono,
    activo: fila.activo,
    saldoUsd: aCentavos(saldoPorCliente.get(fila.id) ?? 0),
  }))
}

export async function crearRapido(nombre: string): Promise<Cliente> {
  const { data, error } = await supabase
    .from('cliente')
    .insert({ nombre })
    .select('id, nombre, telefono, activo')
    .single()

  if (error || !data) {
    throw new ErrorDominio('clientes.creacion_fallida', 'No se pudo crear el cliente.')
  }
  return {
    id: data.id,
    nombre: data.nombre,
    telefono: data.telefono,
    activo: data.activo,
  }
}
