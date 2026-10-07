// Utilidades mínimas de DOM y SVG (sin dependencias).

const NS = 'http://www.w3.org/2000/svg'

function poner(el, attrs) {
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === undefined || v === null || v === false) continue
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v)
    else if (k === 'texto') el.textContent = v
    else if (k === 'estilo') {
      for (const [p, x] of Object.entries(v)) {
        if (p.startsWith('--')) el.style.setProperty(p, x)
        else el.style[p] = x
      }
    }
    else el.setAttribute(k, v === true ? '' : v)
  }
}

function agregar(el, hijos) {
  for (const h of hijos.flat(Infinity)) {
    if (h === null || h === undefined || h === false) continue
    el.append(h instanceof Node ? h : document.createTextNode(String(h)))
  }
}

/** Elemento HTML: h('button', { class: 'x', onclick }, 'texto'). */
export function h(tag, attrs = {}, ...hijos) {
  const el = document.createElement(tag)
  poner(el, attrs)
  agregar(el, hijos)
  return el
}

/** Elemento SVG. */
export function s(tag, attrs = {}, ...hijos) {
  const el = document.createElementNS(NS, tag)
  poner(el, attrs)
  agregar(el, hijos)
  return el
}

/** Vacía un elemento y le agrega hijos. */
export function reemplazar(el, ...hijos) {
  el.replaceChildren()
  agregar(el, hijos)
  return el
}

/** Aviso breve en la parte inferior de la pantalla. */
export function avisar(texto, ms = 3500) {
  const a = h('div', { class: 'aviso-flotante', role: 'status' }, texto)
  document.body.append(a)
  setTimeout(() => a.remove(), ms)
}
