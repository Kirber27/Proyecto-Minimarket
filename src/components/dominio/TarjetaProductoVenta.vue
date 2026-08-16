<script setup lang="ts">
import { computed, ref } from 'vue'

import type { Producto } from '@/types/dominio'
import PrecioDoble from '@/components/dominio/PrecioDoble.vue'

const props = defineProps<{
  producto: Producto
  cantidadEnCarrito: number
}>()

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
      <span class="mm-tarjeta-venta__nombre">{{ producto.nombre }}</span>
      <PrecioDoble :usd="producto.precioVentaUsd" tamano="sm" />
      <span v-if="sinStock" class="mm-tarjeta-venta__etiqueta-sin-stock">Sin stock</span>
      <span v-else class="mm-tarjeta-venta__stock-libre">
        {{ producto.stockActual }} {{ esKg ? 'kg' : 'u.' }} disp.
      </span>
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
        class="mm-tarjeta-venta__control"
        aria-label="Quitar una unidad"
        @click="disminuir"
      >
        −
      </button>
      <span class="mm-tarjeta-venta__cantidad">{{ cantidadEnCarrito }}</span>
      <button
        type="button"
        class="mm-tarjeta-venta__control"
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
  border: 1px solid v.$borde;
  border-radius: v.$radio-md;
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
  gap: 6px;
  padding: 12px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  min-height: 88px;

  &:disabled {
    cursor: not-allowed;
  }

  &:active:not(:disabled) {
    background-color: v.$acento-suave;
  }
}

.mm-tarjeta-venta__nombre {
  font-weight: v.$peso-semi;
  color: v.$tinta;
  font-size: v.$tam-etiqueta;
  line-height: 1.3;
}

.mm-tarjeta-venta__stock-libre {
  font-size: 11px;
  color: v.$tenue;
}

.mm-tarjeta-venta__etiqueta-sin-stock {
  font-size: 11px;
  font-weight: v.$peso-semi;
  color: v.$error;
}

.mm-tarjeta-venta__controles {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background-color: v.$acento;
}

.mm-tarjeta-venta__control {
  @include m.objetivo-tactil;
  border: none;
  background: none;
  color: white;
  font-size: 20px;
  font-weight: v.$peso-semi;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.mm-tarjeta-venta__cantidad {
  color: white;
  font-weight: v.$peso-semi;
}

.mm-tarjeta-venta__kg {
  display: flex;
  gap: 6px;
  padding: 8px;
  background-color: v.$acento-suave;
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
