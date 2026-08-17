<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { useCatalogoStore } from '@/stores/catalogo'
import { usePreferenciasStore } from '@/stores/preferencias'
import * as ventasService from '@/services/ventasService'
import * as inventarioService from '@/services/inventarioService'
import * as cajaService from '@/services/cajaService'
import { ETIQUETAS_METODO } from '@/lib/metodosPago'
import { notificar } from '@/composables/useNotificaciones'
import { ErrorDominio } from '@/lib/errorDominio'
import { aCentavos, aUsd, formatearUsd, restar, type Centavos } from '@/lib/money'
import { formatearHora } from '@/lib/fechas'
import type { ProductoCobertura, ResumenDia, Venta } from '@/types/dominio'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import PrecioDoble from '@/components/dominio/PrecioDoble.vue'
import VentaDetalle from '@/pages/venta/VentaDetalle.vue'

const catalogo = useCatalogoStore()
const preferencias = usePreferenciasStore()

const ventas = ref<Venta[]>([])
const cargando = ref(true)
const ventaAbierta = ref<Venta | null>(null)
const cobertura = ref<ProductoCobertura[]>([])
const resumen = ref<ResumenDia | null>(null)

function inicioDeHoy(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

async function cargar(): Promise<void> {
  cargando.value = true
  try {
    const [listado, resumenDia] = await Promise.all([
      ventasService.listarDelDia(catalogo.negocio),
      cajaService.resumenDia(catalogo.negocio, inicioDeHoy()),
    ])
    ventas.value = listado
    resumen.value = resumenDia
  } catch (err) {
    notificar(
      err instanceof ErrorDominio ? err.message : 'No se pudo cargar el resumen del día.',
    )
  } finally {
    cargando.value = false
  }
}

async function cargarAlertas(): Promise<void> {
  try {
    cobertura.value = await inventarioService.listarCobertura()
  } catch {
    // La tarjeta de alertas es informativa; si falla, el resto del Resumen
    // sigue funcionando.
  }
}

onMounted(() => {
  void cargar()
  void cargarAlertas()
})

/** Requisitos 5.2, 8.8: conteo y los tres productos más críticos. */
const productosEnAlerta = computed(() =>
  cobertura.value
    .filter(c => c.activo && c.unidadNegocio === catalogo.negocio)
    .filter(
      c =>
        c.stockActual < c.stockMinimo ||
        (c.diasCobertura !== null && c.diasCobertura < 7),
    )
    .sort((a, b) => a.stockActual - b.stockActual),
)

const conteoAlertas = computed(() =>
  inventarioService.contarAlertas(cobertura.value, catalogo.negocio),
)

const pendientesRevision = computed(() => resumen.value?.pendientesRevision ?? 0)

/** Requisito 5.3: comparación con el mismo día de la semana anterior. */
const diferenciaSemana = computed<Centavos | null>(() => {
  if (!resumen.value) return null
  return restar(resumen.value.vendidoHoyUsd, resumen.value.mismoDiaSemanaAnteriorUsd)
})

const porcentajeSemana = computed<number | null>(() => {
  if (!resumen.value || resumen.value.mismoDiaSemanaAnteriorUsd <= 0) return null
  return (diferenciaSemana.value! / resumen.value.mismoDiaSemanaAnteriorUsd) * 100
})

/** Requisito 5.2: siete barras, la de hoy en color de acento. */
const barrasSerie = computed(() => {
  const serie = resumen.value?.serie7Dias ?? []
  const maximo = Math.max(1, ...serie.map(d => d.vendidoUsd))
  return serie.map((d, indice) => ({
    ...d,
    alturaPct: Math.round((d.vendidoUsd / maximo) * 100),
    esHoy: indice === serie.length - 1,
  }))
})

const DIAS_SEMANA = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

function etiquetaDia(fechaIso: string): string {
  return DIAS_SEMANA[new Date(`${fechaIso}T12:00:00`).getDay()] ?? ''
}

/** Requisito 5.6: se enmascara también el valor abreviado sobre cada barra. */
function formatearAbreviado(usd: Centavos): string {
  if (preferencias.ocultarMontos) return '•••'
  const dolares = aUsd(usd)
  if (Math.abs(dolares) >= 1000) return `$${(dolares / 1000).toFixed(1)}k`
  return formatearUsd(usd)
}

async function abrirVenta(venta: Venta): Promise<void> {
  try {
    ventaAbierta.value = await ventasService.obtenerDetalle(venta.id)
  } catch (err) {
    notificar(err instanceof ErrorDominio ? err.message : 'No se pudo abrir la venta.')
  }
}

async function alAnular(): Promise<void> {
  ventaAbierta.value = null
  await cargar()
}
</script>

<template>
  <div class="mm-resumen">
    <div class="mm-resumen__cifra">
      <span class="mm-resumen__etiqueta">Vendido hoy</span>
      <PrecioDoble v-if="resumen" :usd="resumen.vendidoHoyUsd" tamano="lg" />
      <p v-if="diferenciaSemana !== null" class="mm-resumen__comparacion">
        <span
          :class="
            diferenciaSemana >= 0
              ? 'mm-resumen__comparacion--arriba'
              : 'mm-resumen__comparacion--abajo'
          "
        >
          {{ diferenciaSemana >= 0 ? '▲' : '▼' }}
          {{ formatearUsd(aCentavos(Math.abs(diferenciaSemana) / 100)) }}
        </span>
        vs. mismo día de la semana pasada
        <template v-if="porcentajeSemana !== null">
          ({{ porcentajeSemana >= 0 ? '+' : '' }}{{ porcentajeSemana.toFixed(0) }}%)
        </template>
      </p>
    </div>

    <div v-if="resumen" class="mm-resumen__cifras-secundarias">
      <div>
        <span class="mm-resumen__etiqueta-chica">Ventas</span>
        <strong>{{ resumen.numeroVentas }}</strong>
      </div>
      <div>
        <span class="mm-resumen__etiqueta-chica">Ticket promedio</span>
        <PrecioDoble :usd="resumen.ticketPromedioUsd" tamano="sm" />
      </div>
      <div>
        <span class="mm-resumen__etiqueta-chica">Egresos hoy</span>
        <PrecioDoble :usd="resumen.egresosHoyUsd" tamano="sm" />
      </div>
      <RouterLink to="/caja" class="mm-resumen__cifra-enlace">
        <span class="mm-resumen__etiqueta-chica">Saldo en caja</span>
        <PrecioDoble :usd="resumen.saldoActualUsd" tamano="sm" />
      </RouterLink>
    </div>

    <div
      v-if="barrasSerie.length > 0"
      class="mm-resumen__grafico"
      role="img"
      aria-label="Ventas de los últimos 7 días"
    >
      <div v-for="dia in barrasSerie" :key="dia.fecha" class="mm-resumen__barra-col">
        <span class="mm-resumen__barra-valor">{{
          formatearAbreviado(dia.vendidoUsd)
        }}</span>
        <div class="mm-resumen__barra-pista">
          <div
            class="mm-resumen__barra"
            :class="{ 'mm-resumen__barra--hoy': dia.esHoy }"
            :style="{ height: `${Math.max(dia.alturaPct, 3)}%` }"
          />
        </div>
        <span class="mm-resumen__barra-dia">{{ etiquetaDia(dia.fecha) }}</span>
      </div>
    </div>

    <RouterLink
      v-if="resumen && resumen.porCobrarUsd > 0"
      to="/deudas"
      class="mm-resumen__alertas"
    >
      <div class="mm-resumen__alertas-cabecera">
        <span>Por cobrar en fiado</span>
        <span class="mm-resumen__alertas-ver">Ver clientes</span>
      </div>
      <PrecioDoble :usd="resumen.porCobrarUsd" tamano="sm" />
    </RouterLink>

    <RouterLink
      v-if="pendientesRevision > 0"
      to="/deudas"
      class="mm-resumen__alertas mm-resumen__alertas--revision"
    >
      <div class="mm-resumen__alertas-cabecera">
        <span>
          {{ pendientesRevision }} nota{{ pendientesRevision === 1 ? '' : 's' }} de la
          planilla por revisar
        </span>
        <span class="mm-resumen__alertas-ver">Revisar</span>
      </div>
    </RouterLink>

    <RouterLink
      v-if="productosEnAlerta.length > 0"
      to="/alertas"
      class="mm-resumen__alertas"
    >
      <div class="mm-resumen__alertas-cabecera">
        <span>
          {{ conteoAlertas.agotados + conteoAlertas.criticos }} producto{{
            conteoAlertas.agotados + conteoAlertas.criticos === 1 ? '' : 's'
          }}
          por reponer
        </span>
        <span class="mm-resumen__alertas-ver">Ver todo</span>
      </div>
      <p class="mm-resumen__alertas-lista">
        {{
          productosEnAlerta
            .slice(0, 3)
            .map(p => p.nombre)
            .join(' · ')
        }}
      </p>
    </RouterLink>

    <EstadoVacio
      v-if="!cargando && ventas.length === 0"
      titulo="Todavía no hay ventas hoy"
      descripcion="Cuando registres una venta, aquí vas a ver cuánto llevas del día."
      etiqueta-accion="Registrar venta"
      ruta-accion="/venta"
    />

    <ul v-else class="mm-resumen__lista list-unstyled">
      <li v-for="venta in ventas" :key="venta.id">
        <button type="button" class="mm-resumen__venta" @click="abrirVenta(venta)">
          <div class="mm-resumen__venta-info">
            <span class="mm-resumen__venta-hora">
              {{ formatearHora(new Date(venta.creadoEn)) }}
            </span>
            <span class="mm-resumen__venta-detalle">
              {{ venta.unidades }} u. ·
              {{
                venta.pagos?.map(p => ETIQUETAS_METODO[p.metodo] ?? p.metodo).join(' + ')
              }}
            </span>
          </div>
          <PrecioDoble :usd="venta.totalUsd" tamano="sm" />
        </button>
      </li>
    </ul>

    <VentaDetalle
      v-if="ventaAbierta"
      :venta="ventaAbierta"
      @cerrar="ventaAbierta = null"
      @anulada="alAnular"
    />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-resumen {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.mm-resumen__cifra {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mm-resumen__etiqueta {
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-semi;
  color: v.$tenue;
}

.mm-resumen__comparacion {
  margin: 0;
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
}

.mm-resumen__comparacion--arriba {
  color: v.$ok;
  font-weight: v.$peso-semi;
}

.mm-resumen__comparacion--abajo {
  color: v.$error;
  font-weight: v.$peso-semi;
}

.mm-resumen__cifras-secundarias {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;

  > div,
  > a {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
}

.mm-resumen__cifra-enlace {
  text-decoration: none;
  color: inherit;
}

.mm-resumen__etiqueta-chica {
  font-size: 11px;
  color: v.$tenue;
}

.mm-resumen__grafico {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 6px;
  height: 120px;
  padding: 8px 4px 0;
}

.mm-resumen__barra-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
  height: 100%;
}

.mm-resumen__barra-valor {
  font-size: 10px;
  color: v.$tenue;
  white-space: nowrap;
}

.mm-resumen__barra-pista {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
}

.mm-resumen__barra {
  width: 100%;
  min-height: 3px;
  border-radius: 3px 3px 0 0;
  background-color: v.$borde;
}

.mm-resumen__barra--hoy {
  background-color: v.$acento;
}

.mm-resumen__barra-dia {
  font-size: 10px;
  color: v.$tenue;
}

.mm-resumen__alertas {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid v.$aviso;
  border-radius: v.$radio-md;
  background-color: v.$acento-suave;
  text-decoration: none;
  color: v.$tinta;
}

.mm-resumen__alertas-cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: v.$peso-semi;
}

.mm-resumen__alertas-ver {
  font-size: v.$tam-etiqueta;
  color: v.$acento-hover;
  font-weight: v.$peso-semi;
}

.mm-resumen__alertas-lista {
  margin: 0;
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
}

.mm-resumen__lista {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mm-resumen__venta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: v.$objetivo-tactil-min;
  padding: 10px 12px;
  border: none;
  border-bottom: 1px solid v.$borde;
  background: none;
  text-align: left;
  cursor: pointer;

  &:hover {
    background-color: v.$acento-suave;
  }
}

.mm-resumen__venta-info {
  display: flex;
  flex-direction: column;
}

.mm-resumen__venta-hora {
  font-weight: v.$peso-medio;
  font-size: v.$tam-etiqueta;
}

.mm-resumen__venta-detalle {
  font-size: 12px;
  color: v.$tenue;
}
</style>
