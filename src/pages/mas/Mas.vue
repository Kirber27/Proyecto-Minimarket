<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useSesionStore } from '@/stores/sesion'
import { tieneModoPinDisponible } from '@/composables/useDispositivo'
import BotonSecundario from '@/components/ui/BotonSecundario.vue'

const sesion = useSesionStore()
const router = useRouter()

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

// El sidebar de escritorio tiene su propio pie con "Salir"; en movil no hay
// donde ponerlo, asi que vive aqui, al fondo de "Mas" (unico lugar comun a
// toda la barra inferior). "Bloquear" solo aparece si ya hay un PIN
// definido en este dispositivo, mismo criterio que Ajustes.vue.
const pinListo = ref(tieneModoPinDisponible())

async function bloquear(): Promise<void> {
  sesion.bloquear()
  await router.replace('/bloqueado')
}

async function cerrarSesion(): Promise<void> {
  await sesion.cerrar()
  await router.replace('/ingresar')
}
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

    <div class="mm-lista-mas__pie">
      <BotonSecundario class="mm-lista-mas__boton" @click="cerrarSesion">
        Cerrar sesión
      </BotonSecundario>
      <BotonSecundario v-if="pinListo" class="mm-lista-mas__boton" @click="bloquear">
        Bloquear
      </BotonSecundario>
    </div>
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

.mm-lista-mas__pie {
  display: flex;
  gap: 10px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--mm-borde);
}

.mm-lista-mas__boton {
  flex: 1;
}
</style>
