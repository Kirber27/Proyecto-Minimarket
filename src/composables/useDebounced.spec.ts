import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { useDebounced } from '@/composables/useDebounced'

describe('useDebounced', () => {
  it('no actualiza el valor derivado antes de que pase la demora', () => {
    vi.useFakeTimers()
    const fuente = ref('a')
    const derivado = useDebounced(fuente, 150)

    fuente.value = 'ab'
    vi.advanceTimersByTime(100)
    expect(derivado.value).toBe('a')

    vi.useRealTimers()
  })

  it('actualiza el valor derivado despues de la demora', () => {
    vi.useFakeTimers()
    const fuente = ref('a')
    const derivado = useDebounced(fuente, 150)

    fuente.value = 'ab'
    vi.advanceTimersByTime(150)
    expect(derivado.value).toBe('ab')

    vi.useRealTimers()
  })

  it('reinicia el temporizador con cada cambio, solo queda el ultimo valor', () => {
    vi.useFakeTimers()
    const fuente = ref('a')
    const derivado = useDebounced(fuente, 150)

    fuente.value = 'ab'
    vi.advanceTimersByTime(100)
    fuente.value = 'abc'
    vi.advanceTimersByTime(100)
    expect(derivado.value).toBe('a')

    vi.advanceTimersByTime(50)
    expect(derivado.value).toBe('abc')

    vi.useRealTimers()
  })
})
