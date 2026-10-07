// Manual de operación dentro del juego: docs/PROCEDIMIENTOS.md convertido a
// HTML con un conversor mínimo de Markdown (títulos, listas, párrafos,
// negrita, cursiva y código).

import texto from '../../docs/PROCEDIMIENTOS.md?raw'
import { h } from './dom.js'
import { glosario } from './ayuda.js'

function enLinea(t) {
  const frag = document.createDocumentFragment()
  const partes = t.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  for (const p of partes) {
    if (p.startsWith('**') && p.endsWith('**')) frag.append(h('strong', {}, p.slice(2, -2)))
    else if (p.startsWith('`') && p.endsWith('`')) frag.append(h('code', {}, p.slice(1, -1)))
    else if (p.startsWith('*') && p.endsWith('*') && p.length > 2) frag.append(h('em', {}, p.slice(1, -1)))
    else if (p) frag.append(p)
  }
  return frag
}

export function markdownAHtml(md) {
  const raiz = h('div', { class: 'manual' })
  let lista = null
  let parrafo = []
  const cerrarParrafo = () => {
    if (parrafo.length) raiz.append(h('p', {}, enLinea(parrafo.join(' '))))
    parrafo = []
  }
  for (const linea of md.split('\n')) {
    const t = linea.trim()
    const titulo = /^(#{1,4})\s+(.*)$/.exec(t)
    const item = /^(?:[-*]|\d+\.)\s+(.*)$/.exec(t)
    if (titulo) {
      cerrarParrafo(); lista = null
      raiz.append(h(`h${Math.min(4, titulo[1].length + 1)}`, {}, enLinea(titulo[2])))
    } else if (item) {
      cerrarParrafo()
      if (!lista) { lista = h(/^\d/.test(t) ? 'ol' : 'ul'); raiz.append(lista) }
      lista.append(h('li', {}, enLinea(item[1])))
    } else if (!t) {
      cerrarParrafo(); lista = null
    } else if (lista && linea.startsWith('  ')) {
      lista.lastChild.append(' ', enLinea(t))
    } else {
      lista = null
      parrafo.push(t)
    }
  }
  cerrarParrafo()
  return raiz
}

export function abrirManual(app) {
  const contenido = markdownAHtml(texto)
  return {
    elemento: h('div', { class: 'panel' },
      h('button', { class: 'cerrar', style: 'float:right', onclick: () => app.cerrarLateral() }, '✕'),
      contenido,
      glosario()),
    actualizar() {},
  }
}
