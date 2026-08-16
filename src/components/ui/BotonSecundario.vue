<script setup lang="ts">
withDefaults(
  defineProps<{
    cargando?: boolean
    deshabilitado?: boolean
    type?: 'button' | 'submit'
  }>(),
  { cargando: false, deshabilitado: false, type: 'button' },
)
</script>

<template>
  <button
    :type="type"
    class="mm-boton mm-boton--secundario"
    :disabled="deshabilitado || cargando"
    :aria-busy="cargando"
  >
    <span v-if="cargando" class="mm-boton__spinner" aria-hidden="true" />
    <slot />
  </button>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-boton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: v.$objetivo-tactil-min;
  padding: 0 20px;
  border-radius: v.$radio-sm;
  font-weight: v.$peso-semi;
  font-size: v.$tam-cuerpo;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.mm-boton--secundario {
  background-color: transparent;
  color: v.$acento;
  border: 1px solid v.$borde;

  &:hover:not(:disabled) {
    background-color: v.$acento-suave;
  }
}

.mm-boton__spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(0, 0, 0, 0.15);
  border-top-color: v.$acento;
  border-radius: 50%;
  animation: girar 0.6s linear infinite;
}

@keyframes girar {
  to {
    transform: rotate(360deg);
  }
}
</style>
