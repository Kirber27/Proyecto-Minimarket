// Error de dominio propio: los servicios lanzan esto en vez de devolver
// `{ data, error }`, para que cada componente no tenga que repetir el manejo
// de errores de Supabase (ver .claude/steering/tech.md).

export class ErrorDominio extends Error {
  readonly codigo: string

  constructor(codigo: string, mensaje: string) {
    super(mensaje)
    this.name = 'ErrorDominio'
    this.codigo = codigo
  }
}
