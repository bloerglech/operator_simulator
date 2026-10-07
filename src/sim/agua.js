// Propiedades de saturación del agua para presión, ebullición y vapor.
//
// Presión de saturación: ecuación de la región 4 de IAPWS-IF97 (exacta dentro
// de la formulación, 273,15–647,096 K). Calor latente: correlación de Watson
// con exponente 0,38, anclada en 2 257 kJ/kg a 100 °C (error ≈ 1 % entre 100
// y 200 °C). Presiones internas en Pa absolutos.

const N = [
  0.11670521452767e4, -0.72421316703206e6, -0.17073846940092e2, 0.12020824702470e5,
  -0.32325550322333e7, 0.1491510861353e2, -0.48232657361591e4, 0.40511340542057e6,
  -0.23855557567849, 0.65017534844798e3,
]

/** Presión atmosférica estándar (Pa). */
export const P_ATM = 101325

/** Aceleración de gravedad (m/s²). */
export const G = 9.80665

/** Presión de saturación (Pa) a la temperatura tC (°C). */
export function presionSaturacion(tC) {
  const T = Math.min(Math.max(tC + 273.15, 273.16), 647.0)
  const th = T + N[8] / (T - N[9])
  const A = th * th + N[0] * th + N[1]
  const B = N[2] * th * th + N[3] * th + N[4]
  const C = N[5] * th * th + N[6] * th + N[7]
  const p = (2 * C) / (-B + Math.sqrt(B * B - 4 * A * C))
  return p ** 4 * 1e6
}

/** Temperatura de saturación (°C) a la presión P (Pa absolutos). */
export function temperaturaSaturacion(P) {
  const b = (Math.min(Math.max(P, 611.213), 22.06e6) / 1e6) ** 0.25
  const E = b * b + N[2] * b + N[5]
  const F = N[0] * b * b + N[3] * b + N[6]
  const Gq = N[1] * b * b + N[4] * b + N[7]
  const D = (2 * Gq) / (-F - Math.sqrt(F * F - 4 * E * Gq))
  const T = (N[9] + D - Math.sqrt((N[9] + D) ** 2 - 4 * (N[8] + N[9] * D))) / 2
  return T - 273.15
}

/** Calor latente de vaporización (kJ/kg) a tC (°C), válido entre 20 y 220 °C. */
export function calorLatente(tC) {
  const x = Math.min(Math.max(tC, 20), 220) - 100
  return 2256.4 - 2.551 * x - 0.00606 * x * x
}
