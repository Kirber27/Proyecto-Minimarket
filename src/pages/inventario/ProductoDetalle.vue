<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import { useCatalogoStore } from '@/stores/catalogo'
import { useSesionStore } from '@/stores/sesion'
import * as inventarioService from '@/services/inventarioService'
import * as usuariosService from '@/services/usuariosService'
import { calcularEstadoStock } from '@/lib/stock'
import { calcularMargen, formatearMargen } from '@/lib/margen'
import { formatearFechaHora } from '@/lib/fechas'
import { ErrorDominio } from '@/lib/errorDominio'
import { notificar } from '@/composables/useNotificaciones'
import type {
  MovimientoStock,
  Perfil,
  Producto,
  ProductoCobertura,
  TipoMovimiento,
} from '@/types/dominio'
import ModalBase from '@/components/ui/ModalBase.vue'
import PrecioDoble from '@/components/dominio/PrecioDoble.vue'
import BotonPrimario from '@/components/ui/BotonPrimario.vue'
import Reposicion from '@/pages/inventario/Reposicion.vue'

const props = defineProps<{
  producto: Producto
  cobertura?: ProductoCobertura
}>()

const emit = defineEmits<{
  cerrar: []
  cambiado: []
}>()

const ETIQUETAS_TIPO: Record<TipoMovimiento, string> = {
  venta: 'Venta',
  anulacion: 'Anulación',
  reposicion: 'Reposición',
  ajuste: 'Ajuste',
  importacion: 'Importación',
}

const ETIQUETAS_MOTIVO: Record<string, string> = {
  conteo: 'Conteo físico',
  merma: 'Merma',
  vencimiento: 'Vencimiento',
  robo: 'Robo',
  error: 'Error de registro',
  otro: 'Otro',
}

const catalogo = useCatalogoStore()
const sesion = useSesionStore()

const categoria = computed(() =>
  catalogo.categorias.find(c => c.id === props.producto.categoriaId),
)
const estadoStock = computed(() =>
  calcularEstadoStock(props.producto.stockActual, props.producto.stockMinimo),
)
const margen = computed(() =>
  calcularMargen(props.producto.precioVentaUsd, props.producto.costoUsd),
)

const movimientos = ref<MovimientoStock[]>([])
const usuarios = ref<Perfil[]>([])
const cargando = ref(true)
const filtroTipo = ref('')
const filtroUsuario = ref('')
const mostrandoReposicion = ref(false)

const usuarioPorId = computed(() => new Map(usuarios.value.map(u => [u.id, u.nombre])))

async function cargarMovimientos(): Promise<void> {
  cargando.value = true
  try {
    movimientos.value = await inventarioService.listarMovimientos(props.producto.id, {
      tipo: filtroTipo.value || undefined,
      usuarioId: filtroUsuario.value || undefined,
    })
  } catch (err) {
    notificar(
      err instanceof ErrorDominio ? err.message : 'No se pudo cargar el historial.',
    )
  } finally {
    cargando.value = false
  }
}

onMounted(async () => {
  void cargarMovimientos()
  if (sesion.esDueno) {
    usuarios.value = await usuariosService.listarUsuarios().catch(() => [])
  }
})

watch([filtroTipo, filtroUsuario], cargarMovimientos)

function textoCantidad(m: MovimientoStock): string {
  const unidad = props.producto.unidadMedida === 'KG' ? 'kg' : 'u.'
  const signo = m.cantidad > 0 ? '+' : ''
  return `${signo}${m.cantidad} ${unidad}`
}

function alReponer(): void {
  mostrandoReposicion.value = false
  emit('cambiado')
}
</script>

<template>
  <ModalBase :titulo="producto.nombre" @cerrar="emit('cerrar')">
    <div class="mm-producto-detalle">
      <div class="mm-producto-detalle__datos">
        <p v-if="categoria" class="mm-producto-detalle__linea">
          Categoría: {{ categoria.nombre }}
        </p>
        <p v-if="producto.sku" class="mm-producto-detalle__linea">
          SKU: {{ producto.sku }}
        </p>
        <p class="mm-producto-detalle__linea">
          Precio: <PrecioDoble :usd="producto.precioVentaUsd" tamano="sm" />
        </p>
        <p class="mm-producto-detalle__linea">
          Costo:
          <PrecioDoble
            v-if="producto.costoUsd !== null"
            :usd="producto.costoUsd"
            tamano="sm"
          />
          <span v-else>—</span>
        </p>
        <p class="mm-producto-detalle__linea">Margen: {{ formatearMargen(margen) }}</p>
        <p class="mm-producto-detalle__linea">
          Stock:
          <span :class="`mm-producto-detalle__estado--${estadoStock.estado}`">
            {{ estadoStock.etiqueta }}
          </span>
          ({{ producto.stockActual }} / mínimo {{ producto.stockMinimo }})
        </p>

        <template v-if="cobertura">
          <p class="mm-producto-detalle__linea">
            Vendidos: {{ cobertura.vendidos7d }} (7d) · {{ cobertura.vendidos30d }} (30d)
            · {{ cobertura.vendidos90d }} (90d)
          </p>
          <p class="mm-producto-detalle__linea">
            Cobertura:
            {{
              cobertura.diasCobertura === null
                ? 'sin ventas en 30 días'
                : `${cobertura.diasCobertura} días`
            }}
          </p>
        </template>

        <BotonPrimario v-if="sesion.esDueno" @click="mostrandoReposicion = true"
          >Reponer</BotonPrimario
        >
      </div>

      <div class="mm-producto-detalle__filtros">
        <select
          v-model="filtroTipo"
          class="mm-producto-detalle__select"
          aria-label="Filtrar por tipo"
        >
          <option value="">Todos los tipos</option>
          <option v-for="(etiqueta, tipo) in ETIQUETAS_TIPO" :key="tipo" :value="tipo">
            {{ etiqueta }}
          </option>
        </select>
        <select
          v-if="usuarios.length > 0"
          v-model="filtroUsuario"
          class="mm-producto-detalle__select"
          aria-label="Filtrar por usuario"
        >
          <option value="">Todos los usuarios</option>
          <option v-for="u in usuarios" :key="u.id" :value="u.id">{{ u.nombre }}</option>
        </select>
      </div>

      <p
        v-if="!cargando && movimientos.length === 0"
        class="mm-producto-detalle__sin-movimientos"
      >
        No hay movimientos para este filtro.
      </p>

      <ul v-else class="mm-producto-detalle__movimientos list-unstyled">
        <li v-for="m in movimientos" :key="m.id" class="mm-producto-detalle__movimiento">
          <div class="mm-producto-detalle__movimiento-cabecera">
            <span class="mm-producto-detalle__movimiento-tipo">{{
              ETIQUETAS_TIPO[m.tipo]
            }}</span>
            <span>{{ textoCantidad(m) }}</span>
          </div>
          <p class="mm-producto-detalle__movimiento-meta">
            {{ formatearFechaHora(new Date(m.creadoEn)) }} ·
            {{ usuarioPorId.get(m.usuarioId) ?? 'Usuario' }} · quedó en
            {{ m.stockResultante }}
          </p>
          <p v-if="m.motivo || m.nota" class="mm-producto-detalle__movimiento-nota">
            {{ m.motivo ? ETIQUETAS_MOTIVO[m.motivo] : '' }}
            {{ m.motivo && m.nota ? '· ' : '' }}{{ m.nota }}
          </p>
        </li>
      </ul>
    </div>

    <Reposicion
      v-if="mostrandoReposicion"
      :producto="producto"
      @cerrar="mostrandoReposicion = false"
      @repuesto="alReponer"
    />
  </ModalBase>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-producto-detalle {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mm-producto-detalle__datos {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mm-producto-detalle__linea {
  margin: 0;
  font-size: v.$tam-etiqueta;
}

.mm-producto-detalle__estado--sin-stock,
.mm-producto-detalle__estado--critico {
  color: v.$error;
  font-weight: v.$peso-semi;
}
.mm-producto-detalle__estado--bajo {
  color: v.$aviso;
  font-weight: v.$peso-semi;
}
.mm-producto-detalle__estado--normal {
  color: v.$ok;
  font-weight: v.$peso-semi;
}

.mm-producto-detalle__filtros {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mm-producto-detalle__select {
  min-height: v.$objetivo-tactil-min;
  padding: 0 10px;
  border: 1px solid v.$borde;
  border-radius: v.$radio-sm;
  background-color: v.$superficie;
  font-size: v.$tam-etiqueta;
}

.mm-producto-detalle__sin-movimientos {
  margin: 0;
  color: v.$tenue;
  font-size: v.$tam-etiqueta;
}

.mm-producto-detalle__movimientos {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 40vh;
  overflow-y: auto;
}

.mm-producto-detalle__movimiento {
  padding: 8px 10px;
  border: 1px solid v.$borde;
  border-radius: v.$radio-sm;
}

.mm-producto-detalle__movimiento-cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: v.$peso-semi;
}

.mm-producto-detalle__movimiento-meta {
  margin: 2px 0 0;
  font-size: 12px;
  color: v.$tenue;
}

.mm-producto-detalle__movimiento-nota {
  margin: 2px 0 0;
  font-size: 12px;
  color: v.$tenue;
  font-style: italic;
}
</style>
