// Instantánea del estado para las capas de presentación (copias, nunca
// referencias al estado interno). Incluye indicadores de operación (KPI) y,
// si se pide, los perfiles por celda de cada vaso.

import { p } from './parametros.js'
import { cierreBalances } from './contabilidad.js'

/**
 * @param op { perfiles: bool, balances: bool }
 */
export function instantanea(modelo, estado, op = {}) {
  const t = estado.paso * modelo.dtR
  const salida = {
    t,
    paso: estado.paso,
    vasos: {},
    corrientes: {},
    kpi: indicadores(modelo, estado),
  }
  for (const v of modelo.vasos) {
    const ev = estado.vasos[v.id]
    const d = estado.diag[v.id] ?? {}
    salida.vasos[v.id] = {
      nombre: v.nombre,
      nivelAstillas: d.nivelAstillas ?? null,
      lleno: d.lleno ?? null,
      zonas: Object.fromEntries(v.zonas.map((z) => [z.id, resumenZona(modelo, ev, z)])),
    }
    if (op.perfiles) salida.vasos[v.id].perfil = perfil(modelo, v, ev, d)
  }
  for (const c of modelo.corrientes) {
    const ec = estado.corrientes[c.id]
    salida.corrientes[c.id] = {
      nombre: c.nombre,
      caudal: ec.caudalReal,
      T: ec.T,
      consigna: { ...estado.ajustes[c.id] },
      calor: ec.calor ?? 0,
    }
  }
  if (op.balances) salida.balances = cierreBalances(modelo, estado)
  return JSON.parse(JSON.stringify(salida))
}

/** Promedios del licor libre en una zona (ponderados por volumen). */
function resumenZona(modelo, ev, zona) {
  let v = 0
  let sT = 0
  const sc = new Array(ev.c.length).fill(0)
  for (const j of zona.celdas) {
    v += ev.vf[j]
    sT += ev.vf[j] * ev.T[j]
    for (let k = 0; k < ev.c.length; k++) sc[k] += ev.vf[j] * ev.c[k][j]
  }
  const r = { nombre: zona.nombre, T: v > 0 ? sT / v : null }
  modelo.especies.forEach((e, k) => { r[e.id] = v > 0 ? sc[k] / v : null })
  return r
}

/** Perfiles por celda: licor libre y astillas (promedios de las parcelas en cada celda). */
function perfil(modelo, v, ev, d) {
  const n = v.geom.n
  const masa = new Array(n).fill(0)
  const H = new Array(n).fill(0)
  const edad = new Array(n).fill(0)
  const Tast = new Array(n).fill(0)
  const OHr = new Array(n).fill(0)
  const vr = new Array(n).fill(0)
  // Se reconstruye la ubicación de las parcelas recorriendo la columna.
  let base = 0
  let j = n - 1
  for (const par of ev.parcelas) {
    const vVaso = par.vol / v.sCol
    let a = base
    const tope = base + vVaso
    while (a < tope - 1e-12 && j >= 0) {
      const fin = v.geom.volBajo[j] + v.geom.V[j]
      const b = Math.min(tope, fin)
      const f = (b - a) / vVaso
      masa[j] += f * par.m
      H[j] += f * par.m * par.H
      edad[j] += f * par.m * par.edad
      Tast[j] += f * par.m * par.T
      OHr[j] += f * par.vr * par.cr[modelo.idx.OH]
      vr[j] += f * par.vr
      a = b
      if (b >= fin - 1e-12) j--
    }
    base = tope
  }
  const div = (a, b) => a.map((x, i) => (b[i] > 0 ? x / b[i] : null))
  return {
    z: Array.from({ length: n }, (_, i) => (i + 0.5) * v.geom.dz),
    licorLibre: ev.vf.slice(),
    T: ev.T.slice(),
    flujo: d.flujo ? d.flujo.slice(1) : new Array(n).fill(0), // caudal por la cara inferior (+ abajo)
    especies: Object.fromEntries(modelo.especies.map((e, k) => [e.id, ev.c[k].slice()])),
    astillas: masa,
    TAstillas: div(Tast, masa),
    H: div(H, masa),
    edad: div(edad, masa),
    OHRetenido: div(OHr, vr),
  }
}

/** Indicadores de operación (en unidades internas). */
function indicadores(modelo, estado) {
  const cfgInd = modelo.config.topologia.indicadores ?? {}
  const cb = modelo.config.caso_base
  const rend = p(cb, 'rendimiento_nominal', 'caso_base.rendimiento_nominal')
  const k = {}
  const vasoSoplado = modelo.corrientePorId[cfgInd.soplado]?.origen.vaso
  const dSop = vasoSoplado ? estado.diag[vasoSoplado] : null
  const vasoImp = modelo.corrientePorId[cfgInd.salida_impregnador]?.origen.vaso
  const dImp = vasoImp ? estado.diag[vasoImp] : null
  const madera = estado.ajustes[cfgInd.alimentacion?.astillas]?.caudalMadera ?? 0
  k.maderaAlimentada = madera // kg/s
  k.produccion = dSop ? (dSop.maderaSalida * rend * 86400) / 1000 / 0.9 : 0 // ADt/d
  k.residenciaImpregnador = dImp?.edadSalida ?? null // s (edad media de lo que sale)
  k.residenciaTotal = dSop?.edadSalida ?? null // s, desde el medidor de astillas
  k.HSoplado = dSop?.HSalida ?? null
  k.marcaSoplado = dSop?.marcaSalida ?? null
  // Relación licor/madera en la alimentación (incluye la humedad de las astillas).
  if (cfgInd.alimentacion && madera > 0) {
    const as = estado.fuentes.astillas
    let q = (madera * as.humedad) / (1 - as.humedad) / 1000
    for (const c of modelo.corrientes) {
      if (c.destino.vaso === cfgInd.alimentacion.vaso && c.destino.tope && c.tipo !== 'astillas') {
        q += estado.corrientes[c.id].caudalReal
      }
    }
    k.licorMaderaAlimentacion = q / madera // m³/kg
  }
  // Factor de dilución: filtrado al fondo menos licor que sale con la pulpa, por ADt.
  if (cfgInd.dilucion_fondo && dSop && k.produccion > 0) {
    const entra = cfgInd.dilucion_fondo.reduce((s, id) => s + estado.corrientes[id].caudalReal, 0)
    const sopl = estado.corrientes[cfgInd.soplado]
    const licorPulpa = sopl.caudalReal - dSop.maderaSalida / estado.fuentes.astillas.densidad + dSop.retenidoSalida
    k.factorDilucion = (entra - licorPulpa) / (k.produccion / 86400) // m³/ADt
    k.TSoplado = sopl.T
  }
  return k
}
