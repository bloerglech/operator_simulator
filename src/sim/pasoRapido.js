// Paso rápido (0,2 s): actuadores, bombas y presión de los vasos, más el
// registro de incidentes. También las funciones que el paso lento usa para
// aplicar los factores de las bombas y cerrar el balance de presión.

import { moverValvula, moverBomba, factorPresionBomba, caracteristica } from './valvulas.js'
import { integrarPresion, presionDesdeExceso, pisoEbullicion } from './presion.js'
import { P_ATM } from './agua.js'
import { destinoBloqueado } from './equipos.js'
import { factorMalla, resistencia } from './mallas.js'

/** Registra un evento (incidente u operación) con el tiempo simulado. */
export function registrarEvento(modelo, estado, tipo, datos = {}) {
  const t = estado.paso * modelo.dtR
  estado.eventos.push({ t, tipo, ...datos })
  estado.incidentes[tipo] = (estado.incidentes[tipo] ?? 0) + 1
  if (estado.eventos.length > 500) estado.eventos.splice(0, estado.eventos.length - 500)
}

/**
 * Factor de caudal de una corriente (0–1): producto de la marcha de sus
 * bombas y, si descarga a un vaso presurizado, de la curva de la bomba.
 */
export function factorCorriente(modelo, estado, c) {
  if (destinoBloqueado(estado, c)) return 0
  let f = 1
  // Mallas: las bombas no pueden succionar más de lo que deja la ΔP máxima.
  if (c.malla && !c.valvula) {
    const m = modelo.mallas[c.malla]
    let pedido = 0
    for (const id of m.corrientes) if (!modelo.corrientePorId[id].valvula) pedido += estado.ajustes[id].caudal
    f *= factorMalla(m, estado.mallas[c.malla], pedido)
  }
  const destino = c.destino.vaso ?? modelo.corrientePorId[c.destino.unir]?.destino.vaso
  for (const id of c.bombas) {
    const b = modelo.bombas[id]
    f *= estado.bombas[id].f
    if (b.Pcierre && destino && destino !== c.origen.vaso) {
      f *= factorPresionBomba(b, estado.vasos[destino].presion.P)
    }
  }
  return f
}

/**
 * Corrientes que afectan el volumen de cada vaso sin pasar por una válvula
 * (se calcula una vez por modelo): signo +1 si entran, −1 si salen.
 */
function corrientesFijas(modelo, v) {
  if (v._fijas) return v._fijas
  const lista = []
  for (const c of modelo.corrientes) {
    if (c.valvula) continue
    const destino = c.destino.vaso ?? modelo.corrientePorId[c.destino.unir]?.destino.vaso
    const astillas = c.tipo === 'astillas' || c.tipo === 'fondo'
    if (destino === v.id) lista.push({ c, signo: 1, astillas })
    if (c.origen.vaso === v.id) lista.push({ c, signo: -1, astillas: c.tipo === 'fondo' })
  }
  Object.defineProperty(v, '_fijas', { value: lista, enumerable: false })
  Object.defineProperty(v, '_valvulas', {
    value: modelo.corrientes.filter((c) => c.valvula && c.origen.vaso === v.id),
    enumerable: false,
  })
  return lista
}

/** Caudal volumétrico neto (m³/s) que entra al vaso sin contar las válvulas. */
function caudalFijo(modelo, estado, v) {
  const rhoB = estado.fuentes.astillas.densidad
  let q = 0
  for (const { c, signo, astillas } of corrientesFijas(modelo, v)) {
    const a = estado.ajustes[c.id]
    const vol = a.caudal + (astillas && a.caudalMadera !== undefined ? a.caudalMadera / rhoB : 0)
    if (vol !== 0) q += signo * vol * factorCorriente(modelo, estado, c)
  }
  return q - estado.vasos[v.id].presion.tasaPenetracion
}

/** Un paso rápido de todos los equipos. */
export function pasoRapidoEquipos(modelo, estado, dt) {
  for (const [id, cfg] of Object.entries(modelo.valvulas)) moverValvula(estado.valvulas[id], cfg, dt)
  for (const [id, cfg] of Object.entries(modelo.bombas)) moverBomba(estado.bombas[id], cfg, dt)
  for (const v of modelo.vasos) {
    const pr = estado.vasos[v.id].presion
    const seg = v.presion.seguridad
    // Válvula de seguridad: abre sobre su ajuste y cierra bajo ajuste − purga.
    if (!pr.seguridadAbierta && pr.P > seg.Pset) {
      pr.seguridadAbierta = true
      registrarEvento(modelo, estado, 'apertura_seguridad', { vaso: v.id, P: pr.P })
    } else if (pr.seguridadAbierta && pr.P < seg.Pset - seg.purga) {
      pr.seguridadAbierta = false
    }
    const Qfijo = caudalFijo(modelo, estado, v)
    const valvulas = v._valvulas.map((c) => ({
      id: c.id,
      cfg: c.valvula,
      f: caracteristica(estado.valvulas[c.id].x, c.valvula.tipo, c.valvula.R),
      z: (c.origen.j + 0.5) * v.geom.dz,
      Pdest: c.valvula.Pdest,
      bloqueada: destinoBloqueado(estado, c),
      Rmalla: c.malla ? resistencia(modelo.mallas[c.malla], estado.mallas[c.malla]) : 0,
    }))
    const ctx = {
      Qfijo,
      valvulas,
      rho: modelo.fis.densidadLicor,
      seguridadAbierta: pr.seguridadAbierta,
    }
    const q = integrarPresion(v, pr, ctx, dt)
    for (const [id, qv] of Object.entries(q.valvulas)) pr.acumulado[id] = (pr.acumulado[id] ?? 0) + qv * dt
    pr.acumulado.alivio = (pr.acumulado.alivio ?? 0) + q.alivio * dt
    pr.acumulado.seguridad = (pr.acumulado.seguridad ?? 0) + q.seguridad * dt
    // Incidentes: apertura del alivio y vaporización súbita (al iniciar cada episodio).
    if (q.alivio > 0 && !pr.alivioAbierto) registrarEvento(modelo, estado, 'apertura_alivio', { vaso: v.id, P: pr.P })
    pr.alivioAbierto = q.alivio > 0
    const hirviendo = !pr.venteo && pr.Ppiso > P_ATM && pr.P <= pr.Ppiso * (1 + 1e-9) &&
      (pr.E < 0 || pr.Pref + pr.E / pr.C < pr.Ppiso)
    if (hirviendo && !pr.ebullicion) registrarEvento(modelo, estado, 'vaporizacion_subita', { vaso: v.id, P: pr.P, celda: pr.celdaPiso })
    pr.ebullicion = hirviendo
  }
}

/** Después del balance hidráulico del paso lento: presión exacta a partir del exceso real. */
export function cerrarPresion(modelo, estado, v, res) {
  const est = estado.vasos[v.id]
  const pr = est.presion
  pr.C = Math.max(res.volumenLiquido, 1e-6) * v.presion.beta
  const piso = pisoEbullicion(v, est, modelo.fis.densidadLicor)
  pr.Ppiso = piso.piso
  pr.celdaPiso = piso.celda
  // Con venteo, el exceso ya rebalsó: el vaso queda lleno a presión atmosférica.
  pr.E = pr.venteo ? Math.min(res.exceso, 0) : res.exceso
  if (pr.venteo) pr.Pref = P_ATM
  pr.P = presionDesdeExceso(pr, pr.E)
  pr.tasaPenetracion = res.tasaPenetracion
  pr.acumulado = {}
}
