// Aritmetica de dinero. Toda la app pasa por aqui: nunca se hacen sumas ni
// multiplicaciones de montos fuera de este modulo (ver .claude/steering/tech.md).
//
// Los montos en USD se representan como enteros de centavos. `Centavos` es un
// `number` marcado en tipo para que el compilador impida sumar un monto crudo
// (dolares) con uno ya convertido (centavos).

export type Centavos = number & { readonly __marca: 'centavos' }

function marcar(valor: number): Centavos {
  return valor as Centavos
}

/** Convierte un monto en dolares (numero o string) a centavos enteros. */
export function aCentavos(usd: number | string): Centavos {
  const valor = typeof usd === 'string' ? Number(usd) : usd
  if (!Number.isFinite(valor)) {
    throw new Error(`aCentavos: valor invalido "${usd}"`)
  }
  return marcar(Math.round(valor * 100))
}

/** Convierte centavos a dolares como numero de punto flotante. */
export function aUsd(monto: Centavos): number {
  return monto / 100
}

/** Suma una lista de montos en centavos. El redondeo ya ocurrio al convertir. */
export function sumar(...montos: Centavos[]): Centavos {
  return marcar(montos.reduce((total, monto) => total + monto, 0))
}

/** Resta dos montos en centavos (puede dar negativo, p. ej. una comparacion). */
export function restar(a: Centavos, b: Centavos): Centavos {
  return marcar(a - b)
}

/**
 * Multiplica un monto por una cantidad (puede ser decimal, para productos por
 * KG) y redondea una sola vez al final.
 */
export function multiplicar(monto: Centavos, cantidad: number): Centavos {
  return marcar(Math.round(monto * cantidad))
}

/** Convierte centavos USD a bolivares enteros, a la tasa dada. */
export function aBolivares(monto: Centavos, tasa: number): number {
  return Math.round((monto * tasa) / 100)
}

/** Formatea centavos como "$1,57" (locale es-VE, dos decimales). */
export function formatearUsd(monto: Centavos): string {
  const valor = (monto / 100).toFixed(2).replace('.', ',')
  return `$${valor}`
}

/** Formatea bolivares enteros como "1.256 Bs." (separador de miles, sin decimales). */
export function formatearBs(bolivares: number): string {
  const entero = Math.round(bolivares)
  const signo = entero < 0 ? '-' : ''
  const texto = Math.abs(entero)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${signo}${texto} Bs.`
}
