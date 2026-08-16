import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/catalogoService', () => ({
  listar: vi.fn(),
  crear: vi.fn(),
  actualizar: vi.fn(),
  desactivar: vi.fn(),
}))

import * as catalogoService from '@/services/catalogoService'
import { aCentavos } from '@/lib/money'
import { useCatalogoStore } from '@/stores/catalogo'
import type { Producto } from '@/types/dominio'

function producto(overrides: Partial<Producto>): Producto {
  return {
    id: overrides.id ?? 'p1',
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

// Node >=22 trae su propio `localStorage` experimental, que en este entorno
// bloquea a happy-dom para instalar el suyo (globalThis.localStorage queda
// no configurable). En el navegador real esto no pasa; aqui se sustituye por
// un stub en memoria para poder probar la persistencia.
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
  setActivePinia(createPinia())
})

describe('buscar', () => {
  it('encuentra "CAFÉ AMANECER PQ" al buscar "cafe", sin tildes', async () => {
    vi.mocked(catalogoService.listar).mockResolvedValue({
      productos: [
        producto({ id: 'p1', nombre: 'CAFÉ AMANECER PQ' }),
        producto({ id: 'p2', nombre: 'Harina P.A.N' }),
      ],
      categorias: [],
    })

    const catalogo = useCatalogoStore()
    await catalogo.cargar()

    const resultados = catalogo.buscar('cafe')
    expect(resultados).toHaveLength(1)
    expect(resultados[0]?.nombre).toBe('CAFÉ AMANECER PQ')
  })

  it('filtra por categoria ademas del texto', async () => {
    vi.mocked(catalogoService.listar).mockResolvedValue({
      productos: [
        producto({ id: 'p1', nombre: 'Café Madrid', categoriaId: 'bebidas' }),
        producto({ id: 'p2', nombre: 'Café Amanecer', categoriaId: 'viveres' }),
      ],
      categorias: [],
    })

    const catalogo = useCatalogoStore()
    await catalogo.cargar()

    const resultados = catalogo.buscar('cafe', 'bebidas')
    expect(resultados.map(p => p.id)).toEqual(['p1'])
  })

  it('busca tambien por SKU', async () => {
    vi.mocked(catalogoService.listar).mockResolvedValue({
      productos: [producto({ id: 'p1', nombre: 'Harina P.A.N', sku: 'harina-p-a-n' })],
      categorias: [],
    })

    const catalogo = useCatalogoStore()
    await catalogo.cargar()

    expect(catalogo.buscar('harina-p-a').map(p => p.id)).toEqual(['p1'])
  })

  it('solo devuelve productos activos de la unidad de negocio activa', async () => {
    vi.mocked(catalogoService.listar).mockResolvedValue({
      productos: [
        producto({
          id: 'p1',
          nombre: 'Activo bodega',
          activo: true,
          unidadNegocio: 'bodega',
        }),
        producto({
          id: 'p2',
          nombre: 'Inactivo',
          activo: false,
          unidadNegocio: 'bodega',
        }),
        producto({
          id: 'p3',
          nombre: 'Otra unidad',
          activo: true,
          unidadNegocio: 'cerveza',
        }),
      ],
      categorias: [],
    })

    const catalogo = useCatalogoStore()
    await catalogo.cargar()

    expect(catalogo.buscar('').map(p => p.id)).toEqual(['p1'])
  })
})

describe('cambiarNegocio', () => {
  it('persiste la unidad de negocio en localStorage', () => {
    const catalogo = useCatalogoStore()
    catalogo.cambiarNegocio('cerveza')
    expect(localStorage.getItem('mm_unidad_negocio')).toBe('cerveza')
  })

  it('lee la unidad guardada al crear el store', () => {
    localStorage.setItem('mm_unidad_negocio', 'thais')
    const catalogo = useCatalogoStore()
    expect(catalogo.negocio).toBe('thais')
  })
})

describe('guardar', () => {
  it('agrega el producto nuevo a la lista', async () => {
    const nuevo = producto({ id: 'nuevo' })
    vi.mocked(catalogoService.crear).mockResolvedValue(nuevo)

    const catalogo = useCatalogoStore()
    await catalogo.guardar({
      nombre: nuevo.nombre,
      categoriaId: nuevo.categoriaId,
      unidadNegocio: nuevo.unidadNegocio,
      unidadMedida: nuevo.unidadMedida,
      precioVentaUsd: nuevo.precioVentaUsd,
      costoUsd: null,
      stockActual: 0,
      stockMinimo: 5,
      activo: true,
    })

    expect(catalogo.productos).toHaveLength(1)
    expect(catalogo.productos[0]?.id).toBe('nuevo')
  })

  it('reemplaza el producto existente al editar', async () => {
    const original = producto({ id: 'p1', nombre: 'Original' })
    const editado = producto({ id: 'p1', nombre: 'Editado' })
    vi.mocked(catalogoService.listar).mockResolvedValue({
      productos: [original],
      categorias: [],
    })
    vi.mocked(catalogoService.actualizar).mockResolvedValue(editado)

    const catalogo = useCatalogoStore()
    await catalogo.cargar()
    await catalogo.guardar(
      {
        nombre: 'Editado',
        categoriaId: original.categoriaId,
        unidadNegocio: original.unidadNegocio,
        unidadMedida: original.unidadMedida,
        precioVentaUsd: original.precioVentaUsd,
        costoUsd: null,
        stockActual: 0,
        stockMinimo: 5,
        activo: true,
      },
      'p1',
    )

    expect(catalogo.productos).toHaveLength(1)
    expect(catalogo.productos[0]?.nombre).toBe('Editado')
  })
})
