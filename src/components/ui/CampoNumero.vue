<script setup lang="ts">
import { useId } from 'vue'

const modelo = defineModel<number | null>({ default: null })

withDefaults(
  defineProps<{
    etiqueta: string
    error?: string
    min?: number
    max?: number
    step?: number
    placeholder?: string
  }>(),
  { step: 1 },
)

const id = useId()
const idError = useId()
</script>

<template>
  <div class="mm-campo">
    <label :for="id" class="mm-campo__etiqueta">{{ etiqueta }}</label>
    <input
      :id="id"
      v-model.number="modelo"
      type="number"
      inputmode="decimal"
      :min="min"
      :max="max"
      :step="step"
      :placeholder="placeholder"
      class="mm-campo__input"
      :class="{ 'mm-campo__input--error': error }"
      :aria-invalid="!!error"
      :aria-describedby="error ? idError : undefined"
    />
    <p v-if="error" :id="idError" class="mm-campo__error">{{ error }}</p>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-campo {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mm-campo__etiqueta {
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-semi;
  color: v.$tenue;
}

.mm-campo__input {
  min-height: v.$objetivo-tactil-min;
  padding: 0 14px;
  border: 1px solid v.$borde;
  border-radius: v.$radio-md;
  font-size: v.$tam-cuerpo;
  background-color: v.$superficie;
  color: v.$tinta;

  &:focus {
    outline: none;
    border-color: v.$acento;
  }
}

.mm-campo__input--error {
  border-color: v.$error;
}

.mm-campo__error {
  margin: 0;
  font-size: v.$tam-etiqueta;
  color: v.$error;
}
</style>
