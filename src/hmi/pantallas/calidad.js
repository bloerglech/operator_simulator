// 6. Calidad y laboratorio: indicadores de calidad, pedidos al laboratorio y
// control avanzado (bloques que el operador activa y ajusta).

import { h, reemplazar } from '../dom.js'
import { num, hora } from '../formato.js'

export const INDICADORES = [
  ['AI-701', 'Kappa (analizador)', '16–18'],
  ['HI-703', 'Factor H en el soplado', '350–500'],
  ['QI-702', 'Producción', '≈ 3 000'],
  ['AI-504', 'Álcali, extracción principal', '6–10'],
  ['AI-505', 'Álcali, extracción final', '6–10'],
  ['CI-605', 'Consistencia de soplado', '≈ 10'],
  ['FD-607', 'Factor de dilución', '2,0–2,5'],
  ['LW-117', 'Relación licor/madera', '3,8–4,2'],
  ['TI-604', 'Temperatura de soplado', '< 90'],
]

const NOMBRES_PARAMETROS = {
  carga: 'Carga de álcali (% NaOH s/madera)', EA_licor_blanco: 'EA licor blanco (g/L)', relacion: 'Licor/madera (m³/t)',
  humedad: 'Humedad de astillas (%)', produccion: 'Producción objetivo (ADt/d)', rampa: 'Rampa (ADt/d por h)',
  rendimiento: 'Rendimiento supuesto (%)', objetivo: 'Objetivo', ganancia: 'Ganancia', Ti: 'Ti (s)', bias_max: 'Sesgo máx. (°C)',
  tiempo_superior: 't zona superior (h)', tiempo_inferior: 't zona inferior (h)', H_resto: 'H fuera de zonas',
}

export function crearCalidad(app) {
  const tablaInd = h('tbody')
  const pendientes = h('div')
  const resultados = h('tbody')
  const bloques = h('div')
  const e0 = app.estado()
  const botonesLab = e0 ? Object.entries(e0.control.laboratorio.analisis).map(([id, a]) =>
    h('button', { onclick: () => app.comando({ tipo: 'laboratorio', analisis: id }).catch(() => {}) }, a.nombre)) : []

  const elemento = h('div', { class: 'rejilla' },
    h('div', { class: 'panel' }, h('h3', {}, 'Calidad y operación'),
      h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Tag'), h('th', {}, 'Variable'), h('th', { class: 'num' }, 'Valor'), h('th', {}, 'Referencia'))), tablaInd)),
    h('div', { class: 'panel' }, h('h3', {}, 'Laboratorio'),
      h('div', { class: 'suave' }, 'Los resultados llegan entre 20 y 40 minutos después de tomada la muestra.'),
      h('div', { class: 'fila' }, botonesLab),
      pendientes,
      h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Muestra'), h('th', {}, 'Resultado'), h('th', {}, 'Análisis'), h('th', { class: 'num' }, 'Valor'))), resultados)),
    h('div', { class: 'panel', style: 'grid-column: 1 / -1' }, h('h3', {}, 'Bloques de cálculo y control avanzado'), bloques))

  let firmaBloques = ''
  function dibujarBloques(estado) {
    const firma = JSON.stringify(Object.entries(estado.control.bloques).map(([t, b]) => [t, b.activo, b.parametros]))
    if (firma === firmaBloques || bloques.contains(document.activeElement)) return
    firmaBloques = firma
    reemplazar(bloques, Object.entries(estado.control.bloques).map(([tag, b]) => {
      const params = Object.entries(b.parametros).filter(([, v]) => typeof v === 'number')
      const inputs = params.map(([k, v]) => {
        const input = h('input', { type: 'number', step: 'any', value: v, class: 'num', style: 'width: 90px' })
        return h('div', { class: 'fila' }, h('span', { style: 'min-width: 210px' }, NOMBRES_PARAMETROS[k] ?? k), input,
          h('button', { onclick: () => app.comando({ tipo: 'bloque', id: tag, accion: 'parametro', campo: k, valor: Number(input.value) }).catch(() => {}) }, 'Aplicar'))
      })
      return h('div', { class: 'panel' },
        h('div', { class: 'fila' }, h('strong', { class: 'num' }, tag), h('span', {}, b.descripcion),
          h('button', { class: b.activo ? 'activo' : '', onclick: () => app.comando({ tipo: 'bloque', id: tag, accion: b.activo ? 'desactivar' : 'activar' }).catch(() => {}) }, b.activo ? 'Activo' : 'Inactivo')),
        h('div', { class: 'suave', 'data-salida': tag }),
        inputs)
    }))
  }

  return {
    elemento,
    actualizar(estado) {
      const c = estado.control
      reemplazar(tablaInd, INDICADORES.map(([tag, nombre, ref]) => {
        const t = c.transmisores[tag]
        return h('tr', {}, h('td', { class: 'num' }, tag), h('td', {}, nombre), h('td', { class: 'num' }, `${num(t?.valor, t?.decimales)} ${t?.unidad ?? ''}`), h('td', { class: 'suave' }, ref))
      }))
      const lab = c.laboratorio
      reemplazar(pendientes, lab.pendientes.length
        ? h('div', { class: 'suave' }, `En análisis: ${lab.pendientes.map((p) => `${p.nombre} (${hora(p.tMuestra)})`).join(', ')}`)
        : null)
      reemplazar(resultados, [...lab.resultados].reverse().map((r) => h('tr', {},
        h('td', { class: 'num' }, hora(r.tMuestra)), h('td', { class: 'num' }, hora(r.t)), h('td', {}, r.nombre),
        h('td', { class: 'num' }, `${num(r.valor, 1)} ${r.unidad}`))))
      dibujarBloques(estado)
      for (const [tag, b] of Object.entries(c.bloques)) {
        const el = bloques.querySelector(`[data-salida="${tag}"]`)
        if (!el) continue
        el.textContent = !b.activo ? '' : b.tipo === 'factor_h' ? `H previsto ${num(b.Hprevisto, 0)} · sesgo de temperatura ${num(b.salida, 2)} °C`
          : b.tipo === 'ritmo' ? `Escala de caudales ${num(b.salida, 3)}`
            : b.salida !== null && b.salida !== undefined ? `Salida ${num(b.salida, 1)}` : ''
      }
    },
  }
}
