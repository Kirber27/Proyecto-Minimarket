import { supabase } from '@/lib/supabase'
import { ErrorDominio } from '@/lib/errorDominio'
import { aCentavos } from '@/lib/money'
import type {
  Arqueo,
  ArqueoDetalleFila,
  Denominacion,
  UnidadNegocio,
} from '@/types/dominio'
import type { Database } from '@/types/database'

type FilaArqueo = Database['public']['Tables']['arqueo']['Row']
type FilaDenominacion = Database['public']['Tables']['denominacion']['Row']

function mapearArqueo(fila: FilaArqueo): Arqueo {
  return {
    id: fila.id,
    unidadNegocio: fila.unidad_negocio,
    fecha: fila.fecha,
    estado: fila.estado as Arqueo['estado'],
    fondoInicialUsd: aCentavos(fila.fondo_inicial_usd),
    contadoVes: fila.contado_ves,
    contadoUsd: aCentavos(fila.contado_usd),
    esperadoVes: fila.esperado_ves,
    esperadoUsd: fila.esperado_usd === null ? null : aCentavos(fila.esperado_usd),
    diferenciaVes: fila.diferencia_ves,
    diferenciaUsd: fila.diferencia_usd === null ? null : aCentavos(fila.diferencia_usd),
    tasaAplicada: fila.tasa_aplicada === null ? null : Number(fila.tasa_aplicada),
    nota: fila.nota,
    usuarioId: fila.usuario_id,
    cerradoEn: fila.cerrado_en,
    cerradoPor: fila.cerrado_por,
    creadoEn: fila.creado_en,
  }
}

function mapearDenominacion(fila: FilaDenominacion): Denominacion {
  return {
    id: fila.id,
    moneda: fila.moneda,
    valor: fila.valor,
    activa: fila.activa,
    orden: fila.orden,
  }
}

export async function listarDenominaciones(): Promise<Denominacion[]> {
  const { data, error } = await supabase
    .from('denominacion')
    .select('*')
    .eq('activa', true)
    .order('moneda')
    .order('orden', { ascending: false })

  if (error || !data) {
    throw new ErrorDominio(
      'arqueo.denominaciones_fallidas',
      'No se pudo cargar las denominaciones.',
    )
  }
  return data.map(mapearDenominacion)
}

/** Borrador o cerrado de hoy para la unidad activa (requisito 3.6, 3.8). */
export async function buscarDelDia(
  negocio: UnidadNegocio,
  fecha: string,
): Promise<Arqueo | null> {
  const { data, error } = await supabase
    .from('arqueo')
    .select('*')
    .eq('unidad_negocio', negocio)
    .eq('fecha', fecha)
    .order('creado_en', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new ErrorDominio(
      'arqueo.busqueda_fallida',
      'No se pudo buscar el arqueo del día.',
    )
  }
  return data ? mapearArqueo(data) : null
}

export async function crearBorrador(
  negocio: UnidadNegocio,
  fecha: string,
  fondoInicialUsd: number,
): Promise<Arqueo> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('arqueo')
    .insert({
      unidad_negocio: negocio,
      fecha,
      fondo_inicial_usd: fondoInicialUsd,
      usuario_id: user!.id,
    })
    .select('*')
    .single()

  if (error || !data) {
    throw new ErrorDominio('arqueo.creacion_fallida', 'No se pudo iniciar el arqueo.')
  }
  return mapearArqueo(data)
}

export async function listarDetalle(arqueoId: string): Promise<ArqueoDetalleFila[]> {
  const { data, error } = await supabase
    .from('arqueo_detalle')
    .select('denominacion_id, cantidad')
    .eq('arqueo_id', arqueoId)

  if (error) {
    throw new ErrorDominio('arqueo.detalle_fallido', 'No se pudo cargar el conteo.')
  }
  return (data ?? []).map(f => ({
    denominacionId: f.denominacion_id,
    cantidad: f.cantidad,
  }))
}

/** Guarda el conteo completo y el subtotal por moneda (requisito 6.4: se
 * sincroniza con rebote, no en cada tecla). */
export async function guardarConteo(
  arqueoId: string,
  cantidades: ArqueoDetalleFila[],
  contadoVes: number,
  contadoUsd: number,
  fondoInicialUsd: number,
): Promise<void> {
  const [detalleRes, arqueoRes] = await Promise.all([
    supabase.from('arqueo_detalle').upsert(
      cantidades.map(c => ({
        arqueo_id: arqueoId,
        denominacion_id: c.denominacionId,
        cantidad: c.cantidad,
      })),
      { onConflict: 'arqueo_id,denominacion_id' },
    ),
    supabase
      .from('arqueo')
      .update({
        contado_ves: contadoVes,
        contado_usd: contadoUsd,
        fondo_inicial_usd: fondoInicialUsd,
      })
      .eq('id', arqueoId),
  ])

  if (detalleRes.error || arqueoRes.error) {
    throw new ErrorDominio('arqueo.guardado_fallido', 'No se pudo guardar el conteo.')
  }
}

export interface EsperadoPreview {
  ves: number
  usd: number
}

/** Vista previa del esperado mientras se cuenta, antes de cerrar (requisito
 * 2.1): la misma consulta que usa cerrar_arqueo, pero de solo lectura. */
export async function previsualizarEsperado(
  negocio: UnidadNegocio,
  desdeDia: Date,
  hastaDia: Date,
  fondoInicialUsd: number,
  tasa: number | null,
): Promise<EsperadoPreview> {
  const { data, error } = await supabase.rpc('efectivo_esperado', {
    p_negocio: negocio,
    p_desde: desdeDia.toISOString(),
    p_hasta: hastaDia.toISOString(),
  })

  if (error || !data) {
    throw new ErrorDominio(
      'arqueo.esperado_fallido',
      'No se pudo calcular el efectivo esperado.',
    )
  }

  const usd = data.find(f => f.moneda === 'USD')?.monto_usd ?? 0
  const vesUsd = data.find(f => f.moneda === 'VES')?.monto_usd ?? 0
  const ves = tasa === null ? 0 : (vesUsd + fondoInicialUsd) * tasa

  return { ves, usd }
}

export interface CierreInput {
  arqueoId: string
  desdeDia: Date
  hastaDia: Date
  nota?: string
  montoRetiro?: number
}

export async function cerrar(input: CierreInput): Promise<Arqueo> {
  const { data, error } = await supabase.rpc('cerrar_arqueo', {
    p_arqueo_id: input.arqueoId,
    p_desde_dia: input.desdeDia.toISOString(),
    p_hasta_dia: input.hastaDia.toISOString(),
    p_nota: input.nota || undefined,
    p_monto_retiro: input.montoRetiro || undefined,
  })

  if (error || !data) {
    const mensaje = error?.message.includes('sin_permiso')
      ? 'Solo el dueño puede cerrar un arqueo.'
      : error?.message.includes('nota_requerida')
        ? 'La diferencia supera el umbral: escribe una nota antes de cerrar.'
        : error?.message.includes('sin_tasa')
          ? 'Registra la tasa del día antes de cerrar.'
          : error?.message.includes('arqueo_unico_cerrado') || error?.code === '23505'
            ? 'Ya existe un arqueo cerrado hoy para esta unidad de negocio.'
            : 'No se pudo cerrar el arqueo.'
    throw new ErrorDominio('arqueo.cierre_fallido', mensaje)
  }
  return mapearArqueo(data)
}

/** Historial de arqueos, mas reciente primero (requisito 5.1). */
export async function listarHistorial(
  negocio: UnidadNegocio,
  limite = 30,
): Promise<Arqueo[]> {
  const { data, error } = await supabase
    .from('arqueo')
    .select('*')
    .eq('unidad_negocio', negocio)
    .eq('estado', 'cerrado')
    .order('fecha', { ascending: false })
    .limit(limite)

  if (error || !data) {
    throw new ErrorDominio(
      'arqueo.historial_fallido',
      'No se pudo cargar el historial de arqueos.',
    )
  }
  return data.map(mapearArqueo)
}

export async function actualizarUmbral(
  negocio: UnidadNegocio,
  umbralUsd: number,
): Promise<void> {
  const { error } = await supabase
    .from('negocio')
    .update({ umbral_diferencia_usd: umbralUsd })
    .eq('id', negocio)

  if (error) {
    throw new ErrorDominio(
      'arqueo.umbral_no_actualizado',
      'No se pudo actualizar el umbral.',
    )
  }
}

export async function obtenerUmbral(negocio: UnidadNegocio): Promise<number> {
  const { data, error } = await supabase
    .from('negocio')
    .select('umbral_diferencia_usd')
    .eq('id', negocio)
    .single()

  if (error || !data) return 1
  return data.umbral_diferencia_usd
}
