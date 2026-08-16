<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { useCatalogoStore } from '@/stores/catalogo'
import { useCarritoStore } from '@/stores/carrito'
import { useTasaStore } from '@/stores/tasa'
import { useDebounced } from '@/composables/useDebounced'
import { formatearUsd } from '@/lib/money'
import type { Producto, Venta } from '@/types/dominio'
import TarjetaProductoVenta from '@/components/dominio/TarjetaProductoVenta.vue'
import PanelCarrito from '@/components/dominio/PanelCarrito.vue'
import ChipFiltro from '@/components/ui/ChipFiltro.vue'
import CampoTexto from '@/components/ui/CampoTexto.vue'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'

const catalogo = useCatalogoStore()
const carrito = useCarritoStore()
const tasa = useTasaStore()

const textoBusqueda = ref('')
const textoBusquedaDebounced = useDebounced(textoBusqueda, 150)
const categoriaFiltro = ref('todas')

const ventaConfirmada = ref<Venta | null>(null)

onMounted(() => {
  void catalogo.cargar()
  void tasa.cargar()
})

const resultados = computed(() =>
  catalogo.buscar(textoBusquedaDebounced.value, categoriaFiltro.value),
)

function alAgregar(producto: Producto, cantidad: number): void {
  carrito.agregar(producto, cantidad)
}

function alEstablecerCantidad(producto: Producto, cantidad: number): void {
  carrito.establecerCantidad(producto, cantidad)
}

function alConfirmar(venta: Venta): void {
  ventaConfirmada.value = venta
  setTimeout(() => {
    ventaConfirmada.value = null
  }, 2400)
}
</script>

<template>
  <div class="mm-venta">
    <div v-if="!tasa.disponible && !tasa.cargando" class="mm-venta__sin-tasa">
      Registra la tasa del día para poder vender.
    </div>

    <div class="mm-venta__buscador">
      <CampoTexto v-model="textoBusqueda" etiqueta="Buscar" placeholder="Nombre o SKU" />
    </div>

    <div class="mm-venta__chips">
      <ChipFiltro
        :activo="categoriaFiltro === 'todas'"
        @click="categoriaFiltro = 'todas'"
      >
        Todas
      </ChipFiltro>
      <ChipFiltro
        v-for="cat in catalogo.categorias"
        :key="cat.id"
        :activo="categoriaFiltro === cat.id"
        @click="categoriaFiltro = cat.id"
      >
        {{ cat.nombre }}
      </ChipFiltro>
    </div>

    <EstadoVacio
      v-if="resultados.length === 0"
      titulo="Ningún producto coincide"
      descripcion="Prueba con otro texto o quita los filtros."
    />

    <div v-else class="mm-venta__cuadricula">
      <TarjetaProductoVenta
        v-for="producto in resultados"
        :key="producto.id"
        :producto="producto"
        :cantidad-en-carrito="carrito.cantidadEnCarrito(producto.id)"
        @agregar="alAgregar"
        @establecer-cantidad="alEstablecerCantidad"
      />
    </div>

    <PanelCarrito @venta-confirmada="alConfirmar" />

    <Transition name="mm-panel-exito">
      <div v-if="ventaConfirmada" class="mm-venta__exito" role="status">
        <p class="mm-venta__exito-titulo">Venta registrada</p>
        <p class="mm-venta__exito-total">{{ formatearUsd(ventaConfirmada.totalUsd) }}</p>
        <p class="mm-venta__exito-detalle">{{ ventaConfirmada.unidades }} unidad(es)</p>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-venta {
  padding-bottom: 90px;
}

.mm-venta__sin-tasa {
  padding: 10px 14px;
  margin-bottom: 12px;
  border-radius: v.$radio-sm;
  background-color: v.$error-bg;
  color: v.$error;
  font-weight: v.$peso-semi;
  font-size: v.$tam-etiqueta;
}

.mm-venta__buscador {
  margin-bottom: 12px;
}

.mm-venta__chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  margin-bottom: 16px;
}

.mm-venta__cuadricula {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

@media (min-width: 768px) {
  .mm-venta__cuadricula {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 1200px) {
  .mm-venta__cuadricula {
    grid-template-columns: repeat(5, 1fr);
  }
}

.mm-venta__exito {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: v.$superficie;
  border-radius: v.$radio-lg;
  box-shadow: v.$sombra-2;
  padding: 28px 40px;
  text-align: center;
  z-index: 100;
}

.mm-venta__exito-titulo {
  font-weight: v.$peso-semi;
  color: v.$ok;
  margin: 0 0 6px;
}

.mm-venta__exito-total {
  font-size: v.$tam-cifra-grande;
  font-weight: v.$peso-extra;
  margin: 0;
}

.mm-venta__exito-detalle {
  color: v.$tenue;
  margin: 4px 0 0;
}

.mm-panel-exito-enter-active,
.mm-panel-exito-leave-active {
  transition: opacity 0.2s ease;
}

.mm-panel-exito-enter-from,
.mm-panel-exito-leave-to {
  opacity: 0;
}
</style>
