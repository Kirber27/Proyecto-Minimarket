<script setup lang="ts">
import { ref, useId } from 'vue'

import { useCarritoStore } from '@/stores/carrito'
import { useTrampaFoco } from '@/composables/useTrampaFoco'
import { formatearUsd } from '@/lib/money'
import { ErrorDominio } from '@/lib/errorDominio'
import type { Venta } from '@/types/dominio'
import PrecioDoble from '@/components/dominio/PrecioDoble.vue'
import SelectorPago from '@/components/dominio/SelectorPago.vue'
import BotonPrimario from '@/components/ui/BotonPrimario.vue'
import ModalBase from '@/components/ui/ModalBase.vue'

const emit = defineEmits<{
  cerrar: []
  ventaConfirmada: [venta: Venta]
}>()

const carrito = useCarritoStore()
const idTitulo = useId()
const refPanel = ref<HTMLElement | null>(null)
const confirmandoVaciar = ref(false)

useTrampaFoco(refPanel, () => emit('cerrar'))

function pedirVaciar(): void {
  confirmandoVaciar.value = true
}

function confirmarVaciar(): void {
  carrito.vaciar()
  confirmandoVaciar.value = false
  emit('cerrar')
}

async function confirmarVenta(): Promise<void> {
  try {
    const venta = await carrito.confirmar()
    emit('cerrar')
    emit('ventaConfirmada', venta)
  } catch (err) {
    // El error ya queda en carrito.error para mostrarlo; el carrito se
    // conserva intacto (requisito 3.7).
    if (!(err instanceof ErrorDominio)) throw err
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="mm-carrito-lateral__fondo" @click.self="emit('cerrar')">
      <div
        ref="refPanel"
        class="mm-carrito-lateral__panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="idTitulo"
      >
        <header class="mm-carrito-lateral__cabecera">
          <h2 :id="idTitulo" class="mm-carrito-lateral__titulo">Carrito</h2>
          <div class="mm-carrito-lateral__acciones-cabecera">
            <button
              v-if="carrito.lineas.length > 0"
              type="button"
              class="mm-carrito-lateral__vaciar"
              @click="pedirVaciar"
            >
              Limpiar
            </button>
            <button
              type="button"
              class="mm-carrito-lateral__cerrar"
              aria-label="Cerrar carrito"
              @click="emit('cerrar')"
            >
              ✕
            </button>
          </div>
        </header>

        <p v-if="carrito.lineas.length === 0" class="mm-carrito-lateral__vacio">
          Toca un producto para agregarlo.
        </p>

        <ul v-else class="mm-carrito-lateral__lineas list-unstyled">
          <li
            v-for="linea in carrito.lineas"
            :key="linea.productoId"
            class="mm-carrito-lateral__linea"
          >
            <div class="mm-carrito-lateral__linea-info">
              <span class="mm-carrito-lateral__linea-nombre">{{ linea.nombre }}</span>
              <span class="mm-carrito-lateral__linea-detalle">
                {{ linea.cantidad }} {{ linea.unidadMedida === 'KG' ? 'kg' : 'u.' }} ×
                {{ formatearUsd(linea.precioUnitarioUsd) }}
              </span>
            </div>
            <PrecioDoble :usd="linea.subtotalUsd" tamano="sm" />
          </li>
        </ul>

        <div class="mm-carrito-lateral__pie">
          <div class="mm-carrito-lateral__total">
            <span>Total</span>
            <PrecioDoble :usd="carrito.totalUsd" tamano="md" />
          </div>

          <SelectorPago v-if="carrito.lineas.length > 0" />

          <p v-if="carrito.error" class="mm-carrito-lateral__error" role="alert">
            {{ carrito.error }}
          </p>

          <BotonPrimario
            class="mm-carrito-lateral__confirmar"
            :deshabilitado="!carrito.puedeConfirmar"
            :cargando="carrito.enviando"
            @click="confirmarVenta"
          >
            Confirmar venta
          </BotonPrimario>
        </div>
      </div>
    </div>

    <ModalBase
      v-if="confirmandoVaciar"
      titulo="¿Vaciar el carrito?"
      @cerrar="confirmandoVaciar = false"
    >
      <p>Se perderán las {{ carrito.lineas.length }} línea(s) que armaste.</p>
      <BotonPrimario @click="confirmarVaciar">Sí, vaciar</BotonPrimario>
    </ModalBase>
  </Teleport>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-carrito-lateral__fondo {
  position: fixed;
  inset: 0;
  background-color: rgba(20, 22, 30, 0.4);
  display: flex;
  justify-content: flex-end;
  z-index: 1040;
}

.mm-carrito-lateral__panel {
  width: min(100%, 380px);
  height: 100%;
  background-color: v.$superficie;
  box-shadow: v.$sombra-2;
  display: flex;
  flex-direction: column;
  animation: mm-carrito-lateral-entrar 0.22s ease-out;
}

@keyframes mm-carrito-lateral-entrar {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .mm-carrito-lateral__panel {
    animation: none;
  }
}

.mm-carrito-lateral__cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 18px 20px;
  border-bottom: 1px solid v.$borde;
  flex-shrink: 0;
}

.mm-carrito-lateral__titulo {
  font-size: v.$tam-titulo-seccion;
  font-weight: v.$peso-negrita;
  margin: 0;
}

.mm-carrito-lateral__acciones-cabecera {
  display: flex;
  align-items: center;
  gap: 14px;
}

.mm-carrito-lateral__vaciar {
  background: none;
  border: none;
  color: v.$error;
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-semi;
  cursor: pointer;
}

.mm-carrito-lateral__cerrar {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  min-width: v.$objetivo-tactil-min;
  min-height: v.$objetivo-tactil-min;
}

.mm-carrito-lateral__vacio {
  color: v.$tenue;
  margin: 20px;
}

.mm-carrito-lateral__lineas {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px;
}

.mm-carrito-lateral__linea {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.mm-carrito-lateral__linea-info {
  display: flex;
  flex-direction: column;
}

.mm-carrito-lateral__linea-nombre {
  font-weight: v.$peso-medio;
  font-size: v.$tam-etiqueta;
}

.mm-carrito-lateral__linea-detalle {
  font-size: 11px;
  color: v.$tenue;
}

.mm-carrito-lateral__pie {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px calc(16px + env(safe-area-inset-bottom));
  border-top: 1px solid v.$borde;
}

.mm-carrito-lateral__total {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mm-carrito-lateral__error {
  color: v.$error;
  margin: 0;
  font-size: v.$tam-etiqueta;
}

.mm-carrito-lateral__confirmar {
  width: 100%;
}
</style>
