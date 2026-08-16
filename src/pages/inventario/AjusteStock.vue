<script setup lang="ts">
import { computed, ref } from 'vue'

import { useCatalogoStore } from '@/stores/catalogo'
import * as inventarioService from '@/services/inventarioService'
import { normalizarTexto } from '@/lib/texto'
import { ErrorDominio } from '@/lib/errorDominio'
import { notificar } from '@/composables/useNotificaciones'
import type { MotivoAjuste, Producto } from '@/types/dominio'
import ModalBase from '@/components/ui/ModalBase.vue'
import CampoTexto from '@/components/ui/CampoTexto.vue'
import CampoNumero from '@/components/ui/CampoNumero.vue'
import BotonPrimario from '@/components/ui/BotonPrimario.vue'

const emit = defineEmits<{
  cerrar: []
  aplicado: []
}>()

const OPCIONES_MOTIVO: { valor: MotivoAjuste; etiqueta: string }[] = [
  { valor: 'conteo', etiqueta: 'Conteo físico' },
  { valor: 'merma', etiqueta: 'Merma' },
  { valor: 'vencimiento', etiqueta: 'Vencimiento' },
  { valor: 'robo', etiqueta: 'Robo' },
  { valor: 'error', etiqueta: 'Error de registro' },
  { valor: 'otro', etiqueta: 'Otro' },
]

const catalogo = useCatalogoStore()

const textoBusqueda = ref('')
const motivo = ref<MotivoAjuste>('conteo')
const nota = ref('')
const error = ref('')
const enviando = ref(false)

interface ItemSesion {
  producto: Producto
  cantidadNueva: number
}

const sesion = ref<ItemSesion[]>([])

const resultadosBusqueda = computed(() => {
  const patron = normalizarTexto(textoBusqueda.value.trim())
  if (!patron) return []
  const yaAgregados = new Set(sesion.value.map(i => i.producto.id))
  return catalogo.productos
    .filter(p => p.unidadNegocio === catalogo.negocio && !yaAgregados.has(p.id))
    .filter(p => normalizarTexto(p.nombre).includes(patron))
    .slice(0, 8)
})

function agregar(producto: Producto): void {
  sesion.value.push({ producto, cantidadNueva: producto.stockActual })
  textoBusqueda.value = ''
}

function quitar(productoId: string): void {
  sesion.value = sesion.value.filter(i => i.producto.id !== productoId)
}

const cambios = computed(() =>
  sesion.value.filter(i => i.cantidadNueva !== i.producto.stockActual),
)

async function aplicar(): Promise<void> {
  error.value = ''
  if (cambios.value.length === 0) {
    error.value = 'No hay cambios que aplicar.'
    return
  }
  if (motivo.value === 'otro' && !nota.value.trim()) {
    error.value = 'Escribe una nota cuando el motivo es "Otro".'
    return
  }
  if (cambios.value.some(i => i.cantidadNueva < 0)) {
    error.value = 'Ningún producto puede quedar con stock negativo.'
    return
  }

  enviando.value = true
  try {
    const cantidad = await inventarioService.aplicarAjustes(
      cambios.value.map(i => ({
        productoId: i.producto.id,
        cantidadNueva: i.cantidadNueva,
      })),
      motivo.value,
      nota.value.trim() || null,
    )
    notificar(
      `${cantidad} producto${cantidad === 1 ? '' : 's'} ajustado${cantidad === 1 ? '' : 's'}`,
    )
    emit('aplicado')
  } catch (err) {
    error.value =
      err instanceof ErrorDominio ? err.message : 'No se pudo aplicar el ajuste.'
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <ModalBase titulo="Ajustar stock (conteo)" @cerrar="emit('cerrar')">
    <div class="mm-ajuste">
      <CampoTexto
        v-model="textoBusqueda"
        etiqueta="Agregar producto"
        placeholder="Busca por nombre"
      />

      <ul
        v-if="resultadosBusqueda.length > 0"
        class="mm-ajuste__resultados list-unstyled"
      >
        <li v-for="producto in resultadosBusqueda" :key="producto.id">
          <button type="button" class="mm-ajuste__resultado" @click="agregar(producto)">
            {{ producto.nombre }}
            <span class="mm-ajuste__resultado-stock"
              >stock actual: {{ producto.stockActual }}</span
            >
          </button>
        </li>
      </ul>

      <p v-if="sesion.length === 0" class="mm-ajuste__vacio">
        Agrega los productos que vas contando. Se aplican todos juntos al final.
      </p>

      <ul v-else class="mm-ajuste__sesion list-unstyled">
        <li v-for="item in sesion" :key="item.producto.id" class="mm-ajuste__item">
          <span class="mm-ajuste__item-nombre">{{ item.producto.nombre }}</span>
          <span class="mm-ajuste__item-anterior"
            >era {{ item.producto.stockActual }}</span
          >
          <CampoNumero
            v-model="item.cantidadNueva"
            etiqueta="Nueva cantidad"
            :step="item.producto.unidadMedida === 'KG' ? 0.001 : 1"
            :min="0"
          />
          <button
            type="button"
            class="mm-ajuste__quitar"
            @click="quitar(item.producto.id)"
          >
            Quitar
          </button>
        </li>
      </ul>

      <div class="mm-ajuste__campo">
        <label class="mm-ajuste__etiqueta" for="motivo-ajuste">Motivo</label>
        <select id="motivo-ajuste" v-model="motivo" class="mm-ajuste__select">
          <option v-for="op in OPCIONES_MOTIVO" :key="op.valor" :value="op.valor">
            {{ op.etiqueta }}
          </option>
        </select>
      </div>

      <CampoTexto
        v-model="nota"
        :etiqueta="motivo === 'otro' ? 'Nota (obligatoria)' : 'Nota (opcional)'"
      />

      <p v-if="error" class="mm-ajuste__error" role="alert">{{ error }}</p>

      <BotonPrimario
        :cargando="enviando"
        :deshabilitado="cambios.length === 0"
        @click="aplicar"
      >
        Aplicar {{ cambios.length }} ajuste{{ cambios.length === 1 ? '' : 's' }}
      </BotonPrimario>
    </div>
  </ModalBase>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-ajuste {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mm-ajuste__resultados {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: -8px;
}

.mm-ajuste__resultado {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: v.$objetivo-tactil-min;
  padding: 8px 12px;
  border: 1px solid v.$borde;
  border-radius: v.$radio-sm;
  background-color: v.$superficie;
  cursor: pointer;
  text-align: left;

  &:hover {
    background-color: v.$acento-suave;
  }
}

.mm-ajuste__resultado-stock {
  font-size: 12px;
  color: v.$tenue;
}

.mm-ajuste__vacio {
  margin: 0;
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
}

.mm-ajuste__sesion {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mm-ajuste__item {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border: 1px solid v.$borde;
  border-radius: v.$radio-sm;
}

.mm-ajuste__item-nombre {
  font-weight: v.$peso-semi;
  grid-column: 1 / -1;
}

.mm-ajuste__item-anterior {
  font-size: 12px;
  color: v.$tenue;
}

.mm-ajuste__quitar {
  grid-column: 1 / -1;
  justify-self: start;
  background: none;
  border: none;
  color: v.$error;
  font-size: 12px;
  cursor: pointer;
}

.mm-ajuste__campo {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mm-ajuste__etiqueta {
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-semi;
  color: v.$tenue;
}

.mm-ajuste__select {
  min-height: v.$objetivo-tactil-min;
  padding: 0 14px;
  border: 1px solid v.$borde;
  border-radius: v.$radio-md;
  background-color: v.$superficie;
  font-size: v.$tam-cuerpo;
}

.mm-ajuste__error {
  margin: 0;
  color: v.$error;
  font-size: v.$tam-etiqueta;
}
</style>
