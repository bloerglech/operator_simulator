// Paso de tiempo de un vaso (impregnador o digestor hidráulico).
//
// Orden dentro del paso lento:
//  1. Sale astilla por el fondo y entra astilla por el tope (columna lagrangiana).
//  2. Se ubican las parcelas en las celdas → capacidad de licor libre por celda.
//  3. Penetración de licor en los poros de la astilla (demanda por celda).
//  4. Balance hidráulico → volúmenes nuevos y caudales por cara.
//  5. Transporte implícito de temperatura y especies en el licor libre.
//  6. Lo extraído sale con la composición nueva; lo penetrado pasa a las parcelas.
//  7. Intercambio licor libre ↔ astilla (difusión de especies y calor).
//  8. Pérdidas de calor al ambiente.

import { ubicarColumna, agregarTope, retirarFondo, compactar } from './columna.js'
import { balanceHidraulico } from './hidraulica.js'
import { transportarLicor } from './transporte.js'
import { capacidadParcela } from './materia.js'
import { kelvin, R_GAS } from './unidades.js'

/** Estado inicial vacío (sin licor ni astillas) de un vaso. */
export function estadoVasoVacio(n, nEsp, tAmb) {
  return {
    vf: new Array(n).fill(0),
    T: new Array(n).fill(tAmb),
    c: Array.from({ length: nEsp }, () => new Array(n).fill(0)),
    parcelas: [],
  }
}

/** Factor de Arrhenius relativo a la temperatura de referencia. */
function arrhenius(E, tC, tRefC) {
  return Math.exp((-E / R_GAS) * (1 / kelvin(tC) - 1 / kelvin(tRefC)))
}

/** Constante de difusión libre ↔ retenido (1/s) de una parcela para una especie. */
export function constanteDifusion(dif, tC, oh, factorEspecie) {
  const eccsa = dif.eccsaMin + ((dif.eccsaMax - dif.eccsaMin) * oh) / (oh + dif.Ke)
  const D = dif.Dref * arrhenius(dif.E, tC, dif.Tref) * eccsa * factorEspecie
  const L = dif.espesor / 2
  return (3 * D) / (L * L) // fuerza impulsora lineal para una lámina (Glueckauf)
}

/**
 * Avanza un vaso un paso dt.
 * @param v   descripción del vaso (geometría y parámetros, no cambia)
 * @param est estado del vaso (se modifica)
 * @param ent entradas del paso:
 *   adiciones: [{ j, licor:{v,T,c} }]
 *   parcelasTope: [parcela]
 *   extracciones: [{ id, j, v }]          (m³ solicitados en el paso)
 *   fondo: { masa (kg), licor (m³) }      (solicitado)
 *   venteo: true si el vaso está abierto a la atmósfera
 * @returns { extraidos: {id: licor}, cierre: licor (rebalse por el venteo), fondo: {licor, parcelas},
 *            perdidas (kJ), nivelAstillas, lleno, exceso, tasas para la presión, … }
 */
export function pasoVaso(v, est, ent, dt) {
  const { geom, fis } = v
  const n = geom.n
  const nEsp = est.c.length
  const iOH = v.iOH

  // 1. Astillas: salida por el fondo, entrada por el tope. Con la columna
  //    colgada, lo que sale del fondo deja un hueco bajo la parte colgada.
  const parcelasFondo = retirarFondo(est.parcelas, Math.max(0, ent.fondo.masa))
  if (est.parcelas.some((q) => q.colgada)) {
    est.hueco = (est.hueco ?? 0) + parcelasFondo.reduce((s, q) => s + q.vol / (q.sc ?? v.sCol), 0)
  }
  agregarTope(est.parcelas, ent.parcelasTope, v.masaObjetivo, fis)

  // 2. Compactación y ubicación de la columna; esfuerzo sobre el raspador.
  const cmp = { ...v.compactacion, friccion: est.friccion ?? 1, hueco: est.hueco ?? 0, dt, sIni: v.sCol }
  const sigmaFondo = compactar(est.parcelas, geom, cmp, est.flujoFiltrado, v.cinLigPorKappa, fis.densidadLicor, v.densidadPared)
  const col = ubicarColumna(est.parcelas, geom, v.sCol, est.hueco ?? 0)
  const r = v.raspador
  const fondoConAstillas = est.parcelas.length > 0 && !est.parcelas[0].colgada
  est.raspador = {
    esfuerzo: fondoConAstillas ? sigmaFondo : 0,
    torque: r.T0 + r.kT * (fondoConAstillas ? sigmaFondo / 1000 : 0),
  }
  est.raspador.corriente = r.I0 + r.kI * est.raspador.torque
  const cap = geom.V.map((V, j) => Math.max(0, V - col.volAstilla[j]))

  // 3. Penetración: el licor libre llena los poros con aire de las astillas.
  const demanda = new Array(col.solapes.length).fill(0)
  const pen = new Array(n).fill(0)
  col.solapes.forEach((s, q) => {
    if (est.vf[s.j] <= 0) return
    const par = est.parcelas[s.i]
    const k = v.penetracion.kRef * arrhenius(v.penetracion.E, par.T, v.penetracion.Tref)
    const d = s.f * Math.max(0, par.vp - par.vr) * (1 - Math.exp(-k * dt))
    demanda[q] = d
    pen[s.j] += d
  })

  // 4. Balance hidráulico.
  const adicV = new Array(n).fill(0)
  const adicX = Array.from({ length: n }, () => new Array(nEsp + 1).fill(0))
  for (const a of ent.adiciones) {
    if (a.licor.v <= 0) continue
    adicV[a.j] += a.licor.v
    adicX[a.j][0] += a.licor.v * a.licor.T
    for (let k = 0; k < nEsp; k++) adicX[a.j][k + 1] += a.licor.v * a.licor.c[k]
  }
  const hid = balanceHidraulico({
    cap,
    vAnt: est.vf,
    adic: adicV,
    extr: ent.extracciones.map((x) => ({ j: x.j, v: x.v })),
    pen,
    salidaFondo: ent.fondo.licor,
    celdaCierre: 0, // con el venteo abierto, el exceso rebalsa por el tope
    compresible: !ent.venteo,
    dt,
  })
  // Lo que cae por celdas secas llega a la superficie con su contenido.
  for (let j = 0; j < hid.sup; j++) {
    for (let s = 0; s <= nEsp; s++) {
      adicX[hid.sup][s] += adicX[j][s]
      adicX[j][s] = 0
    }
  }

  // 5. Transporte del licor libre.
  const sumid = new Array(n).fill(0)
  hid.extr.forEach((x) => { sumid[x.j] += x.v })
  for (let j = 0; j < n; j++) sumid[j] += hid.pen[j]
  sumid[hid.celdaCierre] += hid.cierre
  const x = transportarLicor({
    vAnt: est.vf,
    vNueva: hid.vNueva,
    flujo: hid.flujo,
    sumid,
    adicX,
    x: [est.T, ...est.c],
    dt,
  })
  const T = x[0]
  const c = x.slice(1)
  const licorEn = (j, vol) => ({ v: vol, T: T[j], c: c.map((ck) => ck[j]) })

  // 6. Lo que salió del licor libre.
  const extraidos = {}
  ent.extracciones.forEach((e, q) => { extraidos[e.id] = licorEn(e.j, hid.extr[q].v) })
  const cierre = licorEn(hid.celdaCierre, hid.cierre)
  const licorFondo = licorEn(n - 1, hid.salidaFondo)
  // Penetración: cada porción recibe su parte del licor penetrado en su celda.
  col.solapes.forEach((s, q) => {
    if (demanda[q] <= 0 || pen[s.j] <= 0) return
    const vol = hid.pen[s.j] * (demanda[q] / pen[s.j])
    if (vol <= 0) return
    const par = est.parcelas[s.i]
    const cPar = capacidadParcela(par, fis)
    const cLic = vol * fis.rcpLicor
    par.T = (par.T * cPar + T[s.j] * cLic) / (cPar + cLic)
    for (let k = 0; k < nEsp; k++) par.cr[k] = (par.cr[k] * par.vr + c[k][s.j] * vol) / (par.vr + vol)
    par.vr += vol
  })

  // 7. Intercambio libre ↔ retenido, celda por celda.
  intercambiar(v, est.parcelas, col.solapes, hid.vNueva, T, c, dt, iOH)

  // 8. Pérdidas al ambiente (solo licor libre; el calor de las astillas se
  //    equilibra con él en el intercambio).
  let perdidas = 0
  for (let j = 0; j < n; j++) {
    const C = hid.vNueva[j] * fis.rcpLicor
    if (C <= 0) continue
    const ua = (v.UA * geom.V[j]) / geom.volumenTotal
    const tN = v.tAmb + (T[j] - v.tAmb) * Math.exp((-ua * dt) / C)
    perdidas += C * (T[j] - tN)
    T[j] = tN
  }

  est.vf = hid.vNueva
  est.T = T
  est.c = c
  est.flujo = hid.flujo
  const af = 1 - Math.exp(-dt / v.compactacion.tau)
  est.flujoFiltrado = est.flujoFiltrado ? est.flujoFiltrado.map((x, i) => x + (hid.flujo[i] - x) * af) : hid.flujo.slice()

  return {
    extraidos,
    cierre,
    fondo: { licor: licorFondo, parcelas: parcelasFondo },
    perdidas,
    nivelAstillas: col.nivel,
    lleno: hid.lleno,
    rebalseColumna: col.rebalse,
    residuoHidraulico: hid.residuo,
    flujo: hid.flujo,
    solapes: col.solapes,
    exceso: hid.exceso,
    // Tasas para la integración rápida de la presión (m³/s).
    tasaPenetracion: hid.pen.reduce((s, x) => s + x, 0) / dt,
    volumenLiquido: hid.vNueva.reduce((s, x) => s + x, 0) + est.parcelas.reduce((s, q) => s + q.vr, 0),
  }
}

/**
 * Intercambio de calor y especies entre el licor libre y las parcelas.
 * Es la misma solución implícita de intercambioEstrella(), escrita en línea
 * con arreglos numéricos porque es el cálculo más frecuente del simulador.
 */
function intercambiar(v, parcelas, solapes, vf, T, c, dt, iOH) {
  const { fis, dif } = v
  const n = vf.length
  const nEsp = c.length
  const nP = parcelas.length
  // Propiedades de cada parcela al inicio del intercambio.
  const capP = new Float64Array(nP)
  const kdP = new Float64Array(nP)
  for (let i = 0; i < nP; i++) {
    const par = parcelas[i]
    capP[i] = capacidadParcela(par, fis)
    kdP[i] = constanteDifusion(dif, par.T, par.cr[iOH], 1)
  }
  // Porciones agrupadas por celda (solo celdas con licor libre).
  const inicio = new Int32Array(n + 1)
  for (const s of solapes) if (vf[s.j] > 0) inicio[s.j + 1]++
  for (let j = 0; j < n; j++) inicio[j + 1] += inicio[j]
  const lleno = inicio.slice(0, n)
  const orden = new Array(inicio[n])
  for (const s of solapes) if (vf[s.j] > 0) orden[lleno[s.j]++] = s
  // Acumuladores por parcela: Σ f·x_nuevo sobre las porciones mojadas; la
  // fracción restante (celdas secas o sin ubicar) conserva su valor.
  const fMojada = new Float64Array(nP)
  const accT = new Float64Array(nP)
  const accC = new Float64Array(nP * nEsp)
  const aT = v.kCalor * dt
  const wT = aT / (1 + aT)

  for (let j = 0; j < n; j++) {
    const q0 = inicio[j]
    const q1 = inicio[j + 1]
    if (q1 === q0) continue
    // Calor.
    let num = vf[j] * fis.rcpLicor * T[j]
    let den = vf[j] * fis.rcpLicor
    for (let q = q0; q < q1; q++) {
      const s = orden[q]
      const C = s.f * capP[s.i] * wT
      num += C * parcelas[s.i].T
      den += C
    }
    const tf = num / den
    T[j] = tf
    for (let q = q0; q < q1; q++) {
      const s = orden[q]
      fMojada[s.i] += s.f
      accT[s.i] += (s.f * (parcelas[s.i].T + aT * tf)) / (1 + aT)
    }
    // Especies.
    for (let k = 0; k < nEsp; k++) {
      const fk = v.factorDifusion[k] * dt
      let numC = vf[j] * c[k][j]
      let denC = vf[j]
      for (let q = q0; q < q1; q++) {
        const s = orden[q]
        const a = kdP[s.i] * fk
        const w = (s.f * parcelas[s.i].vr * a) / (1 + a)
        numC += w * parcelas[s.i].cr[k]
        denC += w
      }
      const xf = numC / denC
      c[k][j] = xf
      for (let q = q0; q < q1; q++) {
        const s = orden[q]
        const a = kdP[s.i] * fk
        accC[s.i * nEsp + k] += (s.f * (parcelas[s.i].cr[k] + a * xf)) / (1 + a)
      }
    }
  }
  for (let i = 0; i < nP; i++) {
    if (fMojada[i] <= 0) continue
    const par = parcelas[i]
    const resto = 1 - fMojada[i]
    par.T = accT[i] + resto * par.T
    for (let k = 0; k < nEsp; k++) par.cr[k] = accC[i * nEsp + k] + resto * par.cr[k]
  }
}
