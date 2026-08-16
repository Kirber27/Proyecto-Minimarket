# Autenticación y control de acceso — Diseño

## Esquema

`supabase/migrations/0002_auth.sql`:

```sql
create type rol_usuario as enum ('dueno', 'mostrador');

create table public.perfil (
  id                    uuid primary key references auth.users(id) on delete cascade,
  nombre                text not null,
  rol                   rol_usuario not null default 'mostrador',
  pin_hash              text,                     -- bcrypt, nunca el PIN en claro
  pin_intentos_fallidos int not null default 0,
  pin_bloqueado_hasta   timestamptz,
  activo                boolean not null default true,
  creado_en             timestamptz not null default now()
);

-- Rol del usuario actual, leído desde el JWT para evitar recursión en las
-- políticas: consultar public.perfil dentro de una política sobre public.perfil
-- se llama a sí misma indefinidamente.
create or replace function public.rol_actual() returns rol_usuario
language sql stable as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'rol')::rol_usuario,
    'mostrador'::rol_usuario
  );
$$;

alter table public.perfil enable row level security;

create policy perfil_propio on public.perfil
  for select to authenticated using (id = auth.uid());

create policy perfil_dueno_lee on public.perfil
  for select to authenticated using (public.rol_actual() = 'dueno');

create policy perfil_dueno_escribe on public.perfil
  for all to authenticated
  using (public.rol_actual() = 'dueno')
  with check (public.rol_actual() = 'dueno');
```

El rol se guarda además en `app_metadata` del usuario de Supabase Auth, que es lo
que viaja en el JWT. `app_metadata` **no es editable por el usuario**, a
diferencia de `user_metadata`; usar `user_metadata` para el rol permitiría que un
usuario se ascendiera a `dueno` desde el cliente.

Un trigger mantiene ambos sincronizados cuando el dueño cambia un rol.

### Patrón de política reutilizable

Todas las tablas de negocio de los demás specs siguen esta forma:

```sql
create policy <tabla>_lectura on public.<tabla>
  for select to authenticated using (true);

create policy <tabla>_escritura_dueno on public.<tabla>
  for all to authenticated
  using (public.rol_actual() = 'dueno')
  with check (public.rol_actual() = 'dueno');
```

Las tablas que `mostrador` sí puede escribir (`venta`, `deuda_movimiento`,
`arqueo`) añaden una política `for insert` propia.

## PIN

El PIN **no es un segundo factor ni un sistema de autenticación aparte, y
tampoco reemplaza el login**: es un candado de pantalla para una sesión que
sigue viva. Esto se corrigió durante la implementación al probar contra un
proyecto real: con `persistSession` + `autoRefreshToken` activos (requisito
4.2), el cliente de Supabase renueva la sesión en silencio, así que el
usuario casi nunca ve `/ingresar` de nuevo una vez que inició sesión — y
cuando sí cierra sesión de verdad, `signOut()` revoca el refresh token en el
servidor, así que no queda nada que un PIN pueda "reabrir". Por eso el PIN no
vive como una pestaña dentro de `PantallaIngreso`, sino como una pantalla de
bloqueo (`/bloqueado`) que no toca la sesión de Supabase para nada.

Flujo:

1. El usuario inicia sesión con contraseña (comportamiento estándar del
   cliente de Supabase, con el refresh token persistido según "Recordarme").
2. El usuario define un PIN desde Ajustes. El cliente lo envía a la RPC
   `definir_pin`, que guarda `crypt(pin, gen_salt('bf'))` en `perfil.pin_hash`.
3. Desde Ajustes, "Bloquear ahora" pone `sesion.bloqueada = true` (solo estado
   de cliente, en memoria) y navega a `/bloqueado`. El guard del router manda
   a `/bloqueado` cualquier navegación mientras `bloqueada` sea `true`.
4. En `/bloqueado`, la RPC `validar_pin(pin)` compara contra el hash — la
   sesión de Supabase seguía activa todo este tiempo, por eso la llamada
   autenticada funciona. Si es correcta, `bloqueada` vuelve a `false`.

Por eso el requisito 2.7 exige un ingreso previo con contraseña: sin sesión
activa no hay nada que bloquear ni desbloquear.

```sql
-- search_path incluye "extensions": en Supabase hosted, pgcrypto (crypt,
-- gen_salt) vive ahi, no en public. Con solo `public` la funcion falla con
-- "function gen_salt(unknown) does not exist" (42883) — se detecto probando
-- contra un proyecto real, no aparece en desarrollo local.
create or replace function public.validar_pin(p_pin text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare v_perfil public.perfil;
begin
  select * into v_perfil from public.perfil where id = auth.uid();
  if v_perfil.id is null or v_perfil.pin_hash is null then
    raise exception 'pin_no_definido';
  end if;
  if v_perfil.pin_bloqueado_hasta is not null and v_perfil.pin_bloqueado_hasta > now() then
    raise exception 'pin_bloqueado' using hint = v_perfil.pin_bloqueado_hasta::text;
  end if;
  if v_perfil.pin_hash = crypt(p_pin, v_perfil.pin_hash) then
    update public.perfil
    set pin_intentos_fallidos = 0, pin_bloqueado_hasta = null
    where id = auth.uid();
    return true;
  end if;
  -- 5 fallos consecutivos bloquean 5 minutos, contados en pin_intentos_fallidos
  update public.perfil
  set pin_intentos_fallidos = pin_intentos_fallidos + 1,
      pin_bloqueado_hasta = case
        when pin_intentos_fallidos + 1 >= 5 then now() + interval '5 minutes'
        else pin_bloqueado_hasta
      end
  where id = auth.uid();
  return false;
end $$;
```

`security definer` es necesario porque la función lee `pin_hash`, columna que
ninguna política expone al cliente.

## Store y guard

```ts
export const useSesionStore = defineStore('sesion', () => {
  const usuario = ref<Usuario | null>(null)
  const perfil  = ref<Perfil | null>(null)
  const cargando = ref(true)
  const bloqueada = ref(false) // candado de PIN; no toca la sesion de Supabase

  const autenticado = computed(() => usuario.value !== null)
  const esDueno     = computed(() => perfil.value?.rol === 'dueno')

  async function iniciarConPassword(email: string, password: string) { /* ... */ }
  function bloquear() { bloqueada.value = true }
  async function desbloquear(pin: string) { /* valida el PIN, baja bloqueada */ }
  async function cerrar() { /* signOut real: limpia carrito y demás stores */ }
  return { usuario, perfil, cargando, bloqueada, autenticado, esDueno, iniciarConPassword, bloquear, desbloquear, cerrar }
})
```

Guard global:

```ts
router.beforeEach(async (to) => {
  const sesion = useSesionStore()
  if (sesion.cargando) await sesion.esperarInicializacion()

  if (to.meta.publica) return true
  if (!sesion.autenticado) return { name: 'ingresar', query: { destino: to.fullPath } }
  if (sesion.bloqueada && to.name !== 'bloqueado') return { name: 'bloqueado' }
  if (to.meta.soloDueno && !sesion.esDueno) {
    notificar('No tienes permiso para esa sección')
    return { name: 'resumen' }
  }
  return true
})
```

`esperarInicializacion()` evita el parpadeo clásico: sin él, la primera
navegación ocurre antes de que Supabase restaure la sesión y manda al login a un
usuario que sí estaba autenticado.

Las rutas restringidas llevan `meta.soloDueno: true`: Productos, Categorías,
Reportes, Ajustes y Usuarios.

## Pantallas

Cuatro vistas dentro de `LayoutAuth`:

| Vista | Ruta | Contenido |
| --- | --- | --- |
| `PantallaIngreso` | `/ingresar` (`meta.publica`) | Correo, contraseña, «Recordarme», enlace a recuperación. Sin selector de PIN: ver la nota en la sección PIN de arriba sobre por qué no vive aquí |
| `PantallaRecuperar` | `/recuperar` (`meta.publica`) | Un campo de correo y el botón de envío |
| `PantallaRecuperarEnviado` | `/recuperar/enviado` (`meta.publica`) | Confirmación de envío, con opción de volver |
| `PantallaRestablecer` | `/restablecer` (`meta.publica`) | Nueva contraseña, para el enlace del correo |
| `PantallaBloqueo` | `/bloqueado` | Candado con `TecladoPin`; el guard fuerza esta ruta mientras `sesion.bloqueada` sea `true` |

`PantallaBloqueo` no es pública: requiere sesión activa (solo la sesión está
"bloqueada" a nivel de cliente, no cerrada). El botón "Bloquear ahora" en
Ajustes solo aparece si el dispositivo ya tiene un PIN definido.

## Manejo de errores

| Código | Mensaje al usuario |
| --- | --- |
| `auth.credenciales_invalidas` | Correo o contraseña incorrectos. Revisa e intenta de nuevo. |
| `auth.correo_invalido` | El correo no tiene un formato válido. |
| `auth.campos_faltantes` | Ingresa tu correo y contraseña. |
| `auth.pin_invalido` | PIN incorrecto. Intenta otra vez. |
| `auth.pin_bloqueado` | Demasiados intentos. Usa tu contraseña o espera 5 minutos. |
| `auth.sin_permiso` | No tienes permiso para esa sección. |

Supabase devuelve el mismo error para «usuario no existe» y «contraseña
incorrecta», lo que satisface el requisito 1.5 sin trabajo adicional.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| PIN de 4 dígitos es débil (10 000 combinaciones) | Solo desbloquea una sesión ya establecida en ese dispositivo, y se bloquea a los 5 intentos |
| Política RLS recursiva sobre `perfil` | El rol se lee del JWT, no de la tabla |
| El rol en `user_metadata` sería auto-editable | Se usa `app_metadata`, escribible solo desde el servidor |
| Parpadeo del login al recargar | `esperarInicializacion()` antes del primer guard |
| `pgcrypto` no vive en `public` en Supabase hosted | `search_path = public, extensions` en `definir_pin`/`validar_pin` (detectado probando contra un proyecto real) |
| `sesion.bloqueada` es solo estado de cliente, en memoria | Se pierde al recargar la pestaña (vuelve a quedar desbloqueada); aceptable porque no protege datos — el guard y la RLS siguen exigiendo sesión real |
