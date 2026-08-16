// Normalizacion de texto para busqueda: sin tildes, minusculas. Replica
// public.normalizar() del lado del servidor (ver
// .claude/specs/03-catalogo-productos/design.md), para que buscar "cafe"
// encuentre "CAFE" tanto en memoria como en la base.
const MARCAS_DIACRITICAS = /[\u0300-\u036f]/g

export function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(MARCAS_DIACRITICAS, '').toLowerCase()
}
