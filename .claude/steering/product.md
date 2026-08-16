# Producto

## Qué es

App de gestión para un minimarket / bodega familiar en Venezuela. Reemplaza la
planilla `CONTROL DE VENTAS.xlsx` que hoy se lleva a mano.

Dos superficies, una sola base de código:

- **Mostrador (móvil)** — registrar ventas rápido, consultar precio y stock,
  anotar fiado, contar la caja al cierre. Se usa de pie, con una mano, a veces
  sin señal.
- **Administración (escritorio)** — catálogo, reportes, flujo de caja, deudas,
  configuración de tasa.

## Quién lo usa

| Rol | Qué hace | Superficie |
| --- | --- | --- |
| Dueño/a | Todo. Precios, reportes, tasa, cierre de caja. | Ambas |
| Encargado/a de mostrador | Vender, consultar stock, registrar fiado. | Móvil |

No hay clientes finales usando la app. Nadie se registra solo: las cuentas las
crea el dueño.

## Por qué importa el Excel actual

El Excel no es un requisito de referencia opcional, es **la fuente de verdad del
dominio**. Todo lo que la app modele tiene que poder recibir lo que hoy vive en
esas hojas:

| Hoja | Qué contiene | A dónde va |
| --- | --- | --- |
| `BODEGA` | 215 productos con precio en $ y su equivalente en Bs. | Catálogo + Inventario |
| `CHUCHERIA` | 113 productos de golosinas y snacks | Catálogo + Inventario |
| `DEUDAS 2026` | 42 clientes con fiado pendiente | Deudas |
| `MONEDA` | Ventas por método de pago + conteo de billetes por unidad de negocio | Arqueo de caja |
| `KYC` | Bloques repetidos de conteo de billetes en $ | Arqueo de caja |

Los datos ya extraídos viven en [`mock/`](../../mock/) y son el seed inicial.

## Decisiones de producto tomadas

1. **Moneda dual USD/Bs.** El precio se define en dólares; los bolívares se
   calculan con la tasa vigente. Nunca al revés. Ver [dominio.md](dominio.md).
2. **PWA responsive**, no app nativa. Instalable, funciona sin señal, se
   despliega sin pasar por tiendas.
3. **Tres unidades de negocio**: Bodega, Cerveza, Thais. Ventas, caja y deudas
   se separan por unidad.
4. **El fiado es de primera clase.** Hoy se anota como `"4,5+1,80+1refresco"` en
   una celda. En la app cada consumo es una línea con monto y fecha.

## Lo que NO hace la primera versión

Escribirlo evita que se cuele después:

- Facturación fiscal / integración con SENIAT.
- Lectura de código de barras con cámara (llega con Capacitor, fase posterior).
- Múltiples sucursales o multi-tenant.
- Compras a proveedores y órdenes de reposición automáticas.
- Programa de puntos o fidelización.

## Cómo se mide que funciona

- Registrar una venta de 5 productos toma **menos de 30 segundos** en móvil.
- El cierre de caja cuadra sin usar calculadora aparte.
- Al abrir la app se ve, sin tocar nada, cuánto se vendió hoy y qué falta reponer.
- El dueño deja de abrir el Excel.
