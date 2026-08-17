<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { useCatalogoStore } from '@/stores/catalogo'
import { useSesionStore } from '@/stores/sesion'
import * as ventasService from '@/services/ventasService'
import * as inventarioService from '@/services/inventarioService'
import * as clienteService from '@/services/clienteService'
import { notificar } from '@/composables/useNotificaciones'
import { ErrorDominio } from '@/lib/errorDominio'
import { sumar, type Centavos } from '@/lib/money'
import { formatearHora } from '@/lib/fechas'
import type { ProductoCobertura, Venta } from '@/types/dominio'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import PrecioDoble from '@/components/dominio/PrecioDoble.vue'
import VentaDetalle from '@/pages/venta/VentaDetalle.vue'

const catalogo = useCatalogoStore()
const sesion = useSesionStore()
const ventas = ref<Venta[]>([])
const cargando = ref(true)
const ventaAbierta = ref<Venta | null>(null)
const cobertura = ref<ProductoCobertura[]>([])
const pendientesRevision = ref(0)

const ETIQUETAS_METODO: Record<string, string> = {
  'efectivo-ves': 'Efectivo Bs.',
  'efectivo-usd': 'Efectivo $',
  punto: 'Punto',
  'pago-movil': 'Pago móvil',
  biopago: 'Biopago',
  credito: 'Fiado',
}

async function cargar(): Promise<void> {
  cargando.value = true
  try {
    ventas.value = await ventasService.listarDelDia(catalogo.negocio)
  } catch (err) {
    notificar(
      err instanceof ErrorDominio ? err.message : 'No se pudo cargar las ventas de hoy.',
    )
  } finally {
    cargando.value = false
  }
}

async function cargarAlertas(): Promise<void> {
  try {
    cobertura.value = await inventarioService.listarCobertura()
  } catch {
    // La tarjeta de alertas es informativa; si falla, el resto del Resumen
    // sigue funcionando.
  }
}

async function cargarRevision(): Promise<void> {
  if (!sesion.esDueno) return
  try {
    pendientesRevision.value = (await clienteService.listarPendientesRevision()).length
  } catch {
    // igual que las alertas: informativo, no bloquea el resto del Resumen
  }
}

onMounted(() => {
  void cargar()
  void cargarAlertas()
  void cargarRevision()
})

const totalDelDia = computed<Centavos>(() => sumar(...ventas.value.map(v => v.totalUsd)))

/** Requisitos 5.2, 5.3, 8.8: conteo y los tres productos más críticos. */
const productosEnAlerta = computed(() =>
  cobertura.value
    .filter(c => c.activo && c.unidadNegocio === catalogo.negocio)
    .filter(
      c =>
        c.stockActual < c.stockMinimo ||
        (c.diasCobertura !== null && c.diasCobertura < 7),
    )
    .sort((a, b) => a.stockActual - b.stockActual),
)

const conteoAlertas = computed(() =>
  inventarioService.contarAlertas(cobertura.value, catalogo.negocio),
)

async function abrirVenta(venta: Venta): Promise<void> {
  try {
    ventaAbierta.value = await ventasService.obtenerDetalle(venta.id)
  } catch (err) {
    notificar(err instanceof ErrorDominio ? err.message : 'No se pudo abrir la venta.')
  }
}

async function alAnular(): Promise<void> {
  ventaAbierta.value = null
  await cargar()
}
</script>

<template>
  <div class="mm-resumen">
    <div class="mm-resumen__cifra">
      <span class="mm-resumen__etiqueta">Vendido hoy</span>
      <PrecioDoble :usd="totalDelDia" tamano="lg" />
    </div>

    <RouterLink
      v-if="pendientesRevision > 0"
      to="/deudas"
      class="mm-resumen__alertas mm-resumen__alertas--revision"
    >
      <div class="mm-resumen__alertas-cabecera">
        <span>
          {{ pendientesRevision }} nota{{ pendientesRevision === 1 ? '' : 's' }} de la
          planilla por revisar
        </span>
        <span class="mm-resumen__alertas-ver">Revisar</span>
      </div>
    </RouterLink>

    <RouterLink
      v-if="productosEnAlerta.length > 0"
      to="/alertas"
      class="mm-resumen__alertas"
    >
      <div class="mm-resumen__alertas-cabecera">
        <span>
          {{ conteoAlertas.agotados + conteoAlertas.criticos }} producto{{
            conteoAlertas.agotados + conteoAlertas.criticos === 1 ? '' : 's'
          }}
          por reponer
        </span>
        <span class="mm-resumen__alertas-ver">Ver todo</span>
      </div>
      <p class="mm-resumen__alertas-lista">
        {{
          productosEnAlerta
            .slice(0, 3)
            .map(p => p.nombre)
            .join(' · ')
        }}
      </p>
    </RouterLink>

    <EstadoVacio
      v-if="!cargando && ventas.length === 0"
      titulo="Todavía no hay ventas hoy"
      descripcion="Cuando registres una venta, aquí vas a ver cuánto llevas del día."
      etiqueta-accion="Registrar venta"
      ruta-accion="/venta"
    />

    <ul v-else class="mm-resumen__lista list-unstyled">
      <li v-for="venta in ventas" :key="venta.id">
        <button type="button" class="mm-resumen__venta" @click="abrirVenta(venta)">
          <div class="mm-resumen__venta-info">
            <span class="mm-resumen__venta-hora">
              {{ formatearHora(new Date(venta.creadoEn)) }}
            </span>
            <span class="mm-resumen__venta-detalle">
              {{ venta.unidades }} u. ·
              {{
                venta.pagos?.map(p => ETIQUETAS_METODO[p.metodo] ?? p.metodo).join(' + ')
              }}
            </span>
          </div>
          <PrecioDoble :usd="venta.totalUsd" tamano="sm" />
        </button>
      </li>
    </ul>

    <VentaDetalle
      v-if="ventaAbierta"
      :venta="ventaAbierta"
      @cerrar="ventaAbierta = null"
      @anulada="alAnular"
    />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-resumen {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.mm-resumen__cifra {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mm-resumen__etiqueta {
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-semi;
  color: v.$tenue;
}

.mm-resumen__alertas {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid v.$aviso;
  border-radius: v.$radio-md;
  background-color: v.$acento-suave;
  text-decoration: none;
  color: v.$tinta;
}

.mm-resumen__alertas-cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: v.$peso-semi;
}

.mm-resumen__alertas-ver {
  font-size: v.$tam-etiqueta;
  color: v.$acento-hover;
  font-weight: v.$peso-semi;
}

.mm-resumen__alertas-lista {
  margin: 0;
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
}

.mm-resumen__lista {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mm-resumen__venta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: v.$objetivo-tactil-min;
  padding: 10px 12px;
  border: none;
  border-bottom: 1px solid v.$borde;
  background: none;
  text-align: left;
  cursor: pointer;

  &:hover {
    background-color: v.$acento-suave;
  }
}

.mm-resumen__venta-info {
  display: flex;
  flex-direction: column;
}

.mm-resumen__venta-hora {
  font-weight: v.$peso-medio;
  font-size: v.$tam-etiqueta;
}

.mm-resumen__venta-detalle {
  font-size: 12px;
  color: v.$tenue;
}
</style>
