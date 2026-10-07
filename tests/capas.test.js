// Independencia de capas: src/sim y src/control no pueden depender de la
// interfaz, del mundo 3D ni del navegador.
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, resolve, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// Capas y lo que cada una puede importar. Las pantallas (hmi, ui) no conocen
// la simulación: reciben el cliente del puente (la interfaz única).
const PERMITIDO = {
  sim: ['src/sim'],
  control: ['src/sim', 'src/control'],
  puente: ['src/puente', 'src/sim', 'src/control', 'config'],
  hmi: ['src/hmi', 'src/ui'],
  ui: ['src/ui', 'src/hmi'],
}
const SIN_NAVEGADOR = ['sim', 'control']
const PROHIBIDO_TEXTO = [/\bwindow\b/, /\bdocument\b/, /Math\.random/, /Date\.now/, /\bperformance\b/, /localStorage/, /\bfetch\(/]

function archivos(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((n) => {
    const r = join(dir, n)
    return statSync(r).isDirectory() ? archivos(r) : r.endsWith('.js') ? [r] : []
  })
}

const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

describe('independencia de capas', () => {
  for (const [capa, permitidas] of Object.entries(PERMITIDO)) {
    it(`src/${capa} solo importa ${permitidas.join(', ')}${SIN_NAVEGADOR.includes(capa) ? ' y no usa APIs del navegador' : ''}`, () => {
      for (const archivo of archivos(join(raiz, 'src', capa))) {
        const src = sinComentarios(readFileSync(archivo, 'utf8'))
        const imports = [...src.matchAll(/(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)]
        for (const m of imports) {
          const ruta = m[1] ?? m[2]
          expect(ruta.startsWith('.'), `${archivo}: importa el paquete externo "${ruta}"`).toBe(true)
          const destino = relative(raiz, resolve(dirname(archivo), ruta))
          const ok = permitidas.some((p) => destino.startsWith(p))
          expect(ok, `${archivo}: importa ${destino}`).toBe(true)
        }
        if (SIN_NAVEGADOR.includes(capa)) for (const re of PROHIBIDO_TEXTO) expect(re.test(src), `${archivo}: usa ${re}`).toBe(false)
      }
    })
  }
})
