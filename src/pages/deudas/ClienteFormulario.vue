<script setup lang="ts">
import { ref } from 'vue'

import * as clienteService from '@/services/clienteService'
import { ErrorDominio } from '@/lib/errorDominio'
import type { Cliente } from '@/types/dominio'
import ModalBase from '@/components/ui/ModalBase.vue'
import CampoTexto from '@/components/ui/CampoTexto.vue'
import BotonPrimario from '@/components/ui/BotonPrimario.vue'

const props = defineProps<{
  cliente: Cliente | null
}>()

const emit = defineEmits<{
  cerrar: []
  guardado: [cliente: Cliente]
}>()

const nombre = ref(props.cliente?.nombre ?? '')
const telefono = ref(props.cliente?.telefono ?? '')
const nota = ref(props.cliente?.nota ?? '')
const error = ref('')
const advertenciaHomonimo = ref('')
const guardando = ref(false)

const esEdicion = props.cliente !== null

async function guardar(): Promise<void> {
  error.value = ''

  if (!nombre.value.trim()) {
    error.value = 'El nombre es obligatorio.'
    return
  }

  // Requisito 1.3: se advierte pero se permite guardar (hay homónimos reales).
  if (!esEdicion && !advertenciaHomonimo.value) {
    const existentes = await clienteService.buscarHomonimos(nombre.value)
    if (existentes.length > 0) {
      advertenciaHomonimo.value = `Ya existe un cliente llamado "${nombre.value.trim()}". Si es otra persona, toca guardar de nuevo para confirmar.`
      return
    }
  }

  guardando.value = true
  try {
    const input = { nombre: nombre.value, telefono: telefono.value, nota: nota.value }
    const guardado = esEdicion
      ? await clienteService.actualizar(props.cliente!.id, input)
      : await clienteService.crear(input)
    emit('guardado', guardado)
  } catch (err) {
    error.value =
      err instanceof ErrorDominio ? err.message : 'No se pudo guardar el cliente.'
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <ModalBase
    :titulo="esEdicion ? 'Editar cliente' : 'Nuevo cliente'"
    @cerrar="emit('cerrar')"
  >
    <form class="mm-cliente-form" @submit.prevent="guardar">
      <CampoTexto v-model="nombre" etiqueta="Nombre" placeholder="Nombre del cliente" />
      <CampoTexto
        v-model="telefono"
        etiqueta="Teléfono (opcional)"
        placeholder="0412-1234567"
      />
      <CampoTexto v-model="nota" etiqueta="Nota (opcional)" />

      <p v-if="advertenciaHomonimo" class="mm-cliente-form__advertencia">
        {{ advertenciaHomonimo }}
      </p>
      <p v-if="error" class="mm-cliente-form__error" role="alert">{{ error }}</p>

      <BotonPrimario type="submit" :cargando="guardando">Guardar</BotonPrimario>
    </form>
  </ModalBase>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-cliente-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mm-cliente-form__advertencia {
  margin: 0;
  font-size: v.$tam-etiqueta;
  color: v.$aviso;
  background-color: v.$aviso-bg;
  border-radius: v.$radio-sm;
  padding: 10px 12px;
}

.mm-cliente-form__error {
  margin: 0;
  color: v.$error;
  font-size: v.$tam-etiqueta;
}
</style>
