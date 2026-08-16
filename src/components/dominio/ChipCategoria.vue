<script setup lang="ts">
withDefaults(
  defineProps<{
    nombre: string
    matiz: number
  }>(),
  {},
)
</script>

<template>
  <span class="mm-chip-categoria" :style="{ '--mm-matiz': matiz }">
    {{ nombre }}
  </span>
</template>

<style scoped lang="scss">
@use '@/assets/scss/mixins' as m;
@use '@/assets/scss/variables' as v;

.mm-chip-categoria {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: v.$radio-sm;
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-semi;
  white-space: nowrap;
  background-color: m.tinte-bg(var(--mm-matiz));
  color: m.tinte-fg(var(--mm-matiz));
}
</style>
