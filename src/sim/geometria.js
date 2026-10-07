// Geometría de un vaso dividido en celdas de igual altura.
//
// El vaso se describe por tramos desde el tope: [{altura, diametro}, …]
// (permite vasos cónicos o escalonados). Las alturas `z` se miden desde el
// tope hacia abajo; la celda 0 es la superior.
// Para la columna de astillas se usa además la coordenada "volumen desde el
// fondo" (la columna se apila desde abajo).

/** Construye la geometría de celdas a partir de los tramos (m) y el número de celdas. */
export function crearGeometria(tramos, nCeldas) {
  const altura = tramos.reduce((s, t) => s + t.altura, 0)
  const dz = altura / nCeldas
  const V = new Array(nCeldas).fill(0)
  // Integra el área de cada tramo sobre la parte de la celda que le corresponde.
  let zTramo = 0
  for (const t of tramos) {
    const area = (Math.PI * t.diametro * t.diametro) / 4
    const z0 = zTramo
    const z1 = zTramo + t.altura
    for (let j = 0; j < nCeldas; j++) {
      const a = Math.max(z0, j * dz)
      const b = Math.min(z1, (j + 1) * dz)
      if (b > a) V[j] += area * (b - a)
    }
    zTramo = z1
  }
  const A = V.map((v) => v / dz)
  // volBajo[j]: volumen de las celdas bajo la celda j (coordenada desde el fondo).
  const volBajo = new Array(nCeldas).fill(0)
  for (let j = nCeldas - 2; j >= 0; j--) volBajo[j] = volBajo[j + 1] + V[j + 1]
  const volumenTotal = V.reduce((s, v) => s + v, 0)
  return { n: nCeldas, altura, dz, V, A, volBajo, volumenTotal }
}

/** Índice de la celda que contiene la altura z (m desde el tope). */
export function celdaDeAltura(geom, z) {
  const j = Math.floor(z / geom.dz)
  return Math.min(geom.n - 1, Math.max(0, j))
}

/** Altura sobre el fondo (m) correspondiente a un volumen acumulado desde el fondo. */
export function alturaDesdeFondo(geom, vol) {
  if (vol <= 0) return 0
  let h = 0
  let resto = vol
  for (let j = geom.n - 1; j >= 0; j--) {
    if (resto <= geom.V[j]) return h + resto / geom.A[j]
    resto -= geom.V[j]
    h += geom.dz
  }
  // Por sobre el tope: se extrapola con el área de la celda superior.
  return h + resto / geom.A[0]
}
