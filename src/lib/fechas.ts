// Utilidades de fecha en locale es-VE. La app trabaja en hora local del
// dispositivo; el mostrador no cambia de zona horaria.

const formatoFecha = new Intl.DateTimeFormat('es-VE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const formatoFechaHora = new Intl.DateTimeFormat('es-VE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const formatoHora = new Intl.DateTimeFormat('es-VE', {
  hour: '2-digit',
  minute: '2-digit',
})

/** Formatea una fecha como "16/08/2026". */
export function formatearFecha(fecha: Date): string {
  return formatoFecha.format(fecha)
}

/** Formatea una fecha y hora como "16/08/2026, 02:30 p. m.". */
export function formatearFechaHora(fecha: Date): string {
  return formatoFechaHora.format(fecha)
}

/** Formatea solo la hora, como "02:30 p. m.". */
export function formatearHora(fecha: Date): string {
  return formatoHora.format(fecha)
}

/** Fecha de hoy en formato ISO `YYYY-MM-DD`, para agrupar por dia de venta. */
export function hoyIso(): string {
  const ahora = new Date()
  const anio = ahora.getFullYear()
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}
