<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { useSesionStore } from '@/stores/sesion'
import * as clienteService from '@/services/clienteService'
import { useDebounced } from '@/composables/useDebounced'
import { normalizarTexto } from '@/lib/texto'
import { aCentavos, formatearUsd, sumar, type Centavos } from '@/lib/money'
import { ErrorDominio } from '@/lib/errorDominio'
import { notificar } from '@/composables/useNotificaciones'
import type { Cliente, UnidadNegocio } from '@/types/dominio'
import CampoTexto from '@/components/ui/CampoTexto.vue'
import ChipFiltro from '@/components/ui/ChipFiltro.vue'
import BotonPrimario from '@/components/ui/BotonPrimario.vue'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import PrecioDoble from '@/components/dominio/PrecioDoble.vue'
import ClienteDetalle from '@/pages/deudas/ClienteDetalle.vue'
import ClienteFormulario from '@/pages/deudas/ClienteFormulario.vue'
import RevisionPendiente from '@/pages/deudas/RevisionPendiente.vue'

const DIAS_MOROSO = 30

const NEGOCIOS: { valor: UnidadNegocio; etiqueta: string }[] = [
  { valor: 'bodega', etiqueta: 'Bodega' },
  { valor: 'cerveza', etiqueta: 'Cerveza' },
  { valor: 'thais', etiqueta: 'Thais' },
]

const sesion = useSesionStore()

const clientes = ref<Cliente[]>([])
const cargando = ref(true)
const pendientesRevision = ref(0)

const textoBusqueda = ref('')
const textoBusquedaDebounced = useDebounced(textoBusqueda, 150)
const soloConDeuda = ref(true)
const soloMorosos = ref(false)

const clienteAbierto = ref<Cliente | null>(null)
const mostrandoNuevo = ref(false)
const mostrandoRevision = ref(false)

async function cargar(): Promise<void> {
  cargando.value = true
  try {
    clientes.value = await clienteService.listar()
    if (sesion.esDueno) {
      pendientesRevision.value = (await clienteService.listarPendientesRevision()).length
    }
  } catch (err) {
    notificar(
      err instanceof ErrorDominio ? err.message : 'No se pudo cargar los clientes.',
    )
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

function esMoroso(cliente: Cliente): boolean {
  if (!cliente.deudaMasAntigua) return false
  const dias = (Date.now() - new Date(cliente.deudaMasAntigua).getTime()) / 86_400_000
  return dias > DIAS_MOROSO
}

const resultados = computed(() => {
  const patron = normalizarTexto(textoBusquedaDebounced.value.trim())
  return clientes.value.filter(c => {
    if (patron && !normalizarTexto(c.nombre).includes(patron)) return false
    if (soloConDeuda.value && (c.saldoUsd ?? 0) <= 0) return false
    if (soloMorosos.value && !esMoroso(c)) return false
    return true
  })
})

/** Requisito 6.1: total por cobrar, por unidad de negocio y consolidado. */
const totalPorNegocio = computed(() => {
  const totales: Record<UnidadNegocio, Centavos> = {
    bodega: aCentavos(0),
    cerveza: aCentavos(0),
    thais: aCentavos(0),
  }
  for (const cliente of clientes.value) {
    for (const negocio of NEGOCIOS.map(n => n.valor)) {
      const saldo = cliente.saldosPorNegocio?.[negocio]
      if (saldo && saldo > 0) totales[negocio] = sumar(totales[negocio], saldo)
    }
  }
  return totales
})

const totalConsolidado = computed(() =>
  sumar(...NEGOCIOS.map(n => totalPorNegocio.value[n.valor])),
)

const conteoMorosos = computed(() => clientes.value.filter(esMoroso).length)

function limpiarFiltros(): void {
  textoBusqueda.value = ''
  soloConDeuda.value = false
  soloMorosos.value = false
}

async function alGuardarCliente(): Promise<void> {
  mostrandoNuevo.value = false
  await cargar()
}

async function alCambiarCliente(): Promise<void> {
  await cargar()
  if (clienteAbierto.value) {
    clienteAbierto.value =
      clientes.value.find(c => c.id === clienteAbierto.value?.id) ?? null
  }
}
</script>

<template>
  <div class="mm-deudas">
    <div class="mm-deudas__cabecera">
      <div>
        <span class="mm-deudas__etiqueta">Total por cobrar</span>
        <PrecioDoble :usd="totalConsolidado" tamano="md" />
      </div>
      <div class="mm-deudas__desglose">
        <span v-for="n in NEGOCIOS" :key="n.valor">
          {{ n.etiqueta }}: {{ formatearUsd(totalPorNegocio[n.valor]) }}
        </span>
      </div>
      <p v-if="conteoMorosos > 0" class="mm-deudas__morosos">
        {{ conteoMorosos }} cliente{{ conteoMorosos === 1 ? '' : 's' }} con más de
        {{ DIAS_MOROSO }} días de deuda
      </p>
    </div>

    <button
      v-if="sesion.esDueno && pendientesRevision > 0"
      type="button"
      class="mm-deudas__revision"
      @click="mostrandoRevision = true"
    >
      {{ pendientesRevision }} nota{{ pendientesRevision === 1 ? '' : 's' }} de la
      planilla por revisar
    </button>

    <div class="mm-deudas__barra-superior">
      <CampoTexto
        v-model="textoBusqueda"
        etiqueta="Buscar cliente"
        placeholder="Nombre"
        class="mm-deudas__buscador"
      />
      <BotonPrimario @click="mostrandoNuevo = true">Nuevo cliente</BotonPrimario>
    </div>

    <div class="mm-deudas__chips">
      <ChipFiltro :activo="soloConDeuda" @click="soloConDeuda = !soloConDeuda">
        Con deuda
      </ChipFiltro>
      <ChipFiltro :activo="soloMorosos" @click="soloMorosos = !soloMorosos">
        Morosos (+{{ DIAS_MOROSO }} días)
      </ChipFiltro>
    </div>

    <EstadoVacio
      v-if="!cargando && resultados.length === 0"
      titulo="Ningún cliente coincide"
      descripcion="Prueba con otro texto o quita los filtros."
    >
      <template #accion>
        <button type="button" class="mm-deudas__limpiar" @click="limpiarFiltros">
          Limpiar filtros
        </button>
      </template>
    </EstadoVacio>

    <ul v-else class="mm-deudas__lista list-unstyled">
      <li v-for="cliente in resultados" :key="cliente.id">
        <button
          type="button"
          class="mm-deudas__cliente"
          :class="{ 'mm-deudas__cliente--moroso': esMoroso(cliente) }"
          @click="clienteAbierto = cliente"
        >
          <span class="mm-deudas__cliente-nombre">{{ cliente.nombre }}</span>
          <PrecioDoble :usd="cliente.saldoUsd ?? aCentavos(0)" tamano="sm" />
        </button>
      </li>
    </ul>

    <ClienteDetalle
      v-if="clienteAbierto"
      :cliente="clienteAbierto"
      @cerrar="clienteAbierto = null"
      @cambiado="alCambiarCliente"
    />

    <ClienteFormulario
      v-if="mostrandoNuevo"
      :cliente="null"
      @cerrar="mostrandoNuevo = false"
      @guardado="alGuardarCliente"
    />

    <RevisionPendiente
      v-if="mostrandoRevision"
      @cerrar="mostrandoRevision = false"
      @cambiado="cargar"
    />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-deudas {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mm-deudas__cabecera {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  background-color: v.$superficie;
  border: 1px solid v.$borde;
  border-radius: v.$radio-md;
}

.mm-deudas__etiqueta {
  display: block;
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
}

.mm-deudas__desglose {
  display: flex;
  gap: 14px;
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
}

.mm-deudas__morosos {
  margin: 4px 0 0;
  font-size: v.$tam-etiqueta;
  color: v.$aviso;
  font-weight: v.$peso-semi;
}

.mm-deudas__revision {
  min-height: v.$objetivo-tactil-min;
  padding: 0 16px;
  border: 1px solid v.$aviso;
  border-radius: v.$radio-md;
  background-color: v.$aviso-bg;
  color: v.$aviso;
  font-weight: v.$peso-semi;
  text-align: left;
  cursor: pointer;
}

.mm-deudas__barra-superior {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.mm-deudas__buscador {
  flex: 1;
}

.mm-deudas__chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.mm-deudas__limpiar {
  min-height: v.$objetivo-tactil-min;
  padding: 0 20px;
  border-radius: v.$radio-sm;
  border: none;
  background-color: v.$acento;
  color: white;
  font-weight: v.$peso-semi;
  cursor: pointer;
}

// 2 columnas en movil, subiendo a 6 en escritorio ancho (xl) en vez de una
// lista vertical: los deudores son tarjetas chicas, no filas con vineta.
.mm-deudas__lista {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

@media (min-width: 768px) {
  .mm-deudas__lista {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 992px) {
  .mm-deudas__lista {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 1200px) {
  .mm-deudas__lista {
    grid-template-columns: repeat(6, 1fr);
  }
}

.mm-deudas__cliente {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  width: 100%;
  min-height: 74px;
  padding: 12px 14px;
  border: 1px solid v.$borde;
  border-left: 4px solid transparent;
  border-radius: v.$radio-md;
  background-color: v.$superficie;
  text-align: left;
  cursor: pointer;

  &:hover {
    background-color: v.$acento-suave;
  }

  &--moroso {
    border-left-color: v.$error;
  }
}

.mm-deudas__cliente-nombre {
  width: 100%;
  font-weight: v.$peso-semi;
  color: v.$tinta;
  font-size: v.$tam-etiqueta;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
