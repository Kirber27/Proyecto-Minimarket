<script setup lang="ts">
import { computed } from 'vue'

import { aBolivares, formatearBs, type Centavos } from '@/lib/money'
import { useMoneda } from '@/composables/useMoneda'
import { usePreferenciasStore } from '@/stores/preferencias'

const props = withDefaults(
  defineProps<{
    usd: Centavos
    /** Documentos historicos (venta pasada): usa esta tasa, ignora la vigente. */
    tasaFija?: number
    tamano?: 'sm' | 'md' | 'lg'
    /** Arqueo de caja: el bolivar es la cifra principal, no el dolar. */
    invertido?: boolean
  }>(),
  { tamano: 'sm', invertido: false },
)

const moneda = useMoneda()
const preferencias = usePreferenciasStore()

const MASCARA = '•••'

const textoUsd = computed(() => moneda.mostrarUsd(props.usd))

const textoBs = computed(() => {
  if (preferencias.ocultarMontos) return MASCARA
  const valor =
    props.tasaFija !== undefined
      ? aBolivares(props.usd, props.tasaFija)
      : moneda.bs(props.usd)
  return valor === null ? '—' : formatearBs(valor)
})
</script>

<template>
  <span class="mm-precio-doble" :class="`mm-precio-doble--${tamano}`">
    <span class="mm-precio-doble__principal">
      {{ invertido ? textoBs : textoUsd }}
    </span>
    <span class="mm-precio-doble__secundario">
      {{ invertido ? textoUsd : textoBs }}
    </span>
  </span>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-precio-doble {
  display: inline-flex;
  flex-direction: column;
  line-height: 1.2;
}

.mm-precio-doble__principal {
  font-weight: v.$peso-extra;
  color: v.$tinta;
}

.mm-precio-doble__secundario {
  color: v.$tenue;
  font-weight: v.$peso-medio;
}

.mm-precio-doble--sm {
  .mm-precio-doble__principal {
    font-size: v.$tam-cuerpo;
    font-weight: v.$peso-semi;
  }
  .mm-precio-doble__secundario {
    font-size: 12px;
  }
}

.mm-precio-doble--md {
  .mm-precio-doble__principal {
    font-size: v.$tam-titulo-seccion;
  }
  .mm-precio-doble__secundario {
    font-size: v.$tam-etiqueta;
  }
}

.mm-precio-doble--lg {
  .mm-precio-doble__principal {
    font-size: v.$tam-cifra-grande;
  }
  .mm-precio-doble__secundario {
    font-size: v.$tam-cuerpo;
  }
}
</style>
