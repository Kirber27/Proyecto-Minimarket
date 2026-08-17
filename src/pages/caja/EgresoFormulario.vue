<script setup lang="ts">
import { computed, ref } from 'vue'

import { useSesionStore } from '@/stores/sesion'
import { useCatalogoStore } from '@/stores/catalogo'
import { useTasaStore } from '@/stores/tasa'
import * as cajaService from '@/services/cajaService'
import { ETIQUETAS_METODO } from '@/lib/metodosPago'
import { ErrorDominio } from '@/lib/errorDominio'
import { notificar } from '@/composables/useNotificaciones'
import type { CategoriaEgreso, MetodoPago } from '@/types/dominio'
import ModalBase from '@/components/ui/ModalBase.vue'
import CampoTexto from '@/components/ui/CampoTexto.vue'
import CampoNumero from '@/components/ui/CampoNumero.vue'
import BotonPrimario from '@/components/ui/BotonPrimario.vue'

const emit = defineEmits<{
  cerrar: []
  registrado: []
}>()

const OPCIONES_CATEGORIA: {
  valor: CategoriaEgreso
  etiqueta: string
  soloDueno?: boolean
}[] = [
  { valor: 'proveedor', etiqueta: 'Proveedor' },
  { valor: 'insumos', etiqueta: 'Insumos' },
  { valor: 'servicios', etiqueta: 'Servicios' },
  { valor: 'sueldos', etiqueta: 'Sueldos', soloDueno: true },
  { valor: 'retiro', etiqueta: 'Retiro', soloDueno: true },
  { valor: 'otro', etiqueta: 'Otro' },
]

const METODOS: MetodoPago[] = [
  'efectivo-ves',
  'efectivo-usd',
  'punto',
  'pago-movil',
  'biopago',
]

const sesion = useSesionStore()
const catalogo = useCatalogoStore()
const tasa = useTasaStore()

const descripcion = ref('')
const moneda = ref<'USD' | 'VES'>('USD')
const montoUsd = ref<number | null>(null)
const montoVes = ref<number | null>(null)
const categoria = ref<CategoriaEgreso>('otro')
const metodo = ref<MetodoPago>('efectivo-usd')
const referencia = ref('')
const error = ref('')
const enviando = ref(false)

// Requisito 2.7: la restriccion real vive en la RLS; ocultar las opciones
// aqui es solo cortesia de la interfaz.
const opcionesCategoria = computed(() =>
  OPCIONES_CATEGORIA.filter(o => !o.soloDueno || sesion.esDueno),
)

async function guardar(): Promise<void> {
  error.value = ''

  const monto =
    moneda.value === 'USD' ? montoUsd.value : (montoVes.value ?? 0) / (tasa.valor ?? 1)

  // Requisito 2.3: mensaje exacto.
  if (!descripcion.value.trim() || !monto || monto <= 0) {
    error.value = 'Completa descripción y monto.'
    return
  }
  if (tasa.valor === null) {
    error.value = 'Registra la tasa del día antes de registrar egresos.'
    return
  }

  enviando.value = true
  try {
    await cajaService.registrarEgreso({
      unidadNegocio: catalogo.negocio,
      descripcion: descripcion.value.trim(),
      montoUsd: monto,
      tasaAplicada: tasa.valor,
      categoria: categoria.value,
      metodo: metodo.value,
      referencia: referencia.value.trim() || null,
    })
    notificar('Egreso registrado')
    emit('registrado')
  } catch (err) {
    error.value =
      err instanceof ErrorDominio ? err.message : 'No se pudo registrar el egreso.'
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <ModalBase titulo="Registrar egreso" @cerrar="emit('cerrar')">
    <form class="mm-egreso" @submit.prevent="guardar">
      <CampoTexto
        v-model="descripcion"
        etiqueta="Descripción"
        placeholder="Qué se pagó"
      />

      <div class="mm-egreso__moneda" role="group" aria-label="Moneda del egreso">
        <button
          type="button"
          class="mm-egreso__moneda-boton"
          :class="{ 'mm-egreso__moneda-boton--activo': moneda === 'USD' }"
          @click="moneda = 'USD'"
        >
          Dólares
        </button>
        <button
          type="button"
          class="mm-egreso__moneda-boton"
          :class="{ 'mm-egreso__moneda-boton--activo': moneda === 'VES' }"
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
      <p v-if="moneda === 'VES' && montoVes && tasa.valor" class="mm-egreso__equivalente">
        ≈ ${{ (montoVes / tasa.valor).toFixed(2) }}
      </p>

      <div class="mm-egreso__campo">
        <label class="mm-egreso__etiqueta" for="categoria-egreso">Categoría</label>
        <select id="categoria-egreso" v-model="categoria" class="mm-egreso__select">
          <option v-for="op in opcionesCategoria" :key="op.valor" :value="op.valor">
            {{ op.etiqueta }}
          </option>
        </select>
      </div>

      <div class="mm-egreso__campo">
        <label class="mm-egreso__etiqueta" for="metodo-egreso">Método de pago</label>
        <select id="metodo-egreso" v-model="metodo" class="mm-egreso__select">
          <option v-for="m in METODOS" :key="m" :value="m">
            {{ ETIQUETAS_METODO[m] }}
          </option>
        </select>
      </div>

      <CampoTexto v-model="referencia" etiqueta="Nota o número de factura (opcional)" />

      <p v-if="error" class="mm-egreso__error" role="alert">{{ error }}</p>

      <BotonPrimario type="submit" :cargando="enviando">Registrar egreso</BotonPrimario>
    </form>
  </ModalBase>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-egreso {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mm-egreso__moneda {
  display: flex;
  gap: 8px;
}

.mm-egreso__moneda-boton {
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

.mm-egreso__equivalente {
  margin: -8px 0 0;
  font-size: 12px;
  color: v.$tenue;
}

.mm-egreso__campo {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mm-egreso__etiqueta {
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-semi;
  color: v.$tenue;
}

.mm-egreso__select {
  min-height: v.$objetivo-tactil-min;
  padding: 0 14px;
  border: 1px solid v.$borde;
  border-radius: v.$radio-md;
  background-color: v.$superficie;
  font-size: v.$tam-cuerpo;
}

.mm-egreso__error {
  margin: 0;
  color: v.$error;
  font-size: v.$tam-etiqueta;
}
</style>
