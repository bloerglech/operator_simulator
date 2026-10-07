// 8. Alarmas y eventos: alarmas activas (reconocer, archivar), enclavamientos
// (rearme), historial de alarmas y registro de eventos del proceso.

import { h, reemplazar } from '../dom.js'
import { num, reloj, hora } from '../formato.js'

const ACCIONES = { activa: 'activa', retorna: 'retorna', reconocida: 'reconocida', archivada: 'archivada', desarchivada: 'sale del archivo' }

export function crearAlarmas(app) {
  const activas = h('tbody')
  const enclav = h('tbody')
  const historial = h('tbody')
  const eventos = h('tbody')
  const archivadas = h('div', { class: 'suave' })
  const elemento = h('div', {},
    h('div', { class: 'panel' },
      h('div', { class: 'fila' }, h('h3', { style: 'margin:0' }, 'Alarmas activas'),
        h('button', { onclick: () => app.comando({ tipo: 'alarma', id: '*', accion: 'reconocer' }).catch(() => {}) }, 'Reconocer todas')),
      h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'P'), h('th', {}, 'Hora'), h('th', {}, 'Alarma'), h('th', {}, 'Mensaje'),
        h('th', { class: 'num' }, 'Valor'), h('th', {}, 'Estado'), h('th', {}, ''))), activas),
      archivadas),
    h('div', { class: 'rejilla' },
      h('div', { class: 'panel' }, h('h3', {}, 'Enclavamientos'),
        h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Id'), h('th', {}, 'Descripción'), h('th', {}, 'Condición'), h('th', {}, 'Estado'), h('th', {}, ''))), enclav)),
      h('div', { class: 'panel' }, h('h3', {}, 'Eventos del proceso'),
        h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Hora'), h('th', {}, 'Evento'), h('th', {}, 'Detalle'))), eventos))),
    h('div', { class: 'panel' }, h('h3', {}, 'Historial de alarmas'),
      h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Hora'), h('th', {}, 'P'), h('th', {}, 'Alarma'), h('th', {}, 'Acción'), h('th', {}, 'Mensaje'))), historial)))

  let firma = ''
  return {
    elemento,
    actualizar(estado) {
      const c = estado.control
      // Se redibuja solo si algo cambió (los botones no se recrean bajo el dedo).
      const nueva = JSON.stringify([c.alarmas.lista.map((a) => [a.id, a.activa, a.reconocida]),
        Object.values(c.enclavamientos).map((e) => [e.disparado, e.presente, e.puenteado]), c.alarmas.registro.length, estado.eventos.length, estado.eventos.at(-1)?.n])
      const valorAlarma = (a) => (typeof a.valor === 'number' ? `${num(a.valor, 2)} ${a.unidad ?? ''}` : '')
      if (nueva === firma) {
        // Solo cambian los valores: se actualizan en su lugar (los botones no se recrean).
        for (const a of c.alarmas.lista) {
          const td = activas.querySelector(`td[data-valor="${a.id}"]`)
          if (td) td.textContent = valorAlarma(a)
        }
        return
      }
      firma = nueva
      reemplazar(activas, c.alarmas.lista.map((a) => h('tr', { class: `p${a.prioridad}${a.reconocida ? '' : ' sin-reconocer'}` },
        h('td', {}, h('span', { class: `etiqueta-prioridad p${a.prioridad}${a.reconocida ? '' : ' parpadea'}` }, a.prioridad)),
        h('td', { class: 'num' }, hora(a.t)),
        h('td', { class: 'num' }, a.id),
        h('td', {}, a.mensaje),
        h('td', { class: 'num', 'data-valor': a.id }, valorAlarma(a)),
        h('td', {}, `${a.activa ? 'activa' : 'retornó'}${a.reconocida ? ', reconocida' : ''}`),
        h('td', {},
          a.reconocida ? null : h('button', { onclick: () => app.comando({ tipo: 'alarma', id: a.id, accion: 'reconocer' }).catch(() => {}) }, 'Reconocer'),
          a.prioridad > 1 ? h('button', { onclick: () => app.comando({ tipo: 'alarma', id: a.id, accion: 'archivar', duracion: 3600 }).catch(() => {}) }, 'Archivar 1 h') : null,
          a.tag && (c.lazos[a.tag] || c.transmisores[a.tag]) ? h('button', { onclick: () => (c.lazos[a.tag] ? app.abrirLazo(a.tag) : app.abrirTag(a.tag)) }, 'Ver') : null))))
      if (c.alarmas.lista.length === 0) reemplazar(activas, h('tr', {}, h('td', { colspan: 7, class: 'suave' }, 'Sin alarmas activas')))
      reemplazar(archivadas, c.alarmas.archivadas.length
        ? ['Archivadas: ', c.alarmas.archivadas.map((x) => `${x.id} (hasta ${hora(x.hasta)})`).join(', '), ' ',
          ...c.alarmas.archivadas.map((x) => h('button', { onclick: () => app.comando({ tipo: 'alarma', id: x.id, accion: 'desarchivar' }).catch(() => {}) }, `Sacar ${x.id}`))]
        : (c.alarmas.suprimidas ? 'Alarmas de proceso suprimidas: planta detenida.' : ''))
      reemplazar(enclav, Object.entries(c.enclavamientos).map(([id, e]) => h('tr', { class: e.disparado ? 'p1' : '' },
        h('td', { class: 'num' }, id), h('td', {}, e.descripcion),
        h('td', { class: 'num' }, `${e.condicion.tag} ${e.condicion.op} ${e.condicion.limite}`),
        h('td', {}, e.puenteado ? 'PUENTEADO' : e.disparado ? (e.presente ? 'disparado (condición presente)' : 'disparado') : 'normal'),
        h('td', {}, e.disparado ? h('button', { disabled: e.presente, onclick: () => app.comando({ tipo: 'enclavamiento', id, accion: 'rearmar' }).catch(() => {}) }, 'Rearmar') : null))))
      reemplazar(eventos, estado.eventos.filter((ev) => ev.t >= (estado.inicioPartida ?? 0)).reverse().slice(0, 40).map((ev) => {
        const { n, t, tipo, ...resto } = ev
        const detalle = Object.entries(resto).map(([k, v]) => `${k}: ${typeof v === 'number' ? num(k === 'P' ? v / 1e5 : v, 2) : v}`).join(' · ')
        return h('tr', {}, h('td', { class: 'num' }, reloj(t)), h('td', {}, tipo.replace(/_/g, ' ')), h('td', { class: 'suave' }, detalle))
      }))
      reemplazar(historial, [...c.alarmas.registro].reverse().slice(0, 150).map((r) => h('tr', { class: `p${r.prioridad}` },
        h('td', { class: 'num' }, reloj(r.t)), h('td', {}, r.prioridad), h('td', { class: 'num' }, r.id), h('td', {}, ACCIONES[r.accion] ?? r.accion), h('td', {}, r.mensaje))))
    },
  }
}
