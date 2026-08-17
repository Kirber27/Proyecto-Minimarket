<script setup lang="ts">
import { ref, useId } from 'vue'

import { useTrampaFoco } from '@/composables/useTrampaFoco'

const props = defineProps<{
  titulo: string
}>()

const emit = defineEmits<{
  cerrar: []
}>()

const idTitulo = useId()
const refPanel = ref<HTMLElement | null>(null)

useTrampaFoco(refPanel, () => emit('cerrar'))
</script>

<template>
  <Teleport to="body">
    <div class="mm-modal__fondo" @click.self="emit('cerrar')">
      <div
        ref="refPanel"
        class="mm-modal__panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="idTitulo"
      >
        <header class="mm-modal__cabecera">
          <h2 :id="idTitulo" class="mm-modal__titulo">{{ props.titulo }}</h2>
          <button
            type="button"
            class="mm-modal__cerrar"
            aria-label="Cerrar"
            @click="emit('cerrar')"
          >
            ✕
          </button>
        </header>
        <div class="mm-modal__cuerpo">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;
@use '@/assets/scss/mixins' as m;

.mm-modal__fondo {
  position: fixed;
  inset: 0;
  background-color: rgba(20, 22, 30, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1050;

  // En movil es una hoja que sube desde abajo, no un dialogo centrado (ver
  // el prototipo de Claude Design): mas facil de alcanzar con el pulgar.
  @include m.hasta-movil {
    align-items: flex-end;
    padding: 0;
  }
}

.mm-modal__panel {
  background-color: v.$superficie;
  border-radius: v.$radio-lg;
  box-shadow: v.$sombra-2;
  max-width: 480px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: mm-modal-aparecer 0.18s ease-out;

  @include m.hasta-movil {
    border-radius: v.$radio-xl v.$radio-xl 0 0;
    max-height: 88vh;
    animation: mm-modal-subir 0.22s ease-out;
  }
}

@keyframes mm-modal-aparecer {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes mm-modal-subir {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mm-modal__panel {
    animation: none;
  }
}

.mm-modal__cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 0;
}

.mm-modal__titulo {
  font-size: v.$tam-titulo-seccion;
  font-weight: v.$peso-negrita;
  margin: 0;
}

.mm-modal__cerrar {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  min-width: v.$objetivo-tactil-min;
  min-height: v.$objetivo-tactil-min;
}

.mm-modal__cuerpo {
  padding: 20px;
}
</style>
