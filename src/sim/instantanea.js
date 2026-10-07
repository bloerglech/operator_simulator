// Instantánea del estado para las capas de presentación (copias, nunca
// referencias al estado interno). Incluye indicadores de operación (KPI) y,
// si se pide, los perfiles por celda de cada vaso.

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
      presion: {
        P: ev.presion.P, // Pa absolutos (tope)
        Psaturacion: ev.presion.Ppiso, // piso de ebullición (Pa abs)
        venteo: ev.presion.venteo,
        alivio: ev.presion.alivioAbierto,
        seguridad: ev.presion.seguridadAbierta,
        ebullicion: ev.presion.ebullicion,
      },
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
  salida.valvulas = Object.fromEntries(Object.keys(modelo.valvulas).map((id) => [id, {
    apertura: estado.valvulas[id].x,
    comando: estado.valvulas[id].comando,
    caudal: estado.corrientes[id].caudalReal,
  }]))
  salida.bombas = Object.fromEntries(Object.keys(modelo.bombas).map((id) => [id, { ...estado.bombas[id] }]))
  salida.eventos = estado.eventos.slice(-50)
  salida.incidentes = { ...estado.incidentes }
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
  const lig = new Array(n).fill(0)
  const hexa = new Array(n).fill(0)
  const m0 = new Array(n).fill(0)
  const cin = modelo.cin
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
      if (par.s) {
        lig[j] += f * (par.s[0] + par.s[1] + par.s[2])
        hexa[j] += f * par.HexA
        m0[j] += f * par.m0
      }
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
    kappa: masa.map((m, j) => (m > 0 ? lig[j] / m / cin.ligPorKappa + hexa[j] / m / cin.hexaPorKappa : null)),
    rendimiento: div(masa, m0),
    solidosOrganicos: ev.vf.map((_, j) => ['LD', 'XD', 'CD', 'OD'].reduce((s, id) => s + ev.c[modelo.idx[id]][j], 0)),
  }
}

/** Indicadores de operación (en unidades internas). */
function indicadores(modelo, estado) {
  const cfgInd = modelo.config.topologia.indicadores ?? {}
  const k = {}
  const vasoSoplado = modelo.corrientePorId[cfgInd.soplado]?.origen.vaso
  const dSop = vasoSoplado ? estado.diag[vasoSoplado] : null
  const vasoImp = modelo.corrientePorId[cfgInd.salida_impregnador]?.origen.vaso
  const dImp = vasoImp ? estado.diag[vasoImp] : null
  const madera = estado.ajustes[cfgInd.alimentacion?.astillas]?.caudalMadera ?? 0
  k.maderaAlimentada = madera // kg/s
  k.produccion = dSop ? (dSop.maderaSalida * 86400) / 1000 / 0.9 : 0 // ADt/d de pulpa (incluye rechazos)
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
    const licorPulpa = sopl.caudalReal - dSop.maderaOriginalSalida / estado.fuentes.astillas.densidad + dSop.retenidoSalida
    k.factorDilucion = (entra - licorPulpa) / (k.produccion / 86400) // m³/ADt
    k.TSoplado = sopl.T
  }
  // Calidad de la pulpa en el soplado y álcali residual.
  const q = dSop?.calidadSalida
  if (q) {
    k.kappa = q.kappa
    k.kappaLignina = q.kappaLignina
    k.kappaHexA = q.kappaHexA
    k.rendimiento = q.rendimiento
    k.rendimientoDepurado = q.rendimientoDepurado
    k.rechazos = q.rechazos
    k.viscosidad = q.viscosidad
    k.lignina = q.lignina
    k.xilano = q.xilano
  }
  const { OH, LD, XD, CD, OD, SI } = modelo.idx
  if (dSop?.licorSalida) k.alcaliResidualSoplado = dSop.licorSalida.c[OH] // mol/L (EA)
  k.extracciones = {}
  for (const c of modelo.corrientes) {
    if (c.tipo !== 'extraccion' || !c.destino.sumidero) continue
    const ec = estado.corrientes[c.id]
    if (!ec.c) continue
    k.extracciones[c.id] = {
      caudal: ec.caudalReal,
      alcali: ec.c[OH], // mol/L como EA
      solidosOrganicos: ec.c[LD] + ec.c[XD] + ec.c[CD] + ec.c[OD], // g/L
      solidos: ec.c[LD] + ec.c[XD] + ec.c[CD] + ec.c[OD] + ec.c[SI],
    }
  }
  return k
}
