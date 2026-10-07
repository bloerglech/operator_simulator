// Cinética de cocción kraft dentro de cada parcela de astillas.
//
// Las reacciones ocurren en el licor retenido (dentro de la astilla) y solo en
// la fracción impregnada. Cada paso lento integra las reacciones de primer
// orden con su solución exponencial exacta, con las concentraciones del
// licor retenido congeladas al inicio del paso; si el álcali no alcanza, todas
// las reacciones que lo consumen se reducen en la misma proporción.
// Ecuaciones y supuestos: docs/MODELO.md §6.

import { p } from './parametros.js'
import { kelvin, R_GAS } from './unidades.js'

/** Componentes sólidos de la parcela (kg). */
export const COMPONENTES = ['Lf', 'Lp', 'Lr', 'Ca', 'Cb', 'Xa', 'Xb', 'Ga', 'Gb', 'E', 'Ac', 'Ce']
const C = Object.fromEntries(COMPONENTES.map((c, i) => [c, i]))
const PM_ACETILO = 0.043 // kg/mol (grupo acetilo, CH3CO)

/** Lee y valida la configuración cinética y de la madera. */
export function construirCinetica(config) {
  const { cinetica: cc, madera: md } = config
  if (!cc) throw new Error('Falta config/cinetica.json')
  const r = cc.reacciones
  const reac = (nombre) => {
    const x = r[nombre]
    if (!x) throw new Error(`Falta la reacción "${nombre}" en cinetica.json`)
    const ruta = `cinetica.reacciones.${nombre}`
    return {
      A: p(x, 'A', `${ruta}.A`),
      E: p(x, 'E', `${ruta}.E`),
      a: x.a_OH ? p(x, 'a_OH') : 0,
      b: x.b_HS ? p(x, 'b_HS') : 0,
    }
  }
  const comp = Object.fromEntries(
    ['lignina', 'glucano', 'xilano', 'otros_carbohidratos', 'extraibles', 'acetilos', 'cenizas'].map((k) => [
      k,
      p(md.composicion, k, `madera.composicion.${k}`),
    ]),
  )
  const suma = Object.values(comp).reduce((s, x) => s + x, 0)
  if (Math.abs(suma - 1) > 0.005) {
    throw new Error(`madera.composicion debe sumar 100 % (suma ${(suma * 100).toFixed(2)} %)`)
  }
  const reparto = ['rapida', 'principal', 'residual'].map((k) => p(cc.reparto_lignina, k, `cinetica.reparto_lignina.${k}`))
  if (Math.abs(reparto[0] + reparto[1] + reparto[2] - 1) > 1e-6) throw new Error('cinetica.reparto_lignina debe sumar 100 %')
  const clases = md.clases_tamano.map((k) => ({
    id: k.id,
    nombre: k.nombre,
    w: p(k, 'fraccion', `madera.clases_tamano.${k.id}.fraccion`),
    espesor: p(k, 'espesor', `madera.clases_tamano.${k.id}.espesor`),
  }))
  if (Math.abs(clases.reduce((s, k) => s + k.w, 0) - 1) > 1e-6) throw new Error('madera.clases_tamano: las fracciones deben sumar 100 %')
  const imp = cc.impregnacion
  const ca = cc.consumo_alcali
  return {
    Tref: p(cc, 'T_ref', 'cinetica.T_ref'),
    comp,
    reparto,
    reactiva: {
      C: p(cc.fraccion_reactiva, 'celulosa'),
      X: p(cc.fraccion_reactiva, 'xilano'),
      G: p(cc.fraccion_reactiva, 'otros_carbohidratos'),
    },
    MeGlcA: p(md, 'MeGlcA', 'madera.MeGlcA'),
    DP0: p(md, 'DP_inicial', 'madera.DP_inicial'),
    reactividad: p(md, 'reactividad', 'madera.reactividad'),
    clases,
    k: {
      f: reac('lignina_rapida'),
      p1: reac('lignina_principal_OH'),
      p2: reac('lignina_principal_HS'),
      r: reac('lignina_residual'),
      c: reac('condensacion'),
      pc: reac('celulosa_peeling'),
      hc: reac('celulosa_hidrolisis'),
      dx: reac('xilano_disolucion'),
      hx: reac('xilano_hidrolisis'),
      pg: reac('otros_peeling'),
      hg: reac('otros_hidrolisis'),
      E: reac('extraibles'),
      ac: reac('acetilos'),
      hf: reac('hexa_formacion'),
      hd: reac('hexa_degradacion'),
      v: reac('viscosidad'),
    },
    condensacion: { OHc: p(r.condensacion, 'OH_c'), n: p(r.condensacion, 'n') },
    rep: { k: p(r.reprecipitacion, 'k'), OH: p(r.reprecipitacion, 'OH_umbral') },
    red: {
      activo: !!r.redeposito_xilano.activo,
      k: p(r.redeposito_xilano, 'k'),
      OH: p(r.redeposito_xilano, 'OH_umbral'),
    },
    betaDS: p(r.viscosidad, 'beta_DS'),
    kappaDS: p(cc.solidos_disueltos, 'kappa_DS', 'cinetica.solidos_disueltos.kappa_DS'),
    alfaL: p(ca, 'alfa_lignina', 'cinetica.consumo_alcali.alfa_lignina'),
    alfaC: p(ca, 'alfa_carbohidratos', 'cinetica.consumo_alcali.alfa_carbohidratos'),
    alfaE: p(ca, 'alfa_extraibles', 'cinetica.consumo_alcali.alfa_extraibles'),
    ADS: p(ca, 'A_DS', 'cinetica.consumo_alcali.A_DS'),
    EDS: p(ca, 'E_DS', 'cinetica.consumo_alcali.E_DS'),
    betaHS: p(ca, 'beta_HS_lignina', 'cinetica.consumo_alcali.beta_HS_lignina'),
    imp: {
      A: p(imp, 'A', 'cinetica.impregnacion.A'),
      E: p(imp, 'E', 'cinetica.impregnacion.E'),
      KOH: p(imp, 'K_OH', 'cinetica.impregnacion.K_OH'),
      espesorRef: p(imp, 'espesor_ref', 'cinetica.impregnacion.espesor_ref'),
      psi: p(imp, 'psi', 'cinetica.impregnacion.psi'),
      Tcoccion: p(imp, 'T_inicio_coccion', 'cinetica.impregnacion.T_inicio_coccion'),
      rendNucleo: p(imp, 'rendimiento_nucleo', 'cinetica.impregnacion.rendimiento_nucleo'),
    },
    ligPorKappa: p(cc.kappa, 'lignina_por_kappa', 'cinetica.kappa.lignina_por_kappa'),
    hexaPorKappa: p(cc.kappa, 'HexA_por_kappa', 'cinetica.kappa.HexA_por_kappa'),
    viscExp: p(cc.viscosidad, 'exponente', 'cinetica.viscosidad.exponente'),
    viscFactor: p(cc.viscosidad, 'factor', 'cinetica.viscosidad.factor'),
  }
}

/**
 * Composición inicial de madera fresca por kg seco, según el lote.
 * `lote` puede traer su propia composición (fracciones) y reactividad.
 */
export function composicionFresca(cin, lote = {}) {
  const c = { ...cin.comp, ...(lote.comp ?? {}) }
  const s = new Array(COMPONENTES.length).fill(0)
  s[C.Lf] = c.lignina * cin.reparto[0]
  s[C.Lp] = c.lignina * cin.reparto[1]
  s[C.Lr] = c.lignina * cin.reparto[2]
  s[C.Ca] = c.glucano * cin.reactiva.C
  s[C.Cb] = c.glucano * (1 - cin.reactiva.C)
  s[C.Xa] = c.xilano * cin.reactiva.X
  s[C.Xb] = c.xilano * (1 - cin.reactiva.X)
  s[C.Ga] = c.otros_carbohidratos * cin.reactiva.G
  s[C.Gb] = c.otros_carbohidratos * (1 - cin.reactiva.G)
  s[C.E] = c.extraibles
  s[C.Ac] = c.acetilos
  s[C.Ce] = c.cenizas
  return s
}

/** Campos cinéticos de una parcela fresca de masa m (kg). */
export function camposCineticos(cin, m, lote = {}) {
  return {
    m0: m,
    s: composicionFresca(cin, lote).map((x) => x * m),
    M: (lote.MeGlcA ?? cin.MeGlcA) * m,
    HexA: 0,
    Rp: 0,
    invDP: 1 / cin.DP0,
    reac: lote.reactividad ?? cin.reactividad,
    vap: lote.vaporizacion ?? 1,
    phi: cin.clases.map(() => 1),
    phiIni: cin.clases.map(() => -1),
  }
}

const arrh = (E, tk) => Math.exp((-E / R_GAS) * tk)
const pot = (x, a) => (a === 0 ? 1 : x > 0 ? Math.pow(x, a) : 0)
const avance = (X, k, dt) => (X > 0 && k > 0 ? X * -Math.expm1(-k * dt) : 0)

/**
 * Avanza las reacciones de una parcela un paso dt. Modifica la parcela y
 * devuelve lo producido/consumido, para la contabilidad:
 *   { madera (kg, negativo = disuelto), esp: [Δ(c·V) por especie], energia (kJ) }
 */
export function reaccionarParcela(par, cin, dt, idx, nEsp, densidadPared, cpMadera) {
  if (!par.s || par.vr <= 1e-12 || par.m <= 0) return null
  const s = par.s
  const cr = par.cr
  const tk = 1 / kelvin(par.T) - 1 / kelvin(cin.Tref)
  const OH = Math.max(0, cr[idx.OH])
  const HS = Math.max(0, cr[idx.HS])
  const DSo = Math.max(0, cr[idx.LD] + cr[idx.XD] + cr[idx.CD] + cr[idx.OD])
  let phiBar = 0
  cin.clases.forEach((k, i) => { phiBar += k.w * par.phi[i] })
  const eta = 1 - phiBar + cin.imp.psi * phiBar // fracción que reacciona
  const fDS = 1 / (1 + cin.kappaDS * DSo)
  const K = cin.k
  const kk = (x, extra = 1) => x.A * arrh(x.E, tk) * pot(OH, x.a) * extra
  const r = par.reac

  // Constantes de primer orden (1/s).
  const kf = kk(K.f) * r * eta
  const kp = (kk(K.p1) + kk(K.p2, pot(HS, K.p2.b))) * fDS * r * eta
  const kr = kk(K.r) * fDS * r * eta
  const g = 1 / (1 + Math.pow(OH / cin.condensacion.OHc, cin.condensacion.n))
  const kc = K.c.A * arrh(K.c.E, tk) * g * eta
  const kOH = (x) => x.A * arrh(x.E, tk) * OH * eta // reacciones de orden 1 en OH⁻

  // Avances sin limitación de álcali (kg en el paso).
  const dLf = avance(s[C.Lf], kf, dt)
  const dLpTot = avance(s[C.Lp], kp + kc, dt)
  const dLp = kp + kc > 0 ? (dLpTot * kp) / (kp + kc) : 0
  const dLc = dLpTot - dLp // condensación (no disuelve)
  const dLr = avance(s[C.Lr], kr, dt)
  const dCa = avance(s[C.Ca], kOH(K.pc), dt)
  const dCb = avance(s[C.Cb], kOH(K.hc), dt)
  const dXa = avance(s[C.Xa], kk(K.dx) * eta, dt)
  const dXb = avance(s[C.Xb], kOH(K.hx), dt)
  const dGa = avance(s[C.Ga], kOH(K.pg), dt)
  const dGb = avance(s[C.Gb], kOH(K.hg), dt)
  const dE = avance(s[C.E], kOH(K.E), dt)
  const dAc = avance(s[C.Ac], kOH(K.ac), dt)

  // Consumo de álcali (mol) y limitación por disponibilidad.
  const ligDis = dLf + dLp + dLr
  const carb = dCa + dCb + dXa + dXb + dGa + dGb
  const demDS = cin.ADS * arrh(cin.EDS, tk) * OH * DSo * par.vr * dt * eta
  const demOH = cin.alfaL * ligDis + cin.alfaC * carb + cin.alfaE * dE + dAc / PM_ACETILO + demDS
  const dispOH = OH * par.vr * 1000
  const esc = demOH > 0.95 * dispOH && demOH > 0 ? (0.95 * dispOH) / demOH : 1
  const demHS = Math.min(cin.betaHS * ligDis * esc, 0.95 * HS * par.vr * 1000)

  // HexA (mol): formación desde MeGlcA, degradación, y pérdida con el xilano disuelto.
  const X = s[C.Xa] + s[C.Xb]
  const fracX = X > 0 ? ((dXa + dXb) * esc) / X : 0
  const dForm = avance(par.M, K.hf.A * arrh(K.hf.E, tk) * pot(OH, K.hf.a) * eta, dt) * esc
  const dDeg = avance(par.HexA, K.hd.A * arrh(K.hd.E, tk) * pot(OH, K.hd.a), dt)
  par.M = (par.M - dForm) * (1 - fracX)
  par.HexA = Math.max(0, (par.HexA + dForm - dDeg) * (1 - fracX))

  // Aplicar los avances al sólido.
  s[C.Lf] -= dLf * esc
  s[C.Lp] -= dLpTot * esc
  s[C.Lr] += dLc * esc - dLr * esc
  s[C.Ca] -= dCa * esc
  s[C.Cb] -= dCb * esc
  s[C.Xa] -= dXa * esc
  s[C.Xb] -= dXb * esc
  s[C.Ga] -= dGa * esc
  s[C.Gb] -= dGb * esc
  s[C.E] -= dE * esc
  s[C.Ac] -= dAc * esc

  // Productos al licor retenido (kg).
  let LD = ligDis * esc
  let XD = dXa * esc
  const CD = (dCa + dCb + dXb + dGa + dGb + dAc) * esc
  const OD = dE * esc

  // Reprecipitación de lignina y redepósito de xilano cuando baja el álcali.
  const OHn = Math.max(0, OH - (demOH * esc) / (par.vr * 1000))
  const ligLib = Math.max(0, cr[idx.LD] * par.vr + LD)
  const rep = avance(ligLib, cin.rep.k * Math.max(0, cin.rep.OH - OHn), dt)
  s[C.Lr] += rep
  par.Rp += rep
  LD -= rep
  if (cin.red.activo) {
    const xLib = Math.max(0, cr[idx.XD] * par.vr + XD)
    const red = avance(xLib, cin.red.k * Math.max(0, cin.red.OH - OHn), dt)
    const Xn = s[C.Xa] + s[C.Xb]
    if (red > 0 && Xn > 0) par.HexA *= 1 + red / Xn // trae HexA en la proporción del xilano (S-09)
    s[C.Xb] += red
    XD -= red
  }

  // Viscosidad: escisiones de cadena de la celulosa.
  par.invDP += K.v.A * arrh(K.v.E, tk) * pot(OH, K.v.a) * (1 + cin.betaDS * DSo) * eta * dt

  // Impregnación por clase de tamaño.
  const hOH = OH / (OH + cin.imp.KOH)
  const kImp = cin.imp.A * arrh(cin.imp.E, tk) * par.vap * hOH
  cin.clases.forEach((k, i) => {
    const rel = (cin.imp.espesorRef / k.espesor) ** 2
    par.phi[i] *= Math.exp(-kImp * rel * dt)
    if (par.phiIni[i] < 0 && par.T >= cin.imp.Tcoccion) par.phiIni[i] = par.phi[i]
  })

  // Licor retenido.
  const v = par.vr
  cr[idx.OH] = Math.max(0, cr[idx.OH] - (demOH * esc) / (v * 1000))
  cr[idx.HS] = Math.max(0, cr[idx.HS] - demHS / (v * 1000))
  cr[idx.LD] += LD / v
  cr[idx.XD] += XD / v
  cr[idx.CD] += CD / v
  cr[idx.OD] += OD / v

  // Masa y poros: lo disuelto deja espacio que se llena con licor (penetración).
  const mAnt = par.m
  par.m = s.reduce((a, x) => a + x, 0)
  par.vp = Math.max(par.vr, par.vol - par.m / densidadPared)

  const esp = new Array(nEsp).fill(0)
  esp[idx.OH] = -(demOH * esc) / 1000
  esp[idx.HS] = -demHS / 1000
  esp[idx.LD] = LD
  esp[idx.XD] = XD
  esp[idx.CD] = CD
  esp[idx.OD] = OD
  // Con ρ·cp del licor constante, el calor sensible de lo disuelto se registra
  // aparte para que el balance de energía cierre (supuesto S-24).
  return { madera: par.m - mAnt, esp, energia: cpMadera * (par.m - mAnt) * par.T }
}

/**
 * Calidad promedio de un conjunto de parcelas (ponderada por masa).
 * Devuelve null si no hay masa.
 */
export function calidadPulpa(parcelas, cin) {
  let m = 0, m0 = 0, lig = 0, hexa = 0, cel = 0, invDPcel = 0, rech = 0, rp = 0, xil = 0
  for (const par of parcelas) {
    if (!par.s || par.m <= 0) continue
    m += par.m
    m0 += par.m0
    lig += par.s[C.Lf] + par.s[C.Lp] + par.s[C.Lr]
    hexa += par.HexA
    const c = par.s[C.Ca] + par.s[C.Cb]
    cel += c
    invDPcel += c * par.invDP
    xil += par.s[C.Xa] + par.s[C.Xb]
    rp += par.Rp
    let f = 0
    cin.clases.forEach((k, i) => { f += k.w * (par.phiIni[i] >= 0 ? par.phiIni[i] : par.phi[i]) })
    rech += par.m0 * f * cin.imp.rendNucleo
  }
  if (m <= 0) return null
  const kappaLignina = lig / m / cin.ligPorKappa
  const kappaHexA = hexa / m / cin.hexaPorKappa
  const DP = cel > 0 ? cel / invDPcel : null
  return {
    kappa: kappaLignina + kappaHexA,
    kappaLignina,
    kappaHexA,
    HexA: hexa / m, // mol/kg pulpa
    rendimiento: m / m0,
    rendimientoDepurado: (m - rech) / m0,
    rechazos: rech / m, // fracción sobre pulpa
    lignina: lig / m,
    xilano: xil / m,
    celulosa: cel / m,
    reprecipitada: rp / m,
    DP,
    viscosidad: DP ? Math.pow(DP, cin.viscExp) / cin.viscFactor : null, // mL/g
    masa: m,
    masaMadera: m0,
  }
}
