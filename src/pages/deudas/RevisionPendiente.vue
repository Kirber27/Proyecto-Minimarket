<script setup lang="ts">
import { onMounted, ref } from 'vue'

import * as clienteService from '@/services/clienteService'
import { aCentavos, formatearUsd } from '@/lib/money'
import { ErrorDominio } from '@/lib/errorDominio'
import { notificar } from '@/composables/useNotificaciones'
import type { DeudaPorRevisar } from '@/types/dominio'
import ModalBase from '@/components/ui/ModalBase.vue'
import CampoNumero from '@/components/ui/CampoNumero.vue'
import BotonPrimario from '@/components/ui/BotonPrimario.vue'
import BotonSecundario from '@/components/ui/BotonSecundario.vue'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'

const emit = defineEmits<{
  cerrar: []
  cambiado: []
}>()

const pendientes = ref<DeudaPorRevisar[]>([])
const cargando = ref(true)
const montos = ref<Record<number, number | null>>({})
const enviando = ref<number | null>(null)
const error = ref('')

async function cargar(): Promise<void> {
  cargando.value = true
  try {
    pendientes.value = await clienteService.listarPendientesRevision()
  } catch (err) {
    notificar(err instanceof ErrorDominio ? err.message : 'No se pudo cargar la bandeja.')
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

async function confirmar(item: DeudaPorRevisar): Promise<void> {
  error.value = ''
  const monto = montos.value[item.id]
  if (!monto || monto <= 0) {
    error.value = 'Captura el monto que confirma antes de guardar.'
    return
  }

  enviando.value = item.id
  try {
    await clienteService.resolverRevision(item.id, monto)
    notificar(`Deuda confirmada: ${formatearUsd(aCentavos(monto))}`)
    pendientes.value = pendientes.value.filter(p => p.id !== item.id)
    emit('cambiado')
  } catch (err) {
    error.value =
      err instanceof ErrorDominio ? err.message : 'No se pudo confirmar la deuda.'
  } finally {
    enviando.value = null
  }
}

async function descartar(item: DeudaPorRevisar): Promise<void> {
  enviando.value = item.id
  try {
    await clienteService.descartarRevision(item.id)
    notificar('Registro descartado')
    pendientes.value = pendientes.value.filter(p => p.id !== item.id)
    emit('cambiado')
  } catch (err) {
    notificar(err instanceof ErrorDominio ? err.message : 'No se pudo descartar.')
  } finally {
    enviando.value = null
  }
}
</script>

<template>
  <ModalBase titulo="Deudas pendientes de revisión" @cerrar="emit('cerrar')">
    <div class="mm-revision">
      <p class="mm-revision__ayuda">
        Estas notas vienen de la planilla del Excel, escritas a mano. Nadie adivinó el
        monto: revísalas y captura lo que corresponda, o descártalas si ya no aplican.
      </p>

      <EstadoVacio
        v-if="!cargando && pendientes.length === 0"
        titulo="Nada por revisar"
        descripcion="Ya se confirmaron o descartaron todas las notas del Excel."
      />

      <ul v-else class="mm-revision__lista list-unstyled">
        <li v-for="item in pendientes" :key="item.id" class="mm-revision__item">
          <p class="mm-revision__cliente">
            {{ item.clienteNombre }}
            <span class="mm-revision__negocio">{{ item.unidadNegocio }}</span>
          </p>
          <p class="mm-revision__nota">
            Anotado en la planilla: «{{ item.notaOriginal }}»
          </p>

          <div class="mm-revision__accion">
            <CampoNumero
              v-model="montos[item.id]"
              etiqueta="Monto confirmado (USD)"
              :step="0.01"
              :min="0"
            />
            <div class="mm-revision__botones">
              <BotonPrimario :cargando="enviando === item.id" @click="confirmar(item)">
                Confirmar deuda
              </BotonPrimario>
              <BotonSecundario :cargando="enviando === item.id" @click="descartar(item)">
                Descartar
              </BotonSecundario>
            </div>
          </div>
        </li>
      </ul>

      <p v-if="error" class="mm-revision__error" role="alert">{{ error }}</p>
    </div>
  </ModalBase>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-revision {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mm-revision__ayuda {
  margin: 0;
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
}

.mm-revision__lista {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 60vh;
  overflow-y: auto;
}

.mm-revision__item {
  padding: 14px;
  border: 1px solid v.$borde;
  border-radius: v.$radio-md;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mm-revision__cliente {
  margin: 0;
  font-weight: v.$peso-semi;
  display: flex;
  align-items: center;
  gap: 8px;
}

.mm-revision__negocio {
  font-size: 11px;
  font-weight: v.$peso-semi;
  color: v.$tenue;
  border: 1px solid v.$borde;
  border-radius: v.$radio-sm;
  padding: 1px 6px;
  text-transform: capitalize;
}

.mm-revision__nota {
  margin: 0;
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
  font-style: italic;
}

.mm-revision__accion {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mm-revision__botones {
  display: flex;
  gap: 8px;
}

.mm-revision__error {
  margin: 0;
  color: v.$error;
  font-size: v.$tam-etiqueta;
}
</style>
