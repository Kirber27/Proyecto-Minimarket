<script setup lang="ts">
import { computed, ref } from 'vue'

import { useTasaStore } from '@/stores/tasa'
import * as clienteService from '@/services/clienteService'
import { aBolivares, aCentavos, aUsd, formatearUsd, type Centavos } from '@/lib/money'
import { ErrorDominio } from '@/lib/errorDominio'
import { notificar } from '@/composables/useNotificaciones'
import type { Cliente, MetodoPago, UnidadNegocio } from '@/types/dominio'
import ModalBase from '@/components/ui/ModalBase.vue'
import CampoNumero from '@/components/ui/CampoNumero.vue'
import BotonPrimario from '@/components/ui/BotonPrimario.vue'
import BotonSecundario from '@/components/ui/BotonSecundario.vue'

const props = defineProps<{
  cliente: Cliente
  negocio: UnidadNegocio
  saldoUsd: Centavos
}>()

const emit = defineEmits<{
  cerrar: []
  registrado: []
}>()

const METODOS: { valor: MetodoPago; etiqueta: string }[] = [
  { valor: 'efectivo-ves', etiqueta: 'Efectivo Bs.' },
  { valor: 'efectivo-usd', etiqueta: 'Efectivo $' },
  { valor: 'punto', etiqueta: 'Punto' },
  { valor: 'pago-movil', etiqueta: 'Pago móvil' },
  { valor: 'biopago', etiqueta: 'Biopago' },
]

const tasa = useTasaStore()

const moneda = ref<'USD' | 'VES'>('USD')
const montoUsd = ref<number | null>(props.saldoUsd > 0 ? aUsd(props.saldoUsd) : null)
const montoVes = ref<number | null>(
  props.saldoUsd > 0 && tasa.valor !== null
    ? aBolivares(props.saldoUsd, tasa.valor)
    : null,
)
const metodo = ref<MetodoPago>('efectivo-usd')
const error = ref('')
const enviando = ref(false)
const confirmandoExceso = ref(false)

const montoFinalUsd = computed<number>(() =>
  moneda.value === 'USD'
    ? (montoUsd.value ?? 0)
    : (montoVes.value ?? 0) / (tasa.valor ?? 1),
)

const superaSaldo = computed(() => montoFinalUsd.value > aUsd(props.saldoUsd) + 0.001)
const dejaSaldoCero = computed(
  () =>
    props.saldoUsd > 0 && Math.abs(montoFinalUsd.value - aUsd(props.saldoUsd)) < 0.001,
)

async function enviar(soloSaldo = false): Promise<void> {
  error.value = ''
  const monto = soloSaldo ? aUsd(props.saldoUsd) : montoFinalUsd.value

  if (!monto || monto <= 0) {
    error.value = 'Indica un monto mayor a cero.'
    return
  }

  // Requisito 3.3: si supera el saldo, se advierte y se ofrece elegir.
  if (superaSaldo.value && !soloSaldo && !confirmandoExceso.value) {
    confirmandoExceso.value = true
    return
  }

  enviando.value = true
  try {
    await clienteService.registrarAbono(
      props.cliente.id,
      props.negocio,
      monto,
      metodo.value,
    )
    notificar(
      dejaSaldoCero.value || soloSaldo
        ? `Deuda saldada: ${props.cliente.nombre}`
        : `Abono registrado: ${formatearUsd(aCentavos(monto))}`,
    )
    emit('registrado')
  } catch (err) {
    error.value =
      err instanceof ErrorDominio ? err.message : 'No se pudo registrar el abono.'
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <ModalBase :titulo="`Abono: ${cliente.nombre}`" @cerrar="emit('cerrar')">
    <div class="mm-abono">
      <p class="mm-abono__saldo">Debe {{ formatearUsd(saldoUsd) }}</p>

      <div class="mm-abono__moneda" role="group" aria-label="Moneda del abono">
        <button
          type="button"
          class="mm-abono__moneda-boton"
          :class="{ 'mm-abono__moneda-boton--activo': moneda === 'USD' }"
          @click="moneda = 'USD'"
        >
          Dólares
        </button>
        <button
          type="button"
          class="mm-abono__moneda-boton"
          :class="{ 'mm-abono__moneda-boton--activo': moneda === 'VES' }"
          @click="moneda = 'VES'"
        >
          Bolívares
        </button>
      </div>

      <CampoNumero
        v-if="moneda === 'USD'"
        v-model="montoUsd"
        etiqueta="Monto (USD)"
        :step="0.01"
        :min="0"
      />
      <CampoNumero v-else v-model="montoVes" etiqueta="Monto (Bs.)" :step="1" :min="0" />

      <div class="mm-abono__campo">
        <label class="mm-abono__etiqueta" for="metodo-abono">Método de pago</label>
        <select id="metodo-abono" v-model="metodo" class="mm-abono__select">
          <option v-for="m in METODOS" :key="m.valor" :value="m.valor">
            {{ m.etiqueta }}
          </option>
        </select>
      </div>

      <p v-if="confirmandoExceso" class="mm-abono__aviso">
        El monto ({{ formatearUsd(aCentavos(montoFinalUsd)) }}) supera el saldo ({{
          formatearUsd(saldoUsd)
        }}).
      </p>
      <div v-if="confirmandoExceso" class="mm-abono__aviso-acciones">
        <BotonSecundario @click="enviar(true)">Registrar solo el saldo</BotonSecundario>
        <BotonPrimario :cargando="enviando" @click="enviar(false)">
          Dejar saldo a favor
        </BotonPrimario>
      </div>

      <p v-if="error" class="mm-abono__error" role="alert">{{ error }}</p>

      <BotonPrimario
        v-if="!confirmandoExceso"
        :cargando="enviando"
        @click="enviar(false)"
      >
        Registrar abono
      </BotonPrimario>

      <p
        v-if="moneda === 'VES' && tasa.valor !== null && montoVes"
        class="mm-abono__equivalente"
      >
        ≈ {{ formatearUsd(aCentavos(montoFinalUsd)) }} a la tasa vigente
      </p>
    </div>
  </ModalBase>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-abono {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mm-abono__saldo {
  margin: 0;
  font-weight: v.$peso-semi;
  color: v.$error;
}

.mm-abono__moneda {
  display: flex;
  gap: 8px;
}

.mm-abono__moneda-boton {
  flex: 1;
  min-height: v.$objetivo-tactil-min;
  border: 1px solid v.$borde;
  border-radius: v.$radio-sm;
  background-color: v.$superficie;
  color: v.$tenue;
  font-weight: v.$peso-semi;
  cursor: pointer;

  &--activo {
    background-color: v.$tinta;
    color: white;
    border-color: v.$tinta;
  }
}

.mm-abono__campo {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mm-abono__etiqueta {
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-semi;
  color: v.$tenue;
}

.mm-abono__select {
  min-height: v.$objetivo-tactil-min;
  padding: 0 14px;
  border: 1px solid v.$borde;
  border-radius: v.$radio-md;
  background-color: v.$superficie;
  font-size: v.$tam-cuerpo;
}

.mm-abono__aviso {
  margin: 0;
  font-size: v.$tam-etiqueta;
  color: v.$aviso;
  background-color: v.$aviso-bg;
  border-radius: v.$radio-sm;
  padding: 10px 12px;
}

.mm-abono__aviso-acciones {
  display: flex;
  gap: 8px;
}

.mm-abono__error {
  margin: 0;
  color: v.$error;
  font-size: v.$tam-etiqueta;
}

.mm-abono__equivalente {
  margin: 0;
  font-size: 12px;
  color: v.$tenue;
}
</style>
