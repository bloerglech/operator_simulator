// Columna de astillas: pila de parcelas lagrangianas en un vaso.
//
// Las parcelas se apilan desde el fondo (índice 0 = la más baja). Cada parcela
// ocupa un volumen de vaso vol/sCol, donde sCol es la fracción del volumen del
// vaso ocupada por astillas (incluidos sus poros). Retirar masa por el fondo
// hace bajar toda la columna: flujo pistón exacto, sin dispersión numérica y
// con la columna detenida si no se retira nada.

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
    if (tope && tope.m < masaObjetivo) fundirParcela(tope, nueva, fis)
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
export function ubicarColumna(parcelas, geom, sCol) {
  const solapes = []
  const volAstilla = new Array(geom.n).fill(0)
  let base = 0 // volumen de vaso desde el fondo
  let j = geom.n - 1 // celda actual, empezando por la inferior
  for (let i = 0; i < parcelas.length; i++) {
    const par = parcelas[i]
    const vVaso = par.vol / sCol
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
