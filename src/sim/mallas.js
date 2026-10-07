// Mallas de extracción y de circulación.
//
// Cada juego de mallas tiene una resistencia hidráulica R = R0·(1 + r_f + r_inc):
//   R0     malla limpia (de la caída de presión de diseño)
//   r_f    taponamiento por finos: crece con el caudal y los finos; la
//          conmutación periódica de filas lo limpia (equilibrio ≈ 0,25 R0) y
//          el retrolavado lo reduce de golpe
//   r_inc  incrustación de CaCO₃: lenta, solo se elimina con lavado ácido
// ΔP = R·Q. Las corrientes con bomba quedan limitadas a la ΔP máxima de la
// bomba; las corrientes con válvula ven R en serie con la válvula.

import { p } from './parametros.js'
import { kelvin, R_GAS } from './unidades.js'

export function construirMallas(config) {
  const lista = config.equipos.mallas ?? {}
  const mallas = {}
  for (const [id, m] of Object.entries(lista)) {
    if (id.startsWith('_')) continue
    const r = `equipos.mallas.${id}`
    const dP = p(m, 'dP_limpia', `${r}.dP_limpia`)
    const Qd = p(m, 'Q_diseno', `${r}.Q_diseno`)
    mallas[id] = {
      corrientes: m.corrientes,
      R0: dP / Qd, // Pa·s/m³
      Qd,
      dPmax: p(m, 'dP_maxima', `${r}.dP_maxima`),
      tauTap: p(m, 'tiempo_taponamiento', `${r}.tiempo_taponamiento`),
      tauLimp: p(m, 'tiempo_limpieza_conmutacion', `${r}.tiempo_limpieza_conmutacion`),
      retro: p(m, 'eficiencia_retrolavado', `${r}.eficiencia_retrolavado`),
      inc: p(m, 'incrustacion', `${r}.incrustacion`),
      Einc: p(m, 'E_incrustacion', `${r}.E_incrustacion`),
    }
  }
  return mallas
}

export function estadoMallasInicial(mallas) {
  return Object.fromEntries(Object.keys(mallas).map((id) => [id, { rf: 0.25, rinc: 0, conmutacion: true, dP: 0, Q: 0 }]))
}

/** Resistencia actual de una malla (Pa·s/m³). */
export function resistencia(m, e) {
  return m.R0 * (1 + e.rf + e.rinc)
}

/**
 * Factor (0–1) que limita las corrientes con bomba de una malla para no
 * superar la ΔP máxima. qBombas: caudal pedido por las bombas (m³/s).
 */
export function factorMalla(m, e, qBombas) {
  if (qBombas <= 0) return 1
  const qMax = m.dPmax / resistencia(m, e)
  return Math.min(1, qMax / qBombas)
}

/** Evolución lenta del taponamiento y la incrustación (paso lento). */
export function pasoMalla(m, e, Q, T, finos, dt) {
  e.Q = Q
  e.dP = resistencia(m, e) * Q
  const crec = (Q / m.Qd) * finos / m.tauTap
  const limp = e.conmutacion ? e.rf / m.tauLimp : 0
  e.rf = Math.max(0, e.rf + (crec - limp) * dt)
  const arr = Math.exp((-m.Einc / R_GAS) * (1 / kelvin(T) - 1 / kelvin(150)))
  e.rinc += m.inc * arr * dt
}
