// Panel de un transmisor sin lazo: valor, rango, calidad, alarmas del tag y
// tendencia de la última hora.

import { h, reemplazar } from './dom.js'
import { num, hora } from './formato.js'
import { dibujarTendencia, autoescala } from './grafico.js'
import { bloqueAyuda } from './ayuda.js'

const VENTANA = 3600

export function abrirTag(app, tag) {
  const t0 = app.estado()?.control.transmisores[tag]
  if (!t0) return { elemento: h('div', { class: 'panel' }, `Instrumento desconocido: ${tag}`), actualizar() {} }
  const valor = h('div', { class: 'grande' })
  const alarmas = h('div')
  const canvas = h('canvas')
  let tendencia = null
  let ultima = -Infinity
  const elemento = h('div', { class: 'caratula panel' },
    h('button', { class: 'cerrar', onclick: () => app.cerrarLateral() }, '✕'),
    h('h2', {}, tag),
    h('div', { class: 'desc' }, `${t0.descripcion}${t0.analizador ? ' · analizador (valor discreto)' : ''}`),
    bloqueAyuda(tag),
    valor,
    h('div', { class: 'suave' }, `Rango ${num(t0.rango[0], t0.decimales)}–${num(t0.rango[1], t0.decimales)} ${t0.unidad}`),
    alarmas,
    canvas,
    h('div', { class: 'suave' }, 'Última hora'))
  return {
    elemento,
    actualizar(estado) {
      const t = estado.control.transmisores[tag]
      valor.textContent = `${num(t.valor, t.decimales)} ${t.unidad}${t.calidad === 'mala' ? '  (señal mala)' : ''}`
      const propias = estado.control.alarmas.lista.filter((a) => a.tag === tag)
      reemplazar(alarmas, propias.map((a) => h('div', { class: 'fila' },
        h('span', { class: `etiqueta-prioridad p${a.prioridad}` }, a.prioridad), `${hora(a.t)} ${a.mensaje}`)))
      if (estado.t - ultima > 10) {
        ultima = estado.t
        app.cliente.tendencia([tag], estado.t - VENTANA, estado.t, 300).then((r) => { tendencia = r }).catch(() => {})
      }
      if (tendencia && tendencia.t.length > 1) {
        const [lo, hi] = autoescala(tendencia.datos[tag], t.rango)
        dibujarTendencia(canvas, tendencia.t, [{ valores: tendencia.datos[tag], color: '#1d1d1d', min: lo, max: hi }], [estado.t - VENTANA, estado.t])
      }
    },
  }
}
