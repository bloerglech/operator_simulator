// Historial de tendencias: una muestra de cada serie cada `periodo` segundos
// simulados, en búferes circulares (Float32Array) con capacidad fija.
// Series: el valor de cada transmisor (por su tag) y, para cada lazo,
// "<tag>.sp" y "<tag>.out". Sin DOM: se usa dentro del worker y en pruebas.

export function crearHistorial({ periodo = 5, horas = 8 } = {}) {
  const capacidad = Math.ceil((horas * 3600) / periodo)
  const series = new Map()
  const tiempos = new Float64Array(capacidad)
  let n = 0 // muestras guardadas (hasta capacidad)
  let i0 = 0 // índice de la más antigua
  let proxima = null // tiempo de la próxima muestra

  function serie(nombre) {
    let s = series.get(nombre)
    if (!s) {
      s = new Float32Array(capacidad).fill(NaN)
      series.set(nombre, s)
    }
    return s
  }

  /** true si en el tiempo t (s simulados) corresponde una muestra. */
  const toca = (t) => proxima === null || t >= proxima - 1e-9
  /** Segundos que faltan para la próxima muestra. */
  const falta = (t) => (proxima === null ? 0 : Math.max(0, proxima - t))

  /** Agrega una muestra si corresponde. */
  function muestrear(t, control) {
    if (!toca(t)) return false
    proxima = Math.floor(t / periodo + 1e-9) * periodo + periodo
    const k = (i0 + n) % capacidad
    if (n < capacidad) n++
    else i0 = (i0 + 1) % capacidad
    tiempos[k] = t
    for (const [tag, x] of Object.entries(control.transmisores)) serie(tag)[k] = x.valor
    for (const [tag, l] of Object.entries(control.lazos)) {
      serie(`${tag}.sp`)[k] = l.sp
      serie(`${tag}.out`)[k] = l.salida
    }
    return true
  }

  /** Datos de las series pedidas entre t0 y t1 (s), reducidos a lo más `max` puntos. */
  function consultar(nombres, t0 = -Infinity, t1 = Infinity, max = 600) {
    const idx = []
    for (let j = 0; j < n; j++) {
      const k = (i0 + j) % capacidad
      if (tiempos[k] >= t0 && tiempos[k] <= t1) idx.push(k)
    }
    const paso = Math.max(1, Math.ceil(idx.length / max))
    const sel = idx.filter((_, j) => j % paso === 0 || j === idx.length - 1)
    const datos = {}
    for (const nombre of nombres) {
      const s = series.get(nombre)
      datos[nombre] = sel.map((k) => (s && Number.isFinite(s[k]) ? s[k] : null))
    }
    return { t: sel.map((k) => tiempos[k]), datos }
  }

  function reiniciar() {
    n = 0
    i0 = 0
    proxima = null
    series.clear()
  }

  return { toca, falta, muestrear, consultar, reiniciar, periodo, capacidad, cantidad: () => n }
}
