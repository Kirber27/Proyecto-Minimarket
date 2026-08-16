# Índice de specs

Cada spec tiene tres archivos: `requirements.md` (qué, en formato EARS),
`design.md` (cómo, con esquema y decisiones) y `tasks.md` (pasos, con referencia
al requisito que cada uno cumple).

| # | Spec | Depende de | Qué entrega |
| --- | --- | --- | --- |
| 01 | [Fundación de la plataforma](01-fundacion-plataforma/) | — | Proyecto ejecutable, estilos, layouts, `money.ts`, Supabase |
| 02 | [Autenticación y acceso](02-autenticacion-acceso/) | 01 | Login con contraseña y PIN, roles, RLS |
| 03 | [Catálogo de productos](03-catalogo-productos/) | 01, 02 | 328 productos, categorías, unidades de negocio, importación |
| 04 | [Tasa y moneda dual](04-tasa-y-moneda/) | 01 | Tasa USD→Bs., doble moneda en toda la app |
| 05 | [Punto de venta](05-punto-de-venta/) | 03, 04 | Carrito, pago mixto, `crear_venta` atómica |
| 06 | [Inventario y alertas](06-inventario-alertas/) | 03, 05 | Libro de movimientos, ajustes, reposición, alertas |
| 07 | [Deudas y fiado](07-deudas-fiado/) | 04, 05 | Clientes, saldos, abonos, bandeja de revisión |
| 08 | [Flujo de caja](08-flujo-de-caja/) | 05, 07 | Egresos, saldo, desglose por método, Resumen |
| 09 | [Arqueo de caja](09-arqueo-de-caja/) | 08 | Conteo por denominación, cuadre, cierre |
| 10 | [Reportes](10-reportes/) | 05, 06 | Seis periodos, ranking de productos, margen |
| 11 | [PWA y sin conexión](11-pwa-offline/) | 05 | Instalación, caché, cola de operaciones, conflictos |

## Orden sugerido

```
01 ──┬── 02 ──┬── 03 ──┬── 05 ──┬── 06 ──┬── 10
     │        │        │        │        │
     └── 04 ──┘        │        ├── 07 ──┴── 08 ── 09
                       │        │
                       │        └── 11
```

Fases prácticas:

1. **Base** — 01, 02, 04. Sin esto no hay nada; la tasa entra temprano porque
   todos los montos dependen de ella.
2. **Operación diaria** — 03, 05, 06. Es el mínimo que ya reemplaza al Excel para
   vender y controlar stock.
3. **Dinero** — 07, 08, 09. Fiado, caja y cierre.
4. **Análisis y campo** — 10, 11. Reportes y funcionamiento sin señal.

Ninguna fase es un corte duro: 11 se puede adelantar si la conexión resulta ser
el problema más urgente en la práctica.

## Cómo usar un spec

1. Leer `requirements.md` completo antes de tocar código.
2. Leer `design.md`; si algo del diseño no cuadra con la realidad del código,
   actualizar el diseño primero, no improvisar en la implementación.
3. Trabajar `tasks.md` de arriba hacia abajo, marcando cada casilla.
4. Cada tarea referencia los requisitos que cumple con `_Requisitos: x.y_`. Al
   terminar, verificar contra ese criterio de aceptación, no contra la intuición.

Los documentos de [steering](../steering/) aplican a todos los specs y tienen
precedencia: si un spec contradice a `dominio.md` o `tech.md`, el spec está mal.
