import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import * as catalogoService from '@/services/catalogoService'
import { normalizarTexto } from '@/lib/texto'
import type { Categoria, Producto, ProductoInput, UnidadNegocio } from '@/types/dominio'

const CLAVE_NEGOCIO = 'mm_unidad_negocio'

function leerNegocioGuardado(): UnidadNegocio {
  const guardado = localStorage.getItem(CLAVE_NEGOCIO)
  return guardado === 'bodega' || guardado === 'cerveza' || guardado === 'thais'
    ? guardado
    : 'bodega'
}

export const useCatalogoStore = defineStore('catalogo', () => {
  const productos = ref<Producto[]>([])
  const categorias = ref<Categoria[]>([])
  const negocio = ref<UnidadNegocio>(leerNegocioGuardado())
  const cargando = ref(false)

  const porCategoria = computed(() => {
    const grupos = new Map<string, Producto[]>()
    for (const producto of productos.value) {
      const lista = grupos.get(producto.categoriaId) ?? []
      lista.push(producto)
      grupos.set(producto.categoriaId, lista)
    }
    return grupos
  })

  /** Productos activos de la unidad de negocio activa (requisitos 2.10, 4.3). */
  const activos = computed(() =>
    productos.value.filter(p => p.activo && p.unidadNegocio === negocio.value),
  )

  function cambiarNegocio(nueva: UnidadNegocio): void {
    negocio.value = nueva
    localStorage.setItem(CLAVE_NEGOCIO, nueva)
  }

  /**
   * Filtra en memoria por texto (nombre o SKU, sin distinguir tildes ni
   * mayusculas) y por categoria. `categoriaId` vacio o "todas" no filtra.
   */
  function buscar(texto: string, categoriaId?: string): Producto[] {
    const patron = normalizarTexto(texto.trim())
    const filtroCategoria = categoriaId && categoriaId !== 'todas' ? categoriaId : null

    return activos.value.filter(producto => {
      if (filtroCategoria && producto.categoriaId !== filtroCategoria) return false
      if (!patron) return true
      const enNombre = normalizarTexto(producto.nombre).includes(patron)
      const enSku = producto.sku ? normalizarTexto(producto.sku).includes(patron) : false
      return enNombre || enSku
    })
  }

  async function cargar(): Promise<void> {
    cargando.value = true
    try {
      const catalogo = await catalogoService.listar()
      productos.value = catalogo.productos
      categorias.value = catalogo.categorias
    } finally {
      cargando.value = false
    }
  }

  async function guardar(input: ProductoInput, id?: string): Promise<Producto> {
    const producto = id
      ? await catalogoService.actualizar(id, input)
      : await catalogoService.crear(input)

    const indice = productos.value.findIndex(p => p.id === producto.id)
    if (indice === -1) {
      productos.value.push(producto)
    } else {
      productos.value[indice] = producto
    }
    return producto
  }

  async function desactivar(id: string): Promise<void> {
    await catalogoService.desactivar(id)
    const producto = productos.value.find(p => p.id === id)
    if (producto) producto.activo = false
  }

  return {
    productos,
    categorias,
    negocio,
    cargando,
    porCategoria,
    activos,
    cambiarNegocio,
    buscar,
    cargar,
    guardar,
    desactivar,
  }
})
