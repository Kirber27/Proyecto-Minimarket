<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import * as arqueoService from '@/services/arqueoService'
import { aBolivares, aCentavos, formatearBs, formatearUsd } from '@/lib/money'
import { formatearFecha, formatearFechaHora } from '@/lib/fechas'
import { ErrorDominio } from '@/lib/errorDominio'
import { notificar } from '@/composables/useNotificaciones'
import type { Arqueo, ArqueoDetalleFila, Denominacion } from '@/types/dominio'
import ModalBase from '@/components/ui/ModalBase.vue'

const props = defineProps<{
  arqueo: Arqueo
}>()

const emit = defineEmits<{
  cerrar: []
}>()

const denominaciones = ref<Denominacion[]>([])
const detalle = ref<ArqueoDetalleFila[]>([])
const cargando = ref(true)

onMounted(async () => {
  try {
    const [dens, det] = await Promise.all([
      arqueoService.listarDenominaciones(),
      arqueoService.listarDetalle(props.arqueo.id),
    ])
    denominaciones.value = dens
    detalle.value = det
  } catch (err) {
    notificar(err instanceof ErrorDominio ? err.message : 'No se pudo cargar el detalle.')
  } finally {
    cargando.value = false
  }
})

function cantidadDe(denominacionId: number): number {
  return detalle.value.find(d => d.denominacionId === denominacionId)?.cantidad ?? 0
}

const denominacionesVes = computed(() =>
  denominaciones.value.filter(d => d.moneda === 'VES'),
)
const denominacionesUsd = computed(() =>
  denominaciones.value.filter(d => d.moneda === 'USD'),
)

const diferenciaVesOk = computed(() => (props.arqueo.diferenciaVes ?? 0) === 0)
const diferenciaUsdOk = computed(() => (props.arqueo.diferenciaUsd ?? 0) === 0)
</script>

<template>
  <ModalBase
    :titulo="`Arqueo · ${formatearFecha(new Date(arqueo.fecha + 'T12:00:00'))}`"
    @cerrar="emit('cerrar')"
  >
    <div class="mm-arqueo-detalle">
      <p class="mm-arqueo-detalle__meta">
        Cerrado
        {{ arqueo.cerradoEn ? formatearFechaHora(new Date(arqueo.cerradoEn)) : '' }} ·
        tasa {{ arqueo.tasaAplicada }}
      </p>

      <div class="mm-arqueo-detalle__cuadre">
        <div class="mm-arqueo-detalle__cuadre-fila">
          <span>Bolívares</span>
          <span>Contado {{ formatearBs(arqueo.contadoVes) }}</span>
          <span>Esperado {{ formatearBs(arqueo.esperadoVes ?? 0) }}</span>
          <span
            :class="diferenciaVesOk ? 'mm-arqueo-detalle__ok' : 'mm-arqueo-detalle__diff'"
          >
            {{ diferenciaVesOk ? 'Cuadra' : formatearBs(arqueo.diferenciaVes ?? 0) }}
          </span>
        </div>
        <div class="mm-arqueo-detalle__cuadre-fila">
          <span>Dólares</span>
          <span>Contado {{ formatearUsd(arqueo.contadoUsd) }}</span>
          <span>Esperado {{ formatearUsd(arqueo.esperadoUsd ?? aCentavos(0)) }}</span>
          <span
            :class="diferenciaUsdOk ? 'mm-arqueo-detalle__ok' : 'mm-arqueo-detalle__diff'"
          >
            {{
              diferenciaUsdOk
                ? 'Cuadra'
                : formatearUsd(arqueo.diferenciaUsd ?? aCentavos(0))
            }}
          </span>
        </div>
      </div>

      <p v-if="arqueo.nota" class="mm-arqueo-detalle__nota">Nota: {{ arqueo.nota }}</p>

      <div v-if="!cargando" class="mm-arqueo-detalle__grillas">
        <div class="mm-arqueo-detalle__grilla">
          <h3>Bolívares</h3>
          <div v-for="d in denominacionesVes" :key="d.id" class="mm-arqueo-detalle__fila">
            <span>{{ d.valor }} Bs.</span>
            <span>{{ cantidadDe(d.id) }}</span>
            <span>{{ formatearBs(d.valor * cantidadDe(d.id)) }}</span>
          </div>
        </div>
        <div class="mm-arqueo-detalle__grilla">
          <h3>Dólares</h3>
          <div v-for="d in denominacionesUsd" :key="d.id" class="mm-arqueo-detalle__fila">
            <span>${{ d.valor }}</span>
            <span>{{ cantidadDe(d.id) }}</span>
            <span>{{ formatearUsd(aCentavos(d.valor * cantidadDe(d.id))) }}</span>
          </div>
        </div>
      </div>

      <p class="mm-arqueo-detalle__fondo">
        Fondo inicial: {{ formatearUsd(arqueo.fondoInicialUsd) }} ({{
          formatearBs(aBolivares(arqueo.fondoInicialUsd, arqueo.tasaAplicada ?? 0))
        }})
      </p>
    </div>
  </ModalBase>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-arqueo-detalle {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.mm-arqueo-detalle__meta {
  margin: 0;
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
}

.mm-arqueo-detalle__cuadre {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border: 1px solid v.$borde;
  border-radius: v.$radio-md;
}

.mm-arqueo-detalle__cuadre-fila {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: 8px;
  font-size: v.$tam-etiqueta;
  align-items: center;
}

.mm-arqueo-detalle__ok {
  color: v.$ok;
  font-weight: v.$peso-semi;
}

.mm-arqueo-detalle__diff {
  color: v.$error;
  font-weight: v.$peso-semi;
}

.mm-arqueo-detalle__nota {
  margin: 0;
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
  font-style: italic;
}

.mm-arqueo-detalle__grillas {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.mm-arqueo-detalle__grilla h3 {
  margin: 0 0 6px;
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
}

.mm-arqueo-detalle__fila {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  font-size: v.$tam-etiqueta;
  padding: 4px 0;
}

.mm-arqueo-detalle__fondo {
  margin: 0;
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
}
</style>
