<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { useCatalogoStore } from '@/stores/catalogo'
import { useSesionStore } from '@/stores/sesion'
import * as inventarioService from '@/services/inventarioService'
import {
  calcularCantidadSugerida,
  calcularStockMinimoSugerido,
} from '@/services/inventarioService'
import { ErrorDominio } from '@/lib/errorDominio'
import { notificar } from '@/composables/useNotificaciones'
import type { Producto, ProductoCobertura } from '@/types/dominio'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import BotonSecundario from '@/components/ui/BotonSecundario.vue'
import Reposicion from '@/pages/inventario/Reposicion.vue'

const catalogo = useCatalogoStore()
const sesion = useSesionStore()

const cobertura = ref<ProductoCobertura[]>([])
const cargando = ref(true)
const productoReponiendo = ref<Producto | null>(null)

async function cargar(): Promise<void> {
  cargando.value = true
  try {
    await catalogo.cargar()
    cobertura.value = await inventarioService.listarCobertura()
  } catch (err) {
    notificar(
      err instanceof ErrorDominio ? err.message : 'No se pudo cargar las alertas.',
    )
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

const productoPorId = computed(() => new Map(catalogo.productos.map(p => [p.id, p])))

type Nivel = 'agotado' | 'critico' | 'proximo'

interface Alerta {
  cobertura: ProductoCobertura
  producto: Producto
  nivel: Nivel
}

/** Agotados primero, luego críticos por stock ascendente, luego próximos a
 * agotarse por cobertura ascendente (requisitos 5.1, 5.3). */
const alertas = computed<Alerta[]>(() => {
  const filas: Alerta[] = []
  for (const c of cobertura.value) {
    if (!c.activo || c.unidadNegocio !== catalogo.negocio) continue
    const producto = productoPorId.value.get(c.id)
    if (!producto) continue

    if (c.stockActual <= 0) {
      filas.push({ cobertura: c, producto, nivel: 'agotado' })
    } else if (c.stockActual < c.stockMinimo) {
      filas.push({ cobertura: c, producto, nivel: 'critico' })
    } else if (c.diasCobertura !== null && c.diasCobertura < 7) {
      filas.push({ cobertura: c, producto, nivel: 'proximo' })
    }
  }

  const orden: Record<Nivel, number> = { agotado: 0, critico: 1, proximo: 2 }
  return filas.sort((a, b) => {
    if (orden[a.nivel] !== orden[b.nivel]) return orden[a.nivel] - orden[b.nivel]
    if (a.nivel === 'proximo')
      return (a.cobertura.diasCobertura ?? 0) - (b.cobertura.diasCobertura ?? 0)
    return a.cobertura.stockActual - b.cobertura.stockActual
  })
})

const ETIQUETAS_NIVEL: Record<Nivel, string> = {
  agotado: 'Agotado',
  critico: 'Crítico',
  proximo: 'Próximo a agotarse',
}

function sugerenciaReposicion(alerta: Alerta): number {
  return calcularCantidadSugerida(
    alerta.cobertura.vendidos30d,
    alerta.producto.stockMinimo,
  )
}

async function aplicarMinimoSugerido(alerta: Alerta): Promise<void> {
  const sugerido = calcularStockMinimoSugerido(alerta.cobertura.vendidos7d)
  try {
    await inventarioService.actualizarStockMinimo(alerta.producto.id, sugerido)
    notificar(`Stock mínimo de ${alerta.producto.nombre} actualizado a ${sugerido}`)
    await cargar()
  } catch (err) {
    notificar(
      err instanceof ErrorDominio ? err.message : 'No se pudo actualizar el mínimo.',
    )
  }
}

async function alReponer(): Promise<void> {
  productoReponiendo.value = null
  await cargar()
}
</script>

<template>
  <div class="mm-alertas">
    <EstadoVacio
      v-if="!cargando && alertas.length === 0"
      titulo="Todo en orden"
      descripcion="Ningún producto está por debajo de su mínimo ni próximo a agotarse."
    />

    <ul v-else class="mm-alertas__lista list-unstyled">
      <li
        v-for="alerta in alertas"
        :key="alerta.producto.id"
        class="mm-alertas__item"
        :class="`mm-alertas__item--${alerta.nivel}`"
      >
        <div class="mm-alertas__info">
          <div class="mm-alertas__cabecera">
            <span class="mm-alertas__nombre">{{ alerta.producto.nombre }}</span>
            <span class="mm-alertas__nivel">{{ ETIQUETAS_NIVEL[alerta.nivel] }}</span>
          </div>
          <p class="mm-alertas__detalle">
            Stock: {{ alerta.cobertura.stockActual }} / mínimo
            {{ alerta.cobertura.stockMinimo }}
            <template v-if="alerta.cobertura.diasCobertura !== null">
              · {{ alerta.cobertura.diasCobertura }} días de cobertura
            </template>
          </p>
        </div>

        <div v-if="sesion.esDueno" class="mm-alertas__acciones">
          <BotonSecundario @click="productoReponiendo = alerta.producto">
            Reponer {{ sugerenciaReposicion(alerta) }}
          </BotonSecundario>
          <button
            type="button"
            class="mm-alertas__minimo-sugerido"
            @click="aplicarMinimoSugerido(alerta)"
          >
            Ajustar mínimo a
            {{ calcularStockMinimoSugerido(alerta.cobertura.vendidos7d) }}
          </button>
        </div>
      </li>
    </ul>

    <Reposicion
      v-if="productoReponiendo"
      :producto="productoReponiendo"
      :cantidad-sugerida="
        calcularCantidadSugerida(
          cobertura.find(c => c.id === productoReponiendo!.id)?.vendidos30d ?? 0,
          productoReponiendo.stockMinimo,
        )
      "
      @cerrar="productoReponiendo = null"
      @repuesto="alReponer"
    />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-alertas__lista {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mm-alertas__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px;
  border: 1px solid v.$borde;
  border-radius: v.$radio-md;
  background-color: v.$superficie;
  border-left: 4px solid transparent;

  &--agotado {
    border-left-color: v.$error;
  }
  &--critico {
    border-left-color: v.$error;
  }
  &--proximo {
    border-left-color: v.$aviso;
  }
}

.mm-alertas__cabecera {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mm-alertas__nombre {
  font-weight: v.$peso-semi;
  color: v.$tinta;
}

.mm-alertas__nivel {
  font-size: 11px;
  font-weight: v.$peso-semi;
  color: v.$tenue;
  border: 1px solid v.$borde;
  border-radius: v.$radio-sm;
  padding: 1px 6px;
}

.mm-alertas__item--agotado .mm-alertas__nivel,
.mm-alertas__item--critico .mm-alertas__nivel {
  color: v.$error;
  border-color: v.$error;
}

.mm-alertas__item--proximo .mm-alertas__nivel {
  color: v.$aviso;
  border-color: v.$aviso;
}

.mm-alertas__detalle {
  margin: 4px 0 0;
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
}

.mm-alertas__acciones {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.mm-alertas__minimo-sugerido {
  background: none;
  border: none;
  color: v.$acento-hover;
  font-size: 11px;
  cursor: pointer;
  text-decoration: underline;
}
</style>
