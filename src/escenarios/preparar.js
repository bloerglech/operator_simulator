// Prepara el estado inicial de una partida o de una misión: corre el caso
// base sin control (horas previas, perfiles sintéticos → estacionario),
// conecta el control y el director, aplica la preparación de la misión
// (comandos y horas de asentamiento, o etapas sucesivas de comandos y horas,
// p. ej. una parada general completa) y la inicia.

import { crearPlanta } from '../sim/planta.js'
import { crearJuego } from './juego.js'
import { buscarMision } from '../misiones/campana.js'

const TROZO = 900 // s simulados entre avisos de progreso

export function prepararJuego(config, { semilla = 1, horasPrevias = 8, mision = null, progreso = () => {} } = {}) {
  const def = mision ? buscarMision(mision) : null
  if (mision && !def) throw new Error(`Misión desconocida: ${mision}`)
  const previas = def?.inicio?.horasPrevias ?? horasPrevias
  const prep = def?.inicio?.preparacion
  // preparacion: { comandos, horas, despues } o { etapas: [{ comandos, horas }] }.
  const etapas = prep ? (prep.etapas ?? [{ comandos: prep.comandos, horas: prep.horas ?? 0 }, { comandos: prep.despues, horas: 0 }]) : []
  const total = previas * 3600 + etapas.reduce((s, e) => s + (e.horas ?? 0), 0) * 3600
  let hecho = 0
  const avanzar = (sis, s) => {
    for (let r = s; r > 1e-9; r -= TROZO) {
      sis.avanzar(Math.min(TROZO, r))
      hecho += Math.min(TROZO, r)
      progreso(Math.min(1, hecho / Math.max(1, total)))
    }
  }
  const previa = crearPlanta(config, { semilla })
  avanzar(previa, previas * 3600)
  const juego = crearJuego(config, { semilla })
  juego.cargar(previa.guardar())
  juego.avanzar(10) // el control arranca en el primer paso lento
  for (const e of etapas) {
    for (const c of e.comandos ?? []) juego.enviarComando(c)
    // Al menos un paso: los comandos de la etapa siguiente se validan con estos ya aplicados.
    avanzar(juego, Math.max((e.horas ?? 0) * 3600, 1))
  }
  if (def) juego.enviarComando({ tipo: 'mision', accion: 'iniciar', id: def.id })
  juego.avanzar(0.2)
  return juego
}
