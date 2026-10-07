// 9. Perfiles a lo largo de los vasos: kappa, álcali, sólidos disueltos,
// temperatura y factor H por altura. Es una ayuda didáctica (en planta no se
// ve): se puede ocultar en modo realista.

import { h, reemplazar } from '../dom.js'
import { num } from '../formato.js'

const SERIES = [
  { id: 'kappa', nombre: 'Kappa de la astilla', min: 0, max: 180, valores: (p) => p.kappa },
  { id: 'OH', nombre: 'Álcali libre (g/L NaOH)', min: 0, max: 45, valores: (p) => p.especies.OH.map((x) => x * 40) },
  { id: 'OHr', nombre: 'Álcali dentro de la astilla (g/L)', min: 0, max: 45, valores: (p) => p.OHRetenido.map((x) => (x === null ? null : x * 40)) },
  { id: 'sol', nombre: 'Sólidos orgánicos disueltos (g/L)', min: 0, max: 160, valores: (p) => p.solidosOrganicos },
  { id: 'T', nombre: 'Temperatura del licor (°C)', min: 60, max: 170, valores: (p) => p.T },
  { id: 'H', nombre: 'Factor H acumulado', min: 0, max: 600, valores: (p) => p.H },
]

function grafico(serie, perfiles, alturas) {
  const W = 220
  const Hh = 300
  const ns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg')
  svg.setAttribute('viewBox', `0 0 ${W} ${Hh + 30}`)
  svg.setAttribute('class', 'mimico')
  const add = (tag, attrs, texto) => {
    const el = document.createElementNS(ns, tag)
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    if (texto) el.textContent = texto
    svg.append(el)
    return el
  }
  const x0 = 34
  const w = W - x0 - 8
  add('rect', { x: x0, y: 4, width: w, height: Hh, class: 'nivel-fondo' })
  for (let i = 0; i <= 2; i++) add('text', { x: x0 + (w * i) / 2, y: Hh + 18, 'text-anchor': 'middle', class: 'suave' }, String(Math.round(serie.min + ((serie.max - serie.min) * i) / 2)))
  // Eje vertical: 0 m arriba (tope del impregnador) hasta el fondo del digestor.
  const total = alturas.imp + alturas.dig
  add('text', { x: x0 - 4, y: 14, 'text-anchor': 'end', class: 'suave' }, '0')
  add('text', { x: x0 - 4, y: 4 + (Hh * alturas.imp) / total, 'text-anchor': 'end', class: 'suave' }, `${alturas.imp}`)
  add('text', { x: x0 - 4, y: Hh, 'text-anchor': 'end', class: 'suave' }, `${total}`)
  add('line', { x1: x0, x2: x0 + w, y1: 4 + (Hh * alturas.imp) / total, y2: 4 + (Hh * alturas.imp) / total, class: 'eje' })
  const estilos = { imp: 'perfil b', dig: 'perfil' }
  let base = 0
  for (const vaso of ['imp', 'dig']) {
    const p = perfiles[vaso]
    if (!p) continue
    const v = serie.valores(p)
    const pts = []
    v.forEach((x, i) => {
      if (x === null || !Number.isFinite(x)) return
      const f = Math.min(1, Math.max(0, (x - serie.min) / (serie.max - serie.min)))
      const z = base + p.z[i]
      pts.push(`${(x0 + f * w).toFixed(1)},${(4 + (Hh * z) / total).toFixed(1)}`)
    })
    add('polyline', { points: pts.join(' '), class: estilos[vaso] })
    base += alturas[vaso]
  }
  return svg
}

export function crearPerfiles(app) {
  const contenido = h('div', { class: 'rejilla' })
  const aviso = h('div', { class: 'panel' })
  const elemento = h('div', {}, aviso, contenido)
  let ultimo = -Infinity
  let modoAviso = null
  return {
    elemento,
    actualizar(estado) {
      // El aviso (con su botón) se rehace solo cuando cambia el modo.
      if (modoAviso !== app.ajustes.perfiles) {
        modoAviso = app.ajustes.perfiles
        ultimo = -Infinity
        if (!modoAviso) {
          reemplazar(aviso, 'Perfiles ocultos (modo realista: en planta no se ven). ',
            h('button', { onclick: () => { app.ajustes.perfiles = true; app.cliente.perfiles(true) } }, 'Mostrar (modo didáctico)'))
        } else {
          reemplazar(aviso, h('span', { class: 'suave' }, 'Ayuda didáctica: perfiles por altura, impregnador (línea discontinua) y digestor (continua), de arriba hacia abajo. '),
            h('button', { onclick: () => { app.ajustes.perfiles = false; app.cliente.perfiles(false) } }, 'Ocultar (modo realista)'))
        }
      }
      if (!app.ajustes.perfiles) {
        contenido.replaceChildren()
        return
      }
      if (estado.t - ultimo < 15 && contenido.childElementCount) return
      ultimo = estado.t
      const perfiles = { imp: estado.vasos.imp?.perfil, dig: estado.vasos.dig?.perfil }
      if (!perfiles.dig) return
      const alturas = {
        imp: Math.round(perfiles.imp ? perfiles.imp.z.at(-1) + perfiles.imp.z[0] : 0),
        dig: Math.round(perfiles.dig.z.at(-1) + perfiles.dig.z[0]),
      }
      reemplazar(contenido, SERIES.map((s) => h('div', { class: 'panel' }, h('h3', {}, s.nombre), grafico(s, perfiles, alturas))),
        h('div', { class: 'panel' }, h('h3', {}, 'Calidad en el soplado'),
          h('div', {}, `Kappa ${num(estado.kpi.kappa, 1)} (lignina ${num(estado.kpi.kappaLignina, 1)}, HexA ${num(estado.kpi.kappaHexA, 1)})`),
          h('div', {}, `Rendimiento ${num(estado.kpi.rendimiento * 100, 1)} % · viscosidad ${num(estado.kpi.viscosidad, 0)} mL/g · rechazos ${num(estado.kpi.rechazos * 100, 2)} %`)))
    },
  }
}
