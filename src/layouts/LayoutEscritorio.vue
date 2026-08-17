<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useCatalogoStore } from '@/stores/catalogo'
import { useSesionStore } from '@/stores/sesion'
import * as inventarioService from '@/services/inventarioService'
import { useDestinosNav } from '@/composables/useDestinosNav'
import { formatearFecha } from '@/lib/fechas'
import SelectorNegocio from '@/components/dominio/SelectorNegocio.vue'
import Icono from '@/components/ui/Icono.vue'
import type { ProductoCobertura } from '@/types/dominio'

const route = useRoute()
const router = useRouter()
const catalogo = useCatalogoStore()
const sesion = useSesionStore()
const destinos = useDestinosNav('navEscritorio')

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

const inicialUsuario = computed(
  () => sesion.perfil?.nombre.charAt(0).toUpperCase() ?? '?',
)
const rolLabel = computed(() => (sesion.esDueno ? 'Dueño' : 'Mostrador'))

async function cerrarSesion(): Promise<void> {
  await sesion.cerrar()
  await router.replace('/ingresar')
}
</script>

<template>
  <div class="mm-layout-escritorio">
    <aside class="mm-layout-escritorio__barra">
      <div class="mm-layout-escritorio__marca">
        <span class="mm-layout-escritorio__avatar" aria-hidden="true">M</span>
        <div class="mm-layout-escritorio__marca-texto">
          <p class="mm-layout-escritorio__marca-nombre">Minimarket</p>
          <p class="mm-layout-escritorio__marca-sub">Gestión interna</p>
        </div>
      </div>

      <nav class="mm-layout-escritorio__nav" aria-label="Navegacion principal">
        <RouterLink
          v-for="destino in destinos"
          :key="destino.ruta"
          :to="destino.ruta"
          class="mm-layout-escritorio__destino"
          :aria-current="destino.activo ? 'page' : undefined"
        >
          <Icono :nombre="destino.icono" :tamano="17" />
          <span class="mm-layout-escritorio__destino-etiqueta">{{
            destino.etiqueta
          }}</span>
          <span
            v-if="destino.ruta === '/alertas' && conteoAlertas > 0"
            class="mm-layout-escritorio__badge"
          >
            {{ conteoAlertas }}
          </span>
        </RouterLink>
      </nav>

      <div class="mm-layout-escritorio__usuario">
        <span class="mm-layout-escritorio__usuario-avatar" aria-hidden="true">{{
          inicialUsuario
        }}</span>
        <div class="mm-layout-escritorio__usuario-texto">
          <p class="mm-layout-escritorio__usuario-nombre">{{ sesion.perfil?.nombre }}</p>
          <p class="mm-layout-escritorio__usuario-rol">{{ rolLabel }}</p>
        </div>
        <button type="button" class="mm-layout-escritorio__salir" @click="cerrarSesion">
          <Icono nombre="salir" :tamano="14" />
          Salir
        </button>
      </div>
    </aside>

    <div class="mm-layout-escritorio__panel">
      <header class="mm-layout-escritorio__cabecera">
        <div>
          <h1 class="mm-layout-escritorio__titulo">{{ route.meta.titulo }}</h1>
          <p v-if="route.meta.subtitulo" class="mm-layout-escritorio__subtitulo">
            {{ route.meta.subtitulo }}
          </p>
        </div>
        <div class="mm-layout-escritorio__acciones">
          <span class="mm-layout-escritorio__fecha">{{
            formatearFecha(new Date())
          }}</span>
          <SelectorNegocio />
          <RouterLink to="/venta" class="mm-layout-escritorio__accion-rapida">
            + Registrar venta
          </RouterLink>
        </div>
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
  padding: 22px 14px;
  background-color: v.$fondo;
  border-right: 1px solid v.$borde;
}

.mm-layout-escritorio__marca {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 8px;
  margin-bottom: 24px;
}

.mm-layout-escritorio__avatar {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: v.$radio-sm;
  background-color: v.$acento;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: v.$peso-extra;
}

.mm-layout-escritorio__marca-texto {
  min-width: 0;
}

.mm-layout-escritorio__marca-nombre {
  margin: 0;
  font-size: 14px;
  font-weight: v.$peso-extra;
  color: v.$tinta;
  white-space: nowrap;
}

.mm-layout-escritorio__marca-sub {
  margin: 0;
  font-size: 10.5px;
  color: v.$tenue;
}

.mm-layout-escritorio__nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.mm-layout-escritorio__destino {
  min-height: 40px;
  display: flex;
  align-items: center;
  gap: 11px;
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
    background-color: v.$superficie;
    // $acento sobre $acento-suave apenas roza 4.5:1; $acento-hover da margen.
    color: v.$acento-hover;
    font-weight: v.$peso-semi;
    box-shadow: v.$sombra-1;
  }
}

.mm-layout-escritorio__destino-etiqueta {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mm-layout-escritorio__badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 10px;
  background-color: v.$error;
  color: white;
  font-size: 10px;
  font-weight: v.$peso-extra;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mm-layout-escritorio__usuario {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid v.$borde;
}

.mm-layout-escritorio__usuario-avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: v.$acento-suave;
  color: v.$acento-hover;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: v.$peso-negrita;
  font-size: 13px;
}

.mm-layout-escritorio__usuario-texto {
  flex: 1;
  min-width: 0;
}

.mm-layout-escritorio__usuario-nombre {
  margin: 0;
  font-size: 12.5px;
  font-weight: v.$peso-semi;
  color: v.$tinta;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mm-layout-escritorio__usuario-rol {
  margin: 0;
  font-size: 10.5px;
  color: v.$tenue;
}

.mm-layout-escritorio__salir {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 34px;
  padding: 0 10px;
  border-radius: v.$radio-sm;
  border: 1px solid v.$borde;
  background-color: v.$superficie;
  color: v.$tenue;
  font-size: 11.5px;
  font-weight: v.$peso-semi;
  cursor: pointer;
}

.mm-layout-escritorio__panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.mm-layout-escritorio__cabecera {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 32px;
  border-bottom: 1px solid v.$borde;
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

.mm-layout-escritorio__acciones {
  display: flex;
  align-items: center;
  gap: 14px;
}

.mm-layout-escritorio__fecha {
  font-size: 12px;
  color: v.$tenue;
  white-space: nowrap;
}

.mm-layout-escritorio__accion-rapida {
  display: inline-flex;
  align-items: center;
  min-height: 42px;
  padding: 0 18px;
  border-radius: v.$radio-sm;
  background-color: v.$acento;
  color: white;
  font-size: 13.5px;
  font-weight: v.$peso-semi;
  text-decoration: none;
  white-space: nowrap;
}

.mm-layout-escritorio__contenido {
  padding: 24px 32px 32px;
}
</style>
