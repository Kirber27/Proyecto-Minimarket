<script setup lang="ts">
import { ref } from 'vue'

import { useSesionStore } from '@/stores/sesion'
import * as ventasService from '@/services/ventasService'
import { notificar } from '@/composables/useNotificaciones'
import { ErrorDominio } from '@/lib/errorDominio'
import { formatearFechaHora } from '@/lib/fechas'
import type { Venta } from '@/types/dominio'
import ModalBase from '@/components/ui/ModalBase.vue'
import PrecioDoble from '@/components/dominio/PrecioDoble.vue'
import BotonPrimario from '@/components/ui/BotonPrimario.vue'
import BotonSecundario from '@/components/ui/BotonSecundario.vue'
import CampoTexto from '@/components/ui/CampoTexto.vue'

const props = defineProps<{
  venta: Venta
}>()

const emit = defineEmits<{
  cerrar: []
  anulada: []
}>()

const sesion = useSesionStore()

const anulando = ref(false)
const motivo = ref('')
const error = ref('')
const enviando = ref(false)

const ETIQUETAS_METODO: Record<string, string> = {
  'efectivo-ves': 'Efectivo Bs.',
  'efectivo-usd': 'Efectivo $',
  punto: 'Punto',
  'pago-movil': 'Pago móvil',
  biopago: 'Biopago',
  credito: 'Fiado',
}

function pedirAnular(): void {
  motivo.value = ''
  error.value = ''
  anulando.value = true
}

async function confirmarAnulacion(): Promise<void> {
  error.value = ''
  if (!motivo.value.trim()) {
    error.value = 'Escribe el motivo de la anulación.'
    return
  }

  enviando.value = true
  try {
    await ventasService.anular(props.venta.id, motivo.value.trim())
    notificar('Venta anulada')
    emit('anulada')
  } catch (err) {
    error.value =
      err instanceof ErrorDominio ? err.message : 'No se pudo anular la venta.'
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <ModalBase :titulo="`Venta #${venta.correlativo}`" @cerrar="emit('cerrar')">
    <div class="mm-venta-detalle">
      <p class="mm-venta-detalle__fecha">
        {{ formatearFechaHora(new Date(venta.creadoEn)) }}
      </p>

      <ul class="mm-venta-detalle__lineas list-unstyled">
        <li v-for="linea in venta.lineas" :key="linea.id" class="mm-venta-detalle__linea">
          <span>{{ linea.cantidad }}× {{ linea.nombreSnapshot }}</span>
          <PrecioDoble
            :usd="linea.subtotalUsd"
            :tasa-fija="venta.tasaAplicada"
            tamano="sm"
          />
        </li>
      </ul>

      <div class="mm-venta-detalle__pagos">
        <p v-for="(pago, i) in venta.pagos" :key="i" class="mm-venta-detalle__pago">
          {{ ETIQUETAS_METODO[pago.metodo] ?? pago.metodo }}
          <PrecioDoble :usd="pago.montoUsd" :tasa-fija="venta.tasaAplicada" tamano="sm" />
        </p>
      </div>

      <div class="mm-venta-detalle__total">
        <span>Total</span>
        <PrecioDoble :usd="venta.totalUsd" :tasa-fija="venta.tasaAplicada" tamano="md" />
      </div>

      <template v-if="sesion.esDueno && !venta.anulada">
        <BotonSecundario v-if="!anulando" @click="pedirAnular"
          >Anular venta</BotonSecundario
        >

        <div v-else class="mm-venta-detalle__anular">
          <CampoTexto v-model="motivo" etiqueta="Motivo de la anulación" :error="error" />
          <div class="mm-venta-detalle__anular-acciones">
            <BotonPrimario :cargando="enviando" @click="confirmarAnulacion">
              Confirmar anulación
            </BotonPrimario>
            <BotonSecundario @click="anulando = false">Cancelar</BotonSecundario>
          </div>
        </div>
      </template>
      <p v-else-if="venta.anulada" class="mm-venta-detalle__anulada">
        Anulada{{ venta.anuladaMotivo ? `: ${venta.anuladaMotivo}` : '' }}
      </p>
    </div>
  </ModalBase>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-venta-detalle {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.mm-venta-detalle__fecha {
  color: v.$tenue;
  margin: 0;
  font-size: v.$tam-etiqueta;
}

.mm-venta-detalle__lineas {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mm-venta-detalle__linea {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: v.$tam-etiqueta;
}

.mm-venta-detalle__pagos {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 10px;
  border-top: 1px solid v.$borde;
}

.mm-venta-detalle__pago {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0;
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
}

.mm-venta-detalle__total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid v.$borde;
}

.mm-venta-detalle__anular {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mm-venta-detalle__anular-acciones {
  display: flex;
  gap: 8px;
}

.mm-venta-detalle__anulada {
  color: v.$error;
  font-weight: v.$peso-semi;
  margin: 0;
}
</style>
