# Autenticación y control de acceso — Diseño

## Esquema

`supabase/migrations/0002_auth.sql`:

```sql
create type rol_usuario as enum ('dueno', 'mostrador');

create table public.perfil (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null,
  rol         rol_usuario not null default 'mostrador',
  pin_hash    text,                     -- bcrypt, nunca el PIN en claro
  pin_bloqueado_hasta timestamptz,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

-- Rol del usuario actual, leído desde el JWT para evitar recursión en las
-- políticas: consultar public.perfil dentro de una política sobre public.perfil
-- se llama a sí misma indefinidamente.
create or replace function auth.rol_actual() returns rol_usuario
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
  for select to authenticated using (auth.rol_actual() = 'dueno');

create policy perfil_dueno_escribe on public.perfil
  for all to authenticated
  using (auth.rol_actual() = 'dueno')
  with check (auth.rol_actual() = 'dueno');
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
  using (auth.rol_actual() = 'dueno')
  with check (auth.rol_actual() = 'dueno');
```

Las tablas que `mostrador` sí puede escribir (`venta`, `deuda_movimiento`,
`arqueo`) añaden una política `for insert` propia.

## PIN

El PIN **no es un segundo factor ni un sistema de autenticación aparte**: es un
atajo para reabrir una sesión que ya existe en ese dispositivo.

Flujo:

1. El usuario inicia sesión con contraseña y el dispositivo guarda el refresh
   token en `localStorage` (comportamiento estándar del cliente de Supabase).
2. El usuario define un PIN. El cliente lo envía a la RPC `definir_pin`, que
   guarda `crypt(pin, gen_salt('bf'))` en `perfil.pin_hash`.
3. Al reabrir la app con sesión expirada pero refresh token presente, se ofrece
   el modo PIN.
4. La RPC `validar_pin(pin)` compara contra el hash y devuelve verdadero o falso,
   incrementando el contador de fallos.

Por eso el requisito 2.7 exige un ingreso previo con contraseña: sin refresh
token no hay nada que desbloquear.

```sql
create or replace function public.validar_pin(p_pin text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_perfil public.perfil;
begin
  select * into v_perfil from public.perfil where id = auth.uid();
  if v_perfil.pin_bloqueado_hasta > now() then
    raise exception 'pin_bloqueado' using hint = v_perfil.pin_bloqueado_hasta::text;
  end if;
  if v_perfil.pin_hash = crypt(p_pin, v_perfil.pin_hash) then
    update public.perfil set pin_bloqueado_hasta = null where id = auth.uid();
    return true;
  end if;
  -- 5 fallos consecutivos bloquean 5 minutos
  ...
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

  const autenticado = computed(() => usuario.value !== null)
  const esDueno     = computed(() => perfil.value?.rol === 'dueno')

  async function iniciarConPassword(email: string, password: string) { /* ... */ }
  async function iniciarConPin(pin: string) { /* ... */ }
  async function cerrar() { /* limpia carrito y demás stores */ }
  return { usuario, perfil, cargando, autenticado, esDueno, iniciarConPassword, iniciarConPin, cerrar }
})
```

Guard global:

```ts
router.beforeEach(async (to) => {
  const sesion = useSesionStore()
  if (sesion.cargando) await sesion.esperarInicializacion()

  if (to.meta.publica) return true
  if (!sesion.autenticado) return { name: 'ingresar', query: { destino: to.fullPath } }
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

Tres vistas dentro de `LayoutAuth`, siguiendo el prototipo:

| Vista | Contenido |
| --- | --- |
| `login` | Selector Contraseña / PIN, campos, «Recordarme», enlace a recuperación |
| `forgot` | Un campo de correo y el botón de envío |
| `sent` | Confirmación de envío, con opción de volver |

El selector de modo solo aparece si el dispositivo tiene refresh token y el
perfil tiene PIN definido.

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
