<script setup lang="ts">
const destinos = [
  { ruta: '/productos', etiqueta: 'Productos' },
  { ruta: '/categorias', etiqueta: 'Categorias' },
  { ruta: '/reportes', etiqueta: 'Reportes' },
  { ruta: '/alertas', etiqueta: 'Alertas de stock' },
  { ruta: '/deudas', etiqueta: 'Deudas' },
  { ruta: '/arqueo', etiqueta: 'Arqueo' },
]
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
