<script setup lang="ts">
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
</script>

<template>
  <div class="mm-pagina">
    <EstadoVacio
      titulo="Todavia no hay ventas hoy"
      descripcion="Cuando registres una venta, aqui vas a ver cuanto llevas del dia."
      etiqueta-accion="Registrar venta"
      ruta-accion="/venta"
    />
  </div>
</template>
