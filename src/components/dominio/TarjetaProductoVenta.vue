<script setup lang="ts">
import { computed, ref } from 'vue'

import { obtenerIniciales } from '@/lib/texto'
import type { Producto } from '@/types/dominio'
import PrecioDoble from '@/components/dominio/PrecioDoble.vue'

const props = defineProps<{
  producto: Producto
  matiz: number
  cantidadEnCarrito: number
}>()

const iniciales = computed(() => obtenerIniciales(props.producto.nombre))

const emit = defineEmits<{
  agregar: [producto: Producto, cantidad: number]
  quitar: [producto: Producto]
  establecerCantidad: [producto: Producto, cantidad: number]
}>()

const sinStock = computed(() => props.producto.stockActual <= 0)
const esKg = computed(() => props.producto.unidadMedida === 'KG')
const enCarrito = computed(() => props.cantidadEnCarrito > 0)

const editandoKg = ref(false)
const valorKg = ref('')

function alTocarTarjeta(): void {
  if (sinStock.value) return
  if (esKg.value) {
    valorKg.value = props.cantidadEnCarrito > 0 ? String(props.cantidadEnCarrito) : ''
    editandoKg.value = true
    return
  }
  emit('agregar', props.producto, 1)
}

function confirmarKg(): void {
  const cantidad = Number(valorKg.value)
  if (Number.isFinite(cantidad) && cantidad > 0) {
    emit('establecerCantidad', props.producto, Math.round(cantidad * 1000) / 1000)
  }
  editandoKg.value = false
}

function aumentar(evento: Event): void {
  evento.stopPropagation()
  emit('agregar', props.producto, 1)
}

function disminuir(evento: Event): void {
  evento.stopPropagation()
  emit('agregar', props.producto, -1)
}
</script>

<template>
  <div class="mm-tarjeta-venta" :class="{ 'mm-tarjeta-venta--sin-stock': sinStock }">
    <button
      type="button"
      class="mm-tarjeta-venta__toque"
      :disabled="sinStock"
      @click="alTocarTarjeta"
    >
      <div
        class="mm-tarjeta-venta__caja"
        :style="{ '--mm-matiz': matiz }"
        aria-hidden="true"
      >
        {{ iniciales }}
      </div>
      <span class="mm-tarjeta-venta__nombre">{{ producto.nombre }}</span>
      <div class="mm-tarjeta-venta__pie">
        <PrecioDoble :usd="producto.precioVentaUsd" tamano="sm" />
        <span v-if="sinStock" class="mm-tarjeta-venta__etiqueta-sin-stock"
          >Sin stock</span
        >
        <span v-else class="mm-tarjeta-venta__stock-libre">
          {{ producto.stockActual }} {{ esKg ? 'kg' : 'u.' }}
        </span>
      </div>
    </button>

    <div v-if="editandoKg" class="mm-tarjeta-venta__kg" @click.stop>
      <input
        v-model="valorKg"
        type="number"
        inputmode="decimal"
        step="0.001"
        min="0"
        :max="producto.stockActual"
        class="mm-tarjeta-venta__kg-input"
        autofocus
        @keydown.enter="confirmarKg"
      />
      <button type="button" class="mm-tarjeta-venta__kg-ok" @click="confirmarKg">
        OK
      </button>
    </div>

    <div v-else-if="enCarrito" class="mm-tarjeta-venta__controles" @click.stop>
      <button
        type="button"
        class="mm-tarjeta-venta__control mm-tarjeta-venta__control--restar"
        aria-label="Quitar una unidad"
        @click="disminuir"
      >
        −
      </button>
      <span class="mm-tarjeta-venta__cantidad">{{ cantidadEnCarrito }}</span>
      <button
        type="button"
        class="mm-tarjeta-venta__control mm-tarjeta-venta__control--sumar"
        aria-label="Agregar una unidad"
        :disabled="sinStock"
        @click="aumentar"
      >
        +
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;
@use '@/assets/scss/mixins' as m;

.mm-tarjeta-venta {
  position: relative;
  border: 1.5px solid v.$borde;
  border-radius: v.$radio-lg;
  background-color: v.$superficie;
  overflow: hidden;

  &--sin-stock {
    opacity: 0.55;
  }
}

.mm-tarjeta-venta__toque {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
  }

  &:active:not(:disabled) {
    background-color: v.$acento-suave;
  }
}

.mm-tarjeta-venta__caja {
  width: 100%;
  height: 50px;
  border-radius: v.$radio-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: v.$peso-extra;
  background-color: m.tinte-bg(var(--mm-matiz));
  color: m.tinte-fg(var(--mm-matiz));
}

.mm-tarjeta-venta__nombre {
  font-weight: v.$peso-semi;
  color: v.$tinta;
  font-size: v.$tam-etiqueta;
  line-height: 1.25;
  min-height: 2.5em;
}

.mm-tarjeta-venta__pie {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  width: 100%;
}

.mm-tarjeta-venta__stock-libre {
  font-size: 10.5px;
  font-weight: v.$peso-semi;
  color: v.$tenue;
}

.mm-tarjeta-venta__etiqueta-sin-stock {
  font-size: 10.5px;
  font-weight: v.$peso-semi;
  color: v.$error;
}

.mm-tarjeta-venta__controles {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 0 12px 12px;
}

.mm-tarjeta-venta__control {
  @include m.objetivo-tactil;
  flex: 1;
  border: none;
  border-radius: v.$radio-sm;
  font-size: 18px;
  font-weight: v.$peso-extra;
  cursor: pointer;

  &--restar {
    background-color: v.$fondo;
    color: v.$tinta;
  }

  &--sumar {
    background-color: v.$acento;
    color: white;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.mm-tarjeta-venta__cantidad {
  min-width: 28px;
  text-align: center;
  color: v.$acento-hover;
  font-weight: v.$peso-extra;
}

.mm-tarjeta-venta__kg {
  display: flex;
  gap: 6px;
  padding: 0 12px 12px;
}

.mm-tarjeta-venta__kg-input {
  flex: 1;
  min-height: 36px;
  padding: 0 8px;
  border: 1px solid v.$borde;
  border-radius: v.$radio-sm;
}

.mm-tarjeta-venta__kg-ok {
  min-height: 36px;
  padding: 0 12px;
  border: none;
  border-radius: v.$radio-sm;
  background-color: v.$acento;
  color: white;
  font-weight: v.$peso-semi;
  cursor: pointer;
}
</style>
