<script setup lang="ts">
import { computed, ref } from 'vue'

import { useCatalogoStore } from '@/stores/catalogo'
import * as catalogoService from '@/services/catalogoService'
import { aCentavos, aUsd, type Centavos } from '@/lib/money'
import { generarSlug } from '@/lib/slug'
import { ErrorDominio } from '@/lib/errorDominio'
import type { Producto, UnidadMedida, UnidadNegocio } from '@/types/dominio'
import ModalBase from '@/components/ui/ModalBase.vue'
import CampoTexto from '@/components/ui/CampoTexto.vue'
import CampoNumero from '@/components/ui/CampoNumero.vue'
import BotonPrimario from '@/components/ui/BotonPrimario.vue'

const props = defineProps<{
  producto: Producto | null
}>()

const emit = defineEmits<{
  cerrar: []
  guardado: [producto: Producto]
}>()

const catalogo = useCatalogoStore()

const nombre = ref(props.producto?.nombre ?? '')
const categoriaId = ref(props.producto?.categoriaId ?? catalogo.categorias[0]?.id ?? '')
const sku = ref(props.producto?.sku ?? '')
const unidadNegocio = ref<UnidadNegocio>(props.producto?.unidadNegocio ?? 'bodega')
const unidadMedida = ref<UnidadMedida>(props.producto?.unidadMedida ?? 'UND')
const precioVenta = ref<number | null>(
  props.producto ? aUsd(props.producto.precioVentaUsd) : null,
)
const costo = ref<number | null>(
  props.producto?.costoUsd != null ? aUsd(props.producto.costoUsd) : null,
)
const stockActual = ref<number | null>(props.producto?.stockActual ?? 0)
const stockMinimo = ref<number | null>(props.producto?.stockMinimo ?? 5)
const activo = ref(props.producto?.activo ?? true)

const error = ref('')
const guardando = ref(false)

const esEdicion = computed(() => props.producto !== null)

const margen = computed(() => {
  if (precioVenta.value === null || costo.value === null || precioVenta.value === 0)
    return null
  return ((precioVenta.value - costo.value) / precioVenta.value) * 100
})

async function guardar(): Promise<void> {
  error.value = ''

  if (!nombre.value.trim() || precioVenta.value === null) {
    error.value = 'Falta nombre o precio de venta'
    return
  }

  const skuFinal = sku.value.trim() || generarSlug(nombre.value)

  const conflicto = await catalogoService.buscarConflictoDeSku(
    skuFinal,
    props.producto?.id,
  )
  if (conflicto) {
    error.value = `El SKU "${skuFinal}" ya lo usa "${conflicto.nombre}".`
    return
  }

  guardando.value = true
  try {
    const precioCentavos: Centavos = aCentavos(precioVenta.value)
    const costoCentavos: Centavos | null =
      costo.value === null ? null : aCentavos(costo.value)

    const producto = await catalogo.guardar(
      {
        nombre: nombre.value.trim(),
        categoriaId: categoriaId.value,
        sku: skuFinal,
        unidadNegocio: unidadNegocio.value,
        unidadMedida: unidadMedida.value,
        precioVentaUsd: precioCentavos,
        costoUsd: costoCentavos,
        stockActual: stockActual.value ?? 0,
        stockMinimo: stockMinimo.value ?? (unidadMedida.value === 'KG' ? 1 : 5),
        activo: activo.value,
      },
      props.producto?.id,
    )
    emit('guardado', producto)
  } catch (err) {
    error.value =
      err instanceof ErrorDominio ? err.message : 'No se pudo guardar el producto.'
  } finally {
    guardando.value = false
  }
}

async function desactivar(): Promise<void> {
  if (!props.producto) return
  guardando.value = true
  try {
    await catalogo.desactivar(props.producto.id)
    emit('cerrar')
  } catch (err) {
    error.value = err instanceof ErrorDominio ? err.message : 'No se pudo desactivar.'
  } finally {
    guardando.value = false
  }
}

function formatearMargen(valor: number): string {
  return `${valor.toFixed(1)}%`
}
</script>

<template>
  <ModalBase
    :titulo="esEdicion ? 'Editar producto' : 'Nuevo producto'"
    @cerrar="emit('cerrar')"
  >
    <form class="mm-form-producto" @submit.prevent="guardar">
      <CampoTexto v-model="nombre" etiqueta="Nombre" placeholder="Harina P.A.N" />

      <div class="mm-form-producto__campo">
        <label class="mm-form-producto__etiqueta" for="categoria">Categoría</label>
        <select id="categoria" v-model="categoriaId" class="mm-form-producto__select">
          <option v-for="cat in catalogo.categorias" :key="cat.id" :value="cat.id">
            {{ cat.nombre }}
          </option>
        </select>
      </div>

      <CampoTexto
        v-model="sku"
        etiqueta="SKU (opcional)"
        placeholder="se genera del nombre"
      />

      <div class="mm-form-producto__fila">
        <CampoNumero
          v-model="precioVenta"
          etiqueta="Precio de venta (USD)"
          :step="0.01"
          :min="0"
        />
        <CampoNumero
          v-model="costo"
          etiqueta="Costo (USD, opcional)"
          :step="0.01"
          :min="0"
        />
      </div>

      <p class="mm-form-producto__margen">
        Margen:
        <span v-if="margen === null">— (completa el costo para calcularlo)</span>
        <span v-else :class="{ 'mm-form-producto__margen--negativo': margen < 0 }">
          {{ formatearMargen(margen) }}
          <template v-if="margen < 0">· el precio queda por debajo del costo</template>
        </span>
      </p>

      <div class="mm-form-producto__fila">
        <CampoNumero
          v-model="stockActual"
          etiqueta="Stock actual"
          :step="unidadMedida === 'KG' ? 0.001 : 1"
        />
        <CampoNumero
          v-model="stockMinimo"
          etiqueta="Stock mínimo"
          :step="unidadMedida === 'KG' ? 0.001 : 1"
        />
      </div>

      <div class="mm-form-producto__fila">
        <div class="mm-form-producto__campo">
          <label class="mm-form-producto__etiqueta" for="unidad-medida">Unidad</label>
          <select
            id="unidad-medida"
            v-model="unidadMedida"
            class="mm-form-producto__select"
          >
            <option value="UND">Unidad</option>
            <option value="KG">Kilogramo</option>
            <option value="LITRO">Litro</option>
            <option value="PACK">Pack</option>
          </select>
        </div>

        <div class="mm-form-producto__campo">
          <label class="mm-form-producto__etiqueta" for="negocio"
            >Unidad de negocio</label
          >
          <select id="negocio" v-model="unidadNegocio" class="mm-form-producto__select">
            <option value="bodega">Bodega</option>
            <option value="cerveza">Cerveza</option>
            <option value="thais">Thais</option>
          </select>
        </div>
      </div>

      <label class="mm-form-producto__activo">
        <input v-model="activo" type="checkbox" />
        Activo (visible en la venta)
      </label>

      <p v-if="error" class="mm-form-producto__error" role="alert">{{ error }}</p>

      <div class="mm-form-producto__acciones">
        <BotonPrimario type="submit" :cargando="guardando">Guardar</BotonPrimario>
        <button
          v-if="esEdicion && producto?.activo"
          type="button"
          class="mm-form-producto__desactivar"
          @click="desactivar"
        >
          Desactivar producto
        </button>
      </div>
    </form>
  </ModalBase>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-form-producto {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mm-form-producto__fila {
  display: grid;
  // minmax(0, 1fr), no 1fr a secas: sin el minimo en 0, el track no se
  // encoge mas alla del ancho intrinseco del <input>/<select> que
  // contiene, y en el modal movil (mas angosto que ese minimo) el grid se
  // desborda del panel en vez de repartir el espacio disponible.
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}

.mm-form-producto__campo {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mm-form-producto__etiqueta {
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-semi;
  color: v.$tenue;
}

.mm-form-producto__select {
  min-height: v.$objetivo-tactil-min;
  padding: 0 14px;
  border: 1px solid v.$borde;
  border-radius: v.$radio-md;
  background-color: v.$superficie;
  font-size: v.$tam-cuerpo;
}

.mm-form-producto__margen {
  margin: 0;
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
}

.mm-form-producto__margen--negativo {
  color: v.$error;
  font-weight: v.$peso-semi;
}

.mm-form-producto__activo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: v.$tam-cuerpo;
}

.mm-form-producto__error {
  margin: 0;
  color: v.$error;
  font-size: v.$tam-etiqueta;
}

.mm-form-producto__acciones {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.mm-form-producto__desactivar {
  background: none;
  border: none;
  color: v.$error;
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-semi;
  cursor: pointer;
}
</style>
