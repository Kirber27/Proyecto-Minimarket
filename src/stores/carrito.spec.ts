import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/ventasService', () => ({
  crear: vi.fn(),
}))

// useCarritoStore importa useCatalogoStore, que importa catalogoService, que
// importa el cliente real de Supabase: sin mockearlo, intenta crear un
// cliente real (WebSocket, storage) en el entorno de pruebas.
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  },
}))

import * as ventasService from '@/services/ventasService'
import { aCentavos } from '@/lib/money'
import { useCarritoStore } from '@/stores/carrito'
import { useTasaStore } from '@/stores/tasa'
import type { Producto } from '@/types/dominio'

function producto(overrides: Partial<Producto>): Producto {
  return {
    id: 'p1',
    sku: null,
    nombre: 'Producto',
    categoriaId: 'viveres',
    unidadNegocio: 'bodega',
    unidadMedida: 'UND',
    precioVentaUsd: aCentavos(1),
    costoUsd: null,
    stockActual: 10,
    stockMinimo: 5,
    activo: true,
    origen: null,
    ...overrides,
  }
}

function crearLocalStorageEnMemoria(): Storage {
  const almacen = new Map<string, string>()
  return {
    getItem: clave => almacen.get(clave) ?? null,
    setItem: (clave, valor) => void almacen.set(clave, valor),
    removeItem: clave => void almacen.delete(clave),
    clear: () => almacen.clear(),
    key: indice => Array.from(almacen.keys())[indice] ?? null,
    get length() {
      return almacen.size
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('localStorage', crearLocalStorageEnMemoria())
  vi.stubGlobal('crypto', { randomUUID: () => 'uuid-de-prueba' })
  setActivePinia(createPinia())
})

describe('agregar', () => {
  it('agrega una linea nueva con el subtotal calculado', () => {
    const carrito = useCarritoStore()
    carrito.agregar(producto({ id: 'p1', precioVentaUsd: aCentavos(1.57) }), 3)

    expect(carrito.lineas).toHaveLength(1)
    expect(carrito.lineas[0]?.cantidad).toBe(3)
    expect(carrito.lineas[0]?.subtotalUsd).toBe(aCentavos(4.71))
  })

  it('suma cantidades si el producto ya estaba en el carrito', () => {
    const carrito = useCarritoStore()
    const p = producto({ id: 'p1' })
    carrito.agregar(p, 1)
    carrito.agregar(p, 1)

    expect(carrito.lineas).toHaveLength(1)
    expect(carrito.lineas[0]?.cantidad).toBe(2)
  })

  it('no permite agregar mas unidades que el stock disponible', () => {
    const carrito = useCarritoStore()
    carrito.agregar(producto({ id: 'p1', nombre: 'Harina', stockActual: 2 }), 5)

    expect(carrito.lineas).toHaveLength(0)
    expect(carrito.error).toContain('Harina')
  })

  it('quita la linea cuando la cantidad llega a cero', () => {
    const carrito = useCarritoStore()
    const p = producto({ id: 'p1' })
    carrito.agregar(p, 2)
    carrito.agregar(p, -2)

    expect(carrito.lineas).toHaveLength(0)
  })
})

describe('totales', () => {
  it('el total de 3 lineas es la suma de los subtotales', () => {
    const carrito = useCarritoStore()
    carrito.agregar(producto({ id: 'p1', precioVentaUsd: aCentavos(1.57) }), 1)
    carrito.agregar(producto({ id: 'p2', precioVentaUsd: aCentavos(1.3) }), 1)
    carrito.agregar(producto({ id: 'p3', precioVentaUsd: aCentavos(1.6) }), 1)

    expect(carrito.totalUsd).toBe(aCentavos(4.47))
  })

  it('calcula el vuelto cuando el pago supera el total', () => {
    const carrito = useCarritoStore()
    carrito.agregar(producto({ id: 'p1', precioVentaUsd: aCentavos(1.57) }), 1)
    carrito.agregarMetodoPago('efectivo-usd')
    carrito.actualizarMontoPago(0, aCentavos(2))

    expect(carrito.vueltoUsd).toBe(aCentavos(0.43))
    expect(carrito.faltaUsd).toBe(0)
  })

  it('falta refleja lo que resta por cubrir', () => {
    const carrito = useCarritoStore()
    carrito.agregar(producto({ id: 'p1', precioVentaUsd: aCentavos(5) }), 1)
    carrito.agregarMetodoPago('efectivo-usd')
    carrito.actualizarMontoPago(0, aCentavos(2))

    expect(carrito.faltaUsd).toBe(aCentavos(3))
  })
})

describe('puedeConfirmar', () => {
  it('es falso con el carrito vacio', () => {
    const carrito = useCarritoStore()
    expect(carrito.puedeConfirmar).toBe(false)
  })

  it('es falso si falta pago y no hay cliente para fiado', () => {
    const carrito = useCarritoStore()
    carrito.agregar(producto({ id: 'p1', precioVentaUsd: aCentavos(5) }), 1)
    expect(carrito.puedeConfirmar).toBe(false)
  })

  it('es verdadero si el pago cubre el total', () => {
    const carrito = useCarritoStore()
    carrito.agregar(producto({ id: 'p1', precioVentaUsd: aCentavos(5) }), 1)
    carrito.agregarMetodoPago('efectivo-usd')
    expect(carrito.puedeConfirmar).toBe(true)
  })

  it('es verdadero si falta pago pero hay cliente elegido (fiado)', () => {
    const carrito = useCarritoStore()
    carrito.agregar(producto({ id: 'p1', precioVentaUsd: aCentavos(5) }), 1)
    carrito.clienteId = 'cliente-1'
    expect(carrito.puedeConfirmar).toBe(true)
  })
})

describe('confirmar', () => {
  it('reinicia el carrito tras una venta exitosa', async () => {
    const tasa = useTasaStore()
    tasa.vigente = { valor: 800, vigenteDesde: new Date().toISOString() }

    vi.mocked(ventasService.crear).mockResolvedValue({
      id: 'v1',
      correlativo: 1,
      unidadNegocio: 'bodega',
      totalUsd: aCentavos(5),
      tasaAplicada: 800,
      unidades: 1,
      clienteId: null,
      anulada: false,
      anuladaMotivo: null,
      creadoEn: new Date().toISOString(),
    })

    const carrito = useCarritoStore()
    carrito.agregar(producto({ id: 'p1', precioVentaUsd: aCentavos(5) }), 1)
    carrito.agregarMetodoPago('efectivo-usd')

    await carrito.confirmar()

    expect(carrito.lineas).toHaveLength(0)
    expect(carrito.pagos).toHaveLength(0)
  })

  it('lanza sin_tasa si no hay tasa vigente', async () => {
    const carrito = useCarritoStore()
    carrito.agregar(producto({ id: 'p1', precioVentaUsd: aCentavos(5) }), 1)
    carrito.agregarMetodoPago('efectivo-usd')

    await expect(carrito.confirmar()).rejects.toMatchObject({ codigo: 'venta.sin_tasa' })
  })
})
