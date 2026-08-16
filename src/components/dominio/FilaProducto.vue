<script setup lang="ts">
import { computed } from 'vue'

import { calcularEstadoStock } from '@/lib/stock'
import type { Categoria, Producto } from '@/types/dominio'
import PrecioDoble from '@/components/dominio/PrecioDoble.vue'
import ChipCategoria from '@/components/dominio/ChipCategoria.vue'

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
  <div
    class="mm-fila-producto"
    role="row"
    tabindex="0"
    @click="emit('click', producto)"
    @keydown.enter="emit('click', producto)"
  >
    <span role="cell" class="mm-fila-producto__nombre">{{ producto.nombre }}</span>
    <span role="cell">
      <ChipCategoria
        v-if="categoria"
        :nombre="categoria.nombre"
        :matiz="categoria.matiz"
      />
    </span>
    <span role="cell"><PrecioDoble :usd="producto.precioVentaUsd" tamano="sm" /></span>
    <span role="cell">
      <span
        class="mm-fila-producto__estado"
        :class="`mm-fila-producto__estado--${estadoStock.estado}`"
      >
        {{ estadoStock.etiqueta }}
      </span>
      <span class="mm-fila-producto__stock-numero">{{ textoStock }}</span>
    </span>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-fila-producto {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid v.$borde;
  cursor: pointer;

  &:hover {
    background-color: v.$acento-suave;
  }
}

.mm-fila-producto__nombre {
  font-weight: v.$peso-medio;
  color: v.$tinta;
}

.mm-fila-producto__estado {
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-semi;

  &--sin-stock,
  &--critico {
    color: v.$error;
  }
  &--bajo {
    color: v.$aviso;
  }
  &--normal {
    color: v.$ok;
  }
}

.mm-fila-producto__stock-numero {
  margin-left: 6px;
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
}
</style>
