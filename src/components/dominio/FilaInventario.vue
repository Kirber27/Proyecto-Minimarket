<script setup lang="ts">
import { computed } from 'vue'

import { calcularEstadoStock } from '@/lib/stock'
import { calcularMargen, formatearMargen } from '@/lib/margen'
import type { Categoria, Producto } from '@/types/dominio'
import PrecioDoble from '@/components/dominio/PrecioDoble.vue'
import CajaIniciales from '@/components/dominio/CajaIniciales.vue'

const props = defineProps<{
  producto: Producto
  categoria?: Categoria
  diasCobertura: number | null
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

const margen = computed(() =>
  calcularMargen(props.producto.precioVentaUsd, props.producto.costoUsd),
)

const proximoAAgotarse = computed(
  () =>
    props.diasCobertura !== null &&
    props.diasCobertura < 7 &&
    props.producto.stockActual > 0,
)
</script>

<template>
  <div
    class="mm-fila-inventario"
    role="row"
    tabindex="0"
    :class="{ 'mm-fila-inventario--inactivo': !producto.activo }"
    @click="emit('click', producto)"
    @keydown.enter="emit('click', producto)"
  >
    <span role="cell" class="mm-fila-inventario__nombre">
      <CajaIniciales
        :nombre="producto.nombre"
        :matiz="categoria?.matiz ?? 265"
        :tamano="34"
      />
      <span>
        {{ producto.nombre }}
        <span v-if="!producto.activo" class="mm-fila-inventario__etiqueta-inactivo"
          >Inactivo</span
        >
      </span>
    </span>
    <span role="cell"><PrecioDoble :usd="producto.precioVentaUsd" tamano="sm" /></span>
    <span role="cell">
      <PrecioDoble
        v-if="producto.costoUsd !== null"
        :usd="producto.costoUsd"
        tamano="sm"
      />
      <span v-else class="mm-fila-inventario__sin-dato">—</span>
    </span>
    <span
      role="cell"
      :class="{ 'mm-fila-inventario__margen--negativo': (margen ?? 0) < 0 }"
    >
      {{ formatearMargen(margen) }}
    </span>
    <span role="cell">
      <span
        class="mm-fila-inventario__estado"
        :class="`mm-fila-inventario__estado--${estadoStock.estado}`"
      >
        {{ estadoStock.etiqueta }}
      </span>
      <span class="mm-fila-inventario__stock-numero">{{ textoStock }}</span>
      <span v-if="proximoAAgotarse" class="mm-fila-inventario__proximo"
        >· próximo a agotarse</span
      >
    </span>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-fila-inventario {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1.6fr;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid v.$borde;
  cursor: pointer;

  &:hover {
    background-color: v.$acento-suave;
  }

  &--inactivo {
    opacity: 0.6;
  }
}

.mm-fila-inventario__nombre {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: v.$peso-medio;
  color: v.$tinta;
}

.mm-fila-inventario__etiqueta-inactivo {
  margin-left: 6px;
  font-size: 11px;
  font-weight: v.$peso-semi;
  color: v.$tenue;
  border: 1px solid v.$borde;
  border-radius: v.$radio-sm;
  padding: 1px 6px;
}

.mm-fila-inventario__sin-dato {
  color: v.$tenue;
}

.mm-fila-inventario__margen--negativo {
  color: v.$error;
  font-weight: v.$peso-semi;
}

.mm-fila-inventario__estado {
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

.mm-fila-inventario__stock-numero {
  margin-left: 6px;
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
}

.mm-fila-inventario__proximo {
  margin-left: 6px;
  font-size: 11px;
  color: v.$aviso;
}
</style>
