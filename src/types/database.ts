// ARCHIVO GENERADO. No editar a mano.
// Se regenera con `npm run types` (supabase gen types typescript --local)
// una vez que exista el stack local de Supabase y sus migraciones.
// Ver .claude/specs/01-fundacion-plataforma/requirements.md, requisito 5.5.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
