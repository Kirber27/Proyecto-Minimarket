# Datos mock

Extraídos de `CONTROL DE VENTAS.xlsx` por [`extract_excel.py`](extract_excel.py).
Son el seed inicial de la base de datos y la fuente de los fixtures de prueba.

Para regenerarlos:

```bash
python3 mock/extract_excel.py
```

El script apunta a `~/Downloads/CONTROL DE VENTAS - copia.xlsx`. Si el archivo
está en otro sitio, se ajusta la constante `SRC`.

## Archivos

| Archivo | Registros | Origen |
| --- | --- | --- |
| `productos.json` | 328 | Hojas `BODEGA` (215) y `CHUCHERIA` (113) |
| `categorias.json` | 16 | Encabezados de fila de ambas hojas |
| `clientes.json` | 42 | Hoja `DEUDAS 2026`, columna B |
| `deudas.json` | 13 | Hoja `DEUDAS 2026`, columnas C, E, F, G |
| `denominaciones.json` | 2 monedas | Hojas `MONEDA` y `KYC` |
| `metodos-pago.json` | 6 | Hoja `MONEDA`, filas de métodos |
| `unidades-negocio.json` | 3 | Bloques Bodega / Cerveza / Thais |
| `tasa-cambio.json` | 1 | Celda `G2` de `BODEGA` |

Cada producto y cliente lleva un campo `origen` con su celda de procedencia
(`BODEGA!B4`), para poder auditar cualquier dato contra la planilla original.

## Cosas que conviene saber

**El Excel no tiene precio de compra.** Solo registra el precio de venta (columna
`$$`). Los 328 productos entran con `costo_usd: null`, y por eso el margen no se
puede calcular hasta que se capture. Ver el requisito 4.3 del
[spec 10](../.claude/specs/10-reportes/requirements.md).

**Las categorías se dedujeron de los encabezados de fila.** Dos de ellos no eran
categorías sino marcas de mes (`ENERO` en `BODEGA`, `AGOSTO` en `CHUCHERIA`), y
un bloque de 42 productos de limpieza e higiene no tenía título. El mapeo está en
`CAT_MAP` dentro del script.

**Las deudas de texto libre no se interpretaron.** De los 42 clientes, 13 tienen
algo anotado en la planilla. En 6 casos es texto libre (`"4,5+1,80+1refres pq"`):
esos entran con `monto: null`, `requiere_revision: true` y la `nota_original`
intacta — adivinar un total ahí es peor que preguntar. Ver el requisito 5 del
[spec 07](../.claude/specs/07-deudas-fiado/requirements.md).

Los otros 7 son números simples, y **la columna de origen ya resuelve la
moneda**: `DEUDAS 2026` tiene una columna por moneda/unidad de negocio (`C` =
bodega en Bs., `E` = bodega en USD, `F` = cerveza en Bs., `G` = thais en USD),
así que un monto en columna `C` es bolívares sin ambigüedad, no un número suelto
que haya que interpretar. Esos 7 entran directo como `deuda_movimiento` con
`moneda` explícita; no pasan por la bandeja de revisión.

**Hay un error de fórmula en la planilla.** `CHUCHERIA!F13` (`MARILU TUBO`) dice
`1,5` cuando debería dar `1,6 × 800 = 1280`. El script detecta la discrepancia,
la reporta, y toma el precio en dólares como fuente de verdad, así que el dato
importado sale correcto. Es la única inconsistencia en 328 filas.

**Ocho productos se venden por peso.** `QUESO`, `JAMON`, `MORTADELA`, `POLLO`,
`CHULETA`, `CARNE MOLIDA`, `BISTEC` y `SALCHICHA` quedan con unidad `KG` y stock
decimal. Se detectan por nombre; si aparece uno nuevo, se agrega al patrón `PESO`
del script.
