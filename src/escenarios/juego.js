// Planta completa del juego: simulación + director de escenarios y misiones +
// sistema de control. El director va primero: sus comandos (fallas,
// perturbaciones) se aplican en el mismo paso que el control.

import { crearPlanta } from '../sim/planta.js'
import { extensionControl } from '../control/control.js'
import { extensionDirector } from './director.js'

export function crearJuego(config, opciones = {}) {
  return crearPlanta(config, { ...opciones, extension: [extensionDirector, extensionControl] })
}
