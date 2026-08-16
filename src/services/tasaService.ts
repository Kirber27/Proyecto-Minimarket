import { supabase } from '@/lib/supabase'
import { ErrorDominio } from '@/lib/errorDominio'

export interface Tasa {
  valor: number
  vigenteDesde: string
}

/** La tasa mas reciente por fecha de registro, o null si nunca se registro una. */
export async function obtenerVigente(): Promise<Tasa | null> {
  const { data, error } = await supabase
    .from('tasa_cambio')
    .select('valor, vigente_desde')
    .order('vigente_desde', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new ErrorDominio('tasa.carga_fallida', 'No se pudo cargar la tasa de cambio.')
  }
  return data ? { valor: Number(data.valor), vigenteDesde: data.vigente_desde } : null
}

/**
 * Registra una tasa nueva. tasa_cambio es de solo-insercion (ver
 * .claude/specs/04-tasa-y-moneda/design.md): nunca se corrige una fila, se
 * inserta una version nueva con vigente_desde posterior.
 */
export async function registrar(valor: number, nota?: string): Promise<Tasa> {
  if (!(valor > 0)) {
    throw new ErrorDominio('tasa.valor_invalido', 'La tasa debe ser mayor que cero.')
  }

  const { data, error } = await supabase
    .from('tasa_cambio')
    .insert({ valor, nota })
    .select('valor, vigente_desde')
    .single()

  if (error || !data) {
    throw new ErrorDominio('tasa.registro_fallido', 'No se pudo registrar la tasa.')
  }
  return { valor: Number(data.valor), vigenteDesde: data.vigente_desde }
}
