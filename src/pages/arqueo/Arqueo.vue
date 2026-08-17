<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import { useCatalogoStore } from '@/stores/catalogo'
import { useSesionStore } from '@/stores/sesion'
import { useTasaStore } from '@/stores/tasa'
import * as arqueoService from '@/services/arqueoService'
import { aCentavos, aUsd, formatearBs, formatearUsd } from '@/lib/money'
import { formatearFecha } from '@/lib/fechas'
import { ErrorDominio } from '@/lib/errorDominio'
import { notificar } from '@/composables/useNotificaciones'
import type { Arqueo, Denominacion } from '@/types/dominio'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import CampoNumero from '@/components/ui/CampoNumero.vue'
import CampoTexto from '@/components/ui/CampoTexto.vue'
import BotonPrimario from '@/components/ui/BotonPrimario.vue'
import BotonSecundario from '@/components/ui/BotonSecundario.vue'
import PrecioDoble from '@/components/dominio/PrecioDoble.vue'
import ArqueoDetalle from '@/pages/arqueo/ArqueoDetalle.vue'

const catalogo = useCatalogoStore()
const sesion = useSesionStore()
const tasa = useTasaStore()

const modo = ref<'hoy' | 'historial'>('hoy')
const cargando = ref(true)
const denominaciones = ref<Denominacion[]>([])
const arqueoHoy = ref<Arqueo | null>(null)
const cantidades = ref<Record<number, number | null>>({})
const fondoInicial = ref<number | null>(0)
const esperado = ref<{ ves: number; usd: number } | null>(null)
const umbral = ref(1)

const cerrando = ref(false)
const nota = ref('')
const montoRetiro = ref<number | null>(null)
const cerrandoEnviando = ref(false)
const arqueoVisto = ref<Arqueo | null>(null)

function hoyIsoLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function inicioDeHoy(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function finDeHoy(): Date {
  return new Date(inicioDeHoy().getTime() + 86_400_000)
}

let temporizadorGuardado: ReturnType<typeof setTimeout> | null = null

async function cargarHoy(): Promise<void> {
  cargando.value = true
  try {
    arqueoHoy.value = await arqueoService.buscarDelDia(catalogo.negocio, hoyIsoLocal())
    if (arqueoHoy.value?.estado === 'borrador') {
      const detalle = await arqueoService.listarDetalle(arqueoHoy.value.id)
      cantidades.value = {}
      for (const fila of detalle) cantidades.value[fila.denominacionId] = fila.cantidad
      fondoInicial.value = aUsd(arqueoHoy.value.fondoInicialUsd)
      await refrescarEsperado()
    }
  } catch (err) {
    notificar(err instanceof ErrorDominio ? err.message : 'No se pudo cargar el arqueo.')
  } finally {
    cargando.value = false
  }
}

async function cargar(): Promise<void> {
  try {
    denominaciones.value = await arqueoService.listarDenominaciones()
    umbral.value = await arqueoService.obtenerUmbral(catalogo.negocio)
  } catch (err) {
    notificar(err instanceof ErrorDominio ? err.message : 'No se pudo cargar el arqueo.')
  }
  await cargarHoy()
}

onMounted(cargar)
watch(() => catalogo.negocio, cargar)

const denominacionesVes = computed(() =>
  denominaciones.value.filter(d => d.moneda === 'VES').sort((a, b) => b.valor - a.valor),
)
const denominacionesUsd = computed(() =>
  denominaciones.value.filter(d => d.moneda === 'USD').sort((a, b) => b.valor - a.valor),
)

function cantidad(id: number): number {
  return cantidades.value[id] ?? 0
}

const contadoVes = computed(() =>
  denominacionesVes.value.reduce((total, d) => total + d.valor * cantidad(d.id), 0),
)
const contadoUsd = computed(() =>
  denominacionesUsd.value.reduce((total, d) => total + d.valor * cantidad(d.id), 0),
)

async function refrescarEsperado(): Promise<void> {
  if (!arqueoHoy.value) return
  try {
    esperado.value = await arqueoService.previsualizarEsperado(
      catalogo.negocio,
      inicioDeHoy(),
      finDeHoy(),
      fondoInicial.value ?? 0,
      tasa.valor,
    )
  } catch {
    // el cuadre en vivo es informativo; si falla, seguimos contando igual
  }
}

const diferenciaVes = computed(() => contadoVes.value - (esperado.value?.ves ?? 0))
const diferenciaUsd = computed(() => contadoUsd.value - (esperado.value?.usd ?? 0))

const superaUmbral = computed(() => {
  const enVesComoUsd = tasa.valor ? Math.abs(diferenciaVes.value) / tasa.valor : 0
  return Math.max(enVesComoUsd, Math.abs(diferenciaUsd.value)) > umbral.value
})

function alCambiarCantidad(): void {
  if (temporizadorGuardado) clearTimeout(temporizadorGuardado)
  temporizadorGuardado = setTimeout(guardarBorrador, 2000)
  void refrescarEsperado()
}

async function guardarBorrador(): Promise<void> {
  if (!arqueoHoy.value) return
  try {
    await arqueoService.guardarConteo(
      arqueoHoy.value.id,
      denominaciones.value.map(d => ({ denominacionId: d.id, cantidad: cantidad(d.id) })),
      contadoVes.value,
      contadoUsd.value,
      fondoInicial.value ?? 0,
    )
  } catch (err) {
    notificar(err instanceof ErrorDominio ? err.message : 'No se pudo guardar el conteo.')
  }
}

async function iniciarArqueo(): Promise<void> {
  try {
    arqueoHoy.value = await arqueoService.crearBorrador(
      catalogo.negocio,
      hoyIsoLocal(),
      fondoInicial.value ?? 0,
    )
    cantidades.value = {}
    await refrescarEsperado()
  } catch (err) {
    notificar(err instanceof ErrorDominio ? err.message : 'No se pudo iniciar el arqueo.')
  }
}

function abrirCierre(): void {
  nota.value = ''
  montoRetiro.value = null
  cerrando.value = true
}

async function confirmarCierre(): Promise<void> {
  if (!arqueoHoy.value) return
  if (superaUmbral.value && !nota.value.trim()) {
    notificar('La diferencia supera el umbral: escribe una nota antes de cerrar.')
    return
  }

  cerrandoEnviando.value = true
  try {
    if (temporizadorGuardado) clearTimeout(temporizadorGuardado)
    await guardarBorrador()
    arqueoHoy.value = await arqueoService.cerrar({
      arqueoId: arqueoHoy.value.id,
      desdeDia: inicioDeHoy(),
      hastaDia: finDeHoy(),
      nota: nota.value.trim() || undefined,
      montoRetiro: montoRetiro.value || undefined,
    })
    notificar('Caja cerrada')
    cerrando.value = false
  } catch (err) {
    notificar(err instanceof ErrorDominio ? err.message : 'No se pudo cerrar el arqueo.')
  } finally {
    cerrandoEnviando.value = false
  }
}

// --- Historial (requisito 5) ---
const historial = ref<Arqueo[]>([])
const cargandoHistorial = ref(false)

async function cargarHistorial(): Promise<void> {
  cargandoHistorial.value = true
  try {
    historial.value = await arqueoService.listarHistorial(catalogo.negocio, 30)
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

/** Diferencia de cada arqueo convertida a USD equivalente, a SU propia tasa
 * (requisito 5.5): mezclar tasas de dias distintos daria una serie sin sentido. */
function diferenciaUsdEquivalente(a: Arqueo): number {
  const ves = a.tasaAplicada ? (a.diferenciaVes ?? 0) / a.tasaAplicada : 0
  return ves + aUsd(a.diferenciaUsd ?? aCentavos(0))
}

const tendencia = computed(() => {
  const serie = [...historial.value].reverse()
  const maximo = Math.max(1, ...serie.map(a => Math.abs(diferenciaUsdEquivalente(a))))
  return serie.map(a => ({
    arqueo: a,
    diferencia: diferenciaUsdEquivalente(a),
    alturaPct: Math.round((Math.abs(diferenciaUsdEquivalente(a)) / maximo) * 100),
  }))
})
</script>

<template>
  <div class="mm-arqueo">
    <div class="mm-arqueo__modos" role="group" aria-label="Ver">
      <button
        type="button"
        class="mm-arqueo__modo-boton"
        :class="{ 'mm-arqueo__modo-boton--activo': modo === 'hoy' }"
        @click="modo = 'hoy'"
      >
        Hoy
      </button>
      <button
        type="button"
        class="mm-arqueo__modo-boton"
        :class="{ 'mm-arqueo__modo-boton--activo': modo === 'historial' }"
        @click="irAHistorial"
      >
        Historial
      </button>
    </div>

    <template v-if="modo === 'hoy'">
      <EstadoVacio v-if="cargando" titulo="Cargando…" />

      <div v-else-if="!arqueoHoy" class="mm-arqueo__inicio">
        <p>Todavía no se ha contado la caja de {{ catalogo.negocio }} hoy.</p>
        <CampoNumero
          v-model="fondoInicial"
          etiqueta="Fondo inicial (USD)"
          :step="0.01"
          :min="0"
        />
        <BotonPrimario @click="iniciarArqueo">Iniciar arqueo</BotonPrimario>
      </div>

      <div v-else-if="arqueoHoy.estado === 'cerrado'" class="mm-arqueo__cerrado">
        <EstadoVacio
          titulo="Ya se cerró la caja de hoy"
          :descripcion="`Diferencia: ${formatearBs(arqueoHoy.diferenciaVes ?? 0)} · ${formatearUsd(arqueoHoy.diferenciaUsd ?? aCentavos(0))}`"
        >
          <template #accion>
            <BotonSecundario @click="arqueoVisto = arqueoHoy"
              >Ver detalle</BotonSecundario
            >
          </template>
        </EstadoVacio>
      </div>

      <div v-else class="mm-arqueo__conteo">
        <div class="mm-arqueo__total-fijo">
          <div>
            <span class="mm-arqueo__etiqueta">Contado Bs.</span>
            <strong>{{ formatearBs(contadoVes) }}</strong>
          </div>
          <div>
            <span class="mm-arqueo__etiqueta">Contado $</span>
            <strong>{{ formatearUsd(aCentavos(contadoUsd)) }}</strong>
          </div>
          <div>
            <span class="mm-arqueo__etiqueta">Total combinado</span>
            <PrecioDoble
              :usd="aCentavos(contadoUsd + (tasa.valor ? contadoVes / tasa.valor : 0))"
              tamano="sm"
            />
          </div>
        </div>

        <section class="mm-arqueo__grilla">
          <h2>Bolívares</h2>
          <div v-for="d in denominacionesVes" :key="d.id" class="mm-arqueo__fila">
            <span class="mm-arqueo__denominacion">{{ d.valor }} Bs.</span>
            <input
              v-model.number="cantidades[d.id]"
              type="number"
              inputmode="numeric"
              enterkeyhint="next"
              min="0"
              step="1"
              class="mm-arqueo__input"
              @input="alCambiarCantidad"
            />
            <span class="mm-arqueo__subtotal">{{
              formatearBs(d.valor * cantidad(d.id))
            }}</span>
          </div>
        </section>

        <section class="mm-arqueo__grilla">
          <h2>Dólares</h2>
          <div v-for="d in denominacionesUsd" :key="d.id" class="mm-arqueo__fila">
            <span class="mm-arqueo__denominacion">${{ d.valor }}</span>
            <input
              v-model.number="cantidades[d.id]"
              type="number"
              inputmode="numeric"
              enterkeyhint="next"
              min="0"
              step="1"
              class="mm-arqueo__input"
              @input="alCambiarCantidad"
            />
            <span class="mm-arqueo__subtotal">{{
              formatearUsd(aCentavos(d.valor * cantidad(d.id)))
            }}</span>
          </div>
        </section>

        <section v-if="esperado" class="mm-arqueo__cuadre">
          <h2>Cuadre</h2>
          <div class="mm-arqueo__cuadre-fila">
            <span>Bolívares</span>
            <span>Esperado {{ formatearBs(esperado.ves) }}</span>
            <span :class="diferenciaVes === 0 ? 'mm-arqueo__ok' : 'mm-arqueo__diff'">
              {{
                diferenciaVes === 0
                  ? 'Cuadra'
                  : (diferenciaVes > 0 ? 'Sobrante ' : 'Faltante ') +
                    formatearBs(Math.abs(diferenciaVes))
              }}
            </span>
          </div>
          <div class="mm-arqueo__cuadre-fila">
            <span>Dólares</span>
            <span>Esperado {{ formatearUsd(aCentavos(esperado.usd)) }}</span>
            <span :class="diferenciaUsd === 0 ? 'mm-arqueo__ok' : 'mm-arqueo__diff'">
              {{
                diferenciaUsd === 0
                  ? 'Cuadra'
                  : (diferenciaUsd > 0 ? 'Sobrante ' : 'Faltante ') +
                    formatearUsd(aCentavos(Math.abs(diferenciaUsd)))
              }}
            </span>
          </div>
        </section>

        <BotonPrimario v-if="sesion.esDueno" @click="abrirCierre"
          >Cerrar caja</BotonPrimario
        >
        <p v-else class="mm-arqueo__solo-dueno">Solo el dueño puede cerrar la caja.</p>
      </div>
    </template>

    <template v-else>
      <EstadoVacio
        v-if="!cargandoHistorial && historial.length === 0"
        titulo="Todavía no hay arqueos cerrados"
      />

      <template v-else>
        <div
          v-if="tendencia.length > 1"
          class="mm-arqueo__tendencia"
          role="img"
          aria-label="Tendencia de diferencias"
        >
          <div v-for="t in tendencia" :key="t.arqueo.id" class="mm-arqueo__tendencia-col">
            <div class="mm-arqueo__tendencia-pista">
              <div
                class="mm-arqueo__tendencia-barra"
                :class="
                  t.diferencia === 0
                    ? 'mm-arqueo__tendencia-barra--ok'
                    : 'mm-arqueo__tendencia-barra--diff'
                "
                :style="{ height: `${Math.max(t.alturaPct, 3)}%` }"
              />
            </div>
          </div>
        </div>

        <ul class="mm-arqueo__historial-lista list-unstyled">
          <li v-for="a in historial" :key="a.id">
            <button
              type="button"
              class="mm-arqueo__historial-fila"
              :class="{
                'mm-arqueo__historial-fila--alerta':
                  Math.abs(diferenciaUsdEquivalente(a)) > umbral,
              }"
              @click="arqueoVisto = a"
            >
              <span>{{ formatearFecha(new Date(a.fecha + 'T12:00:00')) }}</span>
              <span>{{ formatearBs(a.diferenciaVes ?? 0) }}</span>
              <span>{{ formatearUsd(a.diferenciaUsd ?? aCentavos(0)) }}</span>
            </button>
          </li>
        </ul>
      </template>
    </template>

    <div v-if="cerrando" class="mm-arqueo__modal-fondo" @click.self="cerrando = false">
      <div class="mm-arqueo__cierre">
        <h2>
          Cierre de caja · {{ catalogo.negocio }} · {{ formatearFecha(new Date()) }}
        </h2>
        <p>
          Contado {{ formatearBs(contadoVes) }} ·
          {{ formatearUsd(aCentavos(contadoUsd)) }}
        </p>
        <p v-if="esperado">
          Esperado {{ formatearBs(esperado.ves) }} ·
          {{ formatearUsd(aCentavos(esperado.usd)) }}
        </p>
        <p
          :class="
            diferenciaVes === 0 && diferenciaUsd === 0
              ? 'mm-arqueo__ok'
              : 'mm-arqueo__diff'
          "
        >
          Diferencia {{ formatearBs(diferenciaVes) }} ·
          {{ formatearUsd(aCentavos(diferenciaUsd)) }}
        </p>

        <CampoTexto
          v-model="nota"
          :etiqueta="
            superaUmbral ? 'Nota (obligatoria por la diferencia)' : 'Nota (opcional)'
          "
        />

        <CampoNumero
          v-model="montoRetiro"
          etiqueta="Retirar de la caja (USD, opcional)"
          :step="0.01"
          :min="0"
        />

        <div class="mm-arqueo__cierre-acciones">
          <BotonPrimario :cargando="cerrandoEnviando" @click="confirmarCierre"
            >Cerrar caja</BotonPrimario
          >
          <BotonSecundario @click="cerrando = false">Cancelar</BotonSecundario>
        </div>
      </div>
    </div>

    <ArqueoDetalle
      v-if="arqueoVisto"
      :arqueo="arqueoVisto"
      @cerrar="arqueoVisto = null"
    />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-arqueo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mm-arqueo__modos {
  display: flex;
  gap: 4px;
}

.mm-arqueo__modo-boton {
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

.mm-arqueo__inicio {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mm-arqueo__conteo {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 90px; // deja ver la barra de total fija en movil
}

.mm-arqueo__total-fijo {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  background-color: v.$superficie;
  border: 1px solid v.$borde;
  border-radius: v.$radio-md;
  box-shadow: v.$sombra-1;

  > div {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
}

.mm-arqueo__etiqueta {
  font-size: 11px;
  color: v.$tenue;
}

.mm-arqueo__grilla h2 {
  margin: 0 0 8px;
  font-size: v.$tam-cuerpo;
  font-weight: v.$peso-semi;
}

.mm-arqueo__fila {
  display: grid;
  grid-template-columns: 80px 1fr 110px;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid v.$borde;
}

.mm-arqueo__denominacion {
  font-weight: v.$peso-medio;
}

.mm-arqueo__input {
  min-height: v.$objetivo-tactil-min;
  padding: 0 10px;
  border: 1px solid v.$borde;
  border-radius: v.$radio-sm;
  font-size: v.$tam-cuerpo;
  text-align: center;
}

.mm-arqueo__subtotal {
  text-align: right;
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
}

.mm-arqueo__cuadre {
  padding: 12px;
  border: 1px solid v.$borde;
  border-radius: v.$radio-md;

  h2 {
    margin: 0 0 8px;
    font-size: v.$tam-cuerpo;
  }
}

.mm-arqueo__cuadre-fila {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  font-size: v.$tam-etiqueta;
  padding: 4px 0;
}

.mm-arqueo__ok {
  color: v.$ok;
  font-weight: v.$peso-semi;
}

.mm-arqueo__diff {
  color: v.$error;
  font-weight: v.$peso-semi;
}

.mm-arqueo__solo-dueno {
  color: v.$tenue;
  font-size: v.$tam-etiqueta;
  margin: 0;
}

.mm-arqueo__modal-fondo {
  position: fixed;
  inset: 0;
  background-color: rgba(20, 22, 30, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1050;
}

.mm-arqueo__cierre {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 420px;
  padding: 20px;
  background-color: v.$superficie;
  border-radius: v.$radio-lg;
  box-shadow: v.$sombra-2;

  h2 {
    margin: 0;
    font-size: v.$tam-titulo-seccion;
  }

  p {
    margin: 0;
  }
}

.mm-arqueo__cierre-acciones {
  display: flex;
  gap: 8px;
}

.mm-arqueo__tendencia {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 60px;
}

.mm-arqueo__tendencia-col {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: flex-end;
}

.mm-arqueo__tendencia-pista {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
}

.mm-arqueo__tendencia-barra {
  width: 100%;
  min-height: 2px;
  border-radius: 2px 2px 0 0;

  &--ok {
    background-color: v.$ok;
  }

  &--diff {
    background-color: v.$error;
  }
}

.mm-arqueo__historial-lista {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mm-arqueo__historial-fila {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  width: 100%;
  min-height: v.$objetivo-tactil-min;
  padding: 8px 12px;
  border: 1px solid v.$borde;
  border-radius: v.$radio-sm;
  background-color: v.$superficie;
  font-size: v.$tam-etiqueta;
  cursor: pointer;
  text-align: left;

  &:hover {
    background-color: v.$acento-suave;
  }

  &--alerta {
    border-left: 3px solid v.$error;
  }
}
</style>
