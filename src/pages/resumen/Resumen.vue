<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { useCatalogoStore } from '@/stores/catalogo'
import { useSesionStore } from '@/stores/sesion'
import { usePreferenciasStore } from '@/stores/preferencias'
import * as cajaService from '@/services/cajaService'
import { useMovimientoCaja } from '@/composables/useMovimientoCaja'
import { ETIQUETAS_METODO } from '@/lib/metodosPago'
import { notificar } from '@/composables/useNotificaciones'
import { ErrorDominio } from '@/lib/errorDominio'
import { aCentavos, aUsd, formatearUsd, restar, type Centavos } from '@/lib/money'
import { formatearHora } from '@/lib/fechas'
import type { MovimientoCaja, ResumenDia } from '@/types/dominio'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import PrecioDoble from '@/components/dominio/PrecioDoble.vue'
import VentaDetalle from '@/pages/venta/VentaDetalle.vue'
import ClienteDetalle from '@/pages/deudas/ClienteDetalle.vue'

const catalogo = useCatalogoStore()
const sesion = useSesionStore()
const preferencias = usePreferenciasStore()
const { ventaAbierta, clienteAbierto, abrirMovimiento } = useMovimientoCaja()

const cargando = ref(true)
const resumen = ref<ResumenDia | null>(null)
const movimientos = ref<MovimientoCaja[]>([])

function inicioDeHoy(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

async function cargar(): Promise<void> {
  cargando.value = true
  try {
    const inicio = inicioDeHoy()
    const fin = new Date(inicio.getTime() + 86_400_000)
    const [resumenDia, mov] = await Promise.all([
      cajaService.resumenDia(catalogo.negocio, inicio),
      cajaService.listarMovimientos(catalogo.negocio, {
        desde: inicio.toISOString(),
        hasta: fin.toISOString(),
      }),
    ])
    resumen.value = resumenDia
    movimientos.value = mov
  } catch (err) {
    notificar(
      err instanceof ErrorDominio ? err.message : 'No se pudo cargar el resumen del día.',
    )
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

const movimientosTop = computed(() => movimientos.value.slice(0, 5))

/** Requisito 5.3 (spec 08): comparación con el mismo día de la semana anterior. */
const diferenciaSemana = computed<Centavos | null>(() => {
  if (!resumen.value) return null
  return restar(resumen.value.semanaActualUsd, resumen.value.semanaAnteriorUsd)
})

const porcentajeSemana = computed<number | null>(() => {
  if (!resumen.value || resumen.value.semanaAnteriorUsd <= 0) return null
  return (diferenciaSemana.value! / resumen.value.semanaAnteriorUsd) * 100
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

const promedioDia = computed<Centavos>(() => {
  const serie = resumen.value?.serie7Dias ?? []
  if (serie.length === 0) return aCentavos(0)
  const total = serie.reduce((acc, d) => acc + d.vendidoUsd, 0)
  return aCentavos(total / serie.length / 100)
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

function metaMovimiento(m: MovimientoCaja): string {
  return `${formatearHora(new Date(m.creadoEn))} · ${ETIQUETAS_METODO[m.metodo]}`
}

/** "Venta · N productos · Metodo" para ventas; el resto conserva su
 * concepto (descripcion del egreso, o "Abono · nombre del cliente"). */
function descripcionMovimiento(m: MovimientoCaja): string {
  if (m.origen === 'venta' && m.unidades !== null) {
    const unidad = m.unidades === 1 ? 'producto' : 'productos'
    return `Venta · ${m.unidades} ${unidad} · ${ETIQUETAS_METODO[m.metodo]}`
  }
  return m.concepto
}

async function alAnularVenta(): Promise<void> {
  ventaAbierta.value = null
  await cargar()
}
</script>

<template>
  <div class="mm-resumen">
    <div class="mm-resumen__barra-montos">
      <button
        type="button"
        class="mm-resumen__boton-montos"
        :class="{ 'mm-resumen__boton-montos--activo': preferencias.ocultarMontos }"
        @click="preferencias.alternarOcultarMontos()"
      >
        {{ preferencias.ocultarMontos ? 'Mostrar montos' : 'Ocultar montos' }}
      </button>
    </div>

    <div v-if="resumen" class="mm-resumen__tarjetas">
      <div class="mm-resumen__tarjeta mm-resumen__tarjeta--acento">
        <span class="mm-resumen__etiqueta-tarjeta">Ventas de hoy</span>
        <PrecioDoble :usd="resumen.vendidoHoyUsd" tamano="md" />
        <span class="mm-resumen__meta-tarjeta"
          >{{ resumen.numeroVentas }} venta{{
            resumen.numeroVentas === 1 ? '' : 's'
          }}</span
        >
      </div>

      <div class="mm-resumen__tarjeta">
        <span class="mm-resumen__etiqueta-tarjeta">Ventas de la semana</span>
        <PrecioDoble :usd="resumen.semanaActualUsd" tamano="md" />
        <span
          v-if="porcentajeSemana !== null"
          class="mm-resumen__meta-tarjeta"
          :class="
            porcentajeSemana >= 0
              ? 'mm-resumen__meta-tarjeta--arriba'
              : 'mm-resumen__meta-tarjeta--abajo'
          "
        >
          {{ porcentajeSemana >= 0 ? '+' : '' }}{{ porcentajeSemana.toFixed(0) }}% vs.
          semana pasada
        </span>
      </div>

      <RouterLink to="/caja" class="mm-resumen__tarjeta">
        <span class="mm-resumen__etiqueta-tarjeta">Saldo de caja</span>
        <PrecioDoble :usd="resumen.saldoActualUsd" tamano="md" />
        <span class="mm-resumen__meta-tarjeta"
          >Egresos hoy {{ formatearUsd(resumen.egresosHoyUsd) }}</span
        >
      </RouterLink>

      <RouterLink to="/alertas" class="mm-resumen__tarjeta mm-resumen__tarjeta--alerta">
        <span class="mm-resumen__etiqueta-tarjeta mm-resumen__etiqueta-tarjeta--alerta"
          >Stock bajo</span
        >
        <strong class="mm-resumen__cifra-alerta">{{ resumen.productosEnAlerta }}</strong>
        <span class="mm-resumen__ver-alerta">Ver alertas →</span>
      </RouterLink>
    </div>

    <RouterLink
      v-if="resumen && resumen.porCobrarUsd > 0"
      to="/deudas"
      class="mm-resumen__fila-enlace"
    >
      <span>Por cobrar en fiado</span>
      <PrecioDoble :usd="resumen.porCobrarUsd" tamano="sm" />
    </RouterLink>

    <RouterLink
      v-if="resumen && resumen.pendientesRevision > 0"
      to="/deudas"
      class="mm-resumen__fila-enlace mm-resumen__fila-enlace--aviso"
    >
      <span
        >{{ resumen.pendientesRevision }} nota{{
          resumen.pendientesRevision === 1 ? '' : 's'
        }}
        de la planilla por revisar</span
      >
      <span class="mm-resumen__ver">Revisar</span>
    </RouterLink>

    <div class="mm-resumen__panel mm-resumen__accesos">
      <span class="mm-resumen__etiqueta-panel">Accesos rápidos</span>
      <div class="mm-resumen__accesos-grilla">
        <RouterLink to="/venta" class="mm-resumen__accion mm-resumen__accion--principal">
          Registrar venta
        </RouterLink>
        <RouterLink v-if="sesion.esDueno" to="/productos" class="mm-resumen__accion">
          Agregar producto
        </RouterLink>
        <RouterLink to="/caja" class="mm-resumen__accion">Registrar egreso</RouterLink>
        <RouterLink v-if="sesion.esDueno" to="/reportes" class="mm-resumen__accion">
          Ver reportes
        </RouterLink>
      </div>
    </div>

    <div class="mm-resumen__cuerpo-escritorio">
      <div class="mm-resumen__panel mm-resumen__panel--grafico">
        <div class="mm-resumen__panel-cabecera">
          <span class="mm-resumen__etiqueta-panel">Últimos 7 días</span>
          <span class="mm-resumen__prom"
            >prom. {{ formatearAbreviado(promedioDia) }}</span
          >
        </div>
        <div
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
      </div>

      <div class="mm-resumen__panel mm-resumen__panel--movimientos">
        <div class="mm-resumen__panel-cabecera">
          <span class="mm-resumen__etiqueta-panel">Movimientos de hoy</span>
          <RouterLink to="/caja" class="mm-resumen__ver">Ver caja</RouterLink>
        </div>

        <EstadoVacio
          v-if="!cargando && movimientosTop.length === 0"
          titulo="Todavía no hay movimientos hoy"
          descripcion="Cuando registres una venta, aquí vas a ver cuánto llevas del día."
          etiqueta-accion="Registrar venta"
          ruta-accion="/venta"
        />

        <ul v-else class="mm-resumen__movimientos list-unstyled">
          <li v-for="m in movimientosTop" :key="m.id">
            <button
              type="button"
              class="mm-resumen__movimiento"
              @click="abrirMovimiento(m)"
            >
              <span
                class="mm-resumen__movimiento-signo"
                :class="
                  m.flujo === 'ingreso'
                    ? 'mm-resumen__movimiento-signo--ingreso'
                    : 'mm-resumen__movimiento-signo--egreso'
                "
                aria-hidden="true"
                >{{ m.flujo === 'ingreso' ? '+' : '−' }}</span
              >
              <div class="mm-resumen__movimiento-info">
                <span class="mm-resumen__movimiento-desc">{{
                  descripcionMovimiento(m)
                }}</span>
                <span class="mm-resumen__movimiento-meta">{{ metaMovimiento(m) }}</span>
              </div>
              <span
                class="mm-resumen__movimiento-monto"
                :class="
                  m.flujo === 'ingreso'
                    ? 'mm-resumen__movimiento-monto--ingreso'
                    : 'mm-resumen__movimiento-monto--egreso'
                "
              >
                {{ m.flujo === 'ingreso' ? '+' : '−' }}{{ formatearUsd(m.montoUsd) }}
              </span>
            </button>
          </li>
        </ul>
      </div>
    </div>

    <VentaDetalle
      v-if="ventaAbierta"
      :venta="ventaAbierta"
      @cerrar="ventaAbierta = null"
      @anulada="alAnularVenta"
    />

    <ClienteDetalle
      v-if="clienteAbierto"
      :cliente="clienteAbierto"
      @cerrar="clienteAbierto = null"
      @cambiado="cargar"
    />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;
@use '@/assets/scss/mixins' as m;

.mm-resumen {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.mm-resumen__barra-montos {
  display: flex;
  justify-content: flex-end;
}

.mm-resumen__boton-montos {
  min-height: 32px;
  padding: 0 13px;
  border-radius: v.$radio-sm;
  border: 1px solid v.$borde;
  background-color: v.$superficie;
  color: v.$tenue;
  font-size: 11.5px;
  font-weight: v.$peso-semi;
  cursor: pointer;

  &--activo {
    background-color: v.$tinta;
    color: white;
    border-color: v.$tinta;
  }
}

.mm-resumen__tarjetas {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.mm-resumen__tarjeta {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 15px;
  border-radius: v.$radio-lg;
  background-color: v.$superficie;
  border: 1px solid v.$borde;
  box-shadow: v.$sombra-1;
  text-decoration: none;
  color: inherit;

  &--acento {
    background-color: v.$acento;
    border-color: v.$acento;
    color: white;

    // PrecioDoble trae su propio color (tinta/tenue) con estilos scoped al
    // componente; en esta tarjeta morada toda la tipografia debe ser
    // blanca, asi que se sobreescribe desde afuera con :deep().
    :deep(.mm-precio-doble__principal),
    :deep(.mm-precio-doble__secundario) {
      color: white;
    }
  }

  &--alerta {
    border-color: v.$grave-bg;
  }
}

.mm-resumen__etiqueta-tarjeta {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: v.$peso-negrita;
  color: v.$tenue;

  .mm-resumen__tarjeta--acento & {
    color: white;
  }

  &--alerta {
    color: v.$grave;
  }
}

.mm-resumen__meta-tarjeta {
  font-size: 11px;
  color: v.$tenue;

  .mm-resumen__tarjeta--acento & {
    color: white;
  }

  &--arriba {
    color: v.$ok;
    font-weight: v.$peso-semi;
  }

  &--abajo {
    color: v.$error;
    font-weight: v.$peso-semi;
  }
}

.mm-resumen__cifra-alerta {
  font-size: v.$tam-titulo-seccion;
  font-weight: v.$peso-extra;
  color: v.$grave;
}

.mm-resumen__ver-alerta {
  font-size: 11px;
  font-weight: v.$peso-semi;
  color: v.$grave;
}

.mm-resumen__accesos {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background-color: v.$fondo;
}

.mm-resumen__accesos-grilla {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.mm-resumen__accion {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 52px;
  border-radius: v.$radio-md;
  border: 1.5px solid v.$borde;
  background-color: v.$superficie;
  color: v.$tinta;
  font-size: 13.5px;
  font-weight: v.$peso-semi;
  text-decoration: none;
  text-align: center;

  &--principal {
    border: none;
    background-color: v.$tinta;
    color: white;
  }
}

.mm-resumen__fila-enlace {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-radius: v.$radio-md;
  border: 1px solid v.$borde;
  background-color: v.$superficie;
  text-decoration: none;
  color: v.$tinta;
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-semi;

  &--aviso {
    border-color: v.$aviso;
    background-color: v.$aviso-bg;
  }
}

.mm-resumen__ver {
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-semi;
  color: v.$acento-hover;
  text-decoration: none;
}

.mm-resumen__cuerpo-escritorio {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.mm-resumen__panel {
  padding: 16px;
  border-radius: v.$radio-lg;
  background-color: v.$superficie;
  border: 1px solid v.$borde;
  box-shadow: v.$sombra-1;
}

.mm-resumen__panel-cabecera {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
}

.mm-resumen__etiqueta-panel {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: v.$peso-negrita;
  color: v.$tenue;
}

.mm-resumen__prom {
  font-size: 11px;
  color: v.$tenue;
}

.mm-resumen__grafico {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 6px;
  height: 110px;
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
  background-color: v.$acento-tenue;

  &--hoy {
    background-color: v.$acento;
  }
}

.mm-resumen__barra-dia {
  font-size: 10px;
  color: v.$tenue;
}

.mm-resumen__movimientos {
  display: flex;
  flex-direction: column;
}

.mm-resumen__movimiento {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: v.$objetivo-tactil-min;
  padding: 10px 4px;
  border: none;
  border-top: 1px solid v.$borde;
  background: none;
  text-align: left;
  cursor: pointer;

  &:hover {
    background-color: v.$acento-suave;
  }
}

.mm-resumen__movimiento-signo {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: v.$radio-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: v.$peso-extra;

  &--ingreso {
    background-color: v.$ok-bg;
    color: v.$ok;
  }

  &--egreso {
    background-color: v.$error-bg;
    color: v.$error;
  }
}

.mm-resumen__movimiento-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.mm-resumen__movimiento-desc {
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-medio;
  color: v.$tinta;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mm-resumen__movimiento-meta {
  font-size: 10.5px;
  color: v.$tenue;
}

.mm-resumen__movimiento-monto {
  flex-shrink: 0;
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-extra;
  white-space: nowrap;

  &--ingreso {
    color: v.$ok;
  }

  &--egreso {
    color: v.$error;
  }
}

// Escritorio: cabeceras en una sola fila de 4, y el grafico + movimientos
// lado a lado, igual que el dashboard del prototipo.
@include m.desde-escritorio {
  .mm-resumen__tarjetas {
    grid-template-columns: repeat(4, 1fr);
  }

  .mm-resumen__cuerpo-escritorio {
    display: grid;
    grid-template-columns: 1.55fr 1fr;
    gap: 18px;
    // Grid estira ambos paneles a la altura de la fila; el panel del
    // grafico necesita ser flex para que las barras aprovechen ese alto
    // en vez de quedarse en los 110px fijos de movil.
    align-items: stretch;
  }

  .mm-resumen__panel--grafico {
    display: flex;
    flex-direction: column;
  }

  .mm-resumen__panel--grafico .mm-resumen__grafico {
    flex: 1;
    height: auto;
  }
}
</style>
