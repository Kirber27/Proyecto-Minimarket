<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'

const props = withDefaults(
  defineProps<{
    mensaje: string
    duracionMs?: number
  }>(),
  { duracionMs: 2200 },
)

const emit = defineEmits<{
  cerrar: []
}>()

let temporizador: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  temporizador = setTimeout(() => emit('cerrar'), props.duracionMs)
})

onBeforeUnmount(() => {
  clearTimeout(temporizador)
})
</script>

<template>
  <Teleport to="body">
    <div class="mm-toast" role="status" aria-live="polite">
      {{ mensaje }}
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;
@use '@/assets/scss/mixins' as m;

.mm-toast {
  position: fixed;
  background-color: v.$tinta;
  color: white;
  padding: 12px 18px;
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-medio;
  box-shadow: v.$sombra-1;
  z-index: 1100;

  // Centrado abajo en escritorio (no hay barra inferior que tapar).
  @include m.desde-escritorio {
    left: 50%;
    bottom: 26px;
    transform: translateX(-50%);
    border-radius: v.$radio-md;
  }

  // En movil queda arriba de la barra de navegacion inferior, no debajo:
  // ahi si tapa el toast por completo.
  @include m.hasta-movil {
    left: 18px;
    right: 18px;
    bottom: calc(v.$objetivo-tactil-min + 24px + env(safe-area-inset-bottom));
    border-radius: v.$radio-lg;
    text-align: center;
  }
}
</style>
