import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { multiplicar, sumar, type Centavos } from '@/lib/money'
import { ErrorDominio } from '@/lib/errorDominio'
import * as ventasService from '@/services/ventasService'
import { useCatalogoStore } from '@/stores/catalogo'
import { useTasaStore } from '@/stores/tasa'
import type { MetodoPago, Producto, Venta } from '@/types/dominio'

export interface LineaCarrito {
  productoId: string
  nombre: string
  cantidad: number
  precioUnitarioUsd: Centavos
  subtotalUsd: Centavos
  unidadMedida: Producto['unidadMedida']
}

export interface LineaPago {
  metodo: MetodoPago
  montoUsd: Centavos
}

const CLAVE_CARRITO = 'mm_carrito'
const CLAVE_ULTIMO_METODO = 'mm_ultimo_metodo_pago'

function nuevaIdempotencia(): string {
  return crypto.randomUUID()
}

function leerUltimoMetodo(): MetodoPago | null {
  return localStorage.getItem(CLAVE_ULTIMO_METODO) as MetodoPago | null
}

interface CarritoPersistido {
  lineas: LineaCarrito[]
  pagos: LineaPago[]
  clienteId: string | null
  idempotencia: string
}

function leerCarritoGuardado(): CarritoPersistido | null {
  const bruto = localStorage.getItem(CLAVE_CARRITO)
  if (!bruto) return null
  try {
    return JSON.parse(bruto) as CarritoPersistido
  } catch {
    return null
  }
}

export const useCarritoStore = defineStore('carrito', () => {
  const guardado = leerCarritoGuardado()

  const lineas = ref<LineaCarrito[]>(guardado?.lineas ?? [])
  const pagos = ref<LineaPago[]>(guardado?.pagos ?? [])
  const clienteId = ref<string | null>(guardado?.clienteId ?? null)
  const idempotencia = ref(guardado?.idempotencia ?? nuevaIdempotencia())
  const enviando = ref(false)
  const error = ref('')
  const ultimoMetodo = ref<MetodoPago | null>(leerUltimoMetodo())

  watch(
    [lineas, pagos, clienteId, idempotencia],
    () => {
      const datos: CarritoPersistido = {
        lineas: lineas.value,
        pagos: pagos.value,
        clienteId: clienteId.value,
        idempotencia: idempotencia.value,
      }
      localStorage.setItem(CLAVE_CARRITO, JSON.stringify(datos))
    },
    { deep: true },
  )

  const totalUsd = computed<Centavos>(() =>
    sumar(...lineas.value.map(l => l.subtotalUsd)),
  )
  const unidadesTotal = computed(() =>
    lineas.value.reduce((suma, l) => suma + l.cantidad, 0),
  )
  const pagadoUsd = computed<Centavos>(() => sumar(...pagos.value.map(p => p.montoUsd)))
  const faltaUsd = computed<Centavos>(
    () => Math.max(totalUsd.value - pagadoUsd.value, 0) as Centavos,
  )
  const vueltoUsd = computed<Centavos>(
    () => Math.max(pagadoUsd.value - totalUsd.value, 0) as Centavos,
  )

  const puedeConfirmar = computed(
    () =>
      lineas.value.length > 0 &&
      !enviando.value &&
      (faltaUsd.value === 0 || clienteId.value !== null),
  )

  function cantidadEnCarrito(productoId: string): number {
    return lineas.value.find(l => l.productoId === productoId)?.cantidad ?? 0
  }

  /**
   * Suma `cantidad` al producto en el carrito. Valida contra el stock LOCAL
   * (requisito 1.5) para respuesta inmediata; el servidor revalida en
   * crear_venta porque el stock local puede estar desactualizado.
   */
  function agregar(producto: Producto, cantidad = 1): void {
    error.value = ''
    const actual = cantidadEnCarrito(producto.id)
    const nuevaCantidad = Math.round((actual + cantidad) * 1000) / 1000

    if (nuevaCantidad > producto.stockActual) {
      error.value = `Sin stock suficiente de ${producto.nombre}.`
      return
    }

    if (nuevaCantidad <= 0) {
      lineas.value = lineas.value.filter(l => l.productoId !== producto.id)
      return
    }

    const existente = lineas.value.find(l => l.productoId === producto.id)
    if (existente) {
      existente.cantidad = nuevaCantidad
      existente.subtotalUsd = multiplicar(producto.precioVentaUsd, nuevaCantidad)
    } else {
      lineas.value.push({
        productoId: producto.id,
        nombre: producto.nombre,
        cantidad: nuevaCantidad,
        precioUnitarioUsd: producto.precioVentaUsd,
        subtotalUsd: multiplicar(producto.precioVentaUsd, nuevaCantidad),
        unidadMedida: producto.unidadMedida,
      })
    }
  }

  function establecerCantidad(producto: Producto, cantidad: number): void {
    const actual = cantidadEnCarrito(producto.id)
    agregar(producto, cantidad - actual)
  }

  function quitarLinea(productoId: string): void {
    lineas.value = lineas.value.filter(l => l.productoId !== productoId)
  }

  function vaciar(): void {
    lineas.value = []
    pagos.value = []
    clienteId.value = null
    error.value = ''
  }

  function elegirCliente(id: string): void {
    clienteId.value = id
  }

  function quitarCliente(): void {
    clienteId.value = null
  }

  /** Al tocar un metodo, agrega una linea precargada con lo que falta. */
  function agregarMetodoPago(metodo: MetodoPago): void {
    const monto = faltaUsd.value > 0 ? faltaUsd.value : totalUsd.value
    pagos.value.push({ metodo, montoUsd: monto as Centavos })
  }

  function actualizarMontoPago(indice: number, montoUsd: Centavos): void {
    const pago = pagos.value[indice]
    if (pago) pago.montoUsd = montoUsd
  }

  function quitarPago(indice: number): void {
    pagos.value.splice(indice, 1)
  }

  function reiniciar(): void {
    lineas.value = []
    pagos.value = []
    clienteId.value = null
    idempotencia.value = nuevaIdempotencia()
    error.value = ''
    localStorage.removeItem(CLAVE_CARRITO)
  }

  async function confirmar(): Promise<Venta> {
    const catalogo = useCatalogoStore()
    const tasa = useTasaStore()

    if (tasa.valor === null) {
      throw new ErrorDominio(
        'venta.sin_tasa',
        'Registra la tasa del día para poder vender.',
      )
    }

    enviando.value = true
    error.value = ''
    try {
      const venta = await ventasService.crear({
        lineas: lineas.value.map(l => ({
          productoId: l.productoId,
          cantidad: l.cantidad,
        })),
        pagos: pagos.value.map(p => ({ metodo: p.metodo, montoUsd: p.montoUsd })),
        unidadNegocio: catalogo.negocio,
        tasaCliente: tasa.valor,
        clienteId: clienteId.value,
        idempotencia: idempotencia.value,
      })

      if (pagos.value[0]) {
        ultimoMetodo.value = pagos.value[0].metodo
        localStorage.setItem(CLAVE_ULTIMO_METODO, pagos.value[0].metodo)
      }

      reiniciar()
      return venta
    } catch (err) {
      error.value =
        err instanceof ErrorDominio ? err.message : 'No se pudo registrar la venta.'
      throw err
    } finally {
      enviando.value = false
    }
  }

  return {
    lineas,
    pagos,
    clienteId,
    enviando,
    error,
    ultimoMetodo,
    totalUsd,
    unidadesTotal,
    pagadoUsd,
    faltaUsd,
    vueltoUsd,
    puedeConfirmar,
    cantidadEnCarrito,
    agregar,
    establecerCantidad,
    quitarLinea,
    vaciar,
    elegirCliente,
    quitarCliente,
    agregarMetodoPago,
    actualizarMontoPago,
    quitarPago,
    confirmar,
    reiniciar,
  }
})
