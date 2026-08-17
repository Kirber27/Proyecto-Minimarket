// Normalizacion de texto para busqueda: sin tildes, minusculas. Replica
// public.normalizar() del lado del servidor (ver
// .claude/specs/03-catalogo-productos/design.md), para que buscar "cafe"
// encuentre "CAFE" tanto en memoria como en la base.
const MARCAS_DIACRITICAS = /[\u0300-\u036f]/g

export function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(MARCAS_DIACRITICAS, '').toLowerCase()
}

/** Iniciales para la caja de color de un producto o categoria (ver
 * prototipo de Claude Design): las primeras letras de las dos primeras
 * palabras, o las dos primeras letras si el nombre es una sola palabra. */
export function obtenerIniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean)
  if (palabras.length === 0) return ''
  if (palabras.length === 1) return palabras[0]!.slice(0, 2).toUpperCase()
  return (palabras[0]![0]! + palabras[1]![0]!).toUpperCase()
}
