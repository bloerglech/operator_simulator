// Prepara el estado inicial de una partida o de una misión: corre el caso
// base sin control (horas previas, perfiles sintéticos → estacionario),
// conecta el control y el director, aplica la preparación de la misión
// (comandos y horas de asentamiento) y la inicia.

import { crearPlanta } from '../sim/planta.js'
import { crearJuego } from './juego.js'
import { MISIONES } from '../misiones/campana.js'

const TROZO = 900 // s simulados entre avisos de progreso

export function prepararJuego(config, { semilla = 1, horasPrevias = 8, mision = null, progreso = () => {} } = {}) {
  const def = mision ? MISIONES[mision] : null
  if (mision && !def) throw new Error(`Misión desconocida: ${mision}`)
  const previas = def?.inicio?.horasPrevias ?? horasPrevias
  const prep = def?.inicio?.preparacion
  const total = previas * 3600 + (prep?.horas ?? 0) * 3600
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
  if (prep) {
    for (const c of prep.comandos ?? []) juego.enviarComando(c)
    avanzar(juego, prep.horas * 3600)
    for (const c of prep.despues ?? []) juego.enviarComando(c)
  }
  if (def) juego.enviarComando({ tipo: 'mision', accion: 'iniciar', id: def.id })
  juego.avanzar(0.2)
  return juego
}
