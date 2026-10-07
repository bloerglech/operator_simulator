// Válvulas de control y bombas.
//
// Válvula: caudal Q = Kv · f(x) · √(ΔP_válvula / 1 bar), con Kv en m³/s a 1 bar
// y característica lineal o de igual porcentaje. Si hay una malla en serie
// (resistencia lineal R, Pa·s/m³), la caída total es ΔP = R·Q + (Q/(Kv·f))²·1 bar
// y se resuelve la cuadrática. El actuador sigue al comando con un límite de
// velocidad (tiempo de carrera) y una constante de tiempo de primer orden.
// Bomba: factor de marcha (0–1) con detención y partida de primer orden, y
// reducción del caudal cerca de la presión de cierre (curva simplificada).

const BAR = 1e5

/** Fracción de caudal de la característica para la apertura x (0–1). */
export function caracteristica(x, tipo, rangeabilidad = 50) {
  const xc = Math.min(Math.max(x, 0), 1)
  if (tipo === 'igual_porcentaje') return xc <= 0 ? 0 : (rangeabilidad ** (xc - 1) - 1 / rangeabilidad * (1 - xc)) // 0 en x = 0
  return xc
}

/** Apertura necesaria para una fracción de caudal dada (inversa, para inicializar). */
export function aperturaPara(fraccion, tipo, rangeabilidad = 50) {
  let lo = 0
  let hi = 1
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2
    if (caracteristica(m, tipo, rangeabilidad) < fraccion) lo = m
    else hi = m
  }
  return (lo + hi) / 2
}

/**
 * Caudal (m³/s) por una válvula con malla en serie.
 * dP = presión aguas arriba − aguas abajo (Pa); R = resistencia de la malla (Pa·s/m³).
 */
export function caudalValvula(Kv, f, dP, R = 0) {
  if (dP <= 0 || f <= 0 || Kv <= 0) return 0
  const a = BAR / (Kv * f) ** 2 // Pa/(m³/s)²
  if (R <= 0) return Math.sqrt(dP / a)
  return (-R + Math.sqrt(R * R + 4 * a * dP)) / (2 * a)
}

/** Mueve el actuador de una válvula hacia su comando. */
export function moverValvula(val, cfg, dt) {
  if (val.pegada) return
  const objetivo = Math.min(Math.max(val.comando, 0), 1)
  const deseado = val.x + (objetivo - val.x) * (1 - Math.exp(-dt / Math.max(cfg.tau, 1e-6)))
  const maxPaso = dt / Math.max(cfg.carrera, 1e-6)
  val.x += Math.max(-maxPaso, Math.min(maxPaso, deseado - val.x))
}

/** Factor de marcha de una bomba (arranque y detención de primer orden). */
export function moverBomba(b, cfg, dt) {
  const objetivo = b.marcha ? 1 : 0
  b.f += (objetivo - b.f) * (1 - Math.exp(-dt / Math.max(cfg.tau, 1e-6)))
  if (Math.abs(b.f - objetivo) < 1e-6) b.f = objetivo
}

/** Reducción de caudal de una bomba que descarga a la presión P (Pa abs). */
export function factorPresionBomba(cfg, P) {
  if (!cfg.Pcierre) return 1
  return Math.min(1, Math.max(0, (cfg.Pcierre - P) / cfg.margen))
}
