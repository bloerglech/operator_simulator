// Eventos (perturbaciones y fallas) del catálogo config/eventos.json y su
// generador aleatorio con semilla. Un evento aplica sus acciones (rampas de
// una variable o comandos directos), dura un tiempo y al terminar puede
// revertir los valores y ejecutar comandos finales. Todo el estado vive en
// estado.escenario (determinista, se guarda con la partida).

import { aInterno } from '../sim/unidades.js'
import { uniforme } from '../sim/aleatorio.js'

const PASO_RAMPA = 5 // s entre actualizaciones de las rampas

export function construirCatalogo(config) {
  const cfg = config.eventos
  const porId = {}
  for (const e of cfg.eventos) {
    if (porId[e.id]) throw new Error(`Evento repetido: ${e.id}`)
    for (const a of e.acciones) if (!a.comando && !a.objetivo) throw new Error(`Evento ${e.id}: acción sin comando ni objetivo`)
    porId[e.id] = e
  }
  return { lista: cfg.eventos, porId, generador: cfg.generador }
}

/** Valor actual (unidades internas) del objetivo de una rampa. */
export function leerObjetivo(ctx, o) {
  const { estado, modelo } = ctx
  if (o.tipo === 'fuente') {
    const f = estado.fuentes[o.id]
    return modelo.idx[o.campo] !== undefined && f.c ? f.c[modelo.idx[o.campo]] : f[o.campo]
  }
  if (o.tipo === 'servicio') return estado.servicios[o.id]
  if (o.tipo === 'perturbar') {
    if (o.id === 'finos') return estado.perturbaciones.finos ?? 1
    if (o.id === 'friccion') return estado.vasos[o.vaso].friccion ?? 1
    if (o.id === 'canalizacion') return estado.vasos[o.vaso].canalizacion ?? 0
    if (o.id === 'incrustacion') {
      const c = estado.equipos.calentadores[o.equipo]
      return c.incrustacion[c.activo]
    }
  }
  throw new Error(`Objetivo de rampa no admitido: ${JSON.stringify(o)}`)
}

/**
 * Ejecuta un comando de un evento. Si no se puede (p. ej. partir una bomba
 * durante un apagón) queda registrado y el evento sigue: un evento nunca
 * detiene la simulación.
 */
function ejecutar(ctx, cmd, evento) {
  try {
    ctx.ejecutar(cmd)
  } catch (err) {
    ctx.evento('comando_fallido', { evento, comando: cmd.tipo, error: String(err?.message ?? err) })
  }
}

/** Reemplaza $parametros en un comando. */
function sustituir(cmd, p) {
  return JSON.parse(JSON.stringify(cmd), (k, v) => (typeof v === 'string' && v.startsWith('$') ? p[v.slice(1)] ?? v : v))
}

export function estadoEventos() {
  return { activos: [], n: 0, generador: { activo: false, dificultad: 1, proximo: null } }
}

/** Inicia un evento. parametros: valores de $opciones (si faltan, se sortean). */
export function iniciarEvento(cat, se, ctx, id, parametros = {}, aviso = null) {
  const def = cat.porId[id]
  if (!def) throw new Error(`Evento desconocido: ${id}`)
  const t = ctx.estado.paso * ctx.modelo.dtR
  const p = { ...parametros }
  for (const [k, ops] of Object.entries(def.opciones ?? {})) {
    if (p[k] === undefined) p[k] = ops[Math.floor(uniforme(ctx.estado.aleatorio.eventos) * ops.length) % ops.length]
  }
  const inst = { n: ++se.eventos.n, id, parametros: p, t0: t, fin: def.duracion ? t + def.duracion : null, fase: 'activo', rampas: [] }
  for (const a of def.acciones) {
    if (a.comando) ejecutar(ctx, sustituir(a.comando, p), id)
    else {
      const objetivo = sustituir(a.objetivo, p)
      // Si otro evento activo mueve la misma variable, este toma su rampa y su
      // valor base: al terminar se vuelve al valor anterior a ambos.
      const base = tomarRampa(se.eventos, objetivo)
      const desde = leerObjetivo(ctx, objetivo)
      const hasta = a.hasta !== undefined ? (a.unidad ? aInterno(a.hasta, a.unidad) : a.hasta) : desde * a.factor
      inst.rampas.push({ objetivo, desde, hasta, t0: t, duracion: a.rampa ?? 0, base: base ?? desde })
    }
  }
  se.eventos.activos.push(inst)
  ctx.evento('perturbacion', { evento: id, nombre: def.nombre })
  if (aviso) aviso(def, inst)
  avanzarRampas(se.eventos, ctx, t, true)
  return inst
}

/** Clave canónica de la variable que mueve una rampa. */
function claveObjetivo(o) {
  return JSON.stringify(Object.keys(o).sort().map((k) => [k, o[k]]))
}

/**
 * Quita a los eventos activos las rampas sobre la misma variable y devuelve el
 * valor base que tenía antes de ellos (o null si ninguno la movía).
 */
function tomarRampa(ev, objetivo) {
  const clave = claveObjetivo(objetivo)
  let base = null
  for (const inst of ev.activos) {
    const quedan = []
    for (const r of inst.rampas) {
      if (claveObjetivo(r.objetivo) !== clave) { quedan.push(r); continue }
      // En retorno, la rampa ya apunta al valor base; activa, lo guarda en base.
      base ??= inst.fase === 'retorno' ? r.hasta : (r.base ?? r.desde)
    }
    inst.rampas = quedan
  }
  return base
}

/** Termina un evento (revierte con rampa si corresponde y ejecuta sus comandos finales). */
export function terminarEvento(cat, se, ctx, inst) {
  const def = cat.porId[inst.id]
  const t = ctx.estado.paso * ctx.modelo.dtR
  for (const c of def.alTerminar ?? []) ejecutar(ctx, sustituir(c, inst.parametros), inst.id)
  if (def.revertir && inst.rampas.length) {
    inst.fase = 'retorno'
    inst.rampas = inst.rampas.map((r) => ({ objetivo: r.objetivo, desde: leerObjetivo(ctx, r.objetivo), hasta: r.base ?? r.desde, t0: t, duracion: r.duracion }))
  } else inst.fase = 'terminado'
  ctx.evento('fin_perturbacion', { evento: inst.id })
}

function avanzarRampas(ev, ctx, t, forzar = false) {
  for (const inst of ev.activos) {
    for (const r of inst.rampas) {
      if (r.hecha) continue
      const f = r.duracion > 0 ? Math.min(1, (t - r.t0) / r.duracion) : 1
      if (!forzar && f < 1 && Math.round(t / ctx.modelo.dtR) % Math.round(PASO_RAMPA / ctx.modelo.dtR) !== 0) continue
      const v = r.desde + (r.hasta - r.desde) * f
      ejecutar(ctx, { ...r.objetivo, valor: v }, inst.id)
      if (f >= 1) r.hecha = true
    }
  }
}

/** Un paso rápido: rampas, fin de eventos y generador aleatorio. */
export function pasoEventos(cat, se, ctx, aviso) {
  const ev = se.eventos
  const t = ctx.estado.paso * ctx.modelo.dtR
  avanzarRampas(ev, ctx, t)
  for (const inst of ev.activos) {
    if (inst.fase === 'activo' && inst.fin !== null && t >= inst.fin) terminarEvento(cat, se, ctx, inst)
    if (inst.fase === 'retorno' && inst.rampas.every((r) => r.hecha)) inst.fase = 'terminado'
    // Sin duración: el evento queda aplicado (p. ej. una bomba que cae) y lo resuelve el operador.
    if (inst.fase === 'activo' && inst.fin === null && inst.rampas.every((r) => r.hecha)) inst.fase = 'terminado'
  }
  ev.activos = ev.activos.filter((i) => i.fase !== 'terminado')
  // Generador: tiempos entre eventos exponenciales, eventos elegidos por peso.
  const g = ev.generador
  if (g.activo) {
    const media = cat.generador.intervalo_medio[g.dificultad]
    const rng = ctx.estado.aleatorio.eventos
    if (g.proximo === null) g.proximo = t + -Math.log(1 - uniforme(rng)) * media
    if (t >= g.proximo) {
      const candidatos = cat.lista.filter((e) => e.dificultad <= g.dificultad && !ev.activos.some((a) => a.id === e.id && a.fase === 'activo'))
      const total = candidatos.reduce((s, e) => s + e.peso, 0)
      let u = uniforme(rng) * total
      const elegido = candidatos.find((e) => (u -= e.peso) < 0) ?? candidatos.at(-1)
      if (elegido) iniciarEvento(cat, se, ctx, elegido.id, {}, cat.generador.aviso_previo[g.dificultad] ? aviso : null)
      g.proximo = t + -Math.log(1 - uniforme(rng)) * media
    }
  }
}
