<script setup lang="ts">
import { ref } from 'vue'

withDefaults(
  defineProps<{
    deshabilitado?: boolean
  }>(),
  { deshabilitado: false },
)

const emit = defineEmits<{
  completar: [pin: string]
}>()

const digitos = ref<string[]>([])

function presionar(digito: string): void {
  if (digitos.value.length >= 4) return
  digitos.value.push(digito)
  if (digitos.value.length === 4) {
    const pin = digitos.value.join('')
    emit('completar', pin)
  }
}

function borrar(): void {
  digitos.value.pop()
}

function limpiar(): void {
  digitos.value = []
}

defineExpose({ limpiar })
</script>

<template>
  <div class="mm-teclado-pin">
    <div class="mm-teclado-pin__posiciones" role="status" aria-label="PIN ingresado">
      <span
        v-for="indice in 4"
        :key="indice"
        class="mm-teclado-pin__posicion"
        :class="{ 'mm-teclado-pin__posicion--llena': indice <= digitos.length }"
      />
    </div>

    <div class="mm-teclado-pin__teclas">
      <button
        v-for="digito in ['1', '2', '3', '4', '5', '6', '7', '8', '9']"
        :key="digito"
        type="button"
        class="mm-teclado-pin__tecla"
        :disabled="deshabilitado"
        @click="presionar(digito)"
      >
        {{ digito }}
      </button>
      <span
        class="mm-teclado-pin__tecla mm-teclado-pin__tecla--vacia"
        aria-hidden="true"
      />
      <button
        type="button"
        class="mm-teclado-pin__tecla"
        :disabled="deshabilitado"
        @click="presionar('0')"
      >
        0
      </button>
      <button
        type="button"
        class="mm-teclado-pin__tecla"
        aria-label="Borrar"
        :disabled="deshabilitado"
        @click="borrar"
      >
        ⌫
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;
@use '@/assets/scss/mixins' as m;

.mm-teclado-pin {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
}

.mm-teclado-pin__posiciones {
  display: flex;
  gap: 16px;
}

.mm-teclado-pin__posicion {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid v.$borde;
  background-color: transparent;
}

.mm-teclado-pin__posicion--llena {
  background-color: v.$acento;
  border-color: v.$acento;
}

.mm-teclado-pin__teclas {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  width: 100%;
  max-width: 260px;
}

.mm-teclado-pin__tecla {
  @include m.objetivo-tactil;
  border-radius: v.$radio-md;
  border: 1px solid v.$borde;
  background-color: v.$superficie;
  font-size: 20px;
  font-weight: v.$peso-semi;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.mm-teclado-pin__tecla--vacia {
  border: none;
  background: none;
}
</style>
