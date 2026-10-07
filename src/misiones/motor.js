// Motor de misiones: ejecuta una misión definida como datos (src/misiones/*.js).
//
// Definición de una misión:
//   { id, capitulo, titulo, resumen, ensena,
//     inicio: { horasPrevias, preparacion: { comandos, horas, despues } o { etapas: [{ comandos, horas }] } },
//     guion: [{ id, cuando, acciones }],                              eventos guionados
//     objetivos: [{ id, texto, tipo: 'principal'|'secundario', condicion,
//                   desde?, evitable?, anticipable?, durante?, plazo?, final?, pistas?: [{ tras, quien, canal, texto, resaltar }] }],
//     fallas: [{ condicion, mensaje }], fin: condicion,
//     evaluacion: [{ texto, condicion, puntos }], respuestaIdeal }
// Acciones del guion: { mensaje: { quien, canal, texto } } · { evento: id, parametros } ·
//   { comando } · { mostrar: idObjetivo } · { velocidad1: true } · { puntoControl: true } ·
//   { terminar: true } · { fallar: texto }.
// Todo el estado vive en estado.escenario.mision (determinista, se guarda).

import { evaluar } from './condiciones.js'
import { estadoIndicadores, acumular, resumen } from '../escenarios/indicadores.js'

export function iniciarMision(def, se, ctx) {
  const t = ctx.estado.paso * ctx.modelo.dtR
  const objetivos = {}
  for (const o of def.objetivos) objetivos[o.id] = { estado: 'pendiente', visible: !o.desde && !o.oculto, tVisible: !o.desde && !o.oculto ? 0 : null, tDesde: null, pistas: 0 }
  se.mision = {
    id: def.id, t0: t, paso0: ctx.estado.paso, registro0: ctx.estado.registro.length,
    jugador0: se.jugador.length, incidentes0: { ...ctx.estado.incidentes },
    objetivos, guion: {}, terminada: false, fallida: null, resultado: null,
    ind: estadoIndicadores(t),
  }
  se.jugador = []
  return se.mision
}

/** Contexto de evaluación de las condiciones (lecturas perezosas). */
function contexto(def, se, ctx) {
  const m = se.mision
  const { estado } = ctx
  let control = null
  let res = null
  return {
    t: estado.paso * ctx.modelo.dtR - m.t0,
    control: () => (control ??= ctx.leer('control')),
    kpi(nombre) {
      const d = estado.diag.dig
      const q = d?.calidadSalida
      if (nombre === 'produccion') return d ? (d.maderaSalida * 86400) / 1000 / 0.9 : null
      if (nombre === 'rechazos') return q ? q.rechazos * 100 : null
      if (nombre === 'rendimiento') return q ? q.rendimiento * 100 : null
      return q?.[nombre] ?? null
    },
    indicador: (n) => (res ??= resumen(m.ind, ctx.modelo.config.campana.economia))[n],
    jugador: se.jugador,
    // Comandos desde que empezó la misión, o desde que se mostró el objetivo que se evalúa (desde, en s de misión).
    desde: 0,
    comandos() { const p0 = m.paso0 + Math.round(this.desde / ctx.modelo.dtR); return estado.registro.filter((r) => r.paso >= p0) },
    mallas: () => estado.mallas,
    laboratorio: () => (estado.control?.laboratorio.resultados ?? []).filter((r) => r.t >= m.t0),
    sinReconocer: () => Object.values(estado.control?.alarmas.a ?? {}).filter((a) => !a.reconocida).length,
    objetivos: m.objetivos,
    guion: m.guion,
    incidente(tipo, desde) {
      const base = desde ? m.incidentesPaso?.[desde] : m.incidentes0
      if (!base) return 0 // el paso aún no se ejecuta
      return (estado.incidentes[tipo] ?? 0) - (base[tipo] ?? 0)
    },
    bombas: () => estado.bombas,
  }
}

/**
 * Un paso de la misión (se llama en cada paso lento, 5 s).
 * emitir(mensaje): agrega un mensaje para la interfaz (diálogos, objetivos, pistas).
 * evento(id, parametros): inicia un evento del catálogo.
 */
export function pasoMision(def, se, ctx, dt, { emitir, evento }) {
  const m = se.mision
  if (!m || m.terminada) return
  acumular(m.ind, ctx, ctx.modelo.config.campana.especificacion, dt)
  const cx = contexto(def, se, ctx)

  // 1. Guion.
  for (const p of def.guion ?? []) {
    if (m.guion[p.id] || !evaluar(p.cuando, cx)) continue
    m.guion[p.id] = cx.t
    m.incidentesPaso = { ...m.incidentesPaso, [p.id]: { ...ctx.estado.incidentes } } // para { incidente, desde: paso }
    for (const a of p.acciones) ejecutarAccion(a, def, se, ctx, cx, { emitir, evento })
    if (m.terminada) return
  }

  // 2. Objetivos.
  for (const o of def.objetivos) {
    const so = m.objetivos[o.id]
    if (so.estado !== 'pendiente') continue
    if (!so.visible) {
      if (o.desde && evaluar(o.desde, cx)) mostrarObjetivo(def, se, o.id, cx.t, emitir)
      else continue
    }
    if (o.final) continue // se evalúa al terminar
    cx.desde = o.anticipable ? 0 : so.tVisible ?? 0 // un comando enviado antes de mostrar el objetivo no lo cumple (salvo anticipable)
    const ok = evaluar(o.condicion, cx)
    cx.desde = 0
    if (o.durante) {
      if (!ok) so.tDesde = null
      else if (so.tDesde === null) so.tDesde = cx.t
    }
    if (ok && (!o.durante || cx.t - so.tDesde >= o.durante)) {
      so.estado = 'cumplido'
      so.tCumplido = cx.t
      emitir({ tipo: 'objetivo', texto: `Objetivo cumplido: ${o.texto}`, objetivo: o.id, puntoControl: o.tipo === 'principal' })
      continue
    }
    // El plazo es para empezar a cumplirlo: si ya se cumple y corre «durante», se le deja terminar.
    if (o.plazo && so.tDesde === null && cx.t - so.tVisible > o.plazo) {
      so.estado = 'fallido'
      emitir({ tipo: 'objetivo', texto: `Objetivo no cumplido a tiempo: ${o.texto}`, objetivo: o.id })
      if (o.tipo === 'principal') return fallar(def, se, ctx, `No se cumplió a tiempo: ${o.texto}`, emitir)
      continue
    }
    // Pistas graduales.
    if (se.pistas && o.pistas && so.pistas < o.pistas.length && cx.t - so.tVisible >= o.pistas[so.pistas].tras) {
      const p = o.pistas[so.pistas++]
      emitir({ tipo: 'pista', quien: p.quien, canal: p.canal ?? 'radio', texto: p.texto, resaltar: p.resaltar ?? null })
    }
  }

  // 3. Fallas.
  for (const f of def.fallas ?? []) if (evaluar(f.condicion, cx)) return fallar(def, se, ctx, f.mensaje, emitir)

  // 4. Fin.
  if (def.fin && evaluar(def.fin, cx)) terminar(def, se, ctx, cx, emitir)
}

function mostrarObjetivo(def, se, id, t, emitir) {
  const so = se.mision.objetivos[id]
  if (so.visible) return
  so.visible = true
  so.tVisible = t
  const o = def.objetivos.find((x) => x.id === id)
  emitir({ tipo: 'objetivo', texto: `Nuevo objetivo: ${o.texto}`, objetivo: id })
}

function ejecutarAccion(a, def, se, ctx, cx, { emitir, evento }) {
  if (a.mensaje) emitir({ tipo: 'dialogo', ...a.mensaje, pararAceleracion: a.mensaje.pararAceleracion ?? true })
  if (a.evento) evento(a.evento, a.parametros ?? {})
  if (a.comando) ctx.ejecutar(a.comando)
  if (a.mostrar) mostrarObjetivo(def, se, a.mostrar, cx.t, emitir)
  if (a.velocidad1) emitir({ tipo: 'aviso', texto: '', pararAceleracion: true })
  if (a.puntoControl) emitir({ tipo: 'aviso', texto: '', puntoControl: true })
  if (a.fallar) fallar(def, se, ctx, a.fallar, emitir)
  if (a.terminar) terminar(def, se, ctx, cx, emitir)
}

function fallar(def, se, ctx, motivo, emitir) {
  const m = se.mision
  m.terminada = true
  m.fallida = motivo
  m.resultado = { exito: false, motivo, medalla: null, puntos: 0, maximo: 0, resumen: resumen(m.ind, ctx.modelo.config.campana.economia), criterios: [], respuestaIdeal: def.respuestaIdeal }
  emitir({ tipo: 'mision', texto: `Misión fallida: ${motivo}`, fallida: true, pararAceleracion: true })
}

function terminar(def, se, ctx, cx, emitir) {
  const m = se.mision
  // Objetivos que se evalúan al final.
  for (const o of def.objetivos) {
    const so = m.objetivos[o.id]
    if (so.estado !== 'pendiente') continue
    // Evitable: si su «desde» nunca se dio, el jugador se anticipó al problema.
    if (o.evitable && !so.visible) so.estado = 'cumplido'
    else if (o.final) so.estado = evaluar(o.condicion, cx) ? 'cumplido' : 'fallido'
    else so.estado = 'fallido'
  }
  const principales = def.objetivos.filter((o) => o.tipo === 'principal')
  const exito = principales.every((o) => m.objetivos[o.id].estado === 'cumplido')
  const criterios = (def.evaluacion ?? []).map((c) => ({ texto: c.texto, puntos: c.puntos, cumple: evaluar(c.condicion, cx) }))
  for (const o of def.objetivos) criterios.push({ texto: o.texto, puntos: o.tipo === 'principal' ? 0 : 1, cumple: m.objetivos[o.id].estado === 'cumplido', objetivo: true })
  const maximo = criterios.reduce((s, c) => s + c.puntos, 0)
  const puntos = criterios.reduce((s, c) => s + (c.cumple ? c.puntos : 0), 0)
  const f = maximo > 0 ? puntos / maximo : 1
  const umbral = ctx.modelo.config.campana.medallas
  const medalla = !exito ? null : f >= umbral.oro ? 'oro' : f >= umbral.plata ? 'plata' : 'bronce' // bronce: todos los objetivos principales
  const incidentes = {}
  for (const tipo of ['apertura_alivio', 'apertura_seguridad', 'enclavamiento', 'vaporizacion_subita', 'caida_columna']) incidentes[tipo] = cx.incidente(tipo)
  m.terminada = true
  m.resultado = { exito, medalla, puntos, maximo, criterios, resumen: resumen(m.ind, ctx.modelo.config.campana.economia, incidentes), respuestaIdeal: def.respuestaIdeal, motivo: exito ? null : 'No se cumplieron todos los objetivos principales' }
  emitir({ tipo: 'mision', texto: exito ? `Misión cumplida: ${def.titulo}` : `Misión no superada: ${def.titulo}`, terminada: true, pararAceleracion: true })
}

/** Resumen visible de la misión (para la interfaz). */
export function vistaMision(def, se) {
  const m = se.mision
  if (!m) return null
  return {
    id: def.id, capitulo: def.capitulo, titulo: def.titulo, t0: m.t0,
    objetivos: def.objetivos.filter((o) => m.objetivos[o.id].visible).map((o) => ({ id: o.id, texto: o.texto, tipo: o.tipo, estado: m.objetivos[o.id].estado })),
    terminada: m.terminada, fallida: m.fallida, resultado: m.resultado,
  }
}
