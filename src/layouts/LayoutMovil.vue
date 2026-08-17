<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { useCatalogoStore } from '@/stores/catalogo'
import * as inventarioService from '@/services/inventarioService'
import { useDestinosNav } from '@/composables/useDestinosNav'
import SelectorNegocio from '@/components/dominio/SelectorNegocio.vue'
import Icono from '@/components/ui/Icono.vue'
import type { ProductoCobertura } from '@/types/dominio'

const route = useRoute()
const catalogo = useCatalogoStore()
const destinos = useDestinosNav('navMovil')

const cobertura = ref<ProductoCobertura[]>([])

async function cargarAlertas(): Promise<void> {
  try {
    cobertura.value = await inventarioService.listarCobertura()
  } catch {
    // el badge es informativo; si falla no bloquea la navegacion
  }
}

onMounted(cargarAlertas)
watch(() => catalogo.negocio, cargarAlertas)

const conteoAlertas = computed(() => {
  const conteo = inventarioService.contarAlertas(cobertura.value, catalogo.negocio)
  return conteo.agotados + conteo.criticos
})
</script>

<template>
  <div class="mm-layout-movil">
    <header class="mm-layout-movil__cabecera">
      <div class="mm-layout-movil__fila-superior">
        <div class="mm-layout-movil__marca">
          <span class="mm-layout-movil__avatar" aria-hidden="true">K</span>
          <div class="mm-layout-movil__titulos">
            <p class="mm-layout-movil__etiqueta-marca">Tu Kiosko</p>
            <h1 class="mm-layout-movil__titulo">{{ route.meta.titulo }}</h1>
          </div>
        </div>

        <RouterLink
          to="/alertas"
          class="mm-layout-movil__campana"
          aria-label="Alertas de stock"
        >
          <Icono nombre="alertas" :tamano="18" />
          <span v-if="conteoAlertas > 0" class="mm-layout-movil__badge">{{
            conteoAlertas
          }}</span>
        </RouterLink>
      </div>

      <div class="mm-layout-movil__fila-negocio">
        <SelectorNegocio />
        <p v-if="route.meta.subtitulo" class="mm-layout-movil__subtitulo">
          {{ route.meta.subtitulo }}
        </p>
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
        <Icono :nombre="destino.icono" :tamano="19" />
        <span>{{ destino.etiqueta }}</span>
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

.mm-layout-movil__marca {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.mm-layout-movil__avatar {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: v.$acento-suave;
  color: v.$acento-hover;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: v.$peso-extra;
}

.mm-layout-movil__titulos {
  min-width: 0;
}

.mm-layout-movil__etiqueta-marca {
  margin: 0 0 2px;
  font-size: 10.5px;
  font-weight: v.$peso-negrita;
  color: v.$tenue;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.mm-layout-movil__titulo {
  font-size: v.$tam-titulo-seccion;
  font-weight: v.$peso-negrita;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mm-layout-movil__fila-negocio {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.mm-layout-movil__subtitulo {
  margin: 0;
  color: v.$tenue;
  font-size: v.$tam-etiqueta;
}

.mm-layout-movil__campana {
  position: relative;
  @include m.objetivo-tactil;
  width: v.$objetivo-tactil-min;
  flex-shrink: 0;
  border-radius: v.$radio-md;
  border: 1px solid v.$borde;
  background-color: v.$superficie;
  color: v.$tinta;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mm-layout-movil__badge {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 10px;
  background-color: v.$error;
  color: white;
  font-size: 10px;
  font-weight: v.$peso-extra;
  display: flex;
  align-items: center;
  justify-content: center;
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 8px 4px;
  font-size: 10px;
  font-weight: v.$peso-semi;
  color: v.$tenue;
  text-decoration: none;

  &[aria-current='page'] {
    // $acento no llega a 4.5:1 sobre $superficie; $acento-hover si.
    color: v.$acento-hover;
  }
}
</style>
