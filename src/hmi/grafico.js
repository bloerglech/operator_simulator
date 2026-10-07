// Gráfico de tendencias en canvas. Cada serie se dibuja en su propia escala
// [min, max]; el eje izquierdo muestra la escala de la primera serie y el
// derecho la de la segunda escala distinta (si la hay).

import { hora, num } from './formato.js'

export const COLORES = ['#1d1d1d', '#1f5fbf', '#b03a2e', '#2e7d32', '#8e44ad', '#b9770e', '#16707a', '#6d6d6d']

/**
 * series: [{ nombre, valores: [], color, min, max, trazo }]; t: tiempos (s).
 * ventana: [t0, t1] en s simulados.
 */
export function dibujarTendencia(canvas, t, series, ventana) {
  const dpr = window.devicePixelRatio || 1
  const W = canvas.clientWidth
  const H = canvas.clientHeight
  if (W === 0 || H === 0) return
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
  }
  const g = canvas.getContext('2d')
  g.setTransform(dpr, 0, 0, dpr, 0, 0)
  g.clearRect(0, 0, W, H)
  const m = { iz: 46, de: 46, ar: 8, ab: 20 }
  const w = W - m.iz - m.de
  const hh = H - m.ar - m.ab
  const [t0, t1] = ventana
  const x = (ti) => m.iz + ((ti - t0) / Math.max(1, t1 - t0)) * w
  // Rejilla y eje de tiempo.
  g.strokeStyle = '#c4c4c4'
  g.lineWidth = 1
  g.font = '11px system-ui, sans-serif'
  g.fillStyle = '#4a4a4a'
  for (let i = 0; i <= 4; i++) {
    const y = m.ar + (hh * i) / 4
    g.beginPath(); g.moveTo(m.iz, y); g.lineTo(m.iz + w, y); g.stroke()
  }
  const paso = elegirPaso(t1 - t0)
  for (let ti = Math.ceil(t0 / paso) * paso; ti <= t1; ti += paso) {
    const xi = x(ti)
    g.beginPath(); g.moveTo(xi, m.ar); g.lineTo(xi, m.ar + hh); g.stroke()
    g.textAlign = 'center'
    g.fillText(hora(ti), xi, H - 5)
  }
  // Escalas de los ejes.
  const escalas = []
  for (const s of series) if (!escalas.some((e) => e.min === s.min && e.max === s.max)) escalas.push(s)
  const etiquetasEje = (s, lado) => {
    if (!s) return
    g.fillStyle = s.color
    g.textAlign = lado === 'iz' ? 'right' : 'left'
    for (let i = 0; i <= 4; i++) {
      const v = s.max - ((s.max - s.min) * i) / 4
      g.fillText(num(v, Math.abs(s.max - s.min) < 5 ? 2 : Math.abs(s.max - s.min) < 50 ? 1 : 0), lado === 'iz' ? m.iz - 4 : m.iz + w + 4, m.ar + (hh * i) / 4 + 4)
    }
  }
  etiquetasEje(escalas[0], 'iz')
  etiquetasEje(escalas[1], 'de')
  // Series.
  g.save()
  g.beginPath()
  g.rect(m.iz, m.ar, w, hh)
  g.clip()
  for (const s of series) {
    g.strokeStyle = s.color
    g.lineWidth = s.trazo ?? 1.6
    g.setLineDash(s.discontinua ? [5, 4] : [])
    g.beginPath()
    let abierto = false
    for (let i = 0; i < t.length; i++) {
      const v = s.valores[i]
      if (v === null || v === undefined || !Number.isFinite(v)) { abierto = false; continue }
      const y = m.ar + hh * (1 - (v - s.min) / ((s.max - s.min) || 1))
      if (!abierto) { g.moveTo(x(t[i]), y); abierto = true } else g.lineTo(x(t[i]), y)
    }
    g.stroke()
  }
  g.restore()
  g.setLineDash([])
  g.strokeStyle = '#8d8d8d'
  g.strokeRect(m.iz, m.ar, w, hh)
}

function elegirPaso(span) {
  for (const p of [60, 300, 600, 900, 1800, 3600, 7200]) if (span / p <= 8) return p
  return 14400
}

/** Escala automática con margen. */
export function autoescala(valores, rango) {
  const v = valores.filter((x) => x !== null && Number.isFinite(x))
  if (v.length === 0) return rango
  let lo = Math.min(...v)
  let hi = Math.max(...v)
  const span = Math.max(hi - lo, Math.abs(rango[1] - rango[0]) * 0.01)
  lo -= span * 0.15
  hi += span * 0.15
  return [lo, hi]
}
