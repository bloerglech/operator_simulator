// Planta con su sistema de control: punto de entrada para el juego y las pruebas.
//
//   const sis = crearSistema(config, { semilla, horasPrevias })
//   sis.avanzar(s) · sis.enviarComando(cmd) · sis.leerEstado() (incluye .control)
//
// El estado inicial del simulador es sintético (perfiles uniformes). Con
// `horasPrevias` la planta corre primero sin control (caudales y temperaturas
// del caso base) hasta acercarse al estado estacionario, y recién entonces se
// conecta el sistema de control, que parte de los valores medidos.

import { crearPlanta } from '../sim/planta.js'
import { extensionControl } from './control.js'

export function crearSistema(config, opciones = {}) {
  const { horasPrevias = 0, ...resto } = opciones
  if (horasPrevias <= 0) return crearPlanta(config, { ...resto, extension: extensionControl })
  const previa = crearPlanta(config, resto)
  previa.avanzar(horasPrevias * 3600)
  const sis = crearPlanta(config, { ...resto, extension: extensionControl })
  sis.cargar(previa.guardar())
  return sis
}
