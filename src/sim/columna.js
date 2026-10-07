// Columna de astillas: pila de parcelas lagrangianas en un vaso.
//
// Las parcelas se apilan desde el fondo (índice 0 = la más baja). Cada parcela
// ocupa un volumen de vaso vol/s, donde s es la fracción del volumen del vaso
// ocupada por astillas (incluidos sus poros). s depende de la compactación
// (parcela.sc, ver compactar()). Retirar masa por el fondo hace bajar toda la
// columna: flujo pistón exacto, sin dispersión numérica y con la columna
// detenida si no se retira nada.
//
// Colgamiento: las parcelas marcadas `colgada` no bajan (las sostiene la
// fricción con la pared). Lo que se retira por el fondo deja un hueco de
// licor bajo ellas; al soltarse, el hueco desaparece y la columna cae.

import { alturaDesdeFondo } from './geometria.js'
import { fundirParcela, partirParcela } from './materia.js'

/**
 * Retira por el fondo astillas equivalentes a `masa` kg de madera original
 * (base madera alimentada, m0). Como el volumen de la astilla no cambia al
 * cocinarse, esto equivale a retirar un volumen fijo de columna: el nivel no
 * depende del rendimiento. Devuelve las porciones retiradas.
 */
export function retirarFondo(parcelas, masa) {
  const retiradas = []
  let resto = masa
  while (resto > 1e-9 && parcelas.length > 0) {
    const par = parcelas[0]
    if (par.colgada) break // la columna colgada no baja: no hay astillas en el fondo
    const m0 = par.m0 ?? par.m
    if (m0 <= resto * (1 + 1e-12)) {
      retiradas.push(par)
      parcelas.shift()
      resto -= m0
    } else {
      retiradas.push(partirParcela(par, resto / m0))
      resto = 0
    }
  }
  return retiradas
}

/**
 * Agrega parcelas sobre el tope de la columna. Si la parcela superior aún no
 * alcanza la masa objetivo, la nueva se funde con ella (limita el número de
 * parcelas; la resolución queda en una fracción de celda).
 */
export function agregarTope(parcelas, nuevas, masaObjetivo, fis) {
  for (const nueva of nuevas) {
    if (nueva.m <= 0) continue
    const tope = parcelas[parcelas.length - 1]
    // Lo que cae sobre una columna colgada también queda colgado.
    if (tope?.colgada) nueva.colgada = true
    if (tope && tope.m < masaObjetivo && !!tope.colgada === !!nueva.colgada) fundirParcela(tope, nueva, fis)
    else parcelas.push(nueva)
  }
}

/**
 * Ubica las parcelas en las celdas del vaso.
 * Devuelve:
 *  - solapes: lista de { i (parcela), j (celda), f (fracción de la parcela en la celda) }
 *  - volAstilla[j]: volumen de astillas (con poros) en cada celda
 *  - nivel: altura del tope de la columna sobre el fondo (m)
 *  - rebalse: volumen de columna que no cabe en el vaso (m³)
 */
export function ubicarColumna(parcelas, geom, sCol, hueco = 0) {
  const solapes = []
  const volAstilla = new Array(geom.n).fill(0)
  let base = 0 // volumen de vaso desde el fondo
  let j = geom.n - 1 // celda actual, empezando por la inferior
  let huecoPuesto = false
  for (let i = 0; i < parcelas.length; i++) {
    const par = parcelas[i]
    if (par.colgada && !huecoPuesto) {
      // El hueco bajo la parte colgada queda lleno de licor.
      base += hueco
      huecoPuesto = true
      while (j >= 0 && base >= geom.volBajo[j] + geom.V[j] - 1e-12) j--
    }
    const vVaso = par.vol / (par.sc ?? sCol)
    if (vVaso <= 0) continue
    const tope = base + vVaso
    let a = base
    while (a < tope - 1e-12) {
      if (j < 0) {
        // Por sobre el tope del vaso: se asigna a la celda superior.
        const f = (tope - a) / vVaso
        solapes.push({ i, j: 0, f })
        volAstilla[0] += f * par.vol
        break
      }
      const finCelda = geom.volBajo[j] + geom.V[j]
      const b = Math.min(tope, finCelda)
      const f = (b - a) / vVaso
      if (f > 0) {
        solapes.push({ i, j, f })
        volAstilla[j] += f * par.vol
      }
      a = b
      if (b >= finCelda - 1e-12) j--
    }
    base = tope
  }
  const rebalse = Math.max(0, base - geom.volumenTotal)
  return { solapes, volAstilla, nivel: alturaDesdeFondo(geom, base), rebalse, volColumna: base }
}

/**
 * Compactación de la columna (Janssen). Recorre la pila desde el tope:
 *   dσ/dz = γ − σ/λ,   λ = D/(4·μK)
 * γ: peso sumergido de la columna por m³ más el arrastre del licor (positivo
 * hacia abajo en cocorriente, negativo en contracorriente); λ: longitud de
 * Janssen (la fricción con la pared sostiene parte del peso). La fracción de
 * astillas de cada parcela crece con la cocción (astillas blandas) y con el
 * esfuerzo:  s = s0·(1 + c_κ·(1 − κ/κ0))·(1 + c_σ·σ/(σ + σ_ref)).
 * s se acerca a ese valor con la constante de tiempo cmp.tau (la columna no
 * se compacta instantáneamente) y el arrastre usa el caudal de licor filtrado;
 * sin esto, compactación e hidráulica se realimentan paso a paso.
 * Guarda s en parcela.sc y el esfuerzo en parcela.sigma. Devuelve el esfuerzo
 * sobre el raspador (Pa).
 */
export function compactar(parcelas, geom, cmp, flujo, ligPorKappa, densidadLicor, densidadPared) {
  const n = parcelas.length
  if (n === 0) return 0
  // Ubicación con la compactación anterior para conocer el área y el caudal de licor.
  const ubic = ubicarColumna(parcelas, geom, cmp.sIni, cmp.hueco ?? 0)
  const celda = new Array(n).fill(geom.n - 1)
  for (const s of ubic.solapes) celda[s.i] = s.j // queda la celda más alta de cada parcela
  const g = 9.80665
  let sigma = 0
  for (let i = n - 1; i >= 0; i--) {
    const par = parcelas[i]
    if (i < n - 1 && parcelas[i + 1].colgada && !par.colgada) sigma = 0 // bajo el hueco
    const A = geom.A[celda[i]]
    const D = Math.sqrt((4 * A) / Math.PI)
    const lambda = D / (4 * cmp.muK * (cmp.friccion ?? 1))
    const vVaso = par.vol / (par.sc ?? cmp.sIni)
    const dz = vVaso / A
    const qLicor = (flujo?.[celda[i] + 1] ?? 0) / A // m/s, + hacia abajo
    const gamma = (par.m * (1 - densidadLicor / densidadPared) * g) / vVaso + cmp.kArrastre * qLicor
    const e = Math.exp(-dz / lambda)
    const sigmaNuevo = Math.max(0, sigma * e + gamma * lambda * (1 - e))
    par.sigma = 0.5 * (sigma + sigmaNuevo)
    sigma = sigmaNuevo
    const kappa = par.s ? (par.s[0] + par.s[1] + par.s[2]) / par.m / ligPorKappa : cmp.kappa0
    const fk = 1 + cmp.cKappa * Math.max(0, 1 - kappa / cmp.kappa0)
    const fs = 1 + cmp.cSigma * (par.sigma / (par.sigma + cmp.sigmaRef))
    const objetivo = Math.min(cmp.sMax, cmp.s0 * fk * fs)
    const actual = par.sc ?? cmp.sIni
    par.sc = actual + (objetivo - actual) * (1 - Math.exp(-cmp.dt / cmp.tau))
  }
  return sigma
}
