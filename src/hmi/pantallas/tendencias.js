// 7. Tendencias configurables: hasta 6 series (transmisores, consignas y
// salidas de lazos), ventana de tiempo, escala del instrumento o automática,
// y grupos predefinidos.

import { h, reemplazar } from '../dom.js'
import { num } from '../formato.js'
import { dibujarTendencia, autoescala, COLORES } from '../grafico.js'

const VENTANAS = [[900, '15 min'], [3600, '1 h'], [4 * 3600, '4 h'], [8 * 3600, '8 h']]
const GRUPOS = {
  'Presión y niveles': ['PI-301', 'PIC-301.sp', 'PI-201', 'LI-302', 'LI-202'],
  'Temperaturas de cocción': ['TI-402', 'TI-404', 'TI-304', 'TI-305', 'TI-212', 'TI-203'],
  'Calidad': ['AI-701', 'HI-703', 'AI-504', 'AI-505', 'CI-605'],
  'Ritmo y licores': ['WI-101', 'FI-111', 'FI-115', 'LW-117', 'QI-702'],
  'Lavado y soplado': ['FI-601', 'FD-607', 'FI-503', 'TI-604', 'II-307'],
}
let memoria = { series: GRUPOS['Presión y niveles'], ventana: 3600, auto: true } // se conserva al cambiar de pantalla

export function crearTendencias(app) {
  const e0 = app.estado()
  const nombres = e0 ? [
    ...Object.keys(e0.control.transmisores),
    ...Object.keys(e0.control.lazos).flatMap((t) => [`${t}.sp`, `${t}.out`]),
  ] : []
  const selects = Array.from({ length: 6 }, (_, i) => {
    const sel = h('select', { onchange: () => { memoria.series = selects.map((x) => x.value).filter(Boolean); refrescar(true) } },
      h('option', { value: '' }, '—'), nombres.map((n) => h('option', { value: n }, n)))
    sel.value = memoria.series[i] ?? ''
    sel.style.borderLeft = `6px solid ${COLORES[i]}`
    return sel
  })
  const ventana = h('select', { onchange: () => { memoria.ventana = Number(ventana.value); refrescar(true) } },
    VENTANAS.map(([v, t]) => h('option', { value: v }, t)))
  ventana.value = String(memoria.ventana)
  const auto = h('input', { type: 'checkbox', onchange: () => { memoria.auto = auto.checked; dibujar() } })
  auto.checked = memoria.auto
  const grupos = Object.keys(GRUPOS).map((g) => h('button', { onclick: () => {
    memoria.series = GRUPOS[g]
    selects.forEach((s, i) => { s.value = memoria.series[i] ?? '' })
    refrescar(true)
  } }, g))
  const canvas = h('canvas')
  const leyenda = h('div', { class: 'leyenda' })
  const elemento = h('div', { class: 'tendencia' },
    h('div', { class: 'panel' },
      h('div', { class: 'fila' }, 'Grupos:', grupos),
      h('div', { class: 'fila' }, selects),
      h('div', { class: 'fila' }, 'Ventana', ventana, h('label', {}, auto, ' escala automática (si no, rango del instrumento)'))),
    canvas, leyenda)

  let datos = null
  let ultimo = -Infinity
  let tActual = 0
  async function refrescar(forzar = false) {
    const estado = app.estado()
    if (!estado) return
    if (!forzar && estado.t - ultimo < Math.max(5, memoria.ventana / 300)) return
    ultimo = estado.t
    tActual = estado.t
    try {
      datos = await app.cliente.tendencia(memoria.series, estado.t - memoria.ventana, estado.t, 600)
    } catch { return }
    dibujar()
  }

  function rangoDe(nombre, estado) {
    const [tag, sufijo] = nombre.split('.')
    if (sufijo === 'out') return [0, 100]
    if (sufijo === 'sp') return estado.control.lazos[tag]?.rango ?? [0, 100]
    return estado.control.transmisores[tag]?.rango ?? [0, 100]
  }

  function dibujar() {
    const estado = app.estado()
    if (!datos || !estado) return
    // Cada serie conserva el color de su selector (aunque haya selectores vacíos).
    const series = selects.map((sel, i) => [sel.value, i]).filter(([n]) => n && datos.datos[n]).map(([n, i]) => {
      const valores = datos.datos[n]
      const r = rangoDe(n, estado)
      const [min, max] = memoria.auto ? autoescala(valores, r) : r
      return { nombre: n, valores, color: COLORES[i], min, max, discontinua: n.endsWith('.sp') }
    })
    dibujarTendencia(canvas, datos.t, series, [tActual - memoria.ventana, tActual])
    reemplazar(leyenda, series.map((s) => {
      const [tag, suf] = s.nombre.split('.')
      const tx = estado.control.transmisores[tag]
      const ultimoValor = s.valores.at(-1)
      const unidad = suf === 'out' ? '%' : tx?.unidad ?? estado.control.lazos[tag]?.unidad ?? ''
      return h('span', { estilo: { '--color': s.color } }, `${s.nombre} ${num(ultimoValor, tx?.decimales ?? 1)} ${unidad} [${num(s.min, 1)}–${num(s.max, 1)}]`)
    }))
  }

  return { elemento, actualizar: () => refrescar(false) }
}
