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

// "Recordarme" (requisito 4.1): si esta en false, la sesion se guarda en
// sessionStorage y se pierde al cerrar el navegador; si esta en true (por
// defecto), se guarda en localStorage y persiste. Se debe llamar antes de
// iniciar sesion, porque supabase-js escribe el storage durante el login.
let recordarSesion = true

export function establecerRecordarSesion(valor: boolean): void {
  recordarSesion = valor
}

const storageSesion = {
  getItem(clave: string) {
    return sessionStorage.getItem(clave) ?? localStorage.getItem(clave)
  },
  setItem(clave: string, valor: string) {
    if (recordarSesion) {
      localStorage.setItem(clave, valor)
      sessionStorage.removeItem(clave)
    } else {
      sessionStorage.setItem(clave, valor)
      localStorage.removeItem(clave)
    }
  },
  removeItem(clave: string) {
    localStorage.removeItem(clave)
    sessionStorage.removeItem(clave)
  },
}

// La clave anon es publica por diseno: la RLS protege los datos, no el
// secreto de la clave. La service_role nunca entra a este bundle.
export const supabase = createClient<Database>(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, storage: storageSesion },
})
