<script setup lang="ts">
import { computed, ref } from 'vue'

import * as inventarioService from '@/services/inventarioService'
import { aCentavos, aUsd } from '@/lib/money'
import { ErrorDominio } from '@/lib/errorDominio'
import { notificar } from '@/composables/useNotificaciones'
import type { Producto } from '@/types/dominio'
import ModalBase from '@/components/ui/ModalBase.vue'
import CampoTexto from '@/components/ui/CampoTexto.vue'
import CampoNumero from '@/components/ui/CampoNumero.vue'
import BotonPrimario from '@/components/ui/BotonPrimario.vue'

const props = defineProps<{
  producto: Producto
  cantidadSugerida?: number
}>()

const emit = defineEmits<{
  cerrar: []
  repuesto: []
}>()

const cantidad = ref<number | null>(props.cantidadSugerida ?? null)
const costoUnitario = ref<number | null>(
  props.producto.costoUsd !== null ? aUsd(props.producto.costoUsd) : null,
)
const proveedor = ref('')
const actualizarCosto = ref(false)
const error = ref('')
const enviando = ref(false)

const costoDifiere = computed(() => {
  if (costoUnitario.value === null) return false
  const actual = props.producto.costoUsd !== null ? aUsd(props.producto.costoUsd) : null
  return actual === null || Math.abs(actual - costoUnitario.value) > 0.001
})

async function confirmar(): Promise<void> {
  error.value = ''
  if (!cantidad.value || cantidad.value <= 0) {
    error.value = 'Indica una cantidad mayor a cero.'
    return
  }

  enviando.value = true
  try {
    await inventarioService.reponer({
      productoId: props.producto.id,
      cantidad: cantidad.value,
      costoUnitarioUsd:
        costoUnitario.value !== null ? aCentavos(costoUnitario.value) : null,
      actualizarCosto: costoDifiere.value && actualizarCosto.value,
      proveedor: proveedor.value,
    })
    notificar(`Reposición registrada: +${cantidad.value} ${props.producto.nombre}`)
    emit('repuesto')
  } catch (err) {
    error.value = err instanceof ErrorDominio ? err.message : 'No se pudo reponer.'
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <ModalBase :titulo="`Reponer: ${producto.nombre}`" @cerrar="emit('cerrar')">
    <form class="mm-reposicion" @submit.prevent="confirmar">
      <p v-if="cantidadSugerida" class="mm-reposicion__sugerencia">
        Sugerido: {{ cantidadSugerida }}
        {{ producto.unidadMedida === 'KG' ? 'kg' : 'u.' }}
        (15 días de cobertura según lo vendido)
      </p>

      <CampoNumero
        v-model="cantidad"
        etiqueta="Cantidad que entra"
        :step="producto.unidadMedida === 'KG' ? 0.001 : 1"
        :min="0"
      />

      <CampoNumero
        v-model="costoUnitario"
        etiqueta="Costo unitario (USD, opcional)"
        :step="0.01"
        :min="0"
      />

      <label v-if="costoDifiere" class="mm-reposicion__checkbox">
        <input v-model="actualizarCosto" type="checkbox" />
        Actualizar el costo del producto a este valor
      </label>

      <CampoTexto v-model="proveedor" etiqueta="Proveedor (opcional)" />

      <p v-if="error" class="mm-reposicion__error" role="alert">{{ error }}</p>

      <BotonPrimario type="submit" :cargando="enviando"
        >Confirmar reposición</BotonPrimario
      >
    </form>
  </ModalBase>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-reposicion {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mm-reposicion__sugerencia {
  margin: 0;
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
  background-color: v.$acento-suave;
  border-radius: v.$radio-sm;
  padding: 10px 12px;
}

.mm-reposicion__checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: v.$tam-cuerpo;
}

.mm-reposicion__error {
  margin: 0;
  color: v.$error;
  font-size: v.$tam-etiqueta;
}
</style>
