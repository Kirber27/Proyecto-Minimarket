// Edge Function: crea un usuario de Auth + su perfil. Es el UNICO lugar del
// sistema que usa la clave service_role (ver requisito 6.4 y tarea 6.2 de
// .claude/specs/02-autenticacion-acceso). Nunca se crea un usuario desde el
// cliente con supabase.auth.admin.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

interface CrearUsuarioInput {
  nombre: string
  email: string
  rol: 'dueno' | 'mostrador'
}

// El navegador manda un preflight OPTIONS antes del POST real (el cliente va
// en otro origen: localhost:5183 -> *.supabase.co). Sin estos headers en
// TODAS las respuestas, el navegador bloquea la peticion entera y
// supabase-js lo reporta como un error generico de red.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'metodo_no_permitido' }, 405)
  }

  const autorizacion = req.headers.get('Authorization')
  if (!autorizacion) {
    return json({ error: 'sin_autorizacion' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Cliente con el JWT de quien llama: solo para saber quien es y que rol
  // tiene. Las politicas RLS normales aplican con este cliente.
  const clienteLlamador = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: autorizacion } },
  })
  const { data: datosUsuario, error: errorUsuario } = await clienteLlamador.auth.getUser()
  if (errorUsuario || !datosUsuario.user) {
    return json({ error: 'no_autenticado' }, 401)
  }

  const rolLlamador = (datosUsuario.user.app_metadata as { rol?: string } | null)?.rol
  if (rolLlamador !== 'dueno') {
    return json({ error: 'sin_permiso' }, 403)
  }

  let input: CrearUsuarioInput
  try {
    input = await req.json()
  } catch {
    return json({ error: 'cuerpo_invalido' }, 400)
  }

  if (!input.nombre || !input.email || !['dueno', 'mostrador'].includes(input.rol)) {
    return json({ error: 'datos_invalidos' }, 400)
  }

  // Unico cliente con service_role de todo el sistema.
  const clienteAdmin = createClient(supabaseUrl, serviceRoleKey)

  const { data: nuevo, error: errorCreacion } = await clienteAdmin.auth.admin.createUser({
    email: input.email,
    email_confirm: true,
    user_metadata: { nombre: input.nombre },
    app_metadata: { rol: input.rol },
  })

  if (errorCreacion || !nuevo.user) {
    return json({ error: 'creacion_fallida', detalle: errorCreacion?.message }, 400)
  }

  // El trigger `usuario_crea_perfil` de 0002_auth.sql ya inserto la fila de
  // perfil con rol "mostrador" por defecto; se completa con el nombre y el
  // rol reales que pidio quien creo el usuario.
  const { error: errorPerfil } = await clienteAdmin
    .from('perfil')
    .update({ nombre: input.nombre, rol: input.rol })
    .eq('id', nuevo.user.id)

  if (errorPerfil) {
    return json({ error: 'perfil_no_actualizado' }, 500)
  }

  return json({ id: nuevo.user.id })
})
