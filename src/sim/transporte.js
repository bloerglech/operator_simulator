// Transporte del licor libre entre celdas: volúmenes finitos, esquema contra
// la corriente implícito (Euler hacia atrás).
//
// Es conservativo, no genera concentraciones negativas (matriz M) y es estable
// con cualquier paso de tiempo y con celdas casi vacías. Las extracciones y
// sumideros salen con la concentración nueva de su celda, así que lo que sale
// se calcula después de resolver y el balance cierra exactamente.

/**
 * Resuelve un sistema tridiagonal para varios lados derechos (algoritmo de Thomas).
 * a: subdiagonal (a[0] no se usa), b: diagonal, c: superdiagonal (c[n-1] no se usa),
 * d: arreglo de lados derechos, cada uno de largo n. Devuelve las soluciones.
 */
export function resolverTridiagonal(a, b, c, d) {
  const n = b.length
  const cp = new Array(n)
  const den = new Array(n)
  den[0] = b[0]
  cp[0] = c[0] / den[0]
  for (let i = 1; i < n; i++) {
    den[i] = b[i] - a[i] * cp[i - 1]
    cp[i] = c[i] / den[i]
  }
  return d.map((rhs) => {
    const x = new Array(n)
    x[0] = rhs[0] / den[0]
    for (let i = 1; i < n; i++) x[i] = (rhs[i] - a[i] * x[i - 1]) / den[i]
    for (let i = n - 2; i >= 0; i--) x[i] -= cp[i] * x[i + 1]
    return x
  })
}

/**
 * Avanza los escalares del licor libre (temperatura y concentraciones).
 * @param e
 *   vAnt[j], vNueva[j]  volúmenes de licor libre (m³)
 *   flujo[n+1]          caudal por cara (m³/s, + hacia abajo; cara 0 = tope, n = fondo)
 *   sumid[j]            volumen que sale de la celda j por extracción o penetración (m³)
 *   adicV[j]            volumen que entra a la celda j (m³)
 *   adicX[j][s]         contenido que entra (volumen × escalar s)
 *   x[s][j]             escalares al inicio del paso
 *   dt
 * @returns x nuevo [s][j]
 */
export function transportarLicor(e) {
  const n = e.vNueva.length
  const nS = e.x.length
  const a = new Array(n).fill(0)
  const b = new Array(n).fill(0)
  const c = new Array(n).fill(0)
  const fijo = new Array(n).fill(false)
  for (let j = 0; j < n; j++) {
    const fa = e.flujo[j]
    const fb = e.flujo[j + 1]
    b[j] = e.vNueva[j] + e.dt * (Math.max(-fa, 0) + Math.max(fb, 0)) + e.sumid[j]
    a[j] = j > 0 ? -e.dt * Math.max(fa, 0) : 0
    c[j] = j < n - 1 ? -e.dt * Math.max(-fb, 0) : 0
    if (b[j] < 1e-12) {
      // Celda seca sin salidas: conserva su valor y no se acopla a sus vecinas.
      fijo[j] = true
      b[j] = 1; a[j] = 0; c[j] = 0
    }
  }
  const d = []
  for (let s = 0; s < nS; s++) {
    const rhs = new Array(n)
    for (let j = 0; j < n; j++) {
      rhs[j] = fijo[j] ? e.x[s][j] : e.vAnt[j] * e.x[s][j] + e.adicX[j][s]
    }
    d.push(rhs)
  }
  return resolverTridiagonal(a, b, c, d)
}
