<script setup lang="ts">
import { computed } from 'vue'

import { obtenerIniciales } from '@/lib/texto'

const props = withDefaults(
  defineProps<{
    nombre: string
    matiz: number
    tamano?: number
  }>(),
  { tamano: 38 },
)

const iniciales = computed(() => obtenerIniciales(props.nombre))
</script>

<template>
  <div
    class="mm-caja-iniciales"
    :style="{
      '--mm-matiz': matiz,
      width: `${tamano}px`,
      height: `${tamano}px`,
      fontSize: `${Math.round(tamano * 0.36)}px`,
    }"
    aria-hidden="true"
  >
    {{ iniciales }}
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/mixins' as m;
@use '@/assets/scss/variables' as v;

.mm-caja-iniciales {
  flex-shrink: 0;
  border-radius: v.$radio-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: v.$peso-extra;
  background-color: m.tinte-bg(var(--mm-matiz));
  color: m.tinte-fg(var(--mm-matiz));
}
</style>
