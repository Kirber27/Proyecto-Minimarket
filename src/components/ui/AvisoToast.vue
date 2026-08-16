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

.mm-toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  background-color: v.$tinta;
  color: white;
  padding: 10px 18px;
  border-radius: v.$radio-sm;
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-medio;
  box-shadow: v.$sombra-1;
  z-index: 1100;
}
</style>
