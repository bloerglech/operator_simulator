// Formato de números, tiempos y unidades para las pantallas.

export function num(x, decimales = 1) {
  if (x === null || x === undefined || !Number.isFinite(x)) return '—'
  return x.toLocaleString('es-CL', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
}

/** Tiempo simulado: "D2 07:15:30" (día de operación y hora). */
export function reloj(t) {
  const dia = Math.floor(t / 86400) + 1
  const r = t % 86400
  const hh = String(Math.floor(r / 3600)).padStart(2, '0')
  const mm = String(Math.floor((r % 3600) / 60)).padStart(2, '0')
  const ss = String(Math.floor(r % 60)).padStart(2, '0')
  return `D${dia} ${hh}:${mm}:${ss}`
}

/** Hora corta "07:15". */
export function hora(t) {
  const r = t % 86400
  return `${String(Math.floor(r / 3600)).padStart(2, '0')}:${String(Math.floor((r % 3600) / 60)).padStart(2, '0')}`
}

/** Decimales razonables según el rango del instrumento. */
export function decimalesPara(rango) {
  const span = Math.abs(rango[1] - rango[0])
  if (span <= 3) return 2
  if (span <= 60) return 1
  return span <= 600 ? 1 : 0
}
