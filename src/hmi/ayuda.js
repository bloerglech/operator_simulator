// Ayuda contextual: qué mide cada variable, por qué importa y qué significa
// que suba o baje (config/ayuda.json). Se muestra plegada en las carátulas.

import { h } from './dom.js'
import ayuda from '../../config/ayuda.json'

/** Texto de ayuda de un tag, o null. */
export function ayudaDe(tag) {
  return ayuda.variables[tag] ?? null
}

/** Texto de ayuda de un análisis de laboratorio, o null. */
export function ayudaLaboratorio(id) {
  return ayuda.laboratorio[id] ?? null
}

/** Bloque plegable «¿Qué es esto?» para una carátula. */
export function bloqueAyuda(tag) {
  const a = ayudaDe(tag)
  if (!a) return null
  const fila = (titulo, texto) => h('p', {}, h('b', {}, `${titulo} `), texto)
  return h('details', { class: 'ayuda' },
    h('summary', {}, `¿Qué es ${tag}?`),
    fila('Mide:', a.mide),
    fila('Por qué importa:', a.importa),
    fila('▲ Si sube:', a.sube),
    fila('▼ Si baja:', a.baja))
}

/** Glosario de todas las variables (al final del manual de operación). */
export function glosario() {
  return h('div', { class: 'manual' },
    h('h2', {}, 'Glosario de variables'),
    h('p', {}, 'Qué mide cada instrumento, por qué importa y qué significa que suba o baje. La misma ayuda aparece en cada carátula («¿Qué es…?»).'),
    Object.entries(ayuda.variables).map(([tag, a]) => h('div', { class: 'glosario' },
      h('h4', {}, tag),
      h('p', {}, a.mide, ' ', a.importa),
      h('p', {}, h('b', {}, '▲ '), a.sube, ' ', h('b', {}, '▼ '), a.baja))),
    h('h3', {}, 'Análisis de laboratorio'),
    h('ul', {}, Object.entries(ayuda.laboratorio).map(([id, t]) => h('li', {}, h('b', {}, id.replaceAll('_', ' ')), ': ', t))))
}
