// Genera docs/manual/anexo-a-parametros.md con todos los parámetros de config/:
// valor, unidad, origen, fuente y nota. Se regenera con `npm run tabla-parametros`
// (lo corre también la calibración), así el anexo nunca queda desactualizado.

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { cargarConfig, ARCHIVOS_CONFIG } from './cargarConfig.js'
import { esParametro } from '../src/sim/parametros.js'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')

export function generarTabla(config = cargarConfig()) {
  const conteo = {}
  const secciones = ARCHIVOS_CONFIG.map((archivo) => {
    const filas = []
    const visitar = (nodo, ruta) => {
      if (Array.isArray(nodo)) {
        nodo.forEach((x, i) => visitar(x, `${ruta}[${x?.id ?? i}]`))
        return
      }
      if (nodo === null || typeof nodo !== 'object') return
      if (esParametro(nodo)) {
        conteo[nodo.origen] = (conteo[nodo.origen] ?? 0) + 1
        const nota = [nodo.fuente ? `Fuente: ${nodo.fuente}.` : '', nodo.nota ?? ''].filter(Boolean).join(' ')
        filas.push(`| \`${ruta}\` | ${nodo.valor} | ${nodo.unidad} | ${nodo.origen} | ${nota.replace(/\|/g, '/')} |`)
        return
      }
      for (const [k, v] of Object.entries(nodo)) visitar(v, ruta ? `${ruta}.${k}` : k)
    }
    visitar(config[archivo], '')
    return `## config/${archivo}.json\n\n| Parámetro | Valor | Unidad | Origen | Fuente / nota |\n|-----------|-------|--------|--------|---------------|\n${filas.join('\n')}\n`
  })
  const resumen = Object.entries(conteo).map(([o, n]) => `| ${o} | ${n} |`).join('\n')
  return `# Anexo A. Tabla de parámetros

Generado automáticamente desde \`config/*.json\` por \`npm run tabla-parametros\`.
No editar a mano: cambie la configuración y vuelva a generar.

Orígenes (ver capítulo 1.5): \`literatura\` (publicación citada), \`especificacion\`
(caso base definido por el usuario), \`calibrado\` (ajustado por \`npm run calibrar\`),
\`supuesto\` (provisional, a reemplazar con datos reales), \`planta\` (dato real).

| Origen | Cantidad de parámetros |
|--------|------------------------|
${resumen}

${secciones.join('\n')}`
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(join(raiz, 'docs', 'manual', 'anexo-a-parametros.md'), generarTabla())
  console.log('Escrito docs/manual/anexo-a-parametros.md')
}
