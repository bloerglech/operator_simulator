// Indicadores del turno (puntaje): se acumulan en cada paso lento desde el
// inicio del turno o de la misión. Las cantidades se calculan con los
// valores verdaderos del proceso (el informe es del instructor, no del DCS).

import { kgPorRevolucion } from '../sim/equipos.js'

export function estadoIndicadores(t) {
  return {
    t0: t, t: 0,
    adt: 0, adtEnEspec: 0, fueraEspec: 0,
    kappa: { n: 0, s: 0, s2: 0, min: Infinity, max: -Infinity },
    pulpa: 0, rend: 0, visc: 0, rech: 0, // promedios ponderados por pulpa
    madera: 0, maderaM3: 0, alcali: 0, vapor: 0, // kg secos, m³ sólidos, kg NaOH, GJ
    licorEvap: 0, solidosEvap: 0, arrastre: 0, // m³, kg, kg de sólidos con la pulpa
    alarmas: 0, alarmasP1: 0, respuesta: { n: 0, s: 0 }, ultimoRegistro: 0,
    paradas: 0, alimentando: true,
    enclavamientos: 0, alivios: 0, seguridad: 0,
    serie: [], // muestras cada 5 min: [t, kappa, producción ADt/d, álcali ext. g/L]
  }
}

/** Acumula un paso lento (dt s). espec: { kappa: [mín, máx] }. */
export function acumular(ind, ctx, espec, dt) {
  const { estado, modelo } = ctx
  ind.t += dt
  const d = estado.diag.dig
  const q = d?.calidadSalida
  const pulpa = d?.maderaSalida ?? 0 // kg/s secos
  const adt = (pulpa * dt) / 1000 / 0.9
  ind.adt += adt
  const kappa = q?.kappa
  const enEspec = kappa !== undefined && kappa >= espec.kappa[0] && kappa <= espec.kappa[1] && (q.rechazos ?? 0) * 100 <= espec.rechazos_max
  // Tiempo fuera de especificación: solo mientras se produce (una parada no cuenta).
  const nominal = (modelo.config.caso_base.produccion.valor / 86400) * 1000 * 0.9
  if (enEspec) ind.adtEnEspec += adt
  else if (pulpa > 0.05 * nominal) ind.fueraEspec += dt
  if (kappa !== undefined && pulpa > 0) {
    const k = ind.kappa
    k.n++; k.s += kappa; k.s2 += kappa * kappa
    k.min = Math.min(k.min, kappa); k.max = Math.max(k.max, kappa)
    ind.pulpa += pulpa * dt
    ind.rend += q.rendimiento * pulpa * dt
    ind.visc += q.viscosidad * pulpa * dt
    ind.rech += q.rechazos * pulpa * dt
  }
  // Madera real: velocidad del medidor por la masa por revolución con la densidad real.
  // (con el tope del medidor y sin madera si el silo está vacío, como en equipos.js).
  const densidad = estado.fuentes.astillas.densidad
  const rpm = Math.min(estado.ajustes.astillas?.velocidad ?? 0, modelo.equipos.medidor.rpmMax)
  const W = (estado.equipos.silo?.masa ?? 1) > 0 ? rpm * kgPorRevolucion(modelo.equipos, densidad) : 0
  ind.madera += W * dt
  ind.maderaM3 = (ind.maderaM3 ?? 0) + (W * dt) / densidad // m³ sólidos con la densidad real
  const iOH = modelo.idx.OH
  for (const c of modelo.corrientes) {
    const ec = estado.corrientes[c.id]
    const q2 = ec.caudalReal ?? 0
    if (c.origen.fuente === 'licor_blanco') ind.alcali += q2 * estado.fuentes.licor_blanco.c[iOH] * 40 * dt
    if (c.destino.equipo === 'flash1' && ec.c) {
      ind.licorEvap += q2 * dt
      ind.solidosEvap += q2 * ['LD', 'XD', 'CD', 'OD', 'SI'].reduce((s, id) => s + ec.c[modelo.idx[id]], 0) * dt
    }
  }
  if (d?.licorSalida?.c) ind.arrastre += d.licorSalida.v * ['LD', 'XD', 'CD', 'OD', 'SI'].reduce((s, id) => s + d.licorSalida.c[modelo.idx[id]], 0)
  ind.vapor += (Object.values(estado.equipos.calentadores).reduce((s, c) => s + c.Q, 0) * dt) / 1e6
  // Alarmas: activaciones y tiempo de respuesta (activación → reconocimiento).
  const ca = estado.control?.alarmas
  if (ca) {
    for (const r of ca.registro) {
      if (r.t <= ind.ultimoRegistro || r.t < ind.t0) continue
      if (r.accion === 'activa') { ind.alarmas++; if (r.prioridad === 1) ind.alarmasP1++ }
      if (r.accion === 'reconocida') {
        const s = ca.a[r.id]
        if (s?.tActivacion !== null && s?.tActivacion !== undefined && r.t >= s.tActivacion) { ind.respuesta.n++; ind.respuesta.s += r.t - s.tActivacion }
      }
    }
    ind.ultimoRegistro = ca.registro.at(-1)?.t ?? ind.ultimoRegistro
  }
  // Paradas de alimentación (madera < 10 % del caso base).
  const alimentando = W > 0.1 * modelo.config.caso_base.produccion.valor / 86400 * 1000 * 0.9 / 0.535
  if (ind.alimentando && !alimentando) ind.paradas++
  ind.alimentando = alimentando
  // Serie para el informe.
  if (ind.serie.length === 0 || ind.t - ind.serie.at(-1)[0] >= 300) {
    const ext = estado.corrientes.ext_principal?.c
    ind.serie.push([Math.round(ind.t), kappa ?? null, Math.round(pulpa * 86400 / 1000 / 0.9), ext ? ext[iOH] * 40 : null])
    if (ind.serie.length > 300) ind.serie.shift()
  }
}

/** Resumen del turno (para el informe). */
export function resumen(ind, economia, incidentes = {}) {
  const k = ind.kappa
  const media = k.n ? k.s / k.n : null
  const desv = k.n > 1 ? Math.sqrt(Math.max(0, k.s2 / k.n - media * media)) : null
  const adt = Math.max(ind.adt, 1e-9)
  const horas = ind.t / 3600
  const m3madera = ind.maderaM3 ?? ind.madera / 480 // m³ sólidos (partidas antiguas: densidad de referencia)
  const r = {
    horas,
    adt: ind.adt,
    adtEnEspec: ind.adtEnEspec,
    produccionMedia: horas > 0 ? ind.adt / horas * 24 : 0,
    kappaMedio: media, kappaDesv: desv, kappaMin: k.n ? k.min : null, kappaMax: k.n ? k.max : null,
    tiempoFueraEspec: ind.fueraEspec,
    rendimiento: ind.pulpa ? ind.rend / ind.pulpa : null,
    viscosidad: ind.pulpa ? ind.visc / ind.pulpa : null,
    rechazos: ind.pulpa ? ind.rech / ind.pulpa : null,
    maderaPorADt: m3madera / adt,
    alcaliPorADt: ind.alcali / adt,
    vaporPorADt: ind.vapor / adt,
    licorEvapPorADt: ind.licorEvap / adt,
    solidosEvapPorADt: ind.solidosEvap / 1000 / adt,
    arrastrePorADt: ind.arrastre / adt,
    alarmasPorHora: horas > 0 ? ind.alarmas / horas : 0,
    alarmasP1: ind.alarmasP1,
    respuestaMedia: ind.respuesta.n ? ind.respuesta.s / ind.respuesta.n : null,
    paradas: ind.paradas,
    serie: ind.serie,
  }
  const e = economia
  r.economia = {
    moneda: e.moneda,
    ingresos: ind.adtEnEspec * e.precio_pulpa + (ind.adt - ind.adtEnEspec) * e.precio_pulpa * 0.6, // fuera de especificación se vende con descuento
    madera: m3madera * e.madera_m3,
    alcali: (ind.alcali / 1000) * e.alcali_t_NaOH,
    vapor: ind.vapor * e.vapor_GJ,
  }
  r.economia.margen = r.economia.ingresos - r.economia.madera - r.economia.alcali - r.economia.vapor
  r.margenPorADt = r.economia.margen / adt // para las condiciones de las misiones
  r.incidentes = incidentes
  return r
}
