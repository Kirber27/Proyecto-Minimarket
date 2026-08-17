<script setup lang="ts">
import { computed } from 'vue'

import { calcularEstadoStock } from '@/lib/stock'
import type { Categoria, Producto } from '@/types/dominio'
import PrecioDoble from '@/components/dominio/PrecioDoble.vue'
import ChipCategoria from '@/components/dominio/ChipCategoria.vue'
import CajaIniciales from '@/components/dominio/CajaIniciales.vue'

const props = defineProps<{
  producto: Producto
  categoria?: Categoria
}>()

const emit = defineEmits<{
  click: [producto: Producto]
}>()

const estadoStock = computed(() =>
  calcularEstadoStock(props.producto.stockActual, props.producto.stockMinimo),
)

const textoStock = computed(() => {
  const unidad = props.producto.unidadMedida === 'KG' ? 'kg' : 'u.'
  return `${props.producto.stockActual} ${unidad}`
})
</script>

<template>
  <button
    type="button"
    class="mm-tarjeta-producto"
    :class="`mm-tarjeta-producto--${estadoStock.estado}`"
    @click="emit('click', producto)"
  >
    <div class="mm-tarjeta-producto__cabecera">
      <CajaIniciales
        :nombre="producto.nombre"
        :matiz="categoria?.matiz ?? 265"
        :tamano="36"
      />
      <span class="mm-tarjeta-producto__nombre">{{ producto.nombre }}</span>
      <ChipCategoria
        v-if="categoria"
        :nombre="categoria.nombre"
        :matiz="categoria.matiz"
      />
    </div>

    <div class="mm-tarjeta-producto__pie">
      <PrecioDoble :usd="producto.precioVentaUsd" tamano="sm" />
      <span class="mm-tarjeta-producto__stock">
        {{ estadoStock.etiqueta }} · {{ textoStock }}
      </span>
    </div>
  </button>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-tarjeta-producto {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  padding: 14px;
  border: 1px solid v.$borde;
  border-radius: v.$radio-md;
  background-color: v.$superficie;
  text-align: left;
  cursor: pointer;
  border-left: 4px solid transparent;

  &--sin-stock,
  &--critico {
    border-left-color: v.$error;
  }
  &--bajo {
    border-left-color: v.$aviso;
  }
  &--normal {
    border-left-color: v.$ok;
  }
}

.mm-tarjeta-producto__cabecera {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mm-tarjeta-producto__nombre {
  flex: 1;
  min-width: 0;
  font-weight: v.$peso-semi;
  color: v.$tinta;
}

.mm-tarjeta-producto__pie {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.mm-tarjeta-producto__stock {
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
}
</style>
