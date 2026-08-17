<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import { useSesionStore } from '@/stores/sesion'
import { useCatalogoStore } from '@/stores/catalogo'
import * as cajaService from '@/services/cajaService'
import * as ventasService from '@/services/ventasService'
import * as clienteService from '@/services/clienteService'
import { ETIQUETAS_METODO, afectaArqueo } from '@/lib/metodosPago'
import { aBolivares, aCentavos, formatearUsd, sumar, type Centavos } from '@/lib/money'
import { formatearFechaHora } from '@/lib/fechas'
import { ErrorDominio } from '@/lib/errorDominio'
import { notificar } from '@/composables/useNotificaciones'
import type { Cliente, MovimientoCaja, SaldoMetodo, Venta } from '@/types/dominio'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import CampoTexto from '@/components/ui/CampoTexto.vue'
import BotonPrimario from '@/components/ui/BotonPrimario.vue'
import BotonSecundario from '@/components/ui/BotonSecundario.vue'
import PrecioDoble from '@/components/dominio/PrecioDoble.vue'
import EgresoFormulario from '@/pages/caja/EgresoFormulario.vue'
import VentaDetalle from '@/pages/venta/VentaDetalle.vue'
import ClienteDetalle from '@/pages/deudas/ClienteDetalle.vue'

const CATEGORIAS_ETIQUETA: Record<string, string> = {
  proveedor: 'Proveedor',
  insumos: 'Insumos',
  servicios: 'Servicios',
  sueldos: 'Sueldos',
  retiro: 'Retiro',
  otro: 'Otro',
}

const sesion = useSesionStore()
const catalogo = useCatalogoStore()

const modo = ref<'hoy' | 'historial'>('hoy')
const cargando = ref(true)
const movimientos = ref<MovimientoCaja[]>([])
const saldos = ref<SaldoMetodo[]>([])
const mostrandoEgreso = ref(false)
const ventaAbierta = ref<Venta | null>(null)
const clienteAbierto = ref<Cliente | null>(null)
const anulandoEgresoId = ref<string | null>(null)
const motivoAnulacion = ref('')

function inicioDeHoy(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

async function cargarHoy(): Promise<void> {
  cargando.value = true
  try {
    const inicio = inicioDeHoy()
    const fin = new Date(inicio.getTime() + 86_400_000)
    const [mov, sal] = await Promise.all([
      cajaService.listarMovimientos(catalogo.negocio, {
        desde: inicio.toISOString(),
        hasta: fin.toISOString(),
      }),
      cajaService.saldoPorMetodo(catalogo.negocio),
    ])
    movimientos.value = mov
    saldos.value = sal
  } catch (err) {
    notificar(err instanceof ErrorDominio ? err.message : 'No se pudo cargar la caja.')
  } finally {
    cargando.value = false
  }
}

onMounted(cargarHoy)
watch(() => catalogo.negocio, cargarHoy)

const totalIngresos = computed<Centavos>(() =>
  sumar(...movimientos.value.filter(m => m.flujo === 'ingreso').map(m => m.montoUsd)),
)
const totalEgresos = computed<Centavos>(() =>
  sumar(...movimientos.value.filter(m => m.flujo === 'egreso').map(m => m.montoUsd)),
)

const saldoEfectivo = computed<Centavos>(() =>
  sumar(...saldos.value.filter(s => afectaArqueo(s.metodo)).map(s => s.saldoUsd)),
)
const saldoElectronico = computed<Centavos>(() =>
  sumar(...saldos.value.filter(s => !afectaArqueo(s.metodo)).map(s => s.saldoUsd)),
)

async function abrirMovimiento(m: MovimientoCaja): Promise<void> {
  try {
    if (m.origen === 'venta') {
      ventaAbierta.value = await ventasService.obtenerDetalle(m.documentoId)
    } else if (m.origen === 'abono' && m.clienteId) {
      clienteAbierto.value = await clienteService.obtener(m.clienteId)
    }
  } catch (err) {
    notificar(err instanceof ErrorDominio ? err.message : 'No se pudo abrir el detalle.')
  }
}

function pedirAnularEgreso(m: MovimientoCaja): void {
  anulandoEgresoId.value = m.documentoId
  motivoAnulacion.value = ''
}

async function confirmarAnularEgreso(): Promise<void> {
  if (!motivoAnulacion.value.trim()) {
    notificar('Escribe el motivo de la anulación.')
    return
  }
  try {
    await cajaService.anularEgreso(anulandoEgresoId.value!, motivoAnulacion.value.trim())
    notificar('Egreso anulado')
    anulandoEgresoId.value = null
    await cargarHoy()
  } catch (err) {
    notificar(err instanceof ErrorDominio ? err.message : 'No se pudo anular el egreso.')
  }
}

async function alRegistrarEgreso(): Promise<void> {
  mostrandoEgreso.value = false
  await cargarHoy()
}

// --- Historial (requisito 6) ---
function hoyIsoLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const fechaDesde = ref(hoyIsoLocal())
const fechaHasta = ref(hoyIsoLocal())
const movimientosHistorial = ref<MovimientoCaja[]>([])
const cargandoHistorial = ref(false)

async function cargarHistorial(): Promise<void> {
  cargandoHistorial.value = true
  try {
    const desde = new Date(`${fechaDesde.value}T00:00:00`)
    const hasta = new Date(`${fechaHasta.value}T00:00:00`)
    hasta.setDate(hasta.getDate() + 1)
    movimientosHistorial.value = await cajaService.listarMovimientos(catalogo.negocio, {
      desde: desde.toISOString(),
      hasta: hasta.toISOString(),
    })
  } catch (err) {
    notificar(
      err instanceof ErrorDominio ? err.message : 'No se pudo cargar el historial.',
    )
  } finally {
    cargandoHistorial.value = false
  }
}

function irAHistorial(): void {
  modo.value = 'historial'
  void cargarHistorial()
}

const ingresosHistorial = computed<Centavos>(() =>
  sumar(
    ...movimientosHistorial.value.filter(m => m.flujo === 'ingreso').map(m => m.montoUsd),
  ),
)
const egresosHistorial = computed<Centavos>(() =>
  sumar(
    ...movimientosHistorial.value.filter(m => m.flujo === 'egreso').map(m => m.montoUsd),
  ),
)
const resultadoHistorial = computed<Centavos>(() =>
  aCentavos((ingresosHistorial.value - egresosHistorial.value) / 100),
)

/** Requisito 6.4: CSV con ambas monedas y la tasa de cada movimiento. */
function exportarCsv(): void {
  const encabezado = [
    'Fecha',
    'Concepto',
    'Método',
    'Categoría',
    'Flujo',
    'Monto USD',
    'Tasa',
    'Monto Bs.',
  ]
  const filas = movimientosHistorial.value.map(m => [
    formatearFechaHora(new Date(m.creadoEn)),
    m.concepto,
    ETIQUETAS_METODO[m.metodo],
    m.categoria ? CATEGORIAS_ETIQUETA[m.categoria] : '',
    m.flujo,
    (m.montoUsd / 100).toFixed(2),
    m.tasaAplicada.toString(),
    Math.round(aBolivares(m.montoUsd, m.tasaAplicada)).toString(),
  ])

  const csv = [encabezado, ...filas]
    .map(fila => fila.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const enlace = document.createElement('a')
  enlace.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  enlace.download = `flujo-caja_${fechaDesde.value}_${fechaHasta.value}.csv`
  enlace.click()
  URL.revokeObjectURL(enlace.href)
}
</script>

<template>
  <div class="mm-caja">
    <div class="mm-caja__modos" role="group" aria-label="Ver">
      <button
        type="button"
        class="mm-caja__modo-boton"
        :class="{ 'mm-caja__modo-boton--activo': modo === 'hoy' }"
        @click="modo = 'hoy'"
      >
        Hoy
      </button>
      <button
        type="button"
        class="mm-caja__modo-boton"
        :class="{ 'mm-caja__modo-boton--activo': modo === 'historial' }"
        @click="irAHistorial"
      >
        Historial
      </button>
    </div>

    <template v-if="modo === 'hoy'">
      <div class="mm-caja__saldos">
        <div class="mm-caja__saldo-tarjeta">
          <span class="mm-caja__etiqueta">Efectivo en gaveta</span>
          <PrecioDoble :usd="saldoEfectivo" tamano="md" />
        </div>
        <div class="mm-caja__saldo-tarjeta">
          <span class="mm-caja__etiqueta">En cuentas</span>
          <PrecioDoble :usd="saldoElectronico" tamano="md" />
        </div>
      </div>

      <div class="mm-caja__desglose">
        <div v-for="s in saldos" :key="s.metodo" class="mm-caja__desglose-fila">
          <span>{{ ETIQUETAS_METODO[s.metodo] }}</span>
          <PrecioDoble :usd="s.saldoUsd" tamano="sm" />
        </div>
      </div>

      <div class="mm-caja__resumen-dia">
        <span>Ingresos hoy: {{ formatearUsd(totalIngresos) }}</span>
        <span>Egresos hoy: {{ formatearUsd(totalEgresos) }}</span>
      </div>

      <BotonPrimario @click="mostrandoEgreso = true">Registrar egreso</BotonPrimario>

      <EstadoVacio
        v-if="!cargando && movimientos.length === 0"
        titulo="Todavía no hay movimientos hoy"
        descripcion="Los ingresos por venta, los abonos y los egresos van a aparecer aquí."
      />

      <ul v-else class="mm-caja__lista list-unstyled">
        <li v-for="m in movimientos" :key="m.id" class="mm-caja__movimiento">
          <button
            type="button"
            class="mm-caja__movimiento-boton"
            :class="{
              'mm-caja__movimiento-boton--sin-enlace':
                m.origen === 'egreso' && !sesion.esDueno,
            }"
            @click="
              m.origen === 'egreso'
                ? sesion.esDueno && pedirAnularEgreso(m)
                : abrirMovimiento(m)
            "
          >
            <div class="mm-caja__movimiento-info">
              <span class="mm-caja__movimiento-concepto">{{ m.concepto }}</span>
              <span class="mm-caja__movimiento-meta">
                {{ formatearFechaHora(new Date(m.creadoEn)) }} ·
                {{ ETIQUETAS_METODO[m.metodo] }}
                <template v-if="m.categoria">
                  · {{ CATEGORIAS_ETIQUETA[m.categoria] }}</template
                >
              </span>
            </div>
            <span
              :class="
                m.flujo === 'ingreso'
                  ? 'mm-caja__monto--ingreso'
                  : 'mm-caja__monto--egreso'
              "
            >
              {{ m.flujo === 'ingreso' ? '+' : '−' }}{{ formatearUsd(m.montoUsd) }}
            </span>
          </button>

          <div v-if="anulandoEgresoId === m.documentoId" class="mm-caja__anular">
            <CampoTexto v-model="motivoAnulacion" etiqueta="Motivo de la anulación" />
            <div class="mm-caja__anular-acciones">
              <BotonPrimario @click="confirmarAnularEgreso">Confirmar</BotonPrimario>
              <BotonSecundario @click="anulandoEgresoId = null">Cancelar</BotonSecundario>
            </div>
          </div>
        </li>
      </ul>
    </template>

    <template v-else>
      <div class="mm-caja__rango">
        <label class="mm-caja__rango-campo">
          Desde
          <input
            v-model="fechaDesde"
            type="date"
            class="mm-caja__fecha"
            @change="cargarHistorial"
          />
        </label>
        <label class="mm-caja__rango-campo">
          Hasta
          <input
            v-model="fechaHasta"
            type="date"
            class="mm-caja__fecha"
            @change="cargarHistorial"
          />
        </label>
      </div>

      <div class="mm-caja__totales-rango">
        <span>Ingresos: {{ formatearUsd(ingresosHistorial) }}</span>
        <span>Egresos: {{ formatearUsd(egresosHistorial) }}</span>
        <span>Resultado: {{ formatearUsd(resultadoHistorial) }}</span>
      </div>

      <BotonSecundario
        :deshabilitado="movimientosHistorial.length === 0"
        @click="exportarCsv"
      >
        Exportar CSV
      </BotonSecundario>

      <EstadoVacio
        v-if="!cargandoHistorial && movimientosHistorial.length === 0"
        titulo="Sin movimientos en ese rango"
        descripcion="Prueba con otras fechas."
      />

      <ul v-else class="mm-caja__lista list-unstyled">
        <li v-for="m in movimientosHistorial" :key="m.id" class="mm-caja__movimiento">
          <div class="mm-caja__movimiento-info">
            <span class="mm-caja__movimiento-concepto">{{ m.concepto }}</span>
            <span class="mm-caja__movimiento-meta">
              {{ formatearFechaHora(new Date(m.creadoEn)) }} ·
              {{ ETIQUETAS_METODO[m.metodo] }}
            </span>
          </div>
          <span
            :class="
              m.flujo === 'ingreso' ? 'mm-caja__monto--ingreso' : 'mm-caja__monto--egreso'
            "
          >
            {{ m.flujo === 'ingreso' ? '+' : '−' }}{{ formatearUsd(m.montoUsd) }}
          </span>
        </li>
      </ul>
    </template>

    <EgresoFormulario
      v-if="mostrandoEgreso"
      @cerrar="mostrandoEgreso = false"
      @registrado="alRegistrarEgreso"
    />

    <VentaDetalle
      v-if="ventaAbierta"
      :venta="ventaAbierta"
      @cerrar="ventaAbierta = null"
      @anulada="
        () => {
          ventaAbierta = null
          cargarHoy()
        }
      "
    />

    <ClienteDetalle
      v-if="clienteAbierto"
      :cliente="clienteAbierto"
      @cerrar="clienteAbierto = null"
      @cambiado="cargarHoy"
    />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-caja {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mm-caja__modos {
  display: flex;
  gap: 4px;
}

.mm-caja__modo-boton {
  min-height: 32px;
  padding: 0 16px;
  border: 1px solid v.$borde;
  border-radius: v.$radio-sm;
  background-color: v.$superficie;
  color: v.$tenue;
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-semi;
  cursor: pointer;

  &--activo {
    background-color: v.$tinta;
    color: white;
    border-color: v.$tinta;
  }
}

.mm-caja__saldos {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.mm-caja__saldo-tarjeta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px;
  background-color: v.$superficie;
  border: 1px solid v.$borde;
  border-radius: v.$radio-md;
}

.mm-caja__etiqueta {
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
}

.mm-caja__desglose {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 14px;
  border: 1px solid v.$borde;
  border-radius: v.$radio-md;
}

.mm-caja__desglose-fila {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: v.$tam-etiqueta;
}

.mm-caja__resumen-dia {
  display: flex;
  gap: 16px;
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
}

.mm-caja__lista {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mm-caja__movimiento-boton {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: v.$objetivo-tactil-min;
  padding: 10px 14px;
  border: 1px solid v.$borde;
  border-radius: v.$radio-md;
  background-color: v.$superficie;
  cursor: pointer;
  text-align: left;

  &:hover {
    background-color: v.$acento-suave;
  }

  &--sin-enlace {
    cursor: default;
  }
}

.mm-caja__movimiento-info {
  display: flex;
  flex-direction: column;
}

.mm-caja__movimiento-concepto {
  font-weight: v.$peso-semi;
  font-size: v.$tam-etiqueta;
}

.mm-caja__movimiento-meta {
  font-size: 12px;
  color: v.$tenue;
}

.mm-caja__monto--ingreso {
  color: v.$ok;
  font-weight: v.$peso-semi;
}

.mm-caja__monto--egreso {
  color: v.$error;
  font-weight: v.$peso-semi;
}

.mm-caja__anular {
  margin-top: 8px;
  padding: 10px;
  border: 1px solid v.$borde;
  border-radius: v.$radio-sm;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mm-caja__anular-acciones {
  display: flex;
  gap: 8px;
}

.mm-caja__rango {
  display: flex;
  gap: 12px;
}

.mm-caja__rango-campo {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
  font-weight: v.$peso-semi;
}

.mm-caja__fecha {
  min-height: v.$objetivo-tactil-min;
  padding: 0 10px;
  border: 1px solid v.$borde;
  border-radius: v.$radio-sm;
  background-color: v.$superficie;
}

.mm-caja__totales-rango {
  display: flex;
  gap: 16px;
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-semi;
}
</style>
