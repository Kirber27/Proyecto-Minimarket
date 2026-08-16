<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'

import { useEsMovil } from '@/composables/useEsMovil'
import LayoutMovil from '@/layouts/LayoutMovil.vue'
import LayoutEscritorio from '@/layouts/LayoutEscritorio.vue'
import LayoutAuth from '@/layouts/LayoutAuth.vue'

const esMovil = useEsMovil()
const route = useRoute()

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
</template>
