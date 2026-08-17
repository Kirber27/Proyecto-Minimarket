<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { useSesionStore } from '@/stores/sesion'
import { useCatalogoStore } from '@/stores/catalogo'
import { useTasaStore } from '@/stores/tasa'
import * as clienteService from '@/services/clienteService'
import * as ventasService from '@/services/ventasService'
import {
  aBolivares,
  aCentavos,
  formatearBs,
  formatearUsd,
  type Centavos,
} from '@/lib/money'
import { formatearFecha, formatearFechaHora } from '@/lib/fechas'
import { ErrorDominio } from '@/lib/errorDominio'
import { notificar } from '@/composables/useNotificaciones'
import type { Cliente, DeudaMovimiento, Venta } from '@/types/dominio'
import ModalBase from '@/components/ui/ModalBase.vue'
import CampoNumero from '@/components/ui/CampoNumero.vue'
import CampoTexto from '@/components/ui/CampoTexto.vue'
import BotonPrimario from '@/components/ui/BotonPrimario.vue'
import BotonSecundario from '@/components/ui/BotonSecundario.vue'
import PrecioDoble from '@/components/dominio/PrecioDoble.vue'
import AbonoFormulario from '@/pages/deudas/AbonoFormulario.vue'
import ClienteFormulario from '@/pages/deudas/ClienteFormulario.vue'
import VentaDetalle from '@/pages/venta/VentaDetalle.vue'

const props = defineProps<{
  cliente: Cliente
}>()

const emit = defineEmits<{
  cerrar: []
  cambiado: []
}>()

const ETIQUETAS_TIPO: Record<string, string> = {
  deuda: 'Consumo',
  abono: 'Abono',
  ajuste: 'Ajuste',
}

const ETIQUETAS_METODO: Record<string, string> = {
  'efectivo-ves': 'Efectivo Bs.',
  'efectivo-usd': 'Efectivo $',
  punto: 'Punto',
  'pago-movil': 'Pago móvil',
  biopago: 'Biopago',
  credito: 'Fiado',
}

const sesion = useSesionStore()
const catalogo = useCatalogoStore()
const tasa = useTasaStore()

const movimientos = ref<DeudaMovimiento[]>([])
const cargando = ref(true)
const mostrandoAbono = ref(false)
const mostrandoEdicion = ref(false)
const mostrandoDeudaManual = ref(false)
const montoDeudaManual = ref<number | null>(null)
const notaDeudaManual = ref('')
const anulandoId = ref<number | null>(null)
const motivoAnulacion = ref('')
const ventaAbierta = ref<Venta | null>(null)
const error = ref('')

async function cargar(): Promise<void> {
  cargando.value = true
  try {
    movimientos.value = await clienteService.listarMovimientos(props.cliente.id)
  } catch (err) {
    notificar(
      err instanceof ErrorDominio
        ? err.message
        : 'No se pudo cargar el estado de cuenta.',
    )
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

const saldoUsd = computed<Centavos>(() => props.cliente.saldoUsd ?? aCentavos(0))

/** Saldo corrido, más antiguo primero (requisito 4.3, mismo orden que el
 * ejemplo del diseño: una cuenta se lee de atrás para adelante). */
const conSaldoCorrido = computed(() => {
  const ordenAsc = [...movimientos.value].sort(
    (a, b) => new Date(a.creadoEn).getTime() - new Date(b.creadoEn).getTime(),
  )
  let saldo = 0
  return ordenAsc.map(m => {
    if (m.tipo === 'deuda') saldo += m.montoUsd
    else if (m.tipo === 'abono') saldo -= m.montoUsd
    return { movimiento: m, saldoCorrido: aCentavos(saldo / 100) }
  })
})

async function abrirVenta(ventaId: string): Promise<void> {
  try {
    ventaAbierta.value = await ventasService.obtenerDetalle(ventaId)
  } catch (err) {
    notificar(err instanceof ErrorDominio ? err.message : 'No se pudo abrir la venta.')
  }
}

function pedirAnular(m: DeudaMovimiento): void {
  anulandoId.value = m.id
  motivoAnulacion.value = ''
  error.value = ''
}

async function confirmarAnulacion(): Promise<void> {
  if (!motivoAnulacion.value.trim()) {
    error.value = 'Escribe el motivo de la anulación.'
    return
  }
  try {
    await clienteService.anularAbono(anulandoId.value!, motivoAnulacion.value.trim())
    notificar('Abono anulado')
    anulandoId.value = null
    await cargar()
    emit('cambiado')
  } catch (err) {
    error.value =
      err instanceof ErrorDominio ? err.message : 'No se pudo anular el abono.'
  }
}

async function registrarDeudaManual(): Promise<void> {
  error.value = ''
  if (!montoDeudaManual.value || montoDeudaManual.value <= 0) {
    error.value = 'Indica un monto mayor a cero.'
    return
  }
  try {
    await clienteService.registrarDeudaManual(
      props.cliente.id,
      catalogo.negocio,
      montoDeudaManual.value,
      notaDeudaManual.value.trim() || undefined,
    )
    notificar('Deuda registrada')
    mostrandoDeudaManual.value = false
    montoDeudaManual.value = null
    notaDeudaManual.value = ''
    await cargar()
    emit('cambiado')
  } catch (err) {
    error.value =
      err instanceof ErrorDominio ? err.message : 'No se pudo registrar la deuda.'
  }
}

async function alAbonar(): Promise<void> {
  mostrandoAbono.value = false
  await cargar()
  emit('cambiado')
}

async function alEditar(): Promise<void> {
  mostrandoEdicion.value = false
  emit('cambiado')
}

/** Requisito 6.3/6.4: se prepara el texto, nunca se envía nada automáticamente. */
async function compartir(): Promise<void> {
  const lineas = [
    `Estado de cuenta — ${props.cliente.nombre}`,
    `Al ${formatearFecha(new Date())}`,
    '',
    ...conSaldoCorrido.value.map(({ movimiento: m }) => {
      const signo = m.tipo === 'abono' ? '-' : '+'
      const concepto =
        m.tipo === 'abono'
          ? `Abono${m.metodo ? ` · ${ETIQUETAS_METODO[m.metodo]}` : ''}`
          : (m.nota ?? 'Consumo')
      return `${formatearFecha(new Date(m.creadoEn))}  ${concepto}  ${signo}${formatearUsd(m.montoUsd)}`
    }),
    '',
    `Saldo: ${formatearUsd(saldoUsd.value)}${
      tasa.valor !== null
        ? `  (${formatearBs(aBolivares(saldoUsd.value, tasa.valor))} a tasa ${tasa.valor})`
        : ''
    }`,
  ]
  const texto = lineas.join('\n')

  if (navigator.share) {
    try {
      await navigator.share({ text: texto })
      return
    } catch {
      // el usuario cancelo el share; no hace falta avisar
      return
    }
  }

  await navigator.clipboard.writeText(texto)
  notificar('Estado de cuenta copiado al portapapeles')
}
</script>

<template>
  <ModalBase :titulo="cliente.nombre" @cerrar="emit('cerrar')">
    <div class="mm-cliente-detalle">
      <div class="mm-cliente-detalle__cabecera">
        <div>
          <span class="mm-cliente-detalle__etiqueta">Saldo</span>
          <PrecioDoble :usd="saldoUsd" tamano="md" />
        </div>
        <p v-if="cliente.telefono" class="mm-cliente-detalle__dato">
          {{ cliente.telefono }}
        </p>
        <p v-if="cliente.nota" class="mm-cliente-detalle__dato">{{ cliente.nota }}</p>
      </div>

      <div class="mm-cliente-detalle__acciones">
        <BotonPrimario @click="mostrandoAbono = true">Registrar abono</BotonPrimario>
        <BotonSecundario @click="mostrandoDeudaManual = !mostrandoDeudaManual">
          Deuda manual
        </BotonSecundario>
        <BotonSecundario @click="mostrandoEdicion = true">Editar</BotonSecundario>
        <BotonSecundario @click="compartir">Compartir</BotonSecundario>
      </div>

      <div v-if="mostrandoDeudaManual" class="mm-cliente-detalle__deuda-manual">
        <p class="mm-cliente-detalle__ayuda">
          Para un consumo que no pasó por la caja (requisito 2.2).
        </p>
        <CampoNumero
          v-model="montoDeudaManual"
          etiqueta="Monto (USD)"
          :step="0.01"
          :min="0"
        />
        <CampoTexto v-model="notaDeudaManual" etiqueta="Nota (opcional)" />
        <BotonPrimario @click="registrarDeudaManual">Registrar deuda</BotonPrimario>
      </div>

      <p v-if="error" class="mm-cliente-detalle__error" role="alert">{{ error }}</p>

      <h3 class="mm-cliente-detalle__subtitulo">Estado de cuenta</h3>

      <p
        v-if="!cargando && movimientos.length === 0"
        class="mm-cliente-detalle__sin-movimientos"
      >
        Este cliente todavía no tiene movimientos.
      </p>

      <ul v-else class="mm-cliente-detalle__movimientos list-unstyled">
        <li
          v-for="{ movimiento: m, saldoCorrido } in conSaldoCorrido"
          :key="m.id"
          class="mm-cliente-detalle__movimiento"
        >
          <div class="mm-cliente-detalle__movimiento-fila">
            <button
              v-if="m.ventaId"
              type="button"
              class="mm-cliente-detalle__concepto mm-cliente-detalle__concepto--link"
              @click="abrirVenta(m.ventaId)"
            >
              {{ ETIQUETAS_TIPO[m.tipo] }} · Ver venta
            </button>
            <span v-else class="mm-cliente-detalle__concepto">
              {{ ETIQUETAS_TIPO[m.tipo]
              }}{{ m.metodo ? ` · ${ETIQUETAS_METODO[m.metodo]}` : '' }}
            </span>
            <span :class="m.tipo === 'abono' ? 'mm-cliente-detalle__monto--abono' : ''">
              {{ m.tipo === 'abono' ? '−' : '+' }}{{ formatearUsd(m.montoUsd) }}
            </span>
          </div>
          <p class="mm-cliente-detalle__meta">
            {{ formatearFechaHora(new Date(m.creadoEn)) }} · saldo
            {{ formatearUsd(saldoCorrido) }}
          </p>
          <p v-if="m.nota && !m.ventaId" class="mm-cliente-detalle__nota">{{ m.nota }}</p>

          <button
            v-if="sesion.esDueno && m.tipo === 'abono' && !m.anulado"
            type="button"
            class="mm-cliente-detalle__anular"
            @click="pedirAnular(m)"
          >
            Anular abono
          </button>

          <div v-if="anulandoId === m.id" class="mm-cliente-detalle__anular-form">
            <CampoTexto v-model="motivoAnulacion" etiqueta="Motivo de la anulación" />
            <div class="mm-cliente-detalle__anular-acciones">
              <BotonPrimario @click="confirmarAnulacion">Confirmar</BotonPrimario>
              <BotonSecundario @click="anulandoId = null">Cancelar</BotonSecundario>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <AbonoFormulario
      v-if="mostrandoAbono"
      :cliente="cliente"
      :negocio="catalogo.negocio"
      :saldo-usd="saldoUsd"
      @cerrar="mostrandoAbono = false"
      @registrado="alAbonar"
    />

    <ClienteFormulario
      v-if="mostrandoEdicion"
      :cliente="cliente"
      @cerrar="mostrandoEdicion = false"
      @guardado="alEditar"
    />

    <VentaDetalle
      v-if="ventaAbierta"
      :venta="ventaAbierta"
      @cerrar="ventaAbierta = null"
      @anulada="ventaAbierta = null"
    />
  </ModalBase>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-cliente-detalle {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mm-cliente-detalle__cabecera {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mm-cliente-detalle__etiqueta {
  display: block;
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
}

.mm-cliente-detalle__dato {
  margin: 0;
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
}

.mm-cliente-detalle__acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mm-cliente-detalle__deuda-manual {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid v.$borde;
  border-radius: v.$radio-md;
}

.mm-cliente-detalle__ayuda {
  margin: 0;
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
}

.mm-cliente-detalle__error {
  margin: 0;
  color: v.$error;
  font-size: v.$tam-etiqueta;
}

.mm-cliente-detalle__subtitulo {
  margin: 0;
  font-size: v.$tam-cuerpo;
  font-weight: v.$peso-semi;
}

.mm-cliente-detalle__sin-movimientos {
  margin: 0;
  color: v.$tenue;
  font-size: v.$tam-etiqueta;
}

.mm-cliente-detalle__movimientos {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 45vh;
  overflow-y: auto;
}

.mm-cliente-detalle__movimiento {
  padding: 10px;
  border: 1px solid v.$borde;
  border-radius: v.$radio-sm;
}

.mm-cliente-detalle__movimiento-fila {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: v.$peso-semi;
}

.mm-cliente-detalle__concepto {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: inherit;
  text-align: left;

  &--link {
    color: v.$acento-hover;
    text-decoration: underline;
    cursor: pointer;
  }
}

.mm-cliente-detalle__monto--abono {
  color: v.$ok;
}

.mm-cliente-detalle__meta {
  margin: 2px 0 0;
  font-size: 12px;
  color: v.$tenue;
}

.mm-cliente-detalle__nota {
  margin: 2px 0 0;
  font-size: 12px;
  color: v.$tenue;
  font-style: italic;
}

.mm-cliente-detalle__anular {
  margin-top: 6px;
  background: none;
  border: none;
  color: v.$error;
  font-size: 12px;
  cursor: pointer;
}

.mm-cliente-detalle__anular-form {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mm-cliente-detalle__anular-acciones {
  display: flex;
  gap: 8px;
}
</style>
