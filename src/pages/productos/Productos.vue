<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { useCatalogoStore } from '@/stores/catalogo'
import { useSesionStore } from '@/stores/sesion'
import { useEsMovil } from '@/composables/useEsMovil'
import { useDebounced } from '@/composables/useDebounced'
import { useListaVirtual } from '@/composables/useListaVirtual'
import TarjetaProducto from '@/components/dominio/TarjetaProducto.vue'
import FilaProducto from '@/components/dominio/FilaProducto.vue'
import ChipFiltro from '@/components/ui/ChipFiltro.vue'
import CampoTexto from '@/components/ui/CampoTexto.vue'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import BotonPrimario from '@/components/ui/BotonPrimario.vue'
import ProductoFormulario from '@/pages/productos/ProductoFormulario.vue'
import type { Producto } from '@/types/dominio'

const UMBRAL_VIRTUALIZACION = 100
const ALTURA_TARJETA = 92
const ALTURA_FILA = 56

const catalogo = useCatalogoStore()
const sesion = useSesionStore()
const esMovil = useEsMovil()

const textoBusqueda = ref('')
const textoBusquedaDebounced = useDebounced(textoBusqueda, 150)
const categoriaFiltro = ref('todas')
const orden = ref<'nombre' | 'stock'>('nombre')

const modalAbierto = ref(false)
const productoEditando = ref<Producto | null>(null)

onMounted(() => {
  void catalogo.cargar()
})

const resultados = computed(() => {
  const filtrados = catalogo.buscar(textoBusquedaDebounced.value, categoriaFiltro.value)
  return [...filtrados].sort((a, b) =>
    orden.value === 'stock'
      ? a.stockActual - b.stockActual
      : a.nombre.localeCompare(b.nombre, 'es'),
  )
})

const categoriaPorId = computed(() => new Map(catalogo.categorias.map(c => [c.id, c])))

const usarVirtualizacion = computed(() => resultados.value.length > UMBRAL_VIRTUALIZACION)
const virtualMovil = useListaVirtual(resultados, ALTURA_TARJETA)
const virtualEscritorio = useListaVirtual(resultados, ALTURA_FILA)

function limpiarFiltros(): void {
  textoBusqueda.value = ''
  categoriaFiltro.value = 'todas'
}

function abrirNuevo(): void {
  productoEditando.value = null
  modalAbierto.value = true
}

function abrirEdicion(producto: Producto): void {
  if (!sesion.esDueno) return
  productoEditando.value = producto
  modalAbierto.value = true
}

function alGuardar(): void {
  modalAbierto.value = false
}
</script>

<template>
  <div class="mm-productos">
    <div
      class="mm-productos__filtros"
      :class="{ 'mm-productos__filtros--sin-ajustar': !sesion.esDueno }"
    >
      <BotonPrimario
        v-if="sesion.esDueno"
        class="mm-productos__ajustar"
        @click="abrirNuevo"
      >
        Nuevo producto
      </BotonPrimario>

      <CampoTexto
        v-model="textoBusqueda"
        etiqueta="Buscar"
        placeholder="Nombre, SKU o categoría"
        class="mm-productos__buscador"
      />

      <div class="mm-productos__chips">
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

      <div class="mm-productos__orden" role="group" aria-label="Ordenar por">
        <button
          type="button"
          class="mm-productos__boton-orden mm-productos__boton-orden--stock"
          :class="{ 'mm-productos__boton-orden--activo': orden === 'stock' }"
          @click="orden = 'stock'"
        >
          Stock
        </button>
        <button
          type="button"
          class="mm-productos__boton-orden mm-productos__boton-orden--nombre"
          :class="{ 'mm-productos__boton-orden--activo': orden === 'nombre' }"
          aria-label="Ordenar alfabéticamente"
          @click="orden = 'nombre'"
        >
          A-Z
        </button>
      </div>
    </div>

    <EstadoVacio
      v-if="resultados.length === 0"
      titulo="Ningún producto coincide"
      descripcion="Prueba con otro texto o quita los filtros."
    >
      <template #accion>
        <button type="button" class="mm-productos__limpiar" @click="limpiarFiltros">
          Limpiar filtros
        </button>
      </template>
    </EstadoVacio>

    <template v-else-if="esMovil">
      <div
        v-if="usarVirtualizacion"
        :ref="el => (virtualMovil.refContenedor.value = el as HTMLElement | null)"
        class="mm-productos__lista-movil mm-productos__lista-movil--virtual"
      >
        <div
          :style="{ height: `${virtualMovil.alturaTotal.value}px`, position: 'relative' }"
        >
          <div
            :style="{
              transform: `translateY(${virtualMovil.offsetSuperior.value}px)`,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }"
          >
            <TarjetaProducto
              v-for="{ item: producto } in virtualMovil.visibles.value"
              :key="producto.id"
              :producto="producto"
              :categoria="categoriaPorId.get(producto.categoriaId)"
              @click="abrirEdicion"
            />
          </div>
        </div>
      </div>
      <div v-else class="mm-productos__lista-movil">
        <TarjetaProducto
          v-for="producto in resultados"
          :key="producto.id"
          :producto="producto"
          :categoria="categoriaPorId.get(producto.categoriaId)"
          @click="abrirEdicion"
        />
      </div>
    </template>

    <template v-else>
      <div class="mm-productos__tabla" role="table" aria-label="Productos">
        <div class="mm-productos__cabecera-tabla" role="row">
          <span role="columnheader">Nombre</span>
          <span role="columnheader">Categoría</span>
          <span role="columnheader">Precio</span>
          <span role="columnheader">Stock</span>
        </div>
        <div
          v-if="usarVirtualizacion"
          :ref="el => (virtualEscritorio.refContenedor.value = el as HTMLElement | null)"
          class="mm-productos__cuerpo-tabla mm-productos__cuerpo-tabla--virtual"
          role="rowgroup"
        >
          <div
            :style="{
              height: `${virtualEscritorio.alturaTotal.value}px`,
              position: 'relative',
            }"
          >
            <div
              :style="{
                transform: `translateY(${virtualEscritorio.offsetSuperior.value}px)`,
              }"
            >
              <FilaProducto
                v-for="{ item: producto } in virtualEscritorio.visibles.value"
                :key="producto.id"
                :producto="producto"
                :categoria="categoriaPorId.get(producto.categoriaId)"
                @click="abrirEdicion"
              />
            </div>
          </div>
        </div>
        <div v-else class="mm-productos__cuerpo-tabla" role="rowgroup">
          <FilaProducto
            v-for="producto in resultados"
            :key="producto.id"
            :producto="producto"
            :categoria="categoriaPorId.get(producto.categoriaId)"
            @click="abrirEdicion"
          />
        </div>
      </div>
    </template>

    <ProductoFormulario
      v-if="modalAbierto"
      :producto="productoEditando"
      @cerrar="modalAbierto = false"
      @guardado="alGuardar"
    />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;
@use '@/assets/scss/mixins' as m;

// Movil: "Nuevo producto" arriba del todo a lo ancho completo, luego
// buscador y categorias (cada uno en su propia fila), y al final Stock/A-Z
// a la mitad cada uno.
.mm-productos__filtros {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-areas:
    'ajustar ajustar'
    'buscador buscador'
    'chips chips'
    'stockbtn nombrebtn';
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;

  &--sin-ajustar {
    grid-template-areas:
      'buscador buscador'
      'chips chips'
      'stockbtn nombrebtn';
  }
}

.mm-productos__buscador {
  grid-area: buscador;
}

.mm-productos__chips {
  grid-area: chips;
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.mm-productos__ajustar {
  grid-area: ajustar;
}

// display:contents saca al wrapper del layout (sus hijos pasan a ser items
// directos del grid de arriba) pero conserva el role="group" para lectores
// de pantalla.
.mm-productos__orden {
  display: contents;
}

.mm-productos__boton-orden {
  min-height: v.$objetivo-tactil-min;
  padding: 0 12px;
  border: 1px solid v.$borde;
  border-radius: v.$radio-sm;
  background-color: v.$superficie;
  color: v.$tenue;
  font-size: v.$tam-etiqueta;
  cursor: pointer;

  &--stock {
    grid-area: stockbtn;
  }

  &--nombre {
    grid-area: nombrebtn;
  }

  &--activo {
    background-color: v.$tinta;
    color: white;
    border-color: v.$tinta;
  }
}

// Escritorio: dos filas (buscador+nuevo arriba, categorias+orden abajo),
// que es como se veia antes de comprimir todo a una sola fila en movil.
@include m.desde-escritorio {
  .mm-productos__filtros {
    grid-template-columns: 1fr auto auto;
    grid-template-areas:
      'buscador buscador ajustar'
      'chips stockbtn nombrebtn';

    &--sin-ajustar {
      grid-template-areas:
        'buscador buscador buscador'
        'chips stockbtn nombrebtn';
    }
  }

  .mm-productos__boton-orden {
    min-height: 32px;
  }
}

.mm-productos__limpiar {
  min-height: v.$objetivo-tactil-min;
  padding: 0 20px;
  border-radius: v.$radio-sm;
  border: none;
  background-color: v.$acento;
  color: white;
  font-weight: v.$peso-semi;
  cursor: pointer;
}

.mm-productos__lista-movil {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mm-productos__lista-movil--virtual {
  height: 70vh;
  overflow-y: auto;
}

.mm-productos__tabla {
  background-color: v.$superficie;
  border-radius: v.$radio-md;
  border: 1px solid v.$borde;
  overflow: hidden;
}

.mm-productos__cabecera-tabla {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 12px;
  padding: 10px 12px;
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-semi;
  color: v.$tenue;
  border-bottom: 1px solid v.$borde;
}

.mm-productos__cuerpo-tabla--virtual {
  height: 70vh;
  overflow-y: auto;
}
</style>
