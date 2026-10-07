// Menú inicial: nueva partida (caso base), continuar la guardada o importar.

import { h } from '../hmi/dom.js'
import { leerLocal, importarArchivo } from './partidas.js'

/** Muestra el menú y resuelve con las opciones de inicio elegidas. */
export function mostrarMenu() {
  return new Promise((resolver) => {
    const guardada = leerLocal()
    const error = h('div', { class: 'error' })
    const velo = h('div', { class: 'velo' }, h('div', { class: 'dialogo' },
      h('h1', {}, 'Sala de control — Digestor continuo Lo-Solids'),
      h('div', { class: 'suave' }, 'Simulador de operador. Fibra de eucalipto (E. nitens), 3 000 ADt/d.'),
      h('div', { class: 'botones' },
        h('button', { onclick: () => elegir({ semilla: Math.floor(Math.random() * 1e9) }) }, 'Nueva partida: caso base en operación'),
        guardada ? h('button', { onclick: () => elegir({ guardado: guardada.datos }) }, `Continuar la partida guardada (${new Date(guardada.fecha).toLocaleString('es-CL')})`) : null,
        h('button', { onclick: async () => {
          try { elegir({ guardado: await importarArchivo() }) } catch (e) { error.textContent = e.message }
        } }, 'Importar partida desde archivo')),
      error))
    document.body.append(velo)
    function elegir(op) {
      velo.remove()
      resolver(op)
    }
  })
}

/** Pantalla de espera mientras la planta llega al estado inicial. */
export function mostrarCarga(cliente) {
  const barra = h('div')
  const velo = h('div', { class: 'velo' }, h('div', { class: 'dialogo' },
    h('h1', {}, 'Preparando la planta…'),
    h('div', { class: 'suave' }, 'El digestor se lleva al estado estacionario del caso base (8 h de operación simuladas).'),
    h('div', { class: 'progreso' }, barra)))
  document.body.append(velo)
  const quitar = cliente.alProgresar((f) => { barra.style.width = `${Math.round(f * 100)}%` })
  return () => { quitar(); velo.remove() }
}
