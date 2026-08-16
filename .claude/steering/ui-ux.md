# Interfaz y experiencia

Derivado del prototipo en Claude Design
([proyecto `App minimarket`](https://claude.ai/design/p/4b19f958-21e0-4894-b148-c1fb9fc13304)).
Los valores de abajo están tomados del prototipo, no inventados: si algo no
coincide, manda el prototipo y se actualiza este archivo.

## Tokens

Todo esto vive en `src/assets/scss/_variables.scss` y se inyecta antes de
importar Bootstrap, para que los componentes de Bootstrap hereden la paleta.

### Color

```scss
$acento:        oklch(56% 0.19 275);   // primario, botones, activos
$acento-hover:  oklch(46% 0.19 275);
$acento-suave:  oklch(97.5% 0.015 275);
$tinta:         oklch(20% 0.015 265);  // texto principal
$tenue:         oklch(52% 0.015 265);  // texto secundario
$fondo:         #F1F2F4;               // fondo de la app
$superficie:    #FFFFFF;               // tarjetas
$borde:         rgba(20, 22, 30, 0.08);
```

`$tenue` sale del prototipo en `oklch(63% ...)`, pero ese valor da 3.13:1 de
contraste contra `$fondo` — por debajo del minimo AA de 4.5:1 de la regla de
abajo. Se oscurecio a 52%, que da 4.91:1 contra `$fondo` y 5.50:1 contra
`$superficie`, detectado por `@axe-core/playwright` en la suite E2E.

`$acento` como **fondo** de botones (con texto blanco encima) esta bien, pero
como **color de texto** sobre `$fondo`/`$superficie`/`$acento-suave` da entre
4.39:1 y 4.57:1 — por debajo o al limite del minimo AA. Enlaces, texto de
botones secundarios y el item de navegacion activo usan `$acento-hover` en vez
de `$acento`, que da 6.8–7.1:1 contra esos mismos fondos.

Semánticos, expresados como trío (texto / fondo / uso):

```scss
$ok:     oklch(55% 0.14 150);  $ok-bg:     oklch(94% 0.05 150);   // stock normal, ingresos
$aviso:  oklch(60% 0.14 70);   $aviso-bg:  oklch(95% 0.05 70);    // stock bajo
$error:  oklch(58% 0.18 25);   $error-bg:  oklch(95% 0.05 25);    // sin stock, egresos
$grave:  oklch(50% 0.19 25);   $grave-bg:  oklch(94% 0.06 25);    // agotado
```

Las categorías se tiñen por matiz. La función toma el matiz de la categoría y
genera el par fondo/texto, así una categoría nueva recibe color sin tocar código:

```scss
@function tinte-bg($h) { @return oklch(95% 0.035 #{$h}); }
@function tinte-fg($h) { @return oklch(48% 0.13 #{$h}); }
```

Matices asignados: Bebidas 240, Víveres 60, Charcutería 200, Tortas 40,
Higiene y limpieza 175, Snacks 330. El resto cae al valor por defecto 265.

### Tipografía

Inter, pesos 400/500/600/700/800. `system-ui` como respaldo. La fuente se
**auto-hospeda** en `public/fonts/` — no se enlaza a Google Fonts, porque el
mostrador trabaja sin señal y una fuente remota bloquea el render.

| Uso | Tamaño | Peso |
| --- | --- | --- |
| Cifra grande (total, saldo) | 32–40 px | 800 |
| Título de sección | 20 px | 700 |
| Cuerpo | 14–15 px | 400–500 |
| Etiqueta / meta | 12–13 px | 600 |

### Forma y elevación

```scss
$radio-sm: 9px;    // chips, botones
$radio-md: 12px;   // tarjetas, campos
$radio-lg: 16px;   // paneles
$sombra-1: 0 2px 10px rgba(20, 22, 40, 0.08);
$sombra-2: 0 24px 60px rgba(20, 22, 40, 0.14);   // modales
```

Espaciado en múltiplos de 4. Los que más se repiten: 6, 12, 20, 26, 36.

## Las dos superficies

El corte es en **768 px**, y no es solo un cambio de ancho: son dos layouts con
navegación distinta.

### Móvil (`< 768px`) — `LayoutMovil.vue`

Barra inferior fija con cinco destinos. Los nombres son los del prototipo:

| Ruta | Etiqueta | Título de pantalla |
| --- | --- | --- |
| `/` | Inicio | Resumen · «Cómo va el día en el local» |
| `/venta` | Vender | Registrar venta · «Arma la venta y confirma en un toque» |
| `/inventario` | Stock | Inventario · «Stock, precios y margen por producto» |
| `/caja` | Caja | Flujo de caja · «Ingresos, egresos y saldo» |
| `/mas` | Más | Más opciones |

Detrás de «Más» quedan Productos, Categorías, Reportes, Alertas, Deudas,
Arqueo y Ajustes.

### Escritorio (`>= 768px`) — `LayoutEscritorio.vue`

Barra lateral fija con todos los destinos visibles, sin «Más»: Resumen,
Registrar venta, Inventario, Productos, Categorías, Reportes, Flujo de caja,
Alertas de stock, Deudas, Arqueo.

Ambos layouts consumen **las mismas páginas**. Una página no sabe en qué layout
está; si necesita adaptarse usa el composable `useEsMovil()`, no `v-if` sobre el
ancho repartido por el template.

## Reglas de interacción

- **Objetivo táctil mínimo 44 × 44 px** en móvil. La pantalla de venta se usa a
  toda velocidad; un botón chico cuesta una venta mal registrada.
- **La venta se confirma en un toque.** Del carrito lleno a la venta guardada hay
  exactamente un botón. Sin diálogo de «¿está seguro?».
- **Confirmación visible, no bloqueante.** Al guardar aparece un panel de éxito
  con el total y el método, que se va solo a los 2,4 s. Los avisos menores usan
  un toast de 2,2 s.
- **Errores donde ocurren.** El mensaje va pegado al campo o a la acción que
  falló, no en un banner arriba del todo.
- **Estados vacíos con salida.** «No hay ventas hoy» viene con un botón
  «Registrar venta», no solo con un dibujo.
- **Modo montos ocultos.** Existe un interruptor `hideMontos` que enmascara las
  cifras. Es para cuando hay clientes mirando la pantalla; conviene que siga
  existiendo.

## Accesibilidad

- Contraste mínimo AA (4.5:1) para texto. Los pares `oklch` de arriba lo
  cumplen; si se agrega un color nuevo hay que verificarlo.
- **El color nunca es la única señal.** El estado de stock lleva etiqueta de
  texto («Sin stock», «12 u.») además del tono. Ingresos y egresos llevan `+` y
  `−` además de verde y rojo.
- Todo lo accionable es alcanzable con teclado y tiene foco visible. Los
  «botones» que en el prototipo son `<div>` con `onClick` se implementan como
  `<button>` reales.
- Los iconos del prototipo son glifos de texto (`▤ ＋ ☰ $ ⋯`). En la
  implementación se reemplazan por SVG con `aria-hidden` y etiqueta textual al
  lado, porque los glifos se leen como caracteres sueltos en lector de pantalla.
- La app se declara `lang="es-VE"`.

## Qué agregar al diseño

El prototipo no cubre lo que decidimos incluir. Estas pantallas se diseñan
siguiendo los tokens de arriba:

- Selector de **unidad de negocio** (Bodega / Cerveza / Thais) en la cabecera.
- Doble moneda en cada monto: USD como cifra principal, Bs. debajo en `$tenue`.
- **Deudas**: lista de clientes con saldo, ficha de cliente con movimientos,
  registrar abono, bandeja de revisión para las notas heredadas del Excel.
- **Arqueo**: grilla de denominaciones con cantidad por billete, totales por
  moneda, y el cuadre contra lo esperado.
- Ajuste de la **tasa del día**, accesible desde la cabecera porque se toca a
  diario.
- Indicador de **sin conexión** y contador de operaciones pendientes de
  sincronizar.
