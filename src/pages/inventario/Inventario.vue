<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { useCatalogoStore } from '@/stores/catalogo'
import { useSesionStore } from '@/stores/sesion'
import * as inventarioService from '@/services/inventarioService'
import { useEsMovil } from '@/composables/useEsMovil'
import { useDebounced } from '@/composables/useDebounced'
import { useListaVirtual } from '@/composables/useListaVirtual'
import { normalizarTexto } from '@/lib/texto'
import { aCentavos, formatearUsd } from '@/lib/money'
import { formatearMargen } from '@/lib/margen'
import { ErrorDominio } from '@/lib/errorDominio'
import { notificar } from '@/composables/useNotificaciones'
import type { Producto, ProductoCobertura } from '@/types/dominio'
import FilaInventario from '@/components/dominio/FilaInventario.vue'
import TarjetaInventario from '@/components/dominio/TarjetaInventario.vue'
import ChipFiltro from '@/components/ui/ChipFiltro.vue'
import CampoTexto from '@/components/ui/CampoTexto.vue'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import BotonPrimario from '@/components/ui/BotonPrimario.vue'
import ProductoDetalle from '@/pages/inventario/ProductoDetalle.vue'
import AjusteStock from '@/pages/inventario/AjusteStock.vue'

const UMBRAL_VIRTUALIZACION = 100
const ALTURA_TARJETA = 108
const ALTURA_FILA = 56

const catalogo = useCatalogoStore()
const sesion = useSesionStore()
const esMovil = useEsMovil()

const textoBusqueda = ref('')
const textoBusquedaDebounced = useDebounced(textoBusqueda, 150)
const categoriaFiltro = ref('todas')
const orden = ref<'stock' | 'nombre'>('stock')

const cobertura = ref<ProductoCobertura[]>([])
const productoAbierto = ref<Producto | null>(null)
const mostrandoAjuste = ref(false)

async function cargar(): Promise<void> {
  try {
    await catalogo.cargar()
    cobertura.value = await inventarioService.listarCobertura()
  } catch (err) {
    notificar(
      err instanceof ErrorDominio ? err.message : 'No se pudo cargar el inventario.',
    )
  }
}

onMounted(cargar)

const coberturaPorId = computed(() => new Map(cobertura.value.map(c => [c.id, c])))

/** Todo el catalogo de la unidad activa, activos e inactivos (requisito 1.5). */
const productosDelNegocio = computed(() =>
  catalogo.productos.filter(p => p.unidadNegocio === catalogo.negocio),
)

const resultados = computed(() => {
  const patron = normalizarTexto(textoBusquedaDebounced.value.trim())
  const filtroCategoria = categoriaFiltro.value !== 'todas' ? categoriaFiltro.value : null

  const filtrados = productosDelNegocio.value.filter(p => {
    if (filtroCategoria && p.categoriaId !== filtroCategoria) return false
    if (!patron) return true
    const enNombre = normalizarTexto(p.nombre).includes(patron)
    const enSku = p.sku ? normalizarTexto(p.sku).includes(patron) : false
    return enNombre || enSku
  })

  return [...filtrados].sort((a, b) =>
    orden.value === 'stock'
      ? a.stockActual - b.stockActual
      : a.nombre.localeCompare(b.nombre, 'es'),
  )
})

const usarVirtualizacion = computed(() => resultados.value.length > UMBRAL_VIRTUALIZACION)
const virtualMovil = useListaVirtual(resultados, ALTURA_TARJETA)
const virtualEscritorio = useListaVirtual(resultados, ALTURA_FILA)

/** Valor del inventario a costo y a venta (requisito 1.7); el valor a costo
 * excluye productos sin costo registrado, y se indica cuántos quedan fuera. */
const resumenValor = computed(() => {
  let valorVenta = 0
  let valorCosto = 0
  let sinCosto = 0

  for (const p of productosDelNegocio.value) {
    valorVenta += (p.precioVentaUsd / 100) * p.stockActual
    if (p.costoUsd === null) {
      sinCosto += 1
    } else {
      valorCosto += (p.costoUsd / 100) * p.stockActual
    }
  }

  const margen = valorVenta > 0 ? ((valorVenta - valorCosto) / valorVenta) * 100 : null
  return { valorVenta, valorCosto, sinCosto, margen }
})

function limpiarFiltros(): void {
  textoBusqueda.value = ''
  categoriaFiltro.value = 'todas'
}

async function alCambiar(): Promise<void> {
  productoAbierto.value = null
  mostrandoAjuste.value = false
  await cargar()
}
</script>

<template>
  <div class="mm-inventario">
    <div class="mm-inventario__cabecera-valor">
      <div>
        <span class="mm-inventario__etiqueta-valor">Valor a costo</span>
        <strong>{{ formatearUsd(aCentavos(resumenValor.valorCosto)) }}</strong>
        <span v-if="resumenValor.sinCosto > 0" class="mm-inventario__nota-valor">
          ({{ resumenValor.sinCosto }} sin costo registrado, no incluidos)
        </span>
      </div>
      <div>
        <span class="mm-inventario__etiqueta-valor">Valor a venta</span>
        <strong>{{ formatearUsd(aCentavos(resumenValor.valorVenta)) }}</strong>
      </div>
      <div>
        <span class="mm-inventario__etiqueta-valor">Margen</span>
        <strong>{{ formatearMargen(resumenValor.margen) }}</strong>
      </div>
    </div>

    <div class="mm-inventario__barra-superior">
      <CampoTexto
        v-model="textoBusqueda"
        etiqueta="Buscar"
        placeholder="Nombre o SKU"
        class="mm-inventario__buscador"
      />
      <BotonPrimario v-if="sesion.esDueno" @click="mostrandoAjuste = true"
        >Ajustar stock</BotonPrimario
      >
    </div>

    <div class="mm-inventario__filtros">
      <div class="mm-inventario__chips">
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

      <div class="mm-inventario__orden" role="group" aria-label="Ordenar por">
        <button
          type="button"
          class="mm-inventario__boton-orden"
          :class="{ 'mm-inventario__boton-orden--activo': orden === 'stock' }"
          @click="orden = 'stock'"
        >
          Stock
        </button>
        <button
          type="button"
          class="mm-inventario__boton-orden"
          :class="{ 'mm-inventario__boton-orden--activo': orden === 'nombre' }"
          @click="orden = 'nombre'"
        >
          Nombre
        </button>
      </div>
    </div>

    <EstadoVacio
      v-if="resultados.length === 0"
      titulo="Ningún producto coincide"
      descripcion="Prueba con otro texto o quita los filtros."
    >
      <template #accion>
        <button type="button" class="mm-inventario__limpiar" @click="limpiarFiltros">
          Limpiar filtros
        </button>
      </template>
    </EstadoVacio>

    <template v-else-if="esMovil">
      <div
        v-if="usarVirtualizacion"
        :ref="el => (virtualMovil.refContenedor.value = el as HTMLElement | null)"
        class="mm-inventario__lista-movil mm-inventario__lista-movil--virtual"
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
            <TarjetaInventario
              v-for="{ item: producto } in virtualMovil.visibles.value"
              :key="producto.id"
              :producto="producto"
              :dias-cobertura="coberturaPorId.get(producto.id)?.diasCobertura ?? null"
              @click="productoAbierto = producto"
            />
          </div>
        </div>
      </div>
      <div v-else class="mm-inventario__lista-movil">
        <TarjetaInventario
          v-for="producto in resultados"
          :key="producto.id"
          :producto="producto"
          :dias-cobertura="coberturaPorId.get(producto.id)?.diasCobertura ?? null"
          @click="productoAbierto = producto"
        />
      </div>
    </template>

    <template v-else>
      <div class="mm-inventario__tabla" role="table" aria-label="Inventario">
        <div class="mm-inventario__cabecera-tabla" role="row">
          <span role="columnheader">Nombre</span>
          <span role="columnheader">Precio</span>
          <span role="columnheader">Costo</span>
          <span role="columnheader">Margen</span>
          <span role="columnheader">Stock</span>
        </div>
        <div
          v-if="usarVirtualizacion"
          :ref="el => (virtualEscritorio.refContenedor.value = el as HTMLElement | null)"
          class="mm-inventario__cuerpo-tabla mm-inventario__cuerpo-tabla--virtual"
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
              <FilaInventario
                v-for="{ item: producto } in virtualEscritorio.visibles.value"
                :key="producto.id"
                :producto="producto"
                :dias-cobertura="coberturaPorId.get(producto.id)?.diasCobertura ?? null"
                @click="productoAbierto = producto"
              />
            </div>
          </div>
        </div>
        <div v-else class="mm-inventario__cuerpo-tabla" role="rowgroup">
          <FilaInventario
            v-for="producto in resultados"
            :key="producto.id"
            :producto="producto"
            :dias-cobertura="coberturaPorId.get(producto.id)?.diasCobertura ?? null"
            @click="productoAbierto = producto"
          />
        </div>
      </div>
    </template>

    <ProductoDetalle
      v-if="productoAbierto"
      :producto="productoAbierto"
      :cobertura="coberturaPorId.get(productoAbierto.id)"
      @cerrar="productoAbierto = null"
      @cambiado="alCambiar"
    />

    <AjusteStock
      v-if="mostrandoAjuste"
      @cerrar="mostrandoAjuste = false"
      @aplicado="alCambiar"
    />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-inventario__cabecera-valor {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding: 14px 16px;
  margin-bottom: 16px;
  background-color: v.$superficie;
  border: 1px solid v.$borde;
  border-radius: v.$radio-md;

  > div {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  strong {
    font-size: v.$tam-titulo-seccion;
  }
}

.mm-inventario__etiqueta-valor {
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
}

.mm-inventario__nota-valor {
  font-size: 11px;
  color: v.$tenue;
}

.mm-inventario__barra-superior {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 16px;
}

.mm-inventario__buscador {
  flex: 1;
}

.mm-inventario__filtros {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  overflow-x: auto;
}

.mm-inventario__chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.mm-inventario__orden {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.mm-inventario__boton-orden {
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid v.$borde;
  border-radius: v.$radio-sm;
  background-color: v.$superficie;
  color: v.$tenue;
  font-size: v.$tam-etiqueta;
  cursor: pointer;

  &--activo {
    background-color: v.$tinta;
    color: white;
    border-color: v.$tinta;
  }
}

.mm-inventario__limpiar {
  min-height: v.$objetivo-tactil-min;
  padding: 0 20px;
  border-radius: v.$radio-sm;
  border: none;
  background-color: v.$acento;
  color: white;
  font-weight: v.$peso-semi;
  cursor: pointer;
}

.mm-inventario__lista-movil {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mm-inventario__lista-movil--virtual {
  height: 70vh;
  overflow-y: auto;
}

.mm-inventario__tabla {
  background-color: v.$superficie;
  border-radius: v.$radio-md;
  border: 1px solid v.$borde;
  overflow: hidden;
}

.mm-inventario__cabecera-tabla {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1.6fr;
  gap: 12px;
  padding: 10px 12px;
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-semi;
  color: v.$tenue;
  border-bottom: 1px solid v.$borde;
}

.mm-inventario__cuerpo-tabla--virtual {
  height: 70vh;
  overflow-y: auto;
}
</style>
