import { normalizarTexto } from '@/lib/texto'

/** Convierte un nombre en un slug ascii-kebab-case, para el SKU automatico. */
export function generarSlug(texto: string): string {
  return normalizarTexto(texto)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
}
