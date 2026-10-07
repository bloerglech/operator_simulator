// Utilidades para correr la planta hasta estado estacionario (calibración y pruebas).

/** Indicadores que se comparan para decidir si se llegó al estado estacionario. */
export function indicadoresCalidad(planta) {
  const k = planta.leerEstado().kpi
  return {
    kappa: k.kappa,
    kappaHexA: k.kappaHexA,
    rendimiento: k.rendimiento * 100, // %
    viscosidad: k.viscosidad, // mL/g
    alcaliExtraccion: k.extracciones.ext_principal.alcali * 40, // g/L como NaOH
    alcaliSoplado: k.alcaliResidualSoplado * 40,
    rechazos: k.rechazos * 100, // % sobre pulpa
    H: k.HSoplado,
  }
}

/**
 * Avanza en bloques de 1 h hasta que el kappa y el rendimiento del soplado
 * cambien menos que la tolerancia en una hora (mínimo `minHoras`).
 * Devuelve los indicadores finales y las horas simuladas.
 */
export function correrHastaEstacionario(planta, { minHoras = 6, maxHoras = 30, tolKappa = 0.05, tolRend = 0.02 } = {}) {
  let anterior = null
  for (let h = 1; h <= maxHoras; h++) {
    planta.avanzar(3600)
    const k = indicadoresCalidad(planta)
    if (h >= minHoras && anterior &&
        Math.abs(k.kappa - anterior.kappa) < tolKappa &&
        Math.abs(k.rendimiento - anterior.rendimiento) < tolRend) {
      return { ...k, horas: h }
    }
    anterior = k
  }
  return { ...indicadoresCalidad(planta), horas: maxHoras, noConvergio: true }
}
