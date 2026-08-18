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

const categoriaPorId = computed(() => new Map(catalogo.categorias.map(c => [c.id, c])))

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
      <h2 class="mm-venta__titulo-filtros">Filtros de búsqueda</h2>
      <CampoTexto
        v-model="textoBusqueda"
        etiqueta="Busca acá tu producto"
        placeholder="Nombre o SKU"
      />
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
        :matiz="categoriaPorId.get(producto.categoriaId)?.matiz ?? 265"
        :cantidad-en-carrito="carrito.cantidadEnCarrito(producto.id)"
        @agregar="alAgregar"
        @establecer-cantidad="alEstablecerCantidad"
      />
    </div>

    <PanelCarrito @venta-confirmada="alConfirmar" />

    <Transition name="mm-panel-exito">
      <div v-if="ventaConfirmada" class="mm-venta__exito-fondo" role="status">
        <div class="mm-venta__exito">
          <div class="mm-venta__exito-circulo" aria-hidden="true">
            <svg
              width="34"
              height="34"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path class="mm-venta__exito-check" d="M5 13l4.5 4.5L19 7" />
            </svg>
          </div>
          <p class="mm-venta__exito-titulo">Venta registrada</p>
          <p class="mm-venta__exito-total">
            {{ formatearUsd(ventaConfirmada.totalUsd) }}
          </p>
          <p class="mm-venta__exito-detalle">{{ ventaConfirmada.unidades }} unidad(es)</p>
        </div>
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

.mm-venta__titulo-filtros {
  margin: 0 0 8px;
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-negrita;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: v.$tenue;
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

.mm-venta__exito-fondo {
  position: fixed;
  inset: 0;
  background-color: rgba(20, 22, 40, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  z-index: 100;
}

.mm-venta__exito {
  background-color: v.$superficie;
  border-radius: v.$radio-xl;
  padding: 32px 26px;
  text-align: center;
  width: 100%;
  max-width: 320px;
  animation: mm-venta-exito-pop 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2);
}

.mm-venta__exito-circulo {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background-color: v.$ok-bg;
  color: v.$ok;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mm-venta__exito-check {
  stroke-dasharray: 40;
  animation: mm-venta-exito-check 0.45s 0.12s ease-out both;
}

.mm-venta__exito-titulo {
  font-weight: v.$peso-extra;
  color: v.$tinta;
  margin: 0 0 6px;
}

.mm-venta__exito-total {
  font-size: v.$tam-cifra-grande;
  font-weight: v.$peso-extra;
  color: v.$acento;
  margin: 0 0 8px;
}

.mm-venta__exito-detalle {
  color: v.$tenue;
  margin: 0;
}

.mm-panel-exito-enter-active,
.mm-panel-exito-leave-active {
  transition: opacity 0.2s ease;
}

.mm-panel-exito-enter-from,
.mm-panel-exito-leave-to {
  opacity: 0;
}

@keyframes mm-venta-exito-pop {
  0% {
    transform: scale(0.6);
    opacity: 0;
  }
  60% {
    transform: scale(1.06);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes mm-venta-exito-check {
  from {
    stroke-dashoffset: 40;
  }
  to {
    stroke-dashoffset: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mm-venta__exito {
    animation: none;
  }

  .mm-venta__exito-check {
    animation: none;
    stroke-dashoffset: 0;
  }
}
</style>
