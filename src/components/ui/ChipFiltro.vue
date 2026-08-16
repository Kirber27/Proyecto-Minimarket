<script setup lang="ts">
defineProps<{
  activo?: boolean
}>()

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    class="mm-chip"
    :class="{ 'mm-chip--activo': activo }"
    :aria-pressed="!!activo"
    @click="emit('click')"
  >
    <slot />
  </button>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-chip {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 14px;
  border-radius: v.$radio-sm;
  border: 1px solid v.$borde;
  background-color: v.$superficie;
  color: v.$tenue;
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-semi;
  cursor: pointer;
  white-space: nowrap;
}

.mm-chip--activo {
  background-color: v.$acento-suave;
  border-color: v.$acento;
  // $acento sobre $acento-suave apenas roza 4.5:1; $acento-hover da margen
  // real (ver .claude/steering/ui-ux.md).
  color: v.$acento-hover;
}
</style>
