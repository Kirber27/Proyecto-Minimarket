# Dominio y glosario

Este documento fija el vocabulario. Si un nombre aparece aquí, se usa **igual**
en el código, en la base de datos y en la interfaz. Los identificadores del
código van en español sin tildes; la interfaz sí lleva tildes.

## Glosario

| Término | Código / BD | Qué es |
| --- | --- | --- |
| Unidad de negocio | `unidad_negocio` | Bodega, Cerveza o Thais. Separa ventas, caja y deudas. |
| Producto | `producto` | Artículo vendible. Precio siempre en USD. |
| Categoría | `categoria` | Agrupación del catálogo (Víveres, Bebidas, Galletas…). |
| Tasa | `tasa_cambio` | Bs. por 1 USD. Cambia a diario. |
| Venta | `venta` | Transacción completa: cabecera + líneas + pagos. |
| Línea de venta | `venta_linea` | Un producto y su cantidad dentro de una venta. |
| Pago | `venta_pago` | Un método y un monto. Una venta puede tener varios. |
| Fiado / Deuda | `deuda` | Saldo pendiente de un cliente. |
| Abono | `deuda_movimiento` tipo `abono` | Pago parcial o total de una deuda. |
| Egreso | `egreso` | Salida de dinero: proveedor, insumos, servicios. |
| Arqueo | `arqueo` | Conteo físico de caja al cierre. |
| Denominación | `arqueo_detalle` | Un billete y cuántos hay (ej. 100 Bs. × 63). |
| Punto | método de pago `punto` | Punto de venta con tarjeta de débito. |
| Pago móvil | método `pago-movil` | Transferencia móvil interbancaria. |
| Biopago | método `biopago` | Pago biométrico del Banco de Venezuela. |

## Moneda: la regla central

El Excel tiene tres columnas relevantes: `$$` (precio en USD),
`CAMBIO BS.` (= precio × TASA) y `TASA` (celda `G2` = 800).

> **El precio se define en USD. Los bolívares son siempre un valor derivado.**

Consecuencias concretas:

- `producto.precio_venta_usd` es la única columna de precio en el catálogo.
- `venta.total_usd` es la fuente de verdad. Se guarda además
  `venta.tasa_aplicada` para poder reimprimir el recibo con los bolívares
  exactos del momento, pero `total_ves` **no se guarda**: se recalcula como
  `total_usd × tasa_aplicada`.
- Si la tasa cambia entre que se arma el carrito y se confirma la venta, manda la
  tasa vigente al confirmar, y se le avisa al usuario.
- La única excepción a "no persistir bolívares" es el arqueo: contar 63 billetes
  de 100 Bs. es un hecho físico, no un cálculo.

### Redondeo

- Los precios en USD se redondean a **2 decimales**.
- Los montos en Bs. se redondean a **entero** al mostrarse. Los billetes de menos
  de 1 Bs. no circulan.
- El redondeo pasa **una sola vez, al final** de cada cálculo. Redondear cada
  línea y luego sumar da un total distinto al correcto.

### Formato de presentación

```
USD  →  $1,57         (punto decimal, símbolo pegado)
Bs.  →  1.256 Bs.     (punto de miles, sin decimales, sufijo)
```

Locale `es-VE`. Ambas monedas se muestran siempre juntas donde importa el monto
(total de venta, precio en la ficha de producto, saldo de caja). En listas densas
manda el USD, con Bs. en tamaño menor.

## Unidades de medida

Del Excel se deducen dos:

- `UND` — se vende por pieza. Stock entero.
- `KG` — se vende por peso. Stock decimal con 3 decimales. En el Excel se ve en
  `QUESO AMARILLO` (cantidad `2.6`) y `MORTADELA GIACOMELO` (`4.4`).

La app arranca con estas dos. `LITRO` y `PACK` existen en el enum pero no tienen
productos asignados todavía.

## Métodos de pago

| id | Nombre | Moneda | Entra al arqueo |
| --- | --- | --- | --- |
| `efectivo-ves` | Efectivo Bs. | VES | Sí |
| `efectivo-usd` | Efectivo $ | USD | Sí |
| `punto` | Punto de venta | VES | No |
| `pago-movil` | Pago móvil | VES | No |
| `biopago` | Biopago | VES | No |
| `credito` | Fiado | USD | No |

"Entra al arqueo" significa que el conteo físico de billetes debe cuadrar contra
la suma de las ventas con ese método. Los métodos electrónicos se concilian
contra el estado de cuenta, no contra la gaveta.

Una venta admite **pago mixto**: parte en efectivo Bs., parte en pago móvil. La
suma de los pagos debe igualar el total; si queda por debajo, la diferencia se
convierte en deuda del cliente y el método `credito` exige que se elija cliente.

## Estados de stock

Copiados del diseño, ya validados visualmente:

| Condición | Etiqueta | Tono |
| --- | --- | --- |
| `stock <= 0` | Sin stock | Rojo |
| `stock < minimo` | Crítico | Rojo suave |
| `stock < minimo × 2` | Bajo | Ámbar |
| resto | Normal | Verde |

`stock_minimo` es por producto, con valor por defecto 5 para `UND` y 1 para `KG`.

## Deudas: migrar el texto libre

En `DEUDAS 2026` los montos están escritos a mano como texto:

```
LESTER   →  "4,5+1,80+1,80+1refres pq+1,80+1refre pq+1,80+2+1,20+2,10+1,30+..."
ERICK    →  "1,20+4"
JOSEFINA →  7420          (número, pero ¿bolívares o dólares?)
```

Esto **no se parsea automáticamente**. La extracción marca cada uno con
`requiere_revision: true` y conserva `nota_original`. La app muestra esas deudas
en una bandeja de revisión donde el dueño confirma el monto real. Adivinar un
saldo de fiado es peor que pedir que lo confirmen.

De los 42 clientes, 13 tienen algo anotado; el resto son nombres sin saldo.

## Anomalía conocida en el Excel

`CHUCHERIA` fila 13, `MARILU TUBO`: la celda `CAMBIO BS.` dice `1,5` cuando la
fórmula debería dar `1,6 × 800 = 1280`. Es un error de fórmula de la hoja, no un
precio distinto. La extracción toma el precio USD (`1,6`) y recalcula los
bolívares, así que el dato importado queda correcto.
