# PWA y funcionamiento sin conexión — Diseño

## Qué se cachea y cómo

Tres estrategias, según lo que cada recurso necesita:

| Recurso | Estrategia | Por qué |
| --- | --- | --- |
| Shell (HTML, JS, CSS, fuentes, iconos) | Precache | Tiene que estar antes del primer corte de señal |
| Catálogo, categorías, clientes | Stale-while-revalidate en IndexedDB | Se usa constantemente y cambia poco |
| Ventas del día, saldos, reportes | Network-first con respaldo a caché | Se prefiere el dato fresco, pero algo es mejor que nada |
| Escrituras (ventas, egresos, abonos) | Cola local | Ver más abajo |

`vite-plugin-pwa` en modo `injectManifest` genera el precache y nos deja escribir
el service worker a mano. El modo `generateSW` no alcanza: la cola de escrituras
necesita lógica propia.

## Almacenamiento local

**IndexedDB, no `localStorage`.** `localStorage` es síncrono (bloquea el hilo
principal), tiene un límite de ~5 MB y solo guarda texto. El catálogo son 328
productos y la cola puede acumular decenas de ventas con sus líneas.

Se usa `idb` (~1 KB) sobre IndexedDB nativo, con cuatro almacenes:

```ts
interface EsquemaLocal {
  catalogo:    { key: string; value: Producto }
  clientes:    { key: string; value: Cliente }
  cola:        { key: number; value: OperacionPendiente }   // autoIncrement
  conflictos:  { key: number; value: OperacionConflicto }
  meta:        { key: string; value: unknown }              // última sincronización, etc.
}
```

El `autoIncrement` de `cola` da el orden del requisito 4.2 sin ninguna lógica
extra: la clave numérica creciente **es** el orden de registro.

El borrador de arqueo y el carrito siguen en `localStorage`: son un solo objeto
pequeño y quieren lectura síncrona al montar el componente.

## La cola

```ts
type OperacionPendiente = {
  id?: number                    // autoIncrement
  tipo: 'venta' | 'egreso' | 'abono'
  idempotencia: string           // UUID, la misma en cada reintento
  cuerpo: unknown                // argumentos de la RPC
  registradaEn: string           // ISO
  intentos: number
  proximoIntento: string | null
}
```

La llave de idempotencia es lo que hace segura toda esta arquitectura. El caso
peligroso es: la petición llega al servidor, la venta se crea, y la respuesta se
pierde en la red. Sin idempotencia el reintento crearía una segunda venta. Con
ella, el `unique` de `venta.idempotencia` hace que `crear_venta` (spec 05)
devuelva la venta ya existente y la cola la marque como sincronizada.

Por eso la llave se genera **al registrar la operación**, no al enviarla, y no
cambia entre reintentos.

### Sincronización

```ts
async function sincronizar() {
  if (!navigator.onLine || sincronizando) return
  sincronizando = true
  const pendientes = await db.getAll('cola')       // ya vienen en orden de clave

  for (const op of pendientes) {
    if (op.proximoIntento && new Date(op.proximoIntento) > new Date()) continue
    try {
      await enviar(op)
      await db.delete('cola', op.id!)
    } catch (e) {
      if (esErrorDeRed(e)) {
        // reintento con espera creciente: 1s, 2s, 4s… tope 5 min
        op.intentos++
        op.proximoIntento = new Date(Date.now() + Math.min(2 ** op.intentos * 1000, 300_000)).toISOString()
        await db.put('cola', op)
      } else {
        // error de negocio: no se arregla reintentando
        await db.add('conflictos', { ...op, motivo: mensajeDe(e), falloEn: new Date().toISOString() })
        await db.delete('cola', op.id!)
      }
    }
  }
  sincronizando = false
}
```

La distinción entre error de red y error de negocio es la decisión central. Un
`stock_insuficiente` no se resuelve reintentando cien veces: alguien tiene que
mirarlo. Reintentar errores de negocio llenaría la cola de operaciones zombis y
bloquearía las que sí pueden entrar.

Disparadores: evento `online`, al abrir la app, tras cada operación registrada
con conexión, y cada 60 s mientras haya cola. No se usa Background Sync porque
Safari en iOS no lo implementa, y el mostrador puede tener un iPhone.

## Stock local

El requisito 3.3 pide que las ventas sin conexión validen contra un stock
estimado. La estimación es el stock cacheado menos lo vendido en la cola:

```ts
const stockEstimado = computed(() => (productoId: string) => {
  const base = catalogoLocal.get(productoId)?.stock ?? 0
  const enCola = operacionesEnCola
    .filter(o => o.tipo === 'venta')
    .flatMap(o => o.cuerpo.lineas)
    .filter(l => l.productoId === productoId)
    .reduce((a, l) => a + l.cantidad, 0)
  return base - enCola
})
```

Es una estimación, no una garantía: otro dispositivo pudo vender lo mismo. Por
eso el servidor revalida (spec 05, requisito 3.6) y por eso existe la bandeja de
conflictos. La interfaz marca el stock como estimado mientras no haya conexión,
para que nadie lo lea como un dato firme.

## Operaciones bloqueadas sin conexión

El requisito 3.6 lista lo que no se permite: cambiar la tasa, modificar
productos, cerrar arqueos y anular ventas. Todas comparten una propiedad: su
resultado depende del estado real del servidor en ese momento, y encolarlas
produciría decisiones tomadas sobre información vieja. Cerrar un arqueo con un
esperado calculado sin las ventas de otro dispositivo daría un cuadre falso.

La interfaz deshabilita esas acciones con la explicación: «Necesita conexión.
Esta acción depende de datos que pueden haber cambiado.»

## Indicadores

```
┌────────────────────────────────────────────┐
│  ⚠  Sin conexión · 3 operaciones pendientes │
└────────────────────────────────────────────┘
```

Banda fija bajo la cabecera mientras no hay conexión. Al reconectar cambia a
«Sincronizando…» y luego desaparece, dejando un toast con el resultado
(requisito 4.7): «3 ventas sincronizadas» o «2 sincronizadas, 1 en conflicto».

Las ventas encoladas aparecen en la lista del día con un distintivo de pendiente
(requisito 3.7), para que el total del día no parezca que le faltan ventas.

## Bandeja de conflictos

```
┌──────────────────────────────────────────────────┐
│  Venta del 16/08 a las 14:32 · $6,87             │
│  No entró: no hay stock suficiente de Harina P.A.N│
│  Quedan 0 unidades.                               │
│                                                   │
│  [ Reintentar ]   [ Descartar ]                   │
└──────────────────────────────────────────────────┘
```

Nada caduca ni se descarta solo (requisito 5.7): una venta que no entró es dinero
que se cobró y no está registrado, y tiene que resolverse a mano. Descartar
revierte el descuento de stock local (requisito 5.5).

## Actualizaciones

`registerSW` de `vite-plugin-pwa` con `onNeedRefresh`. El aviso se retiene
mientras `carrito.lineas.length > 0` o hay un arqueo en borrador (requisito 6.2):
recargar en medio de una venta la perdería.

La migración de la cola entre versiones (requisito 6.4) usa el mecanismo de
versión de IndexedDB, con un `upgrade` que transforma las operaciones existentes.
Descartar la cola en una actualización sería perder ventas cobradas.

## Cuota

El requisito 7.3 importa más de lo que parece: cuando el almacenamiento se llena,
IndexedDB lanza `QuotaExceededError` y una implementación ingenua perdería la
escritura. El orden de sacrificio es explícito:

1. Purgar el histórico de ventas cacheado de más de 7 días.
2. Purgar la caché de respuestas de reportes.
3. Recién entonces avisar al usuario.

La cola de operaciones **nunca** se purga. Es lo único irreemplazable: todo lo
demás se puede volver a pedir al servidor.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Venta duplicada por reintento tras respuesta perdida | Llave de idempotencia generada al registrar |
| Reintentar errores de negocio bloquea la cola | Separación entre error de red y error de negocio |
| Vender sin stock real estando sin conexión | Estimación local + revalidación en servidor + bandeja de conflictos |
| Background Sync no existe en iOS | Sincronización por eventos y sondeo, no por Background Sync |
| Perder la cola al actualizar la app | Migración por versión de IndexedDB |
| Cuota agotada pierde ventas | La cola nunca se purga; se sacrifican cachés reemplazables |
| Recargar por actualización pierde el carrito | El aviso se retiene mientras haya trabajo en curso |
