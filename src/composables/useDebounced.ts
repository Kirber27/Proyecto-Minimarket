import { ref, watch, type Ref } from 'vue'

/**
 * Deriva de `fuente` un ref que se actualiza `demoraMs` despues del ultimo
 * cambio. `fuente` sigue actualizandose al instante (para que el campo de
 * texto no se sienta trabado); lo que se retrasa es el valor derivado, que
 * es el que dispara la busqueda.
 */
export function useDebounced<T>(fuente: Ref<T>, demoraMs = 150): Ref<T> {
  const resultado = ref(fuente.value) as Ref<T>
  let temporizador: ReturnType<typeof setTimeout> | undefined

  watch(
    fuente,
    nuevoValor => {
      clearTimeout(temporizador)
      temporizador = setTimeout(() => {
        resultado.value = nuevoValor
      }, demoraMs)
    },
    { flush: 'sync' },
  )

  return resultado
}
