// Lazos de control, bloques de cálculo (relaciones) y control avanzado.
//
// Cada lazo lee el PV de un transmisor, calcula un PID y escribe su salida en
// un actuador del proceso (válvula, caudal de una corriente, velocidad del
// medidor, válvula de vapor de un calentador, salida de un ciclón flash, un
// servicio) o en la consigna de otro lazo (cascada). Las salidas se aplican
// con los mismos comandos que usa el operador.

import { aInterno, desdeInterno } from '../sim/unidades.js'
import { velocidadRelativa } from '../sim/factorH.js'
import { crearPID, pasoPID, cambiarModo } from './pid.js'
import { lectura } from './instrumentos.js'

// Actuadores por tipo de salida (supuesto): constante de tiempo tau (s),
// tiempo de carrera completa (s, límite de velocidad) y banda muerta (% de
// la salida: cambios menores del comando no mueven el actuador). Las
// válvulas del simulador ya tienen su propia dinámica (valvulas.js): aquí
// solo se agrega la banda muerta. Un lazo puede cambiarlos con "actuador".
const ACTUADOR = {
  valvula: { tau: 0, carrera: 0, banda: 0.2 },
  caudal: { tau: 4, carrera: 30, banda: 0.2 }, // válvula de control de la línea
  madera: { tau: 5, carrera: 60, banda: 0.2 }, // descargador / raspador de salida
  medidor: { tau: 5, carrera: 60, banda: 0.1 }, // variador de velocidad
  vapor: { tau: 3, carrera: 25, banda: 0.2 },
  servicio: { tau: 30, carrera: 120, banda: 0.5 },
  flash: { tau: 4, carrera: 30, banda: 0.2 },
}

/** Mueve el actuador (posición en %) hacia el comando u. */
function moverActuador(a, sa, u, dt) {
  if (sa.pegado) return sa.pos
  if (Math.abs(u - sa.ref) > a.banda || u <= 0 || u >= 100) sa.ref = u
  const deseado = a.tau > 0 ? sa.pos + (sa.ref - sa.pos) * (1 - Math.exp(-dt / a.tau)) : sa.ref
  const maxPaso = a.carrera > 0 ? (100 * dt) / a.carrera : Infinity
  sa.pos += Math.max(-maxPaso, Math.min(maxPaso, deseado - sa.pos))
  return sa.pos
}

export function construirLazos(config, inst) {
  const lazos = {}
  for (const l of config.lazos.lazos) {
    const tx = inst.transmisores[l.pv]
    if (!tx) throw new Error(`Lazo ${l.tag}: transmisor desconocido "${l.pv}"`)
    lazos[l.tag] = {
      ...l,
      directa: l.accion === 'directa',
      pvMin: tx.rangoMostrar[0],
      pvMax: tx.rangoMostrar[1],
      lim: l.limites ?? [0, 100],
      unidadPV: tx.etiqueta,
    }
  }
  for (const l of Object.values(lazos)) {
    // "maestros": maestros posibles (el operador elige uno); "maestro": el inicial.
    l.maestros = l.maestros ?? (l.maestro ? [l.maestro] : [])
    if (l.maestro && !l.maestros.includes(l.maestro)) throw new Error(`Lazo ${l.tag}: el maestro inicial no está en "maestros"`)
    for (const m of l.maestros) {
      if (!lazos[m] && !config.lazos.bloques.some((b) => b.tag === m)) throw new Error(`Lazo ${l.tag}: maestro desconocido "${m}"`)
    }
    if (l.salida.tipo === 'lazo' && !lazos[l.salida.id]) throw new Error(`Lazo ${l.tag}: esclavo desconocido "${l.salida.id}"`)
  }
  const bloques = {}
  const TIPOS_BLOQUE = ['carga_alcali', 'licor_madera', 'seguimiento', 'ritmo', 'factor_h', 'kappa']
  for (const b of config.lazos.bloques) {
    if (!TIPOS_BLOQUE.includes(b.tipo)) throw new Error(`Bloque ${b.tag}: tipo desconocido "${b.tipo}"`)
    if (b.tipo === 'seguimiento' && !lazos[b.parametros.esclavo]) throw new Error(`Bloque ${b.tag}: esclavo desconocido`)
    bloques[b.tag] = b
  }
  for (const l of Object.values(lazos)) {
    l.cfg = { directa: l.directa, lim: l.lim, pvMin: l.pvMin, pvMax: l.pvMax, Kc: l.Kc, Ti: l.Ti, Td: l.Td ?? 0 }
    l.act = l.salida.tipo === 'lazo' ? null : { ...ACTUADOR[l.salida.tipo], ...(l.actuador ?? {}) }
  }
  // Orden de ejecución: maestros antes que esclavos.
  const orden = Object.values(lazos).sort((a, b) => (a.salida.tipo === 'lazo' ? 0 : 1) - (b.salida.tipo === 'lazo' ? 0 : 1))
  return { lazos, bloques, orden }
}

// ---------------------------------------------------------------------------
// Actuadores: lectura (para transferir sin golpe) y escritura

/** Valor actual del actuador de un lazo, en % de su rango. */
function leerActuador(l, ctx, lz, ce) {
  const { estado } = ctx
  const s = l.salida
  const pct = (v) => ((v - s.min) / (s.max - s.min)) * 100
  switch (s.tipo) {
    case 'valvula': return estado.valvulas[s.id].comando * 100
    case 'caudal': return pct(desdeInterno(estado.ajustes[s.corriente].caudal, s.unidad))
    case 'madera': return pct(desdeInterno(estado.ajustes[s.corriente].caudalMadera, s.unidad))
    case 'medidor': return pct(desdeInterno(estado.ajustes.astillas.velocidad, s.unidad))
    case 'vapor': {
      const c = estado.equipos.calentadores[s.calentador]
      const Qv = ctx.modelo.equipos.calentadores[s.calentador].Qvalvula
      return c.aperturaVapor !== null && c.aperturaVapor !== undefined ? c.aperturaVapor * 100 : Math.min(100, (c.Q / Qv) * 100)
    }
    case 'servicio': return pct(desdeInterno(estado.servicios[s.id], s.unidad))
    case 'flash': return pct(desdeInterno(estado.equipos.flash[s.id].salida, s.unidad))
    case 'lazo': {
      const esc = lz.lazos[s.id]
      return ((ce.lazos[s.id].sp - esc.pvMin) / (esc.pvMax - esc.pvMin)) * 100
    }
    default: return 0
  }
}

/** Aplica la salida (%) de un lazo a su actuador. */
function escribirActuador(l, u, ctx, lz, ce) {
  const s = l.salida
  const v = s.min !== undefined ? aInterno(s.min + (u / 100) * (s.max - s.min), s.unidad) : 0
  switch (s.tipo) {
    case 'valvula': return ctx.aplicar({ tipo: 'valvula', id: s.id, valor: u / 100 })
    case 'caudal': return ctx.aplicar({ tipo: 'ajustar', id: s.corriente, campo: 'caudal', valor: v })
    case 'madera': return ctx.aplicar({ tipo: 'ajustar', id: s.corriente, campo: 'caudalMadera', valor: v })
    case 'medidor': return ctx.aplicar({ tipo: 'ajustar', id: 'astillas', campo: 'velocidad', valor: v })
    case 'vapor': return ctx.aplicar({ tipo: 'calentador', id: s.calentador, accion: 'vapor', valor: u / 100 })
    case 'servicio': return ctx.aplicar({ tipo: 'servicio', id: s.id, valor: v })
    case 'flash': return ctx.aplicar({ tipo: 'flash', id: s.id, valor: v })
    case 'lazo': {
      const esc = lz.lazos[s.id]
      const st = ce.lazos[s.id]
      if (st.modo === 'CAS' && st.maestro === l.tag) st.sp = esc.pvMin + (u / 100) * (esc.pvMax - esc.pvMin)
      return undefined
    }
    default: return undefined
  }
}

// ---------------------------------------------------------------------------
// Estado y paso

export function estadoLazos(lz, inst, ctx, ce) {
  const r = {}
  for (const l of Object.values(lz.lazos)) {
    const pv = lectura(inst, ce, l.pv)
    const sp = l.sp === 'pv' ? pv : l.sp
    r[l.tag] = { ...crearPID({ sp, salida: 0, modo: l.modo }), Kc: l.Kc, Ti: l.Ti, Td: l.Td ?? 0, pv, escrito: null, forzado: null, maestro: l.maestro ?? null }
  }
  // Salidas iniciales iguales al valor actual de cada actuador (sin golpe).
  ce.lazos = r
  for (const l of Object.values(lz.lazos)) r[l.tag].salida = Math.min(100, Math.max(0, leerActuador(l, ctx, lz, ce)))
  // Los esclavos en cascada empiezan con la consigna en su valor actual.
  for (const l of Object.values(lz.lazos)) {
    if (l.salida.tipo === 'lazo') r[l.tag].salida = Math.min(100, Math.max(0, leerActuador(l, ctx, lz, ce)))
  }
  for (const s of Object.values(r)) {
    s.integral = s.salida
    s.escrito = s.salida
    s.act = { pos: s.salida, ref: s.salida, pegado: false }
  }
  const bloques = {}
  for (const b of Object.values(lz.bloques)) {
    bloques[b.tag] = { activo: b.activo, parametros: JSON.parse(JSON.stringify(b.parametros)), salida: null, bias: 0, base: null }
  }
  return { lazos: r, bloques }
}

/** Un paso de todos los lazos y bloques. */
export function pasoLazos(lz, inst, ctx, ce, dt, forzados) {
  const st = ce.lazos
  // 1. Bloques de cálculo (fijan consignas de esclavos en CAS).
  pasoBloques(lz, inst, ctx, ce, dt)
  // 2. Lazos: primero los maestros (escriben consignas), luego los demás.
  for (const l of lz.orden) {
    const s = st[l.tag]
    const f = forzados[l.tag]
    s.forzado = f ? f.por : null
    if (f) {
      // Un enclavamiento manda: el lazo queda en MAN con la salida forzada.
      if (s.modo !== 'MAN') cambiarModo(s, 'MAN')
      s.salida = f.salida
    }
    // PV en falla (señal fuera de rango): el lazo pasa a manual.
    const falla = ce.tx[l.pv].falla
    if ((falla === 'alto' || falla === 'bajo') && s.modo !== 'MAN') {
      cambiarModo(s, 'MAN')
      ctx.evento('lazo_a_manual', { lazo: l.tag, causa: 'falla de PV' })
    }
    const pv = lectura(inst, ce, l.pv)
    s.pv = pv
    // Un maestro cuyo esclavo no está en cascada sigue al esclavo (sin acumular integral).
    if (l.salida.tipo === 'lazo') {
      const esc = st[l.salida.id]
      if (esc.modo !== 'CAS' || esc.maestro !== l.tag) {
        s.salida = Math.min(100, Math.max(0, leerActuador(l, ctx, lz, ce)))
        s.integral = s.salida
        s.inicializar = true
        s.pvAnt = null
        s.siguiendo = true
        continue
      }
      s.siguiendo = false
    }
    const cfg = l.cfg
    cfg.Kc = s.Kc
    cfg.Ti = s.Ti
    cfg.Td = s.Td
    // En manual, si otro (instructor, comando directo al proceso) movió el
    // actuador, el lazo adopta esa posición.
    if (s.modo === 'MAN' && l.act && !s.act.pegado) {
      const leido = Math.min(100, Math.max(0, leerActuador(l, ctx, lz, ce)))
      if (Math.abs(leido - s.escrito) > 0.5) {
        s.salida = leido
        s.act.pos = leido
        s.act.ref = leido
      }
    }
    const u = pasoPID(s, cfg, pv, dt)
    const y = l.act ? moverActuador(l.act, s.act, u, dt) : u
    escribirActuador(l, y, ctx, lz, ce)
    s.escrito = y
  }
}

/** Interpreta la salida de un bloque como consigna de un lazo en cascada. */
function consignaEsclavo(ce, lz, tagEsclavo, tagMaestro, valor) {
  const esc = lz.lazos[tagEsclavo]
  const st = ce.lazos[tagEsclavo]
  if (st.modo === 'CAS' && st.maestro === tagMaestro) st.sp = Math.min(esc.pvMax, Math.max(esc.pvMin, valor))
}

// Constante de tiempo del filtro de las entradas de los bloques de relación
// (evita que el ruido de los transmisores mueva las consignas de los esclavos).
const TAU_BLOQUE = 60 // s

function pasoBloques(lz, inst, ctx, ce, dt) {
  const lectura_ = (tag) => lectura(inst, ce, tag)
  const filtrada = (sb, tag) => {
    sb.filtros ??= {}
    const x = lectura_(tag)
    const f = sb.filtros[tag] ?? x
    sb.filtros[tag] = f + ((x - f) * dt) / (TAU_BLOQUE + dt)
    return sb.filtros[tag]
  }
  const resultados = ce.laboratorio.resultados
  const ultimoLab = (analisis) => {
    for (let i = resultados.length - 1; i >= 0; i--) if (resultados[i].analisis === analisis) return resultados[i]
    return null
  }
  for (const b of Object.values(lz.bloques)) {
    const sb = ce.bloques[b.tag]
    if (!sb.activo) { sb.salida = null; continue }
    const pr = sb.parametros
    if (b.tipo === 'carga_alcali') {
      // El EA del licor blanco se toma del último análisis de laboratorio.
      const lab = ultimoLab('licor_blanco_EA')
      if (lab && lab.t > (sb.tLab ?? -1)) { pr.EA_licor_blanco = lab.valor; sb.tLab = lab.t }
      const W = filtrada(sb, 'WI-101') // t/h
      const total = (pr.carga / 100) * W * 1000 / pr.EA_licor_blanco // m³/h
      sb.salida = total
      for (const [tag, pct] of Object.entries(pr.reparto)) consignaEsclavo(ce, lz, tag, b.tag, (total * pct) / 100)
    } else if (b.tipo === 'licor_madera') {
      const lab = ultimoLab('humedad_astillas')
      if (lab && lab.t > (sb.tLab ?? -1)) { pr.humedad = lab.valor; sb.tLab = lab.t }
      const W = filtrada(sb, 'WI-101')
      const agua = (W * pr.humedad) / (100 - pr.humedad) // m³/h
      const otros = filtrada(sb, 'FI-111') + filtrada(sb, 'FI-116')
      sb.salida = Math.max(0, pr.relacion * W - agua - otros)
      consignaEsclavo(ce, lz, 'FIC-115', b.tag, sb.salida)
    } else if (b.tipo === 'seguimiento') {
      // El esclavo (en CAS) sigue los cambios de la fuente desde la
      // activación. Ej.: la extracción final sigue al filtrado de lavado (si
      // no, el filtrado extra sube a la zona de cocción: manual, cap. 2).
      // Mientras el esclavo no está en CAS la base se renueva, así la vuelta
      // a cascada es sin golpe.
      const [clase, id] = pr.fuente.split(':')
      const fuente = clase === 'lazo' ? ce.lazos[id].sp : desdeInterno(ctx.estado.ajustes[id].caudal, 'm3/h')
      const esc = ce.lazos[pr.esclavo]
      if (sb.base === null || esc.modo !== 'CAS') sb.base = { fuente, esclavo: esc.sp }
      sb.salida = Math.max(0, sb.base.esclavo + pr.ganancia * (fuente - sb.base.fuente))
      consignaEsclavo(ce, lz, pr.esclavo, b.tag, sb.salida)
    } else if (b.tipo === 'ritmo') {
      pasoRitmo(lz, ctx, ce, b, sb, dt)
    } else if (b.tipo === 'factor_h') {
      // H previsto con las temperaturas actuales y el ritmo actual.
      const W = filtrada(sb, 'WI-101')
      const r = (sb.Wbase ??= W) / Math.max(1, W)
      const Hp = (velocidadRelativa(filtrada(sb, 'TI-304')) * pr.tiempo_superior + velocidadRelativa(filtrada(sb, 'TI-305')) * pr.tiempo_inferior + pr.H_resto) * r
      // Al activarse, el modelo simple se corrige con el H calculado en el
      // soplado (la diferencia cubre tiempos de zona y temperaturas reales).
      if (sb.base === null) sb.base = { sup: ce.lazos['TIC-402'].sp, inf: ce.lazos['TIC-404'].sp, correccion: lectura_('HI-703') - Hp }
      sb.Hprevisto = Hp + sb.base.correccion
      sb.bias = Math.min(pr.bias_max, Math.max(-pr.bias_max, sb.bias + (pr.ganancia * (pr.objetivo - sb.Hprevisto) * dt) / 60))
      ce.lazos['TIC-402'].sp = sb.base.sup + sb.bias
      ce.lazos['TIC-404'].sp = sb.base.inf + sb.bias
      sb.salida = sb.bias
    } else if (b.tipo === 'kappa') {
      // PI muestreado: actúa solo cuando el analizador entrega un valor nuevo.
      const kappa = lectura_('AI-701')
      if (sb.ultimo === undefined) sb.ultimo = kappa // al activarse no actúa sobre un valor viejo
      if (sb.ultimo !== kappa) {
        sb.ultimo = kappa
        const e = kappa - pr.objetivo
        const h = ce.bloques['HIC-703']
        if (h?.activo) h.parametros.objetivo = Math.max(250, Math.min(800, h.parametros.objetivo + pr.ganancia * e * (1 + 1500 / pr.Ti)))
        else {
          const c = ce.bloques['FFC-110'].parametros
          c.carga = Math.max(12, Math.min(24, c.carga + 0.05 * e * (1 + 1500 / pr.Ti)))
        }
        sb.salida = e
      }
    }
  }
}

/** Coordinación de ritmo: rampa de producción y escalado de los caudales marcados. */
function pasoRitmo(lz, ctx, ce, b, sb, dt) {
  const pr = sb.parametros
  const Wobj = (pr.produccion * 0.9) / (pr.rendimiento / 100) / 24 // t/h de madera seca
  const wic = ce.lazos['WIC-101']
  if (sb.base === null) {
    sb.base = { W: wic.sp, sps: {} }
    for (const l of Object.values(lz.lazos)) if (l.escala_ritmo) sb.base.sps[l.tag] = ce.lazos[l.tag].sp
  }
  // Rampa limitada de la consigna de madera.
  const rampa = (pr.rampa * 0.9 / (pr.rendimiento / 100)) / 24 / 3600 // t/h por s
  const d = Wobj - wic.sp
  wic.sp += Math.sign(d) * Math.min(Math.abs(d), rampa * dt)
  const r = wic.sp / sb.base.W
  for (const [tag, sp0] of Object.entries(sb.base.sps)) if (ce.lazos[tag].modo === 'AUTO') ce.lazos[tag].sp = sp0 * r
  sb.salida = r
}

export { cambiarModo }
