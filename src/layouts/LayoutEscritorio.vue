<script setup lang="ts">
import { useRoute } from 'vue-router'

import { useDestinosNav } from '@/composables/useDestinosNav'

const route = useRoute()
const destinos = useDestinosNav('navEscritorio')
</script>

<template>
  <div class="mm-layout-escritorio">
    <nav class="mm-layout-escritorio__barra" aria-label="Navegacion principal">
      <p class="mm-layout-escritorio__marca">Minimarket</p>
      <RouterLink
        v-for="destino in destinos"
        :key="destino.ruta"
        :to="destino.ruta"
        class="mm-layout-escritorio__destino"
        :aria-current="destino.activo ? 'page' : undefined"
      >
        {{ destino.etiqueta }}
      </RouterLink>
    </nav>

    <div class="mm-layout-escritorio__panel">
      <header class="mm-layout-escritorio__cabecera">
        <h1 class="mm-layout-escritorio__titulo">{{ route.meta.titulo }}</h1>
        <p v-if="route.meta.subtitulo" class="mm-layout-escritorio__subtitulo">
          {{ route.meta.subtitulo }}
        </p>
      </header>

      <main class="mm-layout-escritorio__contenido">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-layout-escritorio {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100vh;
}

.mm-layout-escritorio__barra {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 20px 12px;
  background-color: v.$superficie;
  border-right: 1px solid v.$borde;
}

.mm-layout-escritorio__marca {
  font-weight: v.$peso-extra;
  font-size: 18px;
  padding: 0 12px 16px;
  margin: 0;
}

.mm-layout-escritorio__destino {
  min-height: 40px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-radius: v.$radio-sm;
  color: v.$tenue;
  font-weight: v.$peso-medio;
  font-size: v.$tam-cuerpo;
  text-decoration: none;

  &:hover {
    background-color: v.$acento-suave;
  }

  &[aria-current='page'] {
    background-color: v.$acento-suave;
    color: v.$acento;
    font-weight: v.$peso-semi;
  }
}

.mm-layout-escritorio__cabecera {
  padding: 28px 32px 0;
}

.mm-layout-escritorio__titulo {
  font-size: 24px;
  font-weight: v.$peso-negrita;
  margin: 0;
}

.mm-layout-escritorio__subtitulo {
  margin: 4px 0 0;
  color: v.$tenue;
}

.mm-layout-escritorio__contenido {
  padding: 24px 32px 32px;
}
</style>
