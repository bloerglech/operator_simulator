// Informe de misión y de turno: calificación, criterios, indicadores del
// turno, resumen económico, tendencia de kappa y producción y la respuesta
// ideal. También guarda el avance de la campaña.

import { h } from '../hmi/dom.js'
import { num } from '../hmi/formato.js'

const CLAVE_AVANCE = 'digestor:campana'
const MEDALLAS = { oro: '🥇 Oro', plata: '🥈 Plata', bronce: '🥉 Bronce' }

export function leerAvance() {
  try { return JSON.parse(localStorage.getItem(CLAVE_AVANCE) ?? '{}') } catch { return {} }
}
function registrarAvance(id, medalla) {
  const a = leerAvance()
  const orden = { bronce: 1, plata: 2, oro: 3 }
  if (!a[id] || orden[medalla] > orden[a[id]]) a[id] = medalla
  try { localStorage.setItem(CLAVE_AVANCE, JSON.stringify(a)) } catch { /* sin almacenamiento */ }
}

/** Tabla de indicadores del turno (sirve para el informe de misión y el de operación libre). */
export function tablaTurno(r) {
  const filas = [
    ['Duración', `${num(r.horas, 1)} h`],
    ['Producción', `${num(r.adt, 0)} ADt (media ${num(r.produccionMedia, 0)} ADt/d)`],
    ['Dentro de especificación', `${num(r.adtEnEspec, 0)} ADt`],
    ['Tiempo fuera de especificación', `${num(r.tiempoFueraEspec / 60, 0)} min`],
    ['Kappa medio ± desviación', `${num(r.kappaMedio, 2)} ± ${num(r.kappaDesv, 2)} (${num(r.kappaMin, 1)}–${num(r.kappaMax, 1)})`],
    ['Rendimiento · viscosidad · rechazos', `${num((r.rendimiento ?? 0) * 100, 1)} % · ${num(r.viscosidad, 0)} mL/g · ${num((r.rechazos ?? 0) * 100, 2)} %`],
    ['Madera', `${num(r.maderaPorADt, 2)} m³/ADt`],
    ['Álcali', `${num(r.alcaliPorADt, 0)} kg NaOH/ADt`],
    ['Vapor a calentadores', `${num(r.vaporPorADt, 2)} GJ/ADt`],
    ['Licor a evaporadores', `${num(r.licorEvapPorADt, 1)} m³/ADt (${num(r.solidosEvapPorADt, 2)} t sólidos/ADt)`],
    ['Arrastre al lavado', `${num(r.arrastrePorADt, 0)} kg sólidos/ADt`],
    ['Alarmas', `${num(r.alarmasPorHora, 1)} por hora (${r.alarmasP1} críticas), respuesta media ${r.respuestaMedia === null ? '—' : `${num(r.respuestaMedia, 0)} s`}`],
    ['Paradas de alimentación', String(r.paradas)],
  ]
  if (r.incidentes) {
    const i = r.incidentes
    filas.push(['Incidentes', `alivio ${i.apertura_alivio ?? 0} · seguridad ${i.apertura_seguridad ?? 0} · enclavamientos ${i.enclavamiento ?? 0} · vaporización súbita ${i.vaporizacion_subita ?? 0}`])
  }
  const e = r.economia
  if (e) {
    filas.push(['Resumen económico', `ingresos ${num(e.ingresos, 0)} − madera ${num(e.madera, 0)} − álcali ${num(e.alcali, 0)} − vapor ${num(e.vapor, 0)} = margen ${num(e.margen, 0)} ${e.moneda}`])
  }
  return h('table', {}, filas.map(([a, b]) => h('tr', {}, h('td', {}, a), h('td', { class: 'num' }, b))))
}

/** Gráfico de kappa y producción a lo largo del turno. */
export function graficoTurno(serie) {
  const c = h('canvas', { width: 640, height: 200, class: 'grafico-informe' })
  const g = c.getContext('2d')
  g.fillStyle = '#ececec'
  g.fillRect(0, 0, 640, 200)
  if (serie.length < 2) return c
  const t1 = serie.at(-1)[0] || 1
  const x = (t) => 40 + (t / t1) * 560
  // Banda de kappa 16–18 (escala 10–26).
  const yk = (k) => 190 - ((k - 10) / 16) * 170
  g.fillStyle = 'rgba(46, 125, 50, 0.15)'
  g.fillRect(40, yk(18), 560, yk(16) - yk(18))
  const linea = (i, y, color) => {
    g.strokeStyle = color
    g.lineWidth = 2
    g.beginPath()
    serie.forEach((p, j) => { if (p[i] === null) return; if (j === 0) g.moveTo(x(p[0]), y(p[i])); else g.lineTo(x(p[0]), y(p[i])) })
    g.stroke()
  }
  linea(1, yk, '#1d1d1d')
  linea(2, (p) => 190 - ((p - 2000) / 1500) * 170, '#1f5fbf')
  g.fillStyle = '#1d1d1d'
  g.font = '12px system-ui'
  g.fillText('kappa (banda 16–18)', 46, 16)
  g.fillStyle = '#1f5fbf'
  g.fillText('producción ADt/d (2 000–3 500)', 300, 16)
  g.fillStyle = '#4a4a4a'
  g.fillText(`${num(t1 / 3600, 1)} h`, 580, 198)
  return c
}

/**
 * Muestra el informe de una misión terminada.
 * alTerminar(accion): 'reintentar' | 'repetir' | 'siguiente' | 'menu' | 'seguir'.
 */
export function mostrarInforme(mision, cliente, alTerminar = () => {}) {
  const r = mision.resultado
  if (r.exito) registrarAvance(mision.id, r.medalla)
  const cerrar = (accion) => { velo.remove(); alTerminar(accion, mision) }
  const velo = h('div', { class: 'velo' }, h('div', { class: 'dialogo informe' },
    h('div', { class: 'suave' }, mision.capitulo),
    h('h1', {}, mision.titulo),
    h('div', { class: `calificacion ${r.exito ? 'exito' : 'falla'}` },
      r.exito ? `Misión cumplida · ${MEDALLAS[r.medalla] ?? ''} (${r.puntos} de ${r.maximo} puntos)` : `Misión no superada: ${r.motivo ?? mision.fallida ?? ''}`),
    h('h3', {}, 'Objetivos y criterios'),
    h('ul', { class: 'criterios' }, [
      ...mision.objetivos.map((o) => h('li', { class: o.estado }, `${o.estado === 'cumplido' ? '✔' : '✖'} ${o.texto}${o.tipo === 'principal' ? ' (principal)' : ''}`)),
      ...(r.criterios ?? []).filter((c) => !c.objetivo).map((c) => h('li', { class: c.cumple ? 'cumplido' : 'fallido' }, `${c.cumple ? '✔' : '✖'} ${c.texto} (${c.puntos} pt)`)),
    ]),
    h('h3', {}, 'Lo que pasó'),
    graficoTurno(r.resumen.serie ?? []),
    tablaTurno(r.resumen),
    h('h3', {}, 'Respuesta ideal'),
    h('p', {}, r.respuestaIdeal ?? ''),
    h('div', { class: 'botones' },
      !r.exito && mision.terminada ? h('button', { onclick: () => cerrar('reintentar') }, 'Volver al último punto de control') : null,
      h('button', { onclick: () => cerrar('repetir') }, 'Repetir la misión'),
      r.exito && !mision.id.startsWith('turno_') ? h('button', { onclick: () => cerrar('siguiente') }, 'Siguiente misión') : null,
      h('button', { onclick: () => cerrar('seguir') }, 'Seguir operando la planta'),
      h('button', { onclick: () => cerrar('menu') }, 'Menú inicial'))))
  document.body.append(velo)
}

/** Informe del turno en operación libre. */
export function mostrarInformeTurno(turno) {
  const velo = h('div', { class: 'velo', onclick: (e) => { if (e.target === velo) velo.remove() } }, h('div', { class: 'dialogo informe' },
    h('h1', {}, 'Informe de turno'),
    graficoTurno(turno.serie ?? []),
    tablaTurno(turno),
    h('div', { class: 'botones' }, h('button', { onclick: () => velo.remove() }, 'Cerrar'))))
  document.body.append(velo)
}
