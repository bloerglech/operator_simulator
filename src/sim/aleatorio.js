// Generador aleatorio determinista con semilla (xoshiro128**).
//
// Cada subsistema (ruido de instrumentos, eventos, laboratorio…) usa su propio
// flujo, derivado de la semilla global y de un nombre. Así, agregar un
// transmisor no altera la secuencia de eventos. El estado es un arreglo de
// cuatro enteros de 32 bits y se guarda tal cual.

/** Hash de 32 bits de un texto (FNV-1a). */
function hashTexto(texto) {
  let h = 0x811c9dc5
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

/** splitmix32: expande una semilla de 32 bits en una secuencia para inicializar. */
function splitmix32(a) {
  return () => {
    a = (a + 0x9e3779b9) >>> 0
    let z = a
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0
    return (z ^ (z >>> 16)) >>> 0
  }
}

/** Estado inicial de un flujo a partir de la semilla global y un nombre. */
export function estadoInicial(semilla, nombre) {
  const sm = splitmix32((hashTexto(nombre) ^ (semilla >>> 0)) >>> 0)
  const s = [sm(), sm(), sm(), sm()]
  if ((s[0] | s[1] | s[2] | s[3]) === 0) s[0] = 1
  return s
}

const rotl = (x, k) => ((x << k) | (x >>> (32 - k))) >>> 0

/** Avanza el estado (lo modifica) y devuelve un entero de 32 bits sin signo. */
export function siguienteEntero(s) {
  const r = Math.imul(rotl(Math.imul(s[1], 5) >>> 0, 7), 9) >>> 0
  const t = (s[1] << 9) >>> 0
  s[2] = (s[2] ^ s[0]) >>> 0
  s[3] = (s[3] ^ s[1]) >>> 0
  s[1] = (s[1] ^ s[2]) >>> 0
  s[0] = (s[0] ^ s[3]) >>> 0
  s[2] = (s[2] ^ t) >>> 0
  s[3] = rotl(s[3], 11)
  return r
}

/** Uniforme en [0, 1). */
export function uniforme(s) {
  return siguienteEntero(s) / 4294967296
}

/** Normal estándar (Box–Muller, sin guardar el segundo valor para que el estado sea solo `s`). */
export function normal(s) {
  let u = uniforme(s)
  while (u <= 0) u = uniforme(s)
  const v = uniforme(s)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
