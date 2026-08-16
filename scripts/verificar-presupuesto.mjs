// Falla el build si el JS+CSS que carga la primera pantalla (todo lo que
// Vite deja fuera de import() diferido) pasa el presupuesto de
// .claude/steering/tech.md: "Bundle inicial < 250 KB gzip".
import { gzipSync } from 'node:zlib'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const LIMITE_GZIP_KB = 250
const DIST = 'dist/assets'

const archivosIniciales = readdirSync(DIST).filter(
  nombre =>
    nombre.startsWith('index-') && (nombre.endsWith('.js') || nombre.endsWith('.css')),
)

let totalGzip = 0
for (const archivo of archivosIniciales) {
  const contenido = readFileSync(join(DIST, archivo))
  const tamanoGzip = gzipSync(contenido).length
  totalGzip += tamanoGzip
  console.log(`${archivo}: ${(tamanoGzip / 1024).toFixed(2)} KB gzip`)
}

const totalKb = totalGzip / 1024
console.log(
  `Total bundle inicial: ${totalKb.toFixed(2)} KB gzip (limite ${LIMITE_GZIP_KB} KB)`,
)

if (totalKb > LIMITE_GZIP_KB) {
  console.error(`✗ El bundle inicial supera el presupuesto de ${LIMITE_GZIP_KB} KB gzip.`)
  process.exit(1)
}
console.log('✓ Bundle inicial dentro del presupuesto.')
