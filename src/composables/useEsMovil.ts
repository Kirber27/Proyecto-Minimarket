import { onBeforeUnmount, ref, type Ref } from 'vue'

const CONSULTA_ESCRITORIO = '(min-width: 768px)'

/**
 * `true` mientras el ancho de la ventana sea menor a 768px. Usa
 * `matchMedia`, no el evento `resize`: `matchMedia` dispara solo al cruzar el
 * corte, `resize` dispara en cada pixel.
 */
export function useEsMovil(): Ref<boolean> {
  const medios = window.matchMedia(CONSULTA_ESCRITORIO)
  const esMovil = ref(!medios.matches)

  function actualizar(evento: MediaQueryListEvent): void {
    esMovil.value = !evento.matches
  }

  medios.addEventListener('change', actualizar)
  onBeforeUnmount(() => medios.removeEventListener('change', actualizar))

  return esMovil
}
