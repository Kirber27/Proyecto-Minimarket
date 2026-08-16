<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import * as clienteService from '@/services/clienteService'
import { useCatalogoStore } from '@/stores/catalogo'
import { normalizarTexto } from '@/lib/texto'
import { formatearUsd } from '@/lib/money'
import { notificar } from '@/composables/useNotificaciones'
import { ErrorDominio } from '@/lib/errorDominio'
import type { Cliente } from '@/types/dominio'
import ModalBase from '@/components/ui/ModalBase.vue'
import CampoTexto from '@/components/ui/CampoTexto.vue'
import BotonPrimario from '@/components/ui/BotonPrimario.vue'

const emit = defineEmits<{
  cerrar: []
  elegido: [cliente: Cliente]
}>()

const catalogo = useCatalogoStore()
const clientes = ref<Cliente[]>([])
const cargando = ref(true)
const texto = ref('')

onMounted(async () => {
  try {
    clientes.value = await clienteService.listarConSaldo(catalogo.negocio)
  } catch (err) {
    notificar(
      err instanceof ErrorDominio ? err.message : 'No se pudo cargar los clientes.',
    )
  } finally {
    cargando.value = false
  }
})

const filtrados = computed(() => {
  const patron = normalizarTexto(texto.value.trim())
  if (!patron) return clientes.value
  return clientes.value.filter(c => normalizarTexto(c.nombre).includes(patron))
})

const puedeCrear = computed(
  () => texto.value.trim().length > 0 && filtrados.value.length === 0 && !cargando.value,
)

async function crearYElegir(): Promise<void> {
  try {
    const nuevo = await clienteService.crearRapido(texto.value.trim())
    emit('elegido', nuevo)
  } catch (err) {
    notificar(err instanceof ErrorDominio ? err.message : 'No se pudo crear el cliente.')
  }
}
</script>

<template>
  <ModalBase titulo="Elegir cliente para fiar" @cerrar="emit('cerrar')">
    <div class="mm-selector-cliente">
      <CampoTexto v-model="texto" etiqueta="Buscar cliente" placeholder="Nombre" />

      <ul v-if="filtrados.length > 0" class="mm-selector-cliente__lista list-unstyled">
        <li v-for="cliente in filtrados" :key="cliente.id">
          <button
            type="button"
            class="mm-selector-cliente__opcion"
            @click="emit('elegido', cliente)"
          >
            <span>{{ cliente.nombre }}</span>
            <span
              v-if="cliente.saldoUsd && cliente.saldoUsd > 0"
              class="mm-selector-cliente__saldo"
            >
              Debe {{ formatearUsd(cliente.saldoUsd) }}
            </span>
          </button>
        </li>
      </ul>

      <p v-else-if="!cargando" class="mm-selector-cliente__vacio">
        Ningún cliente coincide.
      </p>

      <BotonPrimario v-if="puedeCrear" @click="crearYElegir">
        Crear "{{ texto.trim() }}" como cliente nuevo
      </BotonPrimario>
    </div>
  </ModalBase>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-selector-cliente {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mm-selector-cliente__lista {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 280px;
  overflow-y: auto;
}

.mm-selector-cliente__opcion {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: v.$objetivo-tactil-min;
  padding: 0 10px;
  border: none;
  border-radius: v.$radio-sm;
  background: none;
  text-align: left;
  cursor: pointer;

  &:hover {
    background-color: v.$acento-suave;
  }
}

.mm-selector-cliente__saldo {
  font-size: v.$tam-etiqueta;
  color: v.$error;
}

.mm-selector-cliente__vacio {
  color: v.$tenue;
  margin: 0;
}
</style>
