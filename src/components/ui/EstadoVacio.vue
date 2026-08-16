<script setup lang="ts">
withDefaults(
  defineProps<{
    titulo: string
    descripcion?: string
    etiquetaAccion?: string
    rutaAccion?: string
  }>(),
  {},
)
</script>

<template>
  <div class="mm-estado-vacio">
    <p class="mm-estado-vacio__titulo">{{ titulo }}</p>
    <p v-if="descripcion" class="mm-estado-vacio__descripcion">{{ descripcion }}</p>
    <RouterLink
      v-if="etiquetaAccion && rutaAccion"
      :to="rutaAccion"
      class="mm-estado-vacio__accion"
    >
      {{ etiquetaAccion }}
    </RouterLink>
    <slot name="accion" />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-estado-vacio {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 8px;
  padding: 48px 20px;
  color: v.$tenue;
}

.mm-estado-vacio__titulo {
  font-size: v.$tam-titulo-seccion;
  font-weight: v.$peso-negrita;
  color: v.$tinta;
  margin: 0;
}

.mm-estado-vacio__descripcion {
  margin: 0;
  max-width: 32ch;
}

.mm-estado-vacio__accion {
  margin-top: 12px;
  min-height: v.$objetivo-tactil-min;
  display: inline-flex;
  align-items: center;
  padding: 0 20px;
  border-radius: v.$radio-sm;
  background-color: v.$acento;
  color: white;
  font-weight: v.$peso-semi;
  text-decoration: none;
}
</style>
