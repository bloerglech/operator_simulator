// Variables "verdaderas" del proceso que leen los transmisores.
//
// Cada variable se nombra con un texto corto y se resuelve, al construir el
// control, en una función (modelo, estado) → valor en unidades internas.
//   P:<vaso>                  presión del tope (Pa abs)
//   Q:<corriente>             caudal real (m³/s; en astillas y soplado, volumen de lechada)
//   Qsuma:<c1>,<c2>,…         suma de caudales reales
//   W:medidor                 caudal de astillas calculado con la densidad nominal (kg/s)
//   rpm:medidor               velocidad del medidor (rev/s)
//   T:corriente:<id>          temperatura de una corriente (°C)
//   T:calentador:<id>         temperatura de salida de un calentador (°C)
//   T:zona:<vaso>:<zona>      temperatura media del licor libre de una zona (°C)
//   T:silo                    temperatura de las astillas vaporizadas (°C)
//   L:astillas:<vaso>         nivel de astillas (m sobre el fondo)
//   L:flash:<id> · L:silo · L:estanque     niveles (fracción 0–1)
//   M:tubo                    astillas acumuladas en el tubo de astillas (kg)
//   EA:corriente:<id>         álcali efectivo de una corriente (mol/L)
//   kappa:soplado · Cs:soplado · H:soplado · FD · LW · prod
//   I:raspador:<vaso>         corriente del motor del raspador (A)
//   dP:malla:<id>             caída de presión de una malla (Pa)
//   vapor:<calentador>        vapor de un calentador (kg/s) · vapor:total
//   x:valvula:<id>            apertura de una válvula (0–1)
//   visc:soplado · rend:soplado · rech:soplado · humedad:astillas · densidad:astillas · finos:astillas
//   EAfuente:<fuente> (mol/L) · Sfuente:<fuente> (sulfidez, fracción)
//   Q:flash:<id>              salida de un ciclón flash (m³/s)

/** Devuelve la función que mide una variable. Lanza un error si el nombre no existe. */
export function resolverVariable(modelo, nombre) {
  const [tipo, a, b, c] = nombre.split(':')
  const zona = (vaso, id) => {
    const z = modelo.vasoPorId[vaso]?.zonas.find((x) => x.id === id)
    if (!z) throw new Error(`Zona desconocida en la variable "${nombre}"`)
    return z
  }
  const corriente = (id) => {
    if (!modelo.corrientePorId[id]) throw new Error(`Corriente desconocida en la variable "${nombre}"`)
    return id
  }
  const eq = modelo.equipos
  switch (tipo) {
    case 'P': return (m, e) => e.vasos[a].presion.P
    case 'Q':
      if (a === 'flash') return (m, e) => e.equipos.flash[b].salida
      corriente(a)
      return (m, e) => e.corrientes[a].caudalReal ?? 0
    case 'Qsuma': {
      const ids = a.split(',').map(corriente)
      return (m, e) => ids.reduce((s, id) => s + (e.corrientes[id].caudalReal ?? 0), 0)
    }
    case 'W': {
      // El medidor no sabe la densidad real del lote: usa la nominal.
      const kgRev = eq.medidor.Vrev * eq.medidor.eta * eq.medidor.sPila * modelo.densidadBasica
      return (m, e) => (e.ajustes.astillas?.velocidad ?? 0) * kgRev
    }
    case 'rpm': return (m, e) => e.ajustes.astillas?.velocidad ?? 0
    case 'T':
      if (a === 'corriente') { corriente(b); return (m, e) => e.corrientes[b].T }
      if (a === 'calentador') return (m, e) => e.equipos.calentadores[b].Tsalida
      if (a === 'silo') return (m, e) => e.equipos.silo.Tsalida
      if (a === 'zona') {
        const z = zona(b, c)
        return (m, e) => {
          const ev = e.vasos[b]
          let v = 0
          let s = 0
          for (const j of z.celdas) { v += ev.vf[j]; s += ev.vf[j] * ev.T[j] }
          return v > 0 ? s / v : ev.T[z.celdas[0]]
        }
      }
      break
    case 'L':
      if (a === 'astillas') return (m, e) => e.diag[b]?.nivelAstillas ?? 0
      if (a === 'flash') return (m, e) => e.equipos.flash[b].licor.v / eq.flash[b].V
      if (a === 'silo') return (m, e) => e.equipos.silo.masa / (eq.medidor.sPila * e.fuentes.astillas.densidad) / eq.silo.V
      if (a === 'estanque') {
        return (m, e) => {
          const t = e.equipos.estanque
          return (t.licor.v + t.parcelas.reduce((s, q) => s + q.vol, 0)) / eq.estanque.V
        }
      }
      break
    case 'M': return (m, e) => e.equipos.tubo.parcelas.reduce((s, q) => s + q.m0, 0)
    case 'EA':
      corriente(b)
      return (m, e) => e.corrientes[b].c?.[modelo.idx.OH] ?? 0
    // Si en el paso no salió pulpa (columna colgada) devuelve null: el
    // instrumento mantiene su último valor.
    case 'kappa': return (m, e) => e.diag.dig?.calidadSalida?.kappa ?? null
    case 'Cs': return (m, e) => {
      const d = e.diag.dig
      if (!d?.licorSalida) return 0
      const pulpa = d.maderaSalida * modelo.dtL
      const licor = d.licorSalida.v * modelo.fis.densidadLicor
      return pulpa + licor > 0 ? pulpa / (pulpa + licor) : 0
    }
    case 'H': return (m, e) => e.diag.dig?.HSalida ?? null
    case 'visc': return (m, e) => e.diag.dig?.calidadSalida?.viscosidad ?? null
    case 'rend': return (m, e) => e.diag.dig?.calidadSalida?.rendimiento ?? null
    case 'rech': return (m, e) => e.diag.dig?.calidadSalida?.rechazos ?? null
    case 'humedad': return (m, e) => e.fuentes.astillas.humedad
    case 'densidad': return (m, e) => e.fuentes.astillas.densidad
    case 'finos': return (m, e) => (modelo.cin.clases.find((k) => k.id === 'finos')?.w ?? 0) * (e.perturbaciones?.finos ?? 1)
    case 'EAfuente': return (m, e) => e.fuentes[a].c[modelo.idx.OH]
    case 'Sfuente': return (m, e) => {
      const oh = e.fuentes[a].c[modelo.idx.OH]
      const hs = e.fuentes[a].c[modelo.idx.HS]
      return oh + hs > 0 ? (2 * hs) / (oh + hs) : 0
    }
    case 'prod': return (m, e) => ((e.diag.dig?.maderaSalida ?? 0) * 86400) / 1000 / 0.9
    case 'FD': return (m, e) => {
      const d = e.diag.dig
      const prod = ((d?.maderaSalida ?? 0) * 86400) / 1000 / 0.9
      if (!d || prod <= 0) return 0
      const entra = (e.corrientes.fil_fondo?.caudalReal ?? 0) + (e.corrientes.dilucion?.caudalReal ?? 0)
      const licorPulpa = (e.corrientes.soplado?.caudalReal ?? 0) - d.maderaOriginalSalida / e.fuentes.astillas.densidad + d.retenidoSalida
      return (entra - licorPulpa) / (prod / 86400)
    }
    case 'LW': return (m, e) => {
      const as = e.fuentes.astillas
      const W = e.ajustes.astillas?.caudalMadera ?? 0
      if (W <= 0) return 0
      let q = (W * as.humedad) / (1 - as.humedad) / 1000
      for (const cc of modelo.corrientes) {
        if (cc.destino.vaso === 'imp' && cc.destino.tope && cc.tipo !== 'astillas') q += e.corrientes[cc.id].caudalReal ?? 0
      }
      return q / W
    }
    case 'I': return (m, e) => e.vasos[b]?.raspador?.corriente ?? 0
    case 'dP': return (m, e) => e.mallas[b]?.dP ?? 0
    case 'vapor':
      if (a === 'total') return (m, e) => Object.values(e.equipos.calentadores).reduce((s, x) => s + x.vapor, 0)
      return (m, e) => e.equipos.calentadores[a].vapor
    case 'x': return (m, e) => e.valvulas[b].x
    default: break
  }
  throw new Error(`Variable de medición desconocida: "${nombre}"`)
}
