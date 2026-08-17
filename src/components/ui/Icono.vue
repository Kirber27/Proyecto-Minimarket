<script setup lang="ts">
// Los iconos del prototipo son glifos de texto ASCII; se reemplazan aqui por
// SVG reales (ver .claude/steering/ui-ux.md). Siempre `aria-hidden`: el
// significado lo lleva la etiqueta de texto que va al lado, nunca el icono
// solo.
import { RUTAS_ICONO, type NombreIcono } from '@/lib/iconos'

withDefaults(
  defineProps<{
    nombre: NombreIcono
    tamano?: number
  }>(),
  { tamano: 18 },
)
</script>

<template>
  <!-- RUTAS_ICONO es un mapa interno fijo, no dato externo -->
  <!-- eslint-disable vue/no-v-html -->
  <svg
    :width="tamano"
    :height="tamano"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
    v-html="RUTAS_ICONO[nombre]"
  />
  <!-- eslint-enable vue/no-v-html -->
</template>
