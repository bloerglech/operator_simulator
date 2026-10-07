// Factor H de Vroom.
// Velocidad relativa = exp(43,2 − 16115 / T), T en kelvin; vale ≈ 1 a 100 °C.
// El factor H es la integral de la velocidad relativa en horas.

import { kelvin } from './unidades.js'

/** Velocidad relativa de deslignificación (adimensional) a la temperatura tC (°C). */
export function velocidadRelativa(tC) {
  return Math.exp(43.2 - 16115 / kelvin(tC))
}

/** Incremento de factor H en un intervalo dt (s) a temperatura constante tC. */
export function incrementoH(tC, dt) {
  return (velocidadRelativa(tC) * dt) / 3600
}
