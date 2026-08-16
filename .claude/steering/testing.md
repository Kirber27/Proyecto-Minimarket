# Estrategia de pruebas

## Qué se prueba y con qué

| Capa | Herramienta | Cobertura esperada |
| --- | --- | --- |
| Aritmética de dinero y tasa (`src/lib/money.ts`) | Vitest | 100 %, sin excepción |
| Stores de Pinia | Vitest | Toda acción que cambie estado |
| Composables | Vitest | Los que tengan lógica; los triviales no |
| Componentes con lógica | Vue Test Utils | Comportamiento, no marcado |
| Funciones `plpgsql` | pgTAP sobre Supabase local | Toda función que escriba |
| Flujos completos | Playwright | Los cinco recorridos críticos |

No hay meta global de cobertura. Un número alto de cobertura con pruebas que
afirman que un `div` existe no dice nada. Lo que sí es obligatorio es el 100 %
en dinero: un error de céntimos ahí se propaga a todos los reportes.

## Los cinco recorridos críticos (E2E)

1. Iniciar sesión con PIN → registrar venta de 3 productos con pago mixto →
   verificar que el stock bajó y que aparece en el resumen del día.
2. Venta con método `credito` → confirmar que crea la deuda del cliente →
   registrar un abono parcial → verificar el saldo.
3. Cambiar la tasa del día → verificar que los precios en Bs. se recalculan en
   catálogo, carrito y reportes.
4. Cierre de caja: contar denominaciones → ver el cuadre contra lo esperado →
   guardar el arqueo.
5. Perder la conexión a mitad de una venta → confirmarla → recuperar la conexión
   → verificar que se sincronizó una sola vez.

## Reglas

- **Se prueba el comportamiento, no la implementación.** Una prueba que se rompe
  al renombrar una variable interna estaba mal escrita.
- **Nada de mocks de Supabase en pruebas de integración.** Se usa el stack local
  (`npx supabase start`) con el seed de `mock/`. Los mocks de la base esconden
  exactamente los errores que importan: RLS, constraints, tipos numéricos.
- Cada corrección de bug entra con una prueba que falla antes del arreglo. Si no
  se puede escribir esa prueba, el bug no está entendido todavía.
- Las pruebas de dinero usan casos frontera reales del Excel:
  `0.04` (caramelo más barato), `13.00` (bistec, el más caro), `1.57 × 800 = 1256`,
  y el caso de `MARILU TUBO` documentado en [dominio.md](dominio.md).
- Los datos de prueba salen de `mock/`, no se inventan. Si un caso necesita datos
  que el Excel no tiene, se agregan a un fixture aparte y se comenta por qué.

## Accesibilidad

`@axe-core/playwright` corre sobre las pantallas principales dentro de la suite
E2E. Una violación de nivel «serious» o «critical» rompe el build.

## Rendimiento

Un presupuesto en CI mide el bundle. Si el chunk inicial pasa de 250 KB gzip,
falla. Ver los objetivos en [tech.md](tech.md).
