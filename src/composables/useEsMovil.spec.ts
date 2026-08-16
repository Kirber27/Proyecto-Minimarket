import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'

import { useEsMovil } from '@/composables/useEsMovil'

function mockMatchMedia(coincide: boolean) {
  const listeners = new Set<(evento: MediaQueryListEvent) => void>()

  const medios = {
    matches: coincide,
    media: '(min-width: 768px)',
    addEventListener: vi.fn((_evento: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.add(cb)
    }),
    removeEventListener: vi.fn(
      (_evento: string, cb: (e: MediaQueryListEvent) => void) => {
        listeners.delete(cb)
      },
    ),
  }

  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(medios))

  function disparar(coincideAhora: boolean) {
    listeners.forEach(cb => cb({ matches: coincideAhora } as MediaQueryListEvent))
  }

  return { medios, disparar }
}

const Anfitrion = defineComponent({
  setup() {
    const esMovil = useEsMovil()
    return () => h('span', String(esMovil.value))
  },
})

describe('useEsMovil', () => {
  it('es true cuando el ancho es menor a 768px', () => {
    mockMatchMedia(false)
    const wrapper = mount(Anfitrion)
    expect(wrapper.text()).toBe('true')
  })

  it('es false cuando el ancho es 768px o mayor', () => {
    mockMatchMedia(true)
    const wrapper = mount(Anfitrion)
    expect(wrapper.text()).toBe('false')
  })

  it('reacciona al cruzar el corte de 768px via matchMedia change', async () => {
    const { disparar } = mockMatchMedia(false)
    const wrapper = mount(Anfitrion)
    expect(wrapper.text()).toBe('true')

    disparar(true)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toBe('false')
  })

  it('quita el listener al desmontar', () => {
    const { medios } = mockMatchMedia(false)
    const wrapper = mount(Anfitrion)
    wrapper.unmount()
    expect(medios.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    )
  })
})
