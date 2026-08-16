<script setup lang="ts">
import { useRoute } from 'vue-router'

import { useDestinosNav } from '@/composables/useDestinosNav'
import SelectorNegocio from '@/components/dominio/SelectorNegocio.vue'

const route = useRoute()
const destinos = useDestinosNav('navMovil')
</script>

<template>
  <div class="mm-layout-movil">
    <header class="mm-layout-movil__cabecera">
      <div class="mm-layout-movil__fila-superior">
        <div>
          <h1 class="mm-layout-movil__titulo">{{ route.meta.titulo }}</h1>
          <p v-if="route.meta.subtitulo" class="mm-layout-movil__subtitulo">
            {{ route.meta.subtitulo }}
          </p>
        </div>
        <SelectorNegocio />
      </div>
    </header>

    <main class="mm-layout-movil__contenido">
      <slot />
    </main>

    <nav class="mm-layout-movil__barra" aria-label="Navegacion principal">
      <RouterLink
        v-for="destino in destinos"
        :key="destino.ruta"
        :to="destino.ruta"
        class="mm-layout-movil__destino"
        :aria-current="destino.activo ? 'page' : undefined"
      >
        {{ destino.etiqueta }}
      </RouterLink>
    </nav>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;
@use '@/assets/scss/mixins' as m;

.mm-layout-movil {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.mm-layout-movil__cabecera {
  padding: 20px 16px 12px;
}

.mm-layout-movil__fila-superior {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.mm-layout-movil__titulo {
  font-size: v.$tam-titulo-seccion;
  font-weight: v.$peso-negrita;
  margin: 0;
}

.mm-layout-movil__subtitulo {
  margin: 2px 0 0;
  color: v.$tenue;
  font-size: v.$tam-etiqueta;
}

.mm-layout-movil__contenido {
  flex: 1;
  padding: 0 16px 16px;
  padding-bottom: calc(v.$objetivo-tactil-min + 24px);
}

.mm-layout-movil__barra {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  background-color: v.$superficie;
  border-top: 1px solid v.$borde;
  padding-bottom: env(safe-area-inset-bottom);
}

.mm-layout-movil__destino {
  @include m.objetivo-tactil;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  font-size: 12px;
  font-weight: v.$peso-semi;
  color: v.$tenue;
  text-decoration: none;

  &[aria-current='page'] {
    // $acento no llega a 4.5:1 sobre $superficie; $acento-hover si.
    color: v.$acento-hover;
  }
}
</style>
