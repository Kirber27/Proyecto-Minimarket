<script setup lang="ts">
import { ref } from 'vue'

import { useCarritoStore } from '@/stores/carrito'
import { useEsMovil } from '@/composables/useEsMovil'
import { formatearUsd } from '@/lib/money'
import { ErrorDominio } from '@/lib/errorDominio'
import type { Venta } from '@/types/dominio'
import PrecioDoble from '@/components/dominio/PrecioDoble.vue'
import SelectorPago from '@/components/dominio/SelectorPago.vue'
import BotonPrimario from '@/components/ui/BotonPrimario.vue'
import ModalBase from '@/components/ui/ModalBase.vue'

const emit = defineEmits<{
  ventaConfirmada: [venta: Venta]
}>()

const carrito = useCarritoStore()
const esMovil = useEsMovil()

const expandido = ref(false)
const confirmandoVaciar = ref(false)

function alternarExpandido(): void {
  expandido.value = !expandido.value
}

function pedirVaciar(): void {
  confirmandoVaciar.value = true
}

function confirmarVaciar(): void {
  carrito.vaciar()
  confirmandoVaciar.value = false
}

async function confirmarVenta(): Promise<void> {
  try {
    const venta = await carrito.confirmar()
    expandido.value = false
    emit('ventaConfirmada', venta)
  } catch (err) {
    // El error ya queda en carrito.error para mostrarlo; el carrito se
    // conserva intacto (requisito 3.7).
    if (!(err instanceof ErrorDominio)) throw err
  }
}
</script>

<template>
  <div
    class="mm-panel-carrito"
    :class="{
      'mm-panel-carrito--movil': esMovil,
      'mm-panel-carrito--expandido': esMovil && expandido,
    }"
  >
    <button
      v-if="esMovil"
      type="button"
      class="mm-panel-carrito__resumen"
      @click="alternarExpandido"
    >
      <span>{{ carrito.unidadesTotal }} u.</span>
      <PrecioDoble :usd="carrito.totalUsd" tamano="sm" />
      <span class="mm-panel-carrito__flecha">{{ expandido ? '▾' : '▴' }}</span>
    </button>

    <div v-if="!esMovil || expandido" class="mm-panel-carrito__cuerpo">
      <div class="mm-panel-carrito__cabecera">
        <h2 class="mm-panel-carrito__titulo">Carrito</h2>
        <button
          v-if="carrito.lineas.length > 0"
          type="button"
          class="mm-panel-carrito__vaciar"
          @click="pedirVaciar"
        >
          Vaciar
        </button>
      </div>

      <p v-if="carrito.lineas.length === 0" class="mm-panel-carrito__vacio">
        Toca un producto para agregarlo.
      </p>

      <ul v-else class="mm-panel-carrito__lineas list-unstyled">
        <li
          v-for="linea in carrito.lineas"
          :key="linea.productoId"
          class="mm-panel-carrito__linea"
        >
          <div class="mm-panel-carrito__linea-info">
            <span class="mm-panel-carrito__linea-nombre">{{ linea.nombre }}</span>
            <span class="mm-panel-carrito__linea-detalle">
              {{ linea.cantidad }} {{ linea.unidadMedida === 'KG' ? 'kg' : 'u.' }} ×
              {{ formatearUsd(linea.precioUnitarioUsd) }}
            </span>
          </div>
          <PrecioDoble :usd="linea.subtotalUsd" tamano="sm" />
        </li>
      </ul>

      <div class="mm-panel-carrito__total">
        <span>Total</span>
        <PrecioDoble :usd="carrito.totalUsd" tamano="md" />
      </div>

      <SelectorPago v-if="carrito.lineas.length > 0" />

      <p v-if="carrito.error" class="mm-panel-carrito__error" role="alert">
        {{ carrito.error }}
      </p>

      <BotonPrimario
        class="mm-panel-carrito__confirmar"
        :deshabilitado="!carrito.puedeConfirmar"
        :cargando="carrito.enviando"
        @click="confirmarVenta"
      >
        Confirmar venta
      </BotonPrimario>
    </div>

    <ModalBase
      v-if="confirmandoVaciar"
      titulo="¿Vaciar el carrito?"
      @cerrar="confirmandoVaciar = false"
    >
      <p>Se perderán las {{ carrito.lineas.length }} línea(s) que armaste.</p>
      <BotonPrimario @click="confirmarVaciar">Sí, vaciar</BotonPrimario>
    </ModalBase>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-panel-carrito {
  display: flex;
  flex-direction: column;
}

.mm-panel-carrito--movil {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(v.$objetivo-tactil-min + env(safe-area-inset-bottom));
  background-color: v.$superficie;
  border-top: 1px solid v.$borde;
  border-radius: v.$radio-lg v.$radio-lg 0 0;
  box-shadow: v.$sombra-2;
  z-index: 10;
  max-height: 75vh;
  overflow-y: auto;
}

.mm-panel-carrito__resumen {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: v.$objetivo-tactil-min;
  padding: 0 16px;
  border: none;
  background: none;
  cursor: pointer;
}

.mm-panel-carrito__flecha {
  color: v.$tenue;
}

.mm-panel-carrito__cuerpo {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
}

.mm-panel-carrito__cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mm-panel-carrito__titulo {
  font-size: v.$tam-titulo-seccion;
  font-weight: v.$peso-negrita;
  margin: 0;
}

.mm-panel-carrito__vaciar {
  background: none;
  border: none;
  color: v.$error;
  font-size: v.$tam-etiqueta;
  cursor: pointer;
}

.mm-panel-carrito__vacio {
  color: v.$tenue;
  margin: 0;
}

.mm-panel-carrito__lineas {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 30vh;
  overflow-y: auto;
}

.mm-panel-carrito__linea {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.mm-panel-carrito__linea-info {
  display: flex;
  flex-direction: column;
}

.mm-panel-carrito__linea-nombre {
  font-weight: v.$peso-medio;
  font-size: v.$tam-etiqueta;
}

.mm-panel-carrito__linea-detalle {
  font-size: 11px;
  color: v.$tenue;
}

.mm-panel-carrito__total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid v.$borde;
}

.mm-panel-carrito__error {
  color: v.$error;
  margin: 0;
  font-size: v.$tam-etiqueta;
}

.mm-panel-carrito__confirmar {
  width: 100%;
}
</style>
