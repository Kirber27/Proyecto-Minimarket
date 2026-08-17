<script setup lang="ts">
import { useCatalogoStore } from '@/stores/catalogo'
import type { UnidadNegocio } from '@/types/dominio'

const catalogo = useCatalogoStore()

const OPCIONES: { valor: UnidadNegocio; etiqueta: string }[] = [
  { valor: 'bodega', etiqueta: 'Bodega' },
  { valor: 'cerveza', etiqueta: 'Cerveza' },
  { valor: 'thais', etiqueta: 'Thais' },
]
</script>

<template>
  <select
    class="mm-selector-negocio__select"
    aria-label="Unidad de negocio"
    :value="catalogo.negocio"
    @change="
      catalogo.cambiarNegocio(($event.target as HTMLSelectElement).value as UnidadNegocio)
    "
  >
    <option v-for="opcion in OPCIONES" :key="opcion.valor" :value="opcion.valor">
      {{ opcion.etiqueta }}
    </option>
  </select>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-selector-negocio__select {
  min-height: 36px;
  padding: 0 10px;
  border-radius: v.$radio-sm;
  border: 1px solid v.$borde;
  background-color: v.$superficie;
  color: v.$tinta;
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-semi;
  cursor: pointer;
}
</style>
