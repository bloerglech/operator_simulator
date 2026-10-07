// Panel básico del instructor: fallas de instrumentos y actuadores, cambios
// de materia prima y servicios, perturbaciones de la columna y puentes de
// enclavamientos. En la Fase 5 se agregan los eventos con guion.

import { h, reemplazar, avisar } from './dom.js'
import { num } from './formato.js'

const P_ATM = 101325

export function abrirInstructor(app) {
  const e0 = app.estado()
  if (!e0) return { elemento: h('div', { class: 'panel' }, 'Esperando la simulación…'), actualizar() {} }
  const enviar = (cmd, texto) => app.comando(cmd).then(() => avisar(texto ?? 'Aplicado')).catch(() => {})
  const numero = (valor, paso = 'any', ancho = 80) => h('input', { type: 'number', step: paso, value: valor, class: 'num', style: `width: ${ancho}px` })
  const seleccion = (opciones) => h('select', {}, opciones.map(([v, t]) => h('option', { value: v }, t ?? v)))

  // Instrumentos
  const selTag = seleccion(Object.keys(e0.control.transmisores).map((t) => [t]))
  const selFalla = seleccion([['', 'sin falla'], ['congelado'], ['alto', 'fuera de rango alto'], ['bajo', 'fuera de rango bajo'], ['deriva', 'deriva lenta']])
  // Actuadores
  const lazosConActuador = Object.entries(e0.control.lazos).filter(([, l]) => l.posicion !== null).map(([t]) => [t])
  const selLazo = seleccion(lazosConActuador)
  // Materia prima y servicios
  const densidad = numero(Math.round(e0.fuentes.astillas?.densidad ?? 480), 5)
  const humedad = numero(Number(((e0.fuentes.astillas?.humedad ?? 0.475) * 100).toFixed(1)), 0.5)
  const ea = numero(Number(((e0.fuentes.licor_blanco?.OH ?? 2.94) * 40).toFixed(1)), 0.5)
  const pMP = numero(num((e0.servicios.presionVaporMP - P_ATM) / 1e5, 1).replace(',', '.'), 0.1)
  const evap = numero(Math.round((e0.servicios.limiteEvaporadores ?? 0) * 3600), 10, 90)
  // Columna
  const selVaso = seleccion([['dig', 'digestor'], ['imp', 'impregnador']])
  const altura = numero(20, 1)
  const friccion = numero(1, 0.1)
  const finos = numero(1, 0.1)
  // Calentadores
  const selCal = seleccion(Object.keys(e0.equipos.calentadores).map((c) => [c]))
  const incr = numero(1, 0.1)
  const enclav = h('div')

  const seccion = (titulo, ...hijos) => h('div', { class: 'panel' }, h('h3', {}, titulo), ...hijos)
  const elemento = h('div', {},
    h('div', { class: 'panel' }, h('button', { class: 'cerrar', style: 'float:right', onclick: () => app.cerrarLateral() }, '✕'),
      h('h3', {}, 'Instructor'), h('div', { class: 'suave' }, 'Lo que haga aquí el operador no lo ve como acción propia: aparece como una perturbación del proceso.')),
    seccion('Falla de instrumento',
      h('div', { class: 'fila' }, selTag, selFalla),
      h('button', { onclick: () => enviar({ tipo: 'instrumento', id: selTag.value, falla: selFalla.value || null }) }, 'Aplicar')),
    seccion('Actuador pegado',
      h('div', { class: 'fila' }, selLazo,
        h('button', { onclick: () => enviar({ tipo: 'actuador', id: selLazo.value, falla: 'pegado' }) }, 'Pegar'),
        h('button', { onclick: () => enviar({ tipo: 'actuador', id: selLazo.value, falla: null }) }, 'Liberar'))),
    seccion('Materia prima',
      h('div', { class: 'fila' }, 'Densidad básica', densidad, 'kg/m³',
        h('button', { onclick: () => enviar({ tipo: 'fuente', id: 'astillas', campo: 'densidad', valor: Number(densidad.value) }) }, 'Aplicar')),
      h('div', { class: 'fila' }, 'Humedad', humedad, '%',
        h('button', { onclick: () => enviar({ tipo: 'fuente', id: 'astillas', campo: 'humedad', valor: Number(humedad.value) / 100 }) }, 'Aplicar')),
      h('div', { class: 'fila' }, 'EA licor blanco', ea, 'g/L NaOH',
        h('button', { onclick: () => enviar({ tipo: 'fuente', id: 'licor_blanco', campo: 'OH', valor: Number(ea.value) / 40 }) }, 'Aplicar')),
      h('div', { class: 'fila' }, 'Finos (multiplicador)', finos,
        h('button', { onclick: () => enviar({ tipo: 'perturbar', id: 'finos', valor: Number(finos.value) }) }, 'Aplicar'))),
    seccion('Servicios',
      h('div', { class: 'fila' }, 'Vapor de media', pMP, 'bar(g)',
        h('button', { onclick: () => enviar({ tipo: 'servicio', id: 'presionVaporMP', valor: Number(pMP.value) * 1e5 + P_ATM }) }, 'Aplicar')),
      h('div', { class: 'fila' }, 'Límite de evaporadores', evap, 'm³/h',
        h('button', { onclick: () => enviar({ tipo: 'servicio', id: 'limiteEvaporadores', valor: Number(evap.value) / 3600 }) }, 'Aplicar'))),
    seccion('Columna de astillas',
      h('div', { class: 'fila' }, selVaso),
      h('div', { class: 'fila' }, 'Colgar a', altura, 'm',
        h('button', { onclick: () => enviar({ tipo: 'perturbar', id: 'colgamiento', vaso: selVaso.value, valor: Number(altura.value) }) }, 'Colgar'),
        h('button', { onclick: () => enviar({ tipo: 'perturbar', id: 'soltar_columna', vaso: selVaso.value }) }, 'Soltar')),
      h('div', { class: 'fila' }, 'Fricción (multiplicador)', friccion,
        h('button', { onclick: () => enviar({ tipo: 'perturbar', id: 'friccion', vaso: selVaso.value, valor: Number(friccion.value) }) }, 'Aplicar'))),
    seccion('Incrustación de calentador',
      h('div', { class: 'fila' }, selCal, 'factor f', incr,
        h('button', { onclick: () => enviar({ tipo: 'perturbar', id: 'incrustacion', equipo: selCal.value, valor: Number(incr.value) }) }, 'Aplicar'))),
    seccion('Enclavamientos (puentes)', enclav))

  return {
    elemento,
    actualizar(estado) {
      if (enclav.contains(document.activeElement)) return
      reemplazar(enclav, h('table', {}, Object.entries(estado.control.enclavamientos).map(([id, en]) => h('tr', {},
        h('td', { class: 'num' }, id),
        h('td', {}, en.puenteado ? 'PUENTEADO' : en.disparado ? 'disparado' : 'normal'),
        h('td', {}, en.puenteado
          ? h('button', { onclick: () => enviar({ tipo: 'enclavamiento', id, accion: 'quitar_puente' }) }, 'Quitar puente')
          : h('button', { onclick: () => enviar({ tipo: 'enclavamiento', id, accion: 'puentear' }) }, 'Puentear'))))))
    },
  }
}
