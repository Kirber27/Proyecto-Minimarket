<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { useCatalogoStore } from '@/stores/catalogo'
import * as catalogoService from '@/services/catalogoService'
import { notificar } from '@/composables/useNotificaciones'
import { ErrorDominio } from '@/lib/errorDominio'
import type { Categoria } from '@/types/dominio'
import BotonPrimario from '@/components/ui/BotonPrimario.vue'
import BotonSecundario from '@/components/ui/BotonSecundario.vue'
import CampoTexto from '@/components/ui/CampoTexto.vue'
import CajaIniciales from '@/components/dominio/CajaIniciales.vue'
import ModalBase from '@/components/ui/ModalBase.vue'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import Icono from '@/components/ui/Icono.vue'

const catalogo = useCatalogoStore()
const conteos = ref<Record<string, number>>({})
const cargando = ref(true)

const modalNuevaAbierto = ref(false)
const nombreNuevo = ref('')
const errorNuevo = ref('')
const guardandoNuevo = ref(false)

const editando = ref<Categoria | null>(null)
const nombreEditado = ref('')
const errorEdicion = ref('')

const reasignando = ref<Categoria | null>(null)
const destinoReasignacion = ref('')
const errorReasignacion = ref('')

async function cargarTodo(): Promise<void> {
  cargando.value = true
  try {
    await catalogo.cargar()
    conteos.value = await catalogoService.contarProductosPorCategoria()
  } catch (err) {
    notificar(
      err instanceof ErrorDominio ? err.message : 'No se pudo cargar las categorías.',
    )
  } finally {
    cargando.value = false
  }
}

onMounted(cargarTodo)

const categoriasOrdenadas = computed(() =>
  [...catalogo.categorias].sort((a, b) => a.orden - b.orden),
)

function abrirNueva(): void {
  nombreNuevo.value = ''
  errorNuevo.value = ''
  modalNuevaAbierto.value = true
}

async function crearCategoria(): Promise<void> {
  errorNuevo.value = ''
  if (!nombreNuevo.value.trim()) {
    errorNuevo.value = 'Ponle un nombre a la categoría.'
    return
  }

  guardandoNuevo.value = true
  try {
    const nueva = await catalogoService.crearCategoria({
      nombre: nombreNuevo.value.trim(),
      unidadNegocio: catalogo.negocio,
    })
    catalogo.categorias.push(nueva)
    conteos.value[nueva.id] = 0
    modalNuevaAbierto.value = false
    notificar('Categoría creada')
  } catch (err) {
    errorNuevo.value =
      err instanceof ErrorDominio ? err.message : 'No se pudo crear la categoría.'
  } finally {
    guardandoNuevo.value = false
  }
}

function empezarEdicion(categoria: Categoria): void {
  editando.value = categoria
  nombreEditado.value = categoria.nombre
  errorEdicion.value = ''
}

async function guardarEdicion(): Promise<void> {
  if (!editando.value) return
  errorEdicion.value = ''
  if (!nombreEditado.value.trim()) {
    errorEdicion.value = 'El nombre no puede quedar vacío.'
    return
  }
  try {
    await catalogoService.renombrarCategoria(
      editando.value.id,
      nombreEditado.value.trim(),
    )
    editando.value.nombre = nombreEditado.value.trim()
    editando.value = null
  } catch (err) {
    errorEdicion.value =
      err instanceof ErrorDominio ? err.message : 'No se pudo renombrar la categoría.'
  }
}

function pedirDesactivar(categoria: Categoria): void {
  const cantidad = conteos.value[categoria.id] ?? 0
  if (cantidad === 0) {
    void desactivarSinProductos(categoria)
    return
  }
  reasignando.value = categoria
  destinoReasignacion.value = ''
  errorReasignacion.value = ''
}

async function desactivarSinProductos(categoria: Categoria): Promise<void> {
  try {
    await catalogoService.desactivarCategoria(categoria.id)
    categoria.activo = false
    notificar('Categoría desactivada')
  } catch (err) {
    notificar(err instanceof ErrorDominio ? err.message : 'No se pudo desactivar.')
  }
}

async function confirmarReasignacion(): Promise<void> {
  if (!reasignando.value) return
  errorReasignacion.value = ''
  if (!destinoReasignacion.value) {
    errorReasignacion.value = 'Elige a qué categoría se van los productos.'
    return
  }

  try {
    await catalogoService.reasignarYDesactivarCategoria(
      reasignando.value.id,
      destinoReasignacion.value,
    )
    reasignando.value.activo = false
    for (const producto of catalogo.productos) {
      if (producto.categoriaId === reasignando.value.id) {
        producto.categoriaId = destinoReasignacion.value
      }
    }
    notificar('Productos reasignados y categoría desactivada')
    reasignando.value = null
  } catch (err) {
    errorReasignacion.value =
      err instanceof ErrorDominio ? err.message : 'No se pudo reasignar los productos.'
  }
}
</script>

<template>
  <div class="mm-categorias">
    <div class="mm-categorias__cabecera">
      <BotonPrimario @click="abrirNueva">Nueva categoría</BotonPrimario>
    </div>

    <EstadoVacio
      v-if="!cargando && categoriasOrdenadas.length === 0"
      titulo="Todavía no hay categorías"
    />

    <ul v-else class="mm-categorias__lista list-unstyled">
      <li
        v-for="categoria in categoriasOrdenadas"
        :key="categoria.id"
        class="mm-categorias__fila"
      >
        <div class="mm-categorias__info">
          <CajaIniciales
            :nombre="categoria.nombre"
            :matiz="categoria.matiz"
            :tamano="40"
          />
          <div class="mm-categorias__texto">
            <span class="mm-categorias__nombre">{{ categoria.nombre }}</span>
            <span class="mm-categorias__meta">
              {{ conteos[categoria.id] ?? 0 }} producto(s)
              <span v-if="!categoria.activo" class="mm-categorias__inactiva"
                >· Inactiva</span
              >
            </span>
          </div>
        </div>

        <div class="mm-categorias__acciones">
          <button
            type="button"
            class="mm-categorias__icono-boton"
            :aria-label="`Renombrar ${categoria.nombre}`"
            @click="empezarEdicion(categoria)"
          >
            <Icono nombre="editar" :tamano="17" />
          </button>
          <button
            v-if="categoria.activo"
            type="button"
            class="mm-categorias__icono-boton mm-categorias__icono-boton--peligro"
            :aria-label="`Desactivar ${categoria.nombre}`"
            @click="pedirDesactivar(categoria)"
          >
            <Icono nombre="desactivar" :tamano="17" />
          </button>
        </div>
      </li>
    </ul>

    <ModalBase
      v-if="modalNuevaAbierto"
      titulo="Nueva categoría"
      @cerrar="modalNuevaAbierto = false"
    >
      <form class="mm-categorias__form" @submit.prevent="crearCategoria">
        <CampoTexto v-model="nombreNuevo" etiqueta="Nombre" :error="errorNuevo" />
        <BotonPrimario type="submit" :cargando="guardandoNuevo">Crear</BotonPrimario>
      </form>
    </ModalBase>

    <ModalBase v-if="editando" titulo="Renombrar categoría" @cerrar="editando = null">
      <form class="mm-categorias__form" @submit.prevent="guardarEdicion">
        <CampoTexto v-model="nombreEditado" etiqueta="Nombre" :error="errorEdicion" />
        <div class="mm-categorias__form-acciones">
          <BotonPrimario type="submit">Guardar</BotonPrimario>
          <BotonSecundario type="button" @click="editando = null"
            >Cancelar</BotonSecundario
          >
        </div>
      </form>
    </ModalBase>

    <ModalBase
      v-if="reasignando"
      :titulo="`Reasignar productos de ${reasignando.nombre}`"
      @cerrar="reasignando = null"
    >
      <form class="mm-categorias__form" @submit.prevent="confirmarReasignacion">
        <p class="mm-categorias__ayuda">
          Esta categoría tiene {{ conteos[reasignando.id] ?? 0 }} producto(s). Elige a qué
          categoría se van antes de desactivarla.
        </p>
        <div class="mm-categorias__campo">
          <label class="mm-categorias__etiqueta" for="destino">Categoría destino</label>
          <select
            id="destino"
            v-model="destinoReasignacion"
            class="mm-categorias__select"
          >
            <option value="" disabled>Elige una categoría</option>
            <option
              v-for="cat in categoriasOrdenadas.filter(
                c => c.id !== reasignando?.id && c.activo,
              )"
              :key="cat.id"
              :value="cat.id"
            >
              {{ cat.nombre }}
            </option>
          </select>
        </div>
        <p v-if="errorReasignacion" class="mm-categorias__error" role="alert">
          {{ errorReasignacion }}
        </p>
        <BotonPrimario type="submit">Reasignar y desactivar</BotonPrimario>
      </form>
    </ModalBase>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;

.mm-categorias__cabecera {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.mm-categorias__lista {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mm-categorias__fila {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid v.$borde;
  flex-wrap: wrap;
}

.mm-categorias__info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.mm-categorias__texto {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.mm-categorias__nombre {
  font-weight: v.$peso-semi;
  color: v.$tinta;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mm-categorias__meta {
  font-size: v.$tam-etiqueta;
  color: v.$tenue;
}

.mm-categorias__acciones {
  display: flex;
  align-items: center;
  gap: 8px;
  // Empuja las acciones al final de la fila sin importar cuanto ocupe el
  // resto (nombre, chip, conteo): estructura mas ordenada y predecible.
  margin-left: auto;
  flex-shrink: 0;
}

.mm-categorias__inactiva {
  color: v.$error;
  font-weight: v.$peso-semi;
}

.mm-categorias__icono-boton {
  flex-shrink: 0;
  width: v.$objetivo-tactil-min;
  height: v.$objetivo-tactil-min;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: v.$radio-sm;
  border: 1px solid v.$borde;
  background-color: v.$superficie;
  color: v.$acento-hover;
  cursor: pointer;

  &:hover {
    background-color: v.$acento-suave;
  }

  &--peligro {
    color: v.$error;

    &:hover {
      background-color: v.$error-bg;
    }
  }
}

.mm-categorias__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mm-categorias__form-acciones {
  display: flex;
  gap: 10px;
}

.mm-categorias__ayuda {
  color: v.$tenue;
  margin: 0;
}

.mm-categorias__campo {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mm-categorias__etiqueta {
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-semi;
  color: v.$tenue;
}

.mm-categorias__select {
  min-height: v.$objetivo-tactil-min;
  padding: 0 14px;
  border: 1px solid v.$borde;
  border-radius: v.$radio-md;
  background-color: v.$superficie;
  font-size: v.$tam-cuerpo;
}

.mm-categorias__error {
  color: v.$error;
  margin: 0;
}
</style>
