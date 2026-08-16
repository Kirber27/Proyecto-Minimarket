<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'

import { useEsMovil } from '@/composables/useEsMovil'
import { useNotificaciones } from '@/composables/useNotificaciones'
import LayoutMovil from '@/layouts/LayoutMovil.vue'
import LayoutEscritorio from '@/layouts/LayoutEscritorio.vue'
import LayoutAuth from '@/layouts/LayoutAuth.vue'
import AvisoToast from '@/components/ui/AvisoToast.vue'

const esMovil = useEsMovil()
const route = useRoute()
const { notificaciones, quitar } = useNotificaciones()

const layout = computed(() => {
  if (route.meta.layout === 'auth') return LayoutAuth
  return esMovil.value ? LayoutMovil : LayoutEscritorio
})
</script>

<template>
  <component :is="layout">
    <RouterView v-slot="{ Component, route: rutaActiva }">
      <KeepAlive :include="['VentaNueva']">
        <component :is="Component" :key="rutaActiva.path" />
      </KeepAlive>
    </RouterView>
  </component>

  <AvisoToast
    v-for="notificacion in notificaciones"
    :key="notificacion.id"
    :mensaje="notificacion.mensaje"
    @cerrar="quitar(notificacion.id)"
  />
</template>
