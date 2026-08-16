# Convenciones de código

## Nombres

| Cosa | Convención | Ejemplo |
| --- | --- | --- |
| Componente | `PascalCase`, dos palabras mínimo | `TarjetaProducto.vue` |
| Página | `PascalCase`, sufijo del módulo | `VentaNueva.vue` |
| Composable | `camelCase`, prefijo `use` | `useMoneda.ts` |
| Store | `camelCase`, singular | `useCarritoStore` |
| Service | `camelCase`, sufijo `Service` | `ventasService.ts` |
| Tabla / columna | `snake_case`, español sin tildes | `venta_linea`, `precio_venta_usd` |
| Ruta | `kebab-case` | `/deudas/nuevo-abono` |
| Clase SCSS propia | `kebab-case` con prefijo `mm-` | `.mm-tarjeta-producto` |

El idioma es **español** en dominio y interfaz. Los términos técnicos del
framework se quedan en inglés (`props`, `emit`, `computed`, `router`). No se
traduce `store` a «tienda» — en este proyecto «tienda» es el minimarket.

## Componentes Vue

- `<script setup lang="ts">` siempre. Sin Options API.
- Orden de bloques: `<script setup>`, `<template>`, `<style scoped lang="scss">`.
- Props tipadas con `defineProps<{...}>()`, sin el objeto en runtime.
- Emits declarados con `defineEmits<{...}>()`. Nombres en pasado:
  `productoAgregado`, no `agregarProducto`.
- Un componente que pasa de ~200 líneas de template se parte.
- El estilo va `scoped`. Si un estilo hace falta en tres sitios, sube a una
  utilidad SCSS, no se copia.

## Stores de Pinia

```ts
export const useCarritoStore = defineStore('carrito', () => {
  const lineas = ref<LineaCarrito[]>([])
  const totalUsd = computed(() => sumar(lineas.value.map(l => l.subtotalUsd)))
  function agregar(producto: Producto, cantidad = 1) { /* ... */ }
  return { lineas, totalUsd, agregar }
})
```

- El estado que se expone es de solo lectura desde fuera: los componentes llaman
  acciones, no mutan `store.lineas` directamente.
- Un store no llama a otro store salvo para leer. Si dos stores se necesitan
  mutuamente, la lógica compartida va a un composable o a un service.
- Los stores no hacen `fetch`. Llaman a un service, que devuelve datos ya
  tipados y con los errores traducidos.

## Servicios

Cada service expone funciones planas que devuelven `Promise<T>` y **lanzan**
en caso de error, con un error de dominio propio:

```ts
export async function crearVenta(input: CrearVentaInput): Promise<Venta> {
  const { data, error } = await supabase.rpc('crear_venta', { ... })
  if (error) throw new ErrorDominio('venta.no_creada', error.message)
  return mapearVenta(data)
}
```

No se devuelve `{ data, error }` hacia arriba: eso obliga a cada componente a
repetir el manejo de errores de Supabase.

## Manejo de errores

- Los errores esperables (sin stock, tasa vencida, saldo insuficiente) son
  errores de dominio con código, y la interfaz los traduce a un mensaje en
  español dirigido al usuario.
- Los errores inesperados se registran y muestran un mensaje genérico. Nunca se
  muestra al usuario el texto crudo de Postgres.
- Los mensajes dicen **qué hacer**, no solo qué falló:
  «No hay stock suficiente de Harina P.A.N. Quedan 3 unidades.»

## Git

- Rama de trabajo desde `develop`, nombrada `feat/<spec>-<detalle>` o
  `fix/<detalle>`.
- Commits en imperativo y en español: `agrega calculo de tasa en carrito`.
- Un commit por unidad lógica. Una tarea de un `tasks.md` suele ser uno o dos.
- No se hace commit a `main` ni a `develop` directamente.

## Definición de «terminado»

Una tarea de un `tasks.md` está terminada cuando:

1. El código cumple el criterio de aceptación que la tarea referencia.
2. Tiene pruebas según [testing.md](testing.md).
3. `npm run lint` y `npm run test` pasan.
4. Funciona en móvil (375 px) y escritorio (1280 px).
5. Si tocó el esquema, la migración está en `supabase/migrations/` y
   `npx supabase db reset` corre limpio.
