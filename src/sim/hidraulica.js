// Balance hidráulico del licor libre de un vaso en un paso de tiempo.
//
// El licor libre ocupa el espacio entre astillas (y todo el volumen sobre la
// columna). Se llena desde el fondo: si el vaso no está lleno hay un espacio
// de gas arriba. Con el vaso lleno, el exceso sale por la corriente de cierre
// (en la Fase 1c esto lo reemplaza el balance de presión).
// Con los volúmenes nuevos de cada celda se calcula el caudal a través de cada
// cara (positivo hacia abajo): así el sentido del flujo en cada zona
// (cocorriente o contracorriente) resulta del balance y no se impone.

const EPS = 1e-12

/**
 * @param {object} e
 *   cap[j]      capacidad de licor libre de cada celda (m³)
 *   vAnt[j]     licor libre al inicio del paso (m³)
 *   adic[j]     volumen que entra a cada celda en el paso (m³)
 *   extr        [{ j, v }] extracciones solicitadas (m³ en el paso)
 *   pen[j]      licor que penetra las astillas en cada celda (m³ solicitado)
 *   salidaFondo volumen de licor libre solicitado por el fondo (m³)
 *   celdaCierre celda de la corriente de cierre (o null: rebalse por el tope)
 *   dt          paso (s)
 * @returns { vNueva, flujo[n+1] (m³/s por cara, 0 = tope), extr[] (m³ reales),
 *            pen[], salidaFondo, cierre, adic[] (redistribuidas), sup (celda que recibe
 *            lo que cae por celdas secas), lleno, residuo }
 */
export function balanceHidraulico(e) {
  const n = e.cap.length
  const vAntTotal = suma(e.vAnt)
  const adic = e.adic.slice()
  const adicTotal = suma(adic)

  // Solicitudes limitadas por disponibilidad local.
  const extr = e.extr.map((x) => ({ j: x.j, v: e.vAnt[x.j] > EPS ? Math.max(0, x.v) : 0 }))
  const pen = e.pen.map((v, j) => Math.min(Math.max(0, v), e.vAnt[j]))
  let salidaFondo = Math.max(0, e.salidaFondo)

  // Si se pide sacar más de lo que hay, se escala todo proporcionalmente.
  const salidas = suma(extr.map((x) => x.v)) + suma(pen) + salidaFondo
  const disponible = vAntTotal + adicTotal
  if (salidas > disponible && salidas > 0) {
    const k = disponible / salidas
    extr.forEach((x) => { x.v *= k })
    for (let j = 0; j < n; j++) pen[j] *= k
    salidaFondo *= k
  }

  let vTotal = vAntTotal + adicTotal - suma(extr.map((x) => x.v)) - suma(pen) - salidaFondo
  vTotal = Math.max(0, vTotal)
  const capTotal = suma(e.cap)
  let cierre = 0
  let lleno = false
  if (vTotal >= capTotal - EPS) {
    cierre = Math.max(0, vTotal - capTotal)
    vTotal = capTotal
    lleno = true
  }

  // Llenado desde el fondo.
  const vNueva = new Array(n).fill(0)
  let resto = vTotal
  for (let j = n - 1; j >= 0 && resto > 0; j--) {
    const v = Math.min(e.cap[j], resto)
    vNueva[j] = v
    resto -= v
  }
  if (lleno) for (let j = 0; j < n; j++) vNueva[j] = e.cap[j]

  // La corriente de cierre (o el rebalse) sale de su celda.
  const jCierre = e.celdaCierre ?? 0
  const sumid = new Array(n).fill(0)
  for (const x of extr) sumid[x.j] += x.v
  for (let j = 0; j < n; j++) sumid[j] += pen[j]
  sumid[jCierre] += cierre

  // Lo que entra en celdas secas cae hasta la superficie del licor.
  let sup = -1
  for (let j = 0; j < n; j++) if (vNueva[j] > EPS || e.vAnt[j] > EPS || sumid[j] > 0) { sup = j; break }
  if (sup < 0) sup = n - 1
  for (let j = 0; j < sup; j++) {
    adic[sup] += adic[j]
    adic[j] = 0
  }

  // Caudales por cara, de arriba hacia abajo.
  const flujo = new Array(n + 1).fill(0)
  for (let j = 0; j < n; j++) {
    flujo[j + 1] = flujo[j] + (adic[j] - sumid[j] - (vNueva[j] - e.vAnt[j])) / e.dt
  }
  // Cierre exacto con la salida de fondo (elimina el error de redondeo).
  const residuo = flujo[n] - salidaFondo / e.dt
  flujo[n] = salidaFondo / e.dt

  return { vNueva, flujo, extr, pen, salidaFondo, cierre, celdaCierre: jCierre, adic, sup, lleno, residuo }
}

function suma(a) {
  let s = 0
  for (const x of a) s += x
  return s
}
