<script setup lang="ts">
import { ref } from 'vue'

import { useCarritoStore } from '@/stores/carrito'
import type { Venta } from '@/types/dominio'
import Icono from '@/components/ui/Icono.vue'
import CarritoLateral from '@/components/dominio/CarritoLateral.vue'

const emit = defineEmits<{
  ventaConfirmada: [venta: Venta]
}>()

const carrito = useCarritoStore()
const abierto = ref(false)

function alConfirmada(venta: Venta): void {
  abierto.value = false
  emit('ventaConfirmada', venta)
}
</script>

<template>
  <button
    v-if="carrito.lineas.length > 0"
    type="button"
    class="mm-carrito-flotante"
    :aria-label="`Ver carrito, ${carrito.unidadesTotal} artículo(s)`"
    @click="abierto = true"
  >
    <Icono nombre="venta" :tamano="22" />
    <span class="mm-carrito-flotante__badge" aria-hidden="true">{{
      carrito.unidadesTotal
    }}</span>
  </button>

  <CarritoLateral
    v-if="abierto"
    @cerrar="abierto = false"
    @venta-confirmada="alConfirmada"
  />
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;
@use '@/assets/scss/mixins' as m;

.mm-carrito-flotante {
  position: fixed;
  right: 20px;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  border: none;
  background-color: v.$acento;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: v.$sombra-2;
  cursor: pointer;
  z-index: 40;

  @include m.hasta-movil {
    bottom: calc(v.$objetivo-tactil-min + 20px + env(safe-area-inset-bottom));
  }

  @include m.desde-escritorio {
    bottom: 28px;
    right: 32px;
  }
}

.mm-carrito-flotante__badge {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 22px;
  height: 22px;
  padding: 0 5px;
  border-radius: 11px;
  background-color: v.$error;
  color: white;
  font-size: 11.5px;
  font-weight: v.$peso-extra;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid v.$superficie;
  box-sizing: border-box;
}
</style>
