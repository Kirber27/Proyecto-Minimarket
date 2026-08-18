<script setup lang="ts">
import { ref } from 'vue'

import { useCarritoStore } from '@/stores/carrito'
import { useTasaStore } from '@/stores/tasa'
import {
  aBolivares,
  aCentavos,
  formatearBs,
  formatearUsd,
  type Centavos,
} from '@/lib/money'
import type { Cliente, MetodoPago } from '@/types/dominio'
import SelectorCliente from '@/components/dominio/SelectorCliente.vue'

const carrito = useCarritoStore()
const tasa = useTasaStore()

interface DefinicionMetodo {
  valor: MetodoPago
  etiqueta: string
  moneda: 'USD' | 'VES'
}

const METODOS: DefinicionMetodo[] = [
  { valor: 'efectivo-ves', etiqueta: 'Efectivo Bs.', moneda: 'VES' },
  { valor: 'efectivo-usd', etiqueta: 'Efectivo $', moneda: 'USD' },
  { valor: 'punto', etiqueta: 'Punto', moneda: 'VES' },
  { valor: 'pago-movil', etiqueta: 'Pago móvil', moneda: 'VES' },
  { valor: 'biopago', etiqueta: 'Biopago', moneda: 'VES' },
]

const modalClienteAbierto = ref(false)
const clienteElegido = ref<Cliente | null>(null)

function etiquetaDe(metodo: MetodoPago): string {
  return METODOS.find(m => m.valor === metodo)?.etiqueta ?? metodo
}

function monedaDe(metodo: MetodoPago): 'USD' | 'VES' {
  return METODOS.find(m => m.valor === metodo)?.moneda ?? 'USD'
}

function abrirFiado(): void {
  modalClienteAbierto.value = true
}

function alElegirCliente(cliente: Cliente): void {
  carrito.elegirCliente(cliente.id)
  clienteElegido.value = cliente
  modalClienteAbierto.value = false
}

function quitarFiado(): void {
  carrito.quitarCliente()
  clienteElegido.value = null
}

/** Requisito 2.8: los montos en Bs. se teclean en Bs. y se convierten con la tasa vigente. */
function alEditarMontoVes(indice: number, evento: Event): void {
  const bs = Number((evento.target as HTMLInputElement).value)
  if (!Number.isFinite(bs) || bs < 0 || tasa.valor === null) return
  carrito.actualizarMontoPago(indice, aCentavos(bs / tasa.valor))
}

function alEditarMontoUsd(indice: number, evento: Event): void {
  const usd = Number((evento.target as HTMLInputElement).value)
  if (!Number.isFinite(usd) || usd < 0) return
  carrito.actualizarMontoPago(indice, aCentavos(usd))
}

function valorVes(montoUsd: Centavos): number {
  return tasa.valor === null ? 0 : Math.round(aBolivares(montoUsd, tasa.valor))
}

function faltaOVuelto(): Centavos {
  return carrito.faltaUsd > 0 ? carrito.faltaUsd : carrito.vueltoUsd
}
</script>

<template>
  <div class="mm-selector-pago">
    <p class="mm-selector-pago__titulo">Escoge 1 o 2 métodos de pago para continuar:</p>

    <div class="mm-selector-pago__metodos">
      <button
        v-for="metodo in METODOS"
        :key="metodo.valor"
        type="button"
        class="mm-selector-pago__metodo"
        @click="carrito.agregarMetodoPago(metodo.valor)"
      >
        {{ metodo.etiqueta }}
      </button>
      <button
        type="button"
        class="mm-selector-pago__metodo mm-selector-pago__metodo--fiado"
        @click="abrirFiado"
      >
        Fiado
      </button>
    </div>

    <ul v-if="carrito.pagos.length > 0" class="mm-selector-pago__lineas list-unstyled">
      <li
        v-for="(pago, indice) in carrito.pagos"
        :key="indice"
        class="mm-selector-pago__linea"
      >
        <span class="mm-selector-pago__linea-etiqueta">{{
          etiquetaDe(pago.metodo)
        }}</span>

        <input
          v-if="monedaDe(pago.metodo) === 'VES'"
          type="number"
          inputmode="decimal"
          class="mm-selector-pago__linea-input"
          :value="valorVes(pago.montoUsd)"
          @input="alEditarMontoVes(indice, $event)"
        />
        <input
          v-else
          type="number"
          inputmode="decimal"
          step="0.01"
          class="mm-selector-pago__linea-input"
          :value="(pago.montoUsd / 100).toFixed(2)"
          @input="alEditarMontoUsd(indice, $event)"
        />

        <span class="mm-selector-pago__linea-equivalente">{{
          formatearUsd(pago.montoUsd)
        }}</span>

        <button
          type="button"
          class="mm-selector-pago__linea-quitar"
          aria-label="Quitar este pago"
          @click="carrito.quitarPago(indice)"
        >
          ✕
        </button>
      </li>
    </ul>

    <div v-if="carrito.clienteId" class="mm-selector-pago__fiado">
      <span>Fiado{{ clienteElegido ? ` · ${clienteElegido.nombre}` : '' }}</span>
      <button type="button" class="mm-selector-pago__fiado-quitar" @click="quitarFiado">
        Quitar
      </button>
    </div>

    <div class="mm-selector-pago__resumen">
      <span>{{ carrito.faltaUsd > 0 ? 'Falta' : 'Vuelto' }}</span>
      <span :class="{ 'mm-selector-pago__resumen--ok': carrito.faltaUsd === 0 }">
        {{ formatearUsd(faltaOVuelto()) }}
        <template v-if="tasa.valor !== null">
          · {{ formatearBs(aBolivares(faltaOVuelto(), tasa.valor)) }}
        </template>
      </span>
    </div>

    <SelectorCliente
      v-if="modalClienteAbierto"
      @cerrar="modalClienteAbierto = false"
      @elegido="alElegirCliente"
    />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;
@use '@/assets/scss/mixins' as m;

.mm-selector-pago {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mm-selector-pago__titulo {
  margin: 0;
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-semi;
  color: v.$tenue;
}

.mm-selector-pago__metodos {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.mm-selector-pago__metodo {
  @include m.objetivo-tactil;
  border: 1px solid v.$borde;
  border-radius: v.$radio-sm;
  background-color: v.$superficie;
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-semi;
  cursor: pointer;

  &:active {
    background-color: v.$acento-suave;
  }
}

.mm-selector-pago__metodo--fiado {
  border-color: v.$aviso;
  color: v.$aviso;
}

.mm-selector-pago__lineas {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mm-selector-pago__linea {
  display: grid;
  grid-template-columns: 1fr 90px auto auto;
  align-items: center;
  gap: 8px;
}

.mm-selector-pago__linea-etiqueta {
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
}

.mm-selector-pago__linea-input {
  min-height: 36px;
  padding: 0 8px;
  border: 1px solid v.$borde;
  border-radius: v.$radio-sm;
  text-align: right;
}

.mm-selector-pago__linea-equivalente {
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
  white-space: nowrap;
}

.mm-selector-pago__linea-quitar {
  background: none;
  border: none;
  color: v.$error;
  cursor: pointer;
}

.mm-selector-pago__fiado {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: v.$radio-sm;
  background-color: v.$aviso-bg;
  color: v.$aviso;
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-semi;
}

.mm-selector-pago__fiado-quitar {
  background: none;
  border: none;
  color: inherit;
  text-decoration: underline;
  cursor: pointer;
}

.mm-selector-pago__resumen {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: v.$peso-semi;

  &--ok {
    color: v.$ok;
  }
}
</style>
