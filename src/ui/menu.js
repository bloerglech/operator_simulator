// Menú inicial: campaña (misiones en orden, cada una desbloquea la siguiente
// y su escenario en operación libre), operación libre con eventos aleatorios,
// continuar la partida guardada o importar un archivo. Modo: sala 3D o solo
// pantallas.

import { h } from '../hmi/dom.js'
import { leerLocal, importarArchivo } from './partidas.js'
import { leerAvance } from './informe.js'

const MEDALLA = { oro: '🥇', plata: '🥈', bronce: '🥉' }

/** Muestra el menú y resuelve con las opciones de inicio elegidas. */
export function mostrarMenu(catalogo) {
  return new Promise((resolver) => {
    const guardada = leerLocal()
    const avance = leerAvance()
    const error = h('div', { class: 'error' })
    let modo = 'sala'
    try { modo = localStorage.getItem('digestor:modo') ?? modo } catch { /* sin almacenamiento */ }
    const botonesModo = [['sala', 'Sala de control 3D'], ['pantallas', 'Solo pantallas DCS']].map(([m, t]) => {
      const b = h('button', { onclick: () => { modo = m; for (const x of botonesModo) x.classList.toggle('activo', x === b) } }, t)
      b.classList.toggle('activo', m === modo)
      return b
    })
    // Campaña: una misión está disponible si la anterior se superó.
    const misiones = catalogo?.misiones ?? []
    const campana = misiones.map((m, i) => {
      const disponible = i === 0 || !!avance[misiones[i - 1].id]
      return h('button', {
        class: 'mision', disabled: !disponible, title: m.ensena,
        onclick: () => elegir({ mision: m.id, semilla: 1000 + i }),
      }, h('span', { class: 'cap' }, m.capitulo), ` ${m.titulo} ${MEDALLA[avance[m.id]] ?? ''}`, h('div', { class: 'suave' }, disponible ? m.resumen : 'Se desbloquea al superar la misión anterior'))
    })
    const dificultad = h('select', {}, Object.entries(catalogo?.dificultades ?? { 1: { nombre: 'Aprendiz' } }).map(([k, d]) => h('option', { value: k }, d.nombre)))
    const eventos = h('input', { type: 'checkbox', checked: true })
    const velo = h('div', { class: 'velo' }, h('div', { class: 'dialogo menu-inicial' },
      h('h1', {}, 'Sala de control — Digestor continuo Lo-Solids'),
      h('div', { class: 'suave' }, 'Simulador de operador. Fibra de eucalipto (E. nitens), 3 000 ADt/d.'),
      h('div', { class: 'fila', style: 'margin-top: 10px' }, 'Modo:', botonesModo),
      h('h3', {}, 'Campaña'),
      h('div', { class: 'botones' }, campana),
      h('h3', {}, 'Operación libre'),
      h('div', { class: 'fila' }, 'Dificultad', dificultad, h('label', {}, eventos, ' eventos aleatorios')),
      h('div', { class: 'botones' },
        h('button', { onclick: () => elegir({ semilla: Math.floor(Math.random() * 1e9), generador: { activo: eventos.checked, dificultad: Number(dificultad.value) } }) }, 'Turno libre: caso base en operación'),
        guardada ? h('button', { onclick: () => elegir({ guardado: guardada.datos }) }, `Continuar la partida guardada (${new Date(guardada.fecha).toLocaleString('es-CL')})`) : null,
        h('button', { onclick: async () => {
          try { elegir({ guardado: await importarArchivo() }) } catch (e) { error.textContent = e.message }
        } }, 'Importar partida desde archivo')),
      error))
    document.body.append(velo)
    function elegir(op) {
      velo.remove()
      try { localStorage.setItem('digestor:modo', modo) } catch { /* sin almacenamiento */ }
      resolver({ ...op, modo })
    }
  })
}

/** Pantalla de espera mientras la planta llega al estado inicial. */
export function mostrarCarga(cliente, texto = 'El digestor se lleva al estado estacionario del caso base (8 h de operación simuladas).') {
  const barra = h('div')
  const velo = h('div', { class: 'velo' }, h('div', { class: 'dialogo' },
    h('h1', {}, 'Preparando la planta…'),
    h('div', { class: 'suave' }, texto),
    h('div', { class: 'progreso' }, barra)))
  document.body.append(velo)
  const quitar = cliente.alProgresar((f) => { barra.style.width = `${Math.round(f * 100)}%` })
  return () => { quitar(); velo.remove() }
}
