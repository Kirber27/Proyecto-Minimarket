<script setup lang="ts">
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
</script>

<template>
  <div class="mm-enviado">
    <EstadoVacio
      titulo="Revisa tu correo"
      descripcion="Si la cuenta existe, te llegó un enlace para elegir una contraseña nueva. Vence en 60 minutos."
      etiqueta-accion="Volver a ingresar"
      ruta-accion="/ingresar"
    />
  </div>
</template>

<style scoped lang="scss">
.mm-enviado {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
