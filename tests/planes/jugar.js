// Juega una misión con un jugador simulado (pruebas de la campaña).
import { config } from '../ayuda.js'
import { prepararJuego } from '../../src/escenarios/preparar.js'

export const MIN = 60

/** plan = { minuto: [comandos] } o función (min, estado, juego). Devuelve la vista de la misión. */
export function jugar(id, plan = {}, maxHoras = 9) {
  const j = prepararJuego(config(), { semilla: 5, mision: id })
  for (let m = 0; m < maxHoras * 60; m++) {
    const e = j.leerEstado()
    if (e.escenario.mision?.terminada) return e.escenario.mision
    if (typeof plan === 'function') plan(m, e, j)
    else for (const c of plan[m] ?? []) j.enviarComando(c)
    j.avanzar(MIN)
  }
  return j.leerEstado().escenario.mision
}
