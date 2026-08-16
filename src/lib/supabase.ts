import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  const faltantes = [!url && 'VITE_SUPABASE_URL', !key && 'VITE_SUPABASE_ANON_KEY']
    .filter(Boolean)
    .join(', ')
  throw new Error(
    `Faltan ${faltantes}. Copia .env.example a .env y completa los valores.`,
  )
}

// La clave anon es publica por diseno: la RLS protege los datos, no el
// secreto de la clave. La service_role nunca entra a este bundle.
export const supabase = createClient<Database>(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, storage: localStorage },
})
