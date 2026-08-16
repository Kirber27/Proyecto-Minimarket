# Tasa de cambio y moneda dual — Diseño

## Esquema

`supabase/migrations/0004_tasa.sql`:

```sql
create table public.tasa_cambio (
  id             bigserial primary key,
  moneda_base    moneda not null default 'USD',
  moneda_destino moneda not null default 'VES',
  valor          numeric(16,4) not null check (valor > 0),
  vigente_desde  timestamptz not null default now(),
  usuario_id     uuid references public.perfil(id),
  nota           text,
  creado_en      timestamptz not null default now()
);

create index tasa_vigente_idx on public.tasa_cambio (vigente_desde desc);

create or replace function public.tasa_vigente() returns numeric
language sql stable as $$
  select valor from public.tasa_cambio
  where vigente_desde <= now()
  order by vigente_desde desc, id desc
  limit 1;
$$;
```

Es una tabla de solo-inserción: nunca se hace `update` sobre una tasa, ni
siquiera para «corregir» la de hoy. Corregir es insertar una fila nueva con la
misma fecha y `vigente_desde` posterior. Así el requisito 4.2 se cumple sin
esfuerzo: una venta del martes apunta a una tasa que sigue existiendo intacta.

El `order by ... , id desc` importa: dos tasas registradas en el mismo instante
(corrección inmediata de un error de tecleo) se desempatan por orden de
inserción.

```sql
alter table public.tasa_cambio enable row level security;
create policy tasa_lectura on public.tasa_cambio for select to authenticated using (true);
create policy tasa_escritura on public.tasa_cambio for insert to authenticated
  with check (public.rol_actual() = 'dueno');
-- Sin políticas de update ni delete: la tabla es inmutable por diseño.
```

## Referencia desde los documentos

Las ventas, egresos y movimientos de deuda guardan el **valor** de la tasa, no
una llave foránea:

```sql
alter table public.venta add column tasa_aplicada numeric(16,4) not null;
```

Guardar el valor y no el `id` puede parecer una desnormalización, pero es lo
correcto: el bolívar cobrado es un hecho consumado, y no debe depender de que
una fila de otra tabla siga existiendo o de un `join` en cada consulta de
historial.

## Store

```ts
export const useTasaStore = defineStore('tasa', () => {
  const vigente   = ref<Tasa | null>(null)
  const historial = ref<Tasa[]>([])

  const valor = computed(() => vigente.value?.valor ?? null)
  const disponible = computed(() => valor.value !== null)
  const horasDeAntiguedad = computed(() => /* ... */)
  const desactualizada = computed(() => horasDeAntiguedad.value > 24)

  async function registrar(nuevoValor: number, nota?: string) { /* ... */ }
  function suscribir() { /* Realtime sobre tasa_cambio */ }
  return { vigente, valor, disponible, desactualizada, horasDeAntiguedad, registrar, suscribir }
})
```

`suscribir()` abre un canal Realtime de Supabase sobre `tasa_cambio`. Es lo que
hace posible el requisito 5.1: si el dueño cambia la tasa desde el escritorio
mientras el mostrador tiene un carrito armado en el teléfono, el teléfono se
entera solo. Sin Realtime habría que sondear, y el mostrador cobraría a la tasa
vieja hasta la siguiente recarga.

## Composable de moneda

Único punto donde la interfaz convierte:

```ts
export function useMoneda() {
  const tasa = useTasaStore()
  const preferencias = usePreferenciasStore()

  function bs(usd: Centavos): number | null {
    return tasa.valor === null ? null : aBolivares(usd, tasa.valor)
  }
  function mostrarUsd(usd: Centavos): string {
    return preferencias.ocultarMontos ? '•••' : formatearUsd(usd)
  }
  function mostrarBs(usd: Centavos): string {
    if (preferencias.ocultarMontos) return '•••'
    const v = bs(usd)
    return v === null ? '—' : formatearBs(v)
  }
  return { bs, mostrarUsd, mostrarBs }
}
```

El enmascarado del requisito 3.4 vive aquí y no en cada componente, así no hay
forma de olvidarlo en una pantalla nueva.

## `PrecioDoble.vue`

```vue
<script setup lang="ts">
const props = defineProps<{
  usd: Centavos
  tasaFija?: number     // documentos históricos: usa esta y no la vigente
  tamano?: 'sm' | 'md' | 'lg'
  invertido?: boolean   // arqueo: Bs. como cifra principal
}>()
</script>
```

`tasaFija` es lo que cumple el requisito 4.2. La ficha de una venta pasada le
pasa `venta.tasaAplicada` y el componente ignora la tasa vigente; el resto de la
app lo omite y toma la del store.

## Validación en el servidor

El cliente no es de fiar para esto. `crear_venta` (spec 05) recibe la tasa que el
cliente creía vigente y la contrasta:

```sql
if p_tasa_cliente is distinct from public.tasa_vigente() then
  raise exception 'tasa_desactualizada'
    using detail = public.tasa_vigente()::text;
end if;
```

El cliente atrapa el error, lee la tasa correcta del `detail`, actualiza el store,
muestra el aviso del requisito 5.1 y deja que el usuario reintente con un toque.
No reintenta solo: el total en bolívares cambió y el usuario tiene que verlo
antes de cobrar.

## Aviso de tasa antigua

Cuando `desactualizada` es verdadero, la cabecera muestra una banda ámbar:
«Tasa de hace 2 días · 800 Bs. — Actualizar». No bloquea (requisito 2.3), porque
un mostrador sin el dueño presente tiene que poder seguir vendiendo.

Cuando no hay ninguna tasa sí bloquea la venta (requisito 2.2): vender sin saber
a cuánto convertir no es un caso degradado, es un dato faltante.

## Cambio brusco

El requisito 1.7 (variación mayor al 20 %) atrapa el error de tecleo más común:
escribir `8000` en vez de `800`. El diálogo muestra ambas tasas y el efecto sobre
un producto conocido:

> La tasa pasa de 800 a 8.000 Bs. (+900 %).
> Harina P.A.N pasaría de 1.256 Bs. a 12.560 Bs.
> ¿Confirmas?

Mostrar el efecto sobre un producto real hace evidente el error de un cero de
más, cosa que un porcentaje solo no logra.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Tasa mal tecleada afecta todos los precios | Confirmación al superar 20 % de variación, con ejemplo concreto |
| Venta cobrada a tasa vieja | Validación en el servidor + Realtime en el cliente |
| Reportes que mezclan tasas y dan totales sin sentido | Dos métricas separadas y etiquetadas (requisito 6.3) |
| Realtime no llega por mala señal | La validación del servidor sigue atrapando el caso; Realtime es mejora, no garantía |
| Redondear por línea desvía el total | La conversión ocurre sobre el total, probado en `money.ts` |
