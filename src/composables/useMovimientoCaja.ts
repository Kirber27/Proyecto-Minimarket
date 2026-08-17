import { ref } from 'vue'

import * as ventasService from '@/services/ventasService'
import * as clienteService from '@/services/clienteService'
import { ErrorDominio } from '@/lib/errorDominio'
import { notificar } from '@/composables/useNotificaciones'
import type { Cliente, MovimientoCaja, Venta } from '@/types/dominio'

/** Abrir el documento origen de un movimiento de caja (requisito 1.7 del
 * spec 08): venta -> detalle de venta, abono -> ficha del cliente. Un egreso
 * no tiene detalle propio que abrir aqui (su UI vive en Caja, con anulacion). */
export function useMovimientoCaja() {
  const ventaAbierta = ref<Venta | null>(null)
  const clienteAbierto = ref<Cliente | null>(null)

  async function abrirMovimiento(m: MovimientoCaja): Promise<void> {
    try {
      if (m.origen === 'venta') {
        ventaAbierta.value = await ventasService.obtenerDetalle(m.documentoId)
      } else if (m.origen === 'abono' && m.clienteId) {
        clienteAbierto.value = await clienteService.obtener(m.clienteId)
      }
    } catch (err) {
      notificar(
        err instanceof ErrorDominio ? err.message : 'No se pudo abrir el detalle.',
      )
    }
  }

  return { ventaAbierta, clienteAbierto, abrirMovimiento }
}
