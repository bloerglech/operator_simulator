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
//   Campos cinéticos (Fase 1b, ver cinetica.js):
//   m0    masa de madera seca original (kg)      s     componentes sólidos (kg)
//   M     MeGlcA (mol)   HexA  ácidos hexenurónicos (mol)   Rp  lignina reprecipitada (kg)
//   invDP 1/DP de la celulosa   reac  reactividad del lote   vap  calidad de vaporización
//   phi   fracción no impregnada por clase de tamaño
//   phiIni  phi al alcanzar la temperatura de cocción (−1 si aún no la alcanza)
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
  const c = { ...par, cr: par.cr.slice() }
  if (par.s) {
    c.s = par.s.slice()
    c.phi = par.phi.slice()
    c.phiIni = par.phiIni.slice()
  }
  return c
}

/** Campos extensivos (proporcionales a la cantidad de astilla). */
const EXTENSIVOS = ['m', 'vol', 'vp', 'vr', 'm0', 'M', 'HexA', 'Rp']

function escalar(par, f) {
  for (const k of EXTENSIVOS) if (par[k] !== undefined) par[k] *= f
  if (par.s) for (let i = 0; i < par.s.length; i++) par.s[i] *= f
}

/** Separa una fracción f de la parcela: devuelve la parte separada y reduce el original. */
export function partirParcela(par, f) {
  const parte = clonarParcela(par)
  escalar(parte, f)
  escalar(par, 1 - f)
  return parte
}

/** Promedio ponderado de un campo intensivo. */
const pond = (xa, wa, xb, wb) => (wa + wb > 0 ? (xa * wa + xb * wb) / (wa + wb) : xa)

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
  if (a.s && b.s) {
    // 1/DP se promedia con la masa de celulosa (promedio en número de cadenas).
    const celA = a.s[3] + a.s[4]
    const celB = b.s[3] + b.s[4]
    a.invDP = pond(a.invDP, celA, b.invDP, celB)
    a.reac = pond(a.reac, a.m0, b.reac, b.m0)
    a.vap = pond(a.vap, a.m0, b.vap, b.m0)
    for (let i = 0; i < a.phi.length; i++) {
      // Si solo una de las dos alcanzó la temperatura de cocción, la otra aporta su phi actual.
      const ia = a.phiIni[i] >= 0 ? a.phiIni[i] : a.phi[i]
      const ib = b.phiIni[i] >= 0 ? b.phiIni[i] : b.phi[i]
      const algunaIni = a.phiIni[i] >= 0 || b.phiIni[i] >= 0
      a.phiIni[i] = algunaIni ? pond(ia, a.m0, ib, b.m0) : -1
      a.phi[i] = pond(a.phi[i], a.m0, b.phi[i], b.m0)
    }
    for (let i = 0; i < a.s.length; i++) a.s[i] += b.s[i]
    a.m0 += b.m0; a.M += b.M; a.HexA += b.HexA; a.Rp += b.Rp
  }
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
