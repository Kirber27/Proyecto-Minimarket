import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'

export interface ItemVirtual<T> {
  item: T
  indice: number
}

/**
 * Ventana de desplazamiento simple, sin dependencias (ver
 * .claude/specs/03-catalogo-productos/design.md): asume una altura fija por
 * elemento, que alcanza para tarjetas y filas de una lista de productos.
 */
export function useListaVirtual<T>(items: Ref<T[]>, alturaItem: number, margen = 4) {
  const refContenedor = ref<HTMLElement | null>(null)
  const scrollTop = ref(0)
  const alturaContenedor = ref(0)
  let observador: ResizeObserver | null = null

  function alHacerScroll(): void {
    if (refContenedor.value) scrollTop.value = refContenedor.value.scrollTop
  }

  onMounted(() => {
    const contenedor = refContenedor.value
    if (!contenedor) return

    alturaContenedor.value = contenedor.clientHeight
    contenedor.addEventListener('scroll', alHacerScroll, { passive: true })

    observador = new ResizeObserver(() => {
      alturaContenedor.value = contenedor.clientHeight
    })
    observador.observe(contenedor)
  })

  onUnmounted(() => {
    refContenedor.value?.removeEventListener('scroll', alHacerScroll)
    observador?.disconnect()
  })

  const indiceInicio = computed(() =>
    Math.max(0, Math.floor(scrollTop.value / alturaItem) - margen),
  )
  const cantidadVisible = computed(
    () => Math.ceil(alturaContenedor.value / alturaItem) + margen * 2,
  )
  const indiceFin = computed(() =>
    Math.min(items.value.length, indiceInicio.value + cantidadVisible.value),
  )

  const visibles = computed<ItemVirtual<T>[]>(() =>
    items.value
      .slice(indiceInicio.value, indiceFin.value)
      .map((item, i) => ({ item, indice: indiceInicio.value + i })),
  )

  const alturaTotal = computed(() => items.value.length * alturaItem)
  const offsetSuperior = computed(() => indiceInicio.value * alturaItem)

  return { refContenedor, visibles, alturaTotal, offsetSuperior }
}
