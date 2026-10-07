// Contenido de las pantallas de la sala: cada monitor dibuja en un canvas
// (textura) la misma pantalla DCS que se opera en 2D. Los mímicos SVG se
// serializan con sus estilos y se rasterizan; alarmas, calidad, tendencias,
// perfiles y la pantalla mural se dibujan directamente en el canvas.

import estilosCSS from '../hmi/estilos.css?raw'
import { crearMimico } from '../hmi/mimico.js'
import { DEFINICIONES } from '../hmi/pantallas/mimicos.js'
import { INDICADORES } from '../hmi/pantallas/calidad.js'
import { dibujarTendencia, autoescala, COLORES } from '../hmi/grafico.js'
import { num, hora, reloj } from '../hmi/formato.js'

const TITULOS = {
  alimentacion: 'Alimentación e impregnación', digestor: 'Digestor', circulaciones: 'Circulaciones y calentadores',
  extracciones: 'Extracciones y flash', fondo: 'Fondo y soplado', calidad: 'Calidad', alarmas: 'Alarmas',
  tendencias: 'Tendencias', perfiles: 'Perfiles', mural: 'Resumen de proceso',
}
const COLOR_P = { 1: '#d71f1f', 2: '#f08a00', 3: '#e2c800', 4: '#3d8fe0' }
const SIN_ACCION = { abrirTag() {}, abrirLazo() {}, menuBomba() {}, menuMalla() {}, menuCalentador() {} }
const ALTO_TITULO = 0.06 // fracción del alto

/** Crea el pintor de un contenido sobre un canvas. */
export function crearPintor(contenido, canvas, cliente, alDibujar = () => {}) {
  const g = canvas.getContext('2d')
  const W = canvas.width
  const H = canvas.height
  const top = Math.round(H * ALTO_TITULO)
  const def = DEFINICIONES[contenido]
  const mimico = def ? crearMimico(def, SIN_ACCION) : null
  let cargando = false
  let tendencia = null
  let pidiendo = false

  function titulo(estado) {
    g.fillStyle = '#bdbdbd'
    g.fillRect(0, 0, W, top)
    g.fillStyle = '#161616'
    g.font = `600 ${Math.round(top * 0.55)}px system-ui, sans-serif`
    g.textBaseline = 'middle'
    g.textAlign = 'left'
    g.fillText(TITULOS[contenido] ?? contenido, top * 0.4, top / 2)
    g.textAlign = 'right'
    g.font = `${Math.round(top * 0.5)}px ui-monospace, monospace`
    g.fillText(reloj(estado.t), W - top * 0.4, top / 2)
    g.textBaseline = 'alphabetic'
  }

  function fondo() {
    g.fillStyle = '#c9c9c9'
    g.fillRect(0, top, W, H - top)
  }

  function pintarMimico(estado) {
    if (cargando) return
    mimico.actualizar(estado)
    const svg = mimico.elemento.cloneNode(true)
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    svg.setAttribute('width', def.ancho)
    svg.setAttribute('height', def.alto)
    const estilo = document.createElementNS('http://www.w3.org/2000/svg', 'style')
    estilo.textContent = estilosCSS
    svg.prepend(estilo)
    const img = new Image()
    cargando = true
    img.onload = () => {
      cargando = false
      titulo(estado)
      fondo()
      const esc = Math.min(W / def.ancho, (H - top) / def.alto)
      const w = def.ancho * esc
      const hh = def.alto * esc
      g.drawImage(img, (W - w) / 2, top + (H - top - hh) / 2, w, hh)
      alDibujar()
    }
    img.onerror = () => { cargando = false }
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`
  }

  function texto(t, x, y, tam, color = '#161616', alinear = 'left', peso = '') {
    g.font = `${peso} ${Math.round(tam)}px system-ui, sans-serif`
    g.fillStyle = color
    g.textAlign = alinear
    g.fillText(t, x, y)
  }

  function listaAlarmas(estado, x, y, w, h, tam) {
    const lista = estado.control.alarmas.lista
    const fila = tam * 1.7
    if (lista.length === 0) texto('Sin alarmas activas', x + tam, y + fila, tam, '#4a4a4a')
    lista.slice(0, Math.floor(h / fila)).forEach((a, i) => {
      const yy = y + i * fila
      g.fillStyle = COLOR_P[a.prioridad]
      g.fillRect(x, yy + fila * 0.15, tam * 1.2, fila * 0.7)
      texto(String(a.prioridad), x + tam * 0.6, yy + fila * 0.68, tam * 0.8, a.prioridad === 1 || a.prioridad === 4 ? '#fff' : '#000', 'center', '600')
      texto(hora(a.t), x + tam * 1.8, yy + fila * 0.68, tam, '#161616')
      texto(`${a.id}  ${a.mensaje}`, x + tam * 5.2, yy + fila * 0.68, tam, '#161616', 'left', a.reconocida ? '' : '600')
    })
  }

  function tablaIndicadores(estado, x, y, tam) {
    const fila = tam * 1.8
    INDICADORES.forEach(([tag, nombre, ref], i) => {
      const t = estado.control.transmisores[tag]
      const yy = y + (i + 1) * fila
      texto(tag, x, yy, tam, '#4a4a4a')
      texto(nombre, x + tam * 5.5, yy, tam)
      texto(`${num(t?.valor, t?.decimales)} ${t?.unidad ?? ''}`, x + tam * 26, yy, tam, '#161616', 'right', '600')
      texto(ref, x + tam * 27, yy, tam * 0.85, '#4a4a4a')
    })
  }

  async function pedirTendencia(estado, nombres, ventana) {
    if (pidiendo) return
    pidiendo = true
    try { tendencia = await cliente.tendencia(nombres, estado.t - ventana, estado.t, 200) } catch { /* reintento */ }
    pidiendo = false
  }

  function graficoTendencia(estado, nombres, x, y, w, h) {
    if (!tendencia || tendencia.t.length < 2) return
    const series = nombres.map((n, i) => {
      const tx = estado.control.transmisores[n]
      const v = tendencia.datos[n] ?? []
      const [min, max] = autoescala(v, tx?.rango ?? [0, 100])
      return { valores: v, color: COLORES[i], min, max }
    })
    dibujarTendencia(canvas, tendencia.t, series, [estado.t - 3600, estado.t], { x, y, w, h, escala: Math.max(1, h / 260) })
    nombres.forEach((n, i) => {
      const tx = estado.control.transmisores[n]
      texto(`${n} ${num(tx?.valor, tx?.decimales)} ${tx?.unidad ?? ''}`, x + 10 + i * (w / nombres.length), y + h + h * 0.09, h * 0.065, COLORES[i], 'left', '600')
    })
  }

  function perfil(estado, serie, x, y, w, h, min, max, factor = 1) {
    const p = estado.vasos.dig?.perfil
    g.fillStyle = '#ececec'
    g.fillRect(x, y, w, h)
    if (!p) return
    const v = serie === 'OH' ? p.especies.OH : p[serie]
    g.strokeStyle = '#1d1d1d'
    g.lineWidth = 2
    g.beginPath()
    v.forEach((val, i) => {
      if (val === null || !Number.isFinite(val)) return
      const f = Math.min(1, Math.max(0, (val * factor - min) / (max - min)))
      const px = x + f * w
      const py = y + (h * (i + 0.5)) / v.length
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py)
    })
    g.stroke()
  }

  return {
    pintar(estado) {
      if (mimico) return pintarMimico(estado)
      titulo(estado)
      fondo()
      const m = W * 0.02
      if (contenido === 'alarmas') listaAlarmas(estado, m, top + m, W - 2 * m, H - top - 2 * m, H * 0.035)
      else if (contenido === 'calidad') tablaIndicadores(estado, m, top + m, H * 0.04)
      else if (contenido === 'tendencias') {
        const nombres = ['PI-301', 'LI-302', 'TI-402', 'TI-404']
        pedirTendencia(estado, nombres, 3600)
        graficoTendencia(estado, nombres, m, top + m, W - 2 * m, (H - top) * 0.78)
      } else if (contenido === 'perfiles') {
        texto('Temperatura del licor', m, top + H * 0.07, H * 0.04)
        texto('Álcali libre', W / 2 + m, top + H * 0.07, H * 0.04)
        perfil(estado, 'T', m, top + H * 0.1, W / 2 - 2 * m, H - top - H * 0.14, 60, 170)
        perfil(estado, 'OH', W / 2 + m, top + H * 0.1, W / 2 - 2 * m, H - top - H * 0.14, 0, 40, 40)
      } else if (contenido === 'mural') {
        const k = estado.control.transmisores
        const tam = H * 0.05
        const grandes = [['QI-702', 'Producción'], ['AI-701', 'Kappa'], ['HI-703', 'Factor H'], ['WI-101', 'Madera'], ['PI-301', 'Presión digestor'], ['LI-302', 'Nivel de astillas']]
        grandes.forEach(([tag, nombre], i) => {
          const yy = top + m + i * (H - top) * 0.155
          texto(nombre, m, yy + tam, tam * 0.75, '#4a4a4a')
          texto(`${num(k[tag]?.valor, k[tag]?.decimales)} ${k[tag]?.unidad ?? ''}`, W * 0.25, yy + tam * 1.9, tam * 1.3, '#161616', 'right', '600')
        })
        texto('Alarmas', W * 0.28, top + m + tam, tam * 0.8, '#161616', 'left', '600')
        listaAlarmas(estado, W * 0.28, top + m + tam * 1.4, W * 0.34, H - top - 3 * m, tam * 0.62)
        const nombres = ['PI-301', 'LI-302', 'TI-304', 'TI-305']
        pedirTendencia(estado, nombres, 3600)
        graficoTendencia(estado, nombres, W * 0.64, top + m, W * 0.35, (H - top) * 0.8)
      }
      alDibujar()
    },
  }
}
