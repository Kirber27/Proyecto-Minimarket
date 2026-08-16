<script setup lang="ts">
import { computed } from 'vue'

import { useSesionStore } from '@/stores/sesion'

const sesion = useSesionStore()

const todosLosDestinos = [
  { ruta: '/productos', etiqueta: 'Productos', soloDueno: true },
  { ruta: '/categorias', etiqueta: 'Categorías', soloDueno: true },
  { ruta: '/reportes', etiqueta: 'Reportes', soloDueno: true },
  { ruta: '/alertas', etiqueta: 'Alertas de stock', soloDueno: false },
  { ruta: '/deudas', etiqueta: 'Deudas', soloDueno: false },
  { ruta: '/arqueo', etiqueta: 'Arqueo', soloDueno: false },
  { ruta: '/ajustes', etiqueta: 'Ajustes', soloDueno: false },
  { ruta: '/usuarios', etiqueta: 'Usuarios', soloDueno: true },
]

const destinos = computed(() =>
  todosLosDestinos.filter(d => !d.soloDueno || sesion.esDueno),
)
</script>

<template>
  <div class="mm-pagina">
    <ul class="mm-lista-mas list-unstyled">
      <li v-for="destino in destinos" :key="destino.ruta">
        <RouterLink :to="destino.ruta" class="mm-lista-mas__enlace">
          {{ destino.etiqueta }}
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.mm-lista-mas__enlace {
  display: block;
  padding: 14px 4px;
  color: var(--mm-tinta);
  text-decoration: none;
  border-bottom: 1px solid var(--mm-borde);
  min-height: 44px;
}
</style>
