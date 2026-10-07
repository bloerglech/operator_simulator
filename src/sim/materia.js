// Estructuras de materia que se mueven por la planta y sus operaciones
// conservativas (mezclar y dividir conservan masa, especies y energía).
//
// Licor:   { v (m³), T (°C), c: [concentración por especie] }
// Parcela: porción de astillas que se mueve en flujo pistón (lagrangiana).
//   m     masa de madera seca (kg)
//   vol   volumen de astilla, incluidos los poros (m³)
//   vp    volumen de poros (m³)
//   vr    licor retenido en los poros (m³), vr ≤ vp
//   T     temperatura de la astilla y su licor retenido (°C)
//   cr    concentraciones del licor retenido
//   H     factor H acumulado (h)
//   edad  tiempo desde que entró al sistema (s)
//   marca trazador de sólido (adimensional, para medir tiempos muertos)
// Paquete: licor + lista de parcelas (lo que viaja por una tubería).
//
// Propiedades térmicas: `fis` = { cpMadera kJ/(kg·K), rcpLicor kJ/(m³·K) }.

export function licorVacio(nEsp) {
  return { v: 0, T: 0, c: new Array(nEsp).fill(0) }
}

/** Mezcla en `dest` un volumen v de licor a temperatura T y concentraciones c. */
export function sumarLicor(dest, v, T, c) {
  if (v <= 0) return
  const vt = dest.v + v
  for (let k = 0; k < dest.c.length; k++) dest.c[k] = (dest.c[k] * dest.v + c[k] * v) / vt
  dest.T = (dest.T * dest.v + T * v) / vt // ρ·cp del licor constante (supuesto S-12)
  dest.v = vt
}

/** Capacidad calorífica de una parcela (kJ/K). */
export function capacidadParcela(par, fis) {
  return par.m * fis.cpMadera + par.vr * fis.rcpLicor
}

export function clonarParcela(par) {
  return { ...par, cr: par.cr.slice() }
}

/** Separa una fracción f de la parcela: devuelve la parte separada y reduce el original. */
export function partirParcela(par, f) {
  const parte = clonarParcela(par)
  parte.m *= f; parte.vol *= f; parte.vp *= f; parte.vr *= f
  const r = 1 - f
  par.m *= r; par.vol *= r; par.vp *= r; par.vr *= r
  return parte
}

/** Funde la parcela b dentro de a (b deja de existir). */
export function fundirParcela(a, b, fis) {
  const m = a.m + b.m
  if (m <= 0) return
  const ca = capacidadParcela(a, fis)
  const cb = capacidadParcela(b, fis)
  if (ca + cb > 0) a.T = (a.T * ca + b.T * cb) / (ca + cb)
  const vr = a.vr + b.vr
  if (vr > 0) for (let k = 0; k < a.cr.length; k++) a.cr[k] = (a.cr[k] * a.vr + b.cr[k] * b.vr) / vr
  a.H = (a.H * a.m + b.H * b.m) / m
  a.edad = (a.edad * a.m + b.edad * b.m) / m
  a.marca = (a.marca * a.m + b.marca * b.m) / m
  a.m = m; a.vol += b.vol; a.vp += b.vp; a.vr = vr
}

export function paqueteVacio(nEsp) {
  return { licor: licorVacio(nEsp), parcelas: [] }
}

/** Volumen que ocupa un paquete en una tubería (licor + astillas). */
export function volumenPaquete(paq) {
  let v = paq.licor.v
  for (const par of paq.parcelas) v += par.vol
  return v
}

/** Agrega el contenido de `src` a `dest`. */
export function sumarPaquete(dest, src) {
  sumarLicor(dest.licor, src.licor.v, src.licor.T, src.licor.c)
  for (const par of src.parcelas) dest.parcelas.push(par)
}

/** Separa una fracción f de un paquete (devuelve la parte; reduce el original). */
export function partirPaquete(paq, f) {
  const parte = {
    licor: { v: paq.licor.v * f, T: paq.licor.T, c: paq.licor.c.slice() },
    parcelas: paq.parcelas.map((par) => partirParcela(par, f)),
  }
  paq.licor.v *= 1 - f
  return parte
}
