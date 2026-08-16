<template>
  <div class="mm-layout-auth">
    <slot />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-layout-auth {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background-color: v.$fondo;
}
</style>
