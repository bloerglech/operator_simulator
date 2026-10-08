// Presión de un vaso hidráulico (paso rápido).
//
// Estado de presión de cada vaso:
//   E      exceso de líquido sobre la capacidad geométrica (m³). E > 0: vaso
//          lleno y comprimido; E < 0: falta líquido (hay espacio de vapor o gas).
//   Pref   presión a la que el vaso quedó justo lleno (Pa)
//   venteo true si el venteo del tope está abierto (presión atmosférica)
//
// Con el vaso lleno y cerrado:  P = Pref + E / C,
//   C = V_líquido·(β_licor + β_vaso) + V_gas / P_abs   (gas arrastrado, isotérmico)
// Con el vaso lleno, un desbalance de pocos m³/h cambia la presión en segundos.
// Si P cae bajo la presión de saturación de alguna celda (corregida por la
// columna hidrostática), el licor hierve: la presión queda sostenida en ese
// valor y se registra una vaporización súbita. Si falta líquido con el vaso
// cerrado, el espacio se llena de vapor (P = presión de saturación) o, si está
// frío, entra aire por el rompedor de vacío (P = atmosférica).
//
// En cada paso rápido se integra dE/dt = Q_fijo − Q_válvulas(P) − Q_alivio(P)
// con Euler implícito (regula falsi en un intervalo seguro: la función es monótona). En el paso lento,
// el balance hidráulico recalcula E exactamente a partir de los volúmenes.

import { P_ATM, G, presionSaturacion } from './agua.js'
import { caudalValvula } from './valvulas.js'

/**
 * Capacidad hidráulica del vaso lleno (m³/Pa): compresión del licor y
 * elasticidad del manto, más el gas libre arrastrado (V_gas = fracción·V_líquido),
 * que a la presión del vaso domina el total (revisión B-04).
 */
export function capacidad(v, volumenLiquido, P) {
  const V = Math.max(volumenLiquido, 1e-6)
  return V * v.presion.beta + (V * (v.presion.fraccionGas ?? 0)) / Math.max(P, P_ATM)
}

/** Presión del tope (Pa abs) para un exceso E. */
export function presionDesdeExceso(pr, E) {
  if (pr.venteo) return P_ATM
  if (E >= 0) return Math.max(pr.Pref + E / pr.C, pr.Ppiso)
  return Math.max(pr.Ppiso, P_ATM)
}

/**
 * Piso de presión por ebullición: la mayor de (P_sat(T_j) − ρ·g·z_j) sobre las
 * celdas con licor, más el margen configurado.
 */
export function pisoEbullicion(v, est, rho) {
  let piso = 0
  let celda = -1
  for (let j = 0; j < v.geom.n; j++) {
    if (est.vf[j] <= 0) continue
    const zc = (j + 0.5) * v.geom.dz
    const p = presionSaturacion(est.T[j]) - rho * G * zc
    if (p > piso) { piso = p; celda = j }
  }
  return { piso: piso + v.presion.margenEbullicion, celda }
}

/** Caudales de las válvulas, el alivio y la seguridad de un vaso a la presión P. */
export function caudalesSalida(v, ctx, P) {
  const r = { total: 0, valvulas: {}, alivio: 0, seguridad: 0 }
  for (const s of ctx.valvulas) {
    const Pmalla = P + ctx.rho * G * s.z
    const q = s.bloqueada ? 0 : caudalValvula(s.cfg.Kv, s.f, Pmalla - s.Pdest, s.Rmalla ?? 0)
    r.valvulas[s.id] = q
    r.total += q
  }
  const al = v.presion.alivio
  const apertura = Math.min(1, Math.max(0, (P - al.Pset) / al.dP))
  if (apertura > 0) r.alivio = caudalValvula(al.Kv, apertura, P - al.Pdest)
  if (ctx.seguridadAbierta) r.seguridad = caudalValvula(v.presion.seguridad.Kv, 1, P - v.presion.seguridad.Pdest)
  r.total += r.alivio + r.seguridad
  return r
}

/**
 * Integra la presión de un vaso un paso rápido.
 * ctx: { Qfijo (m³/s), valvulas: [{id, cfg, f (fracción de la característica), z, Pdest, bloqueada, Rmalla}], rho, seguridadAbierta }
 * Devuelve los caudales de salida usados en el paso.
 */
export function integrarPresion(v, pr, ctx, dt) {
  if (pr.venteo) {
    // Vaso abierto: la presión es atmosférica; el exceso rebalsa por el venteo
    // (se resuelve en el paso lento).
    pr.P = P_ATM
    return caudalesSalida(v, ctx, P_ATM)
  }
  const f = (En) => En - pr.E - dt * (ctx.Qfijo - caudalesSalida(v, ctx, presionDesdeExceso(pr, En)).total)
  // Intervalo seguro: f(lo) ≤ 0 ≤ f(hi) porque los caudales de salida no son negativos.
  let hi = pr.E + dt * Math.max(ctx.Qfijo, 0)
  const qHi = caudalesSalida(v, ctx, presionDesdeExceso(pr, hi)).total
  let lo = pr.E + dt * (Math.min(ctx.Qfijo, 0) - qHi)
  let fLo = f(lo)
  let fHi = f(hi)
  // Regula falsi (variante de Illinois): converge en pocas iteraciones y nunca
  // sale del intervalo.
  let En = hi
  let lado = 0
  for (let i = 0; i < 40 && hi - lo > 1e-12 * (1 + Math.abs(pr.E)); i++) {
    if (fHi <= 0) { En = hi; break }
    if (fLo >= 0) { En = lo; break }
    En = (lo * fHi - hi * fLo) / (fHi - fLo)
    const fm = f(En)
    if (Math.abs(fm) < 1e-13) break
    if (fm > 0) {
      hi = En; fHi = fm
      if (lado === 1) fLo /= 2
      lado = 1
    } else {
      lo = En; fLo = fm
      if (lado === -1) fHi /= 2
      lado = -1
    }
  }
  // Paso de deficitario a lleno: la presión de referencia es la del momento.
  if (pr.E < 0 && En >= 0) pr.Pref = presionDesdeExceso(pr, -1e-12)
  pr.E = En
  pr.P = presionDesdeExceso(pr, En)
  return caudalesSalida(v, ctx, pr.P)
}
