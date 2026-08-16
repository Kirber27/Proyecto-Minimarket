<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId } from 'vue'

const props = defineProps<{
  titulo: string
}>()

const emit = defineEmits<{
  cerrar: []
}>()

const idTitulo = useId()
const refPanel = ref<HTMLElement | null>(null)
let elementoConFocoPrevio: HTMLElement | null = null

function seleccionarFocables(): HTMLElement[] {
  if (!refPanel.value) return []
  return Array.from(
    refPanel.value.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    ),
  )
}

function alPresionarTecla(evento: KeyboardEvent): void {
  if (evento.key === 'Escape') {
    emit('cerrar')
    return
  }
  if (evento.key !== 'Tab') return

  const focables = seleccionarFocables()
  if (focables.length === 0) return

  const primero = focables[0]!
  const ultimo = focables[focables.length - 1]!

  if (evento.shiftKey && document.activeElement === primero) {
    evento.preventDefault()
    ultimo.focus()
  } else if (!evento.shiftKey && document.activeElement === ultimo) {
    evento.preventDefault()
    primero.focus()
  }
}

onMounted(() => {
  elementoConFocoPrevio = document.activeElement as HTMLElement | null
  document.addEventListener('keydown', alPresionarTecla)
  seleccionarFocables()[0]?.focus()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', alPresionarTecla)
  elementoConFocoPrevio?.focus()
})
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

.mm-modal__fondo {
  position: fixed;
  inset: 0;
  background-color: rgba(20, 22, 30, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1050;
}

.mm-modal__panel {
  background-color: v.$superficie;
  border-radius: v.$radio-lg;
  box-shadow: v.$sombra-2;
  max-width: 480px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
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
