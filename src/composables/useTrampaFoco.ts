import { onBeforeUnmount, onMounted, type Ref } from 'vue'

/** Atrapa el foco de teclado dentro de refPanel mientras el componente que
 * llama esta activo (dialogo, hoja lateral): Tab/Shift+Tab no se escapan,
 * Escape dispara alCerrar, y al desmontar se devuelve el foco a quien lo
 * tenia antes de abrir. Usado por ModalBase y CarritoLateral. */
export function useTrampaFoco(
  refPanel: Ref<HTMLElement | null>,
  alCerrar: () => void,
): void {
  let elementoConFocoPrevio: HTMLElement | null = null

  function seleccionarFocables(): HTMLElement[] {
    if (!refPanel.value) return []
    return Array.from(
      refPanel.value.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      ),
    )
  }

  function alPresionarTecla(evento: KeyboardEvent): void {
    if (evento.key === 'Escape') {
      alCerrar()
      return
    }
    if (evento.key !== 'Tab') return

    const focables = seleccionarFocables()
    if (focables.length === 0) return

    const primero = focables[0]!
    const ultimo = focables[focables.length - 1]!

    if (evento.shiftKey && document.activeElement === primero) {
      evento.preventDefault()
      ultimo.focus()
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault()
      primero.focus()
    }
  }

  onMounted(() => {
    elementoConFocoPrevio = document.activeElement as HTMLElement | null
    document.addEventListener('keydown', alPresionarTecla)
    seleccionarFocables()[0]?.focus()
  })

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', alPresionarTecla)
    elementoConFocoPrevio?.focus()
  })
}
