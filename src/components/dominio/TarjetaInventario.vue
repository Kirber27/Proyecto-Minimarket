<script setup lang="ts">
import { computed } from 'vue'

import { calcularEstadoStock } from '@/lib/stock'
import { calcularMargen, formatearMargen } from '@/lib/margen'
import type { Producto } from '@/types/dominio'
import PrecioDoble from '@/components/dominio/PrecioDoble.vue'

const props = defineProps<{
  producto: Producto
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
  <button
    type="button"
    class="mm-tarjeta-inventario"
    :class="[
      `mm-tarjeta-inventario--${estadoStock.estado}`,
      { 'mm-tarjeta-inventario--inactivo': !producto.activo },
    ]"
    @click="emit('click', producto)"
  >
    <div class="mm-tarjeta-inventario__cabecera">
      <span class="mm-tarjeta-inventario__nombre">{{ producto.nombre }}</span>
      <span
        class="mm-tarjeta-inventario__estado"
        :class="`mm-tarjeta-inventario__estado--${estadoStock.estado}`"
      >
        {{ estadoStock.etiqueta }}
      </span>
    </div>

    <div class="mm-tarjeta-inventario__cuerpo">
      <span>{{ textoStock }}</span>
      <PrecioDoble :usd="producto.precioVentaUsd" tamano="sm" />
      <span class="mm-tarjeta-inventario__margen"
        >Margen: {{ formatearMargen(margen) }}</span
      >
    </div>

    <p v-if="proximoAAgotarse" class="mm-tarjeta-inventario__proximo">
      Próximo a agotarse
    </p>
    <p v-if="!producto.activo" class="mm-tarjeta-inventario__inactivo-etiqueta">
      Inactivo
    </p>
  </button>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-tarjeta-inventario {
  display: flex;
  flex-direction: column;
  gap: 8px;
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

  &--inactivo {
    opacity: 0.6;
  }
}

.mm-tarjeta-inventario__cabecera {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.mm-tarjeta-inventario__nombre {
  font-weight: v.$peso-semi;
  color: v.$tinta;
}

.mm-tarjeta-inventario__estado {
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-semi;
  white-space: nowrap;

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

.mm-tarjeta-inventario__cuerpo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
}

.mm-tarjeta-inventario__margen {
  font-size: v.$tam-etiqueta;
}

.mm-tarjeta-inventario__proximo {
  margin: 0;
  font-size: 12px;
  font-weight: v.$peso-semi;
  color: v.$aviso;
}

.mm-tarjeta-inventario__inactivo-etiqueta {
  margin: 0;
  font-size: 11px;
  color: v.$tenue;
}
</style>
