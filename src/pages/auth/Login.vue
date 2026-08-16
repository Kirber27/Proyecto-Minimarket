<script setup lang="ts">
// Placeholder: el flujo real de login con contrasena y PIN llega con el
// spec 02 (autenticacion-acceso).
</script>

<template>
  <div class="mm-login">
    <h1 class="mm-login__titulo">Minimarket</h1>
    <p class="text-muted">El inicio de sesion se implementa en el spec 02.</p>
  </div>
</template>

<style scoped lang="scss">
.mm-login {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  text-align: center;
  gap: 8px;
}

.mm-login__titulo {
  font-weight: 800;
  font-size: 28px;
}
</style>
