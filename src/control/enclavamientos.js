// Enclavamientos (lógica de protección).
//
// Cada enclavamiento vigila la lectura de un transmisor. Si la condición se
// mantiene durante `retardo` segundos, se dispara: ejecuta una vez sus
// comandos (p. ej. detener una bomba) y, mientras siga disparado, fuerza la
// salida de los lazos indicados (el lazo queda en MAN). El rearme es manual y
// solo se acepta cuando la condición ya desapareció. El instructor puede
// puentear un enclavamiento (queda anotado en el registro de eventos).
//
// La protección actúa sobre la medición, no sobre el valor verdadero: un
// transmisor en falla puede provocar un disparo en falso (como en planta).

import { lectura } from './instrumentos.js'

export function construirEnclavamientos(config, inst, lz) {
  const lista = config.enclavamientos.enclavamientos.map((e) => {
    if (!inst.transmisores[e.condicion.tag]) throw new Error(`Enclavamiento ${e.id}: transmisor desconocido "${e.condicion.tag}"`)
    if (!['>', '<'].includes(e.condicion.op)) throw new Error(`Enclavamiento ${e.id}: operador inválido "${e.condicion.op}"`)
    for (const a of e.acciones) {
      if (a.lazo && !lz.lazos[a.lazo]) throw new Error(`Enclavamiento ${e.id}: lazo desconocido "${a.lazo}"`)
      if (!a.lazo && !a.comando) throw new Error(`Enclavamiento ${e.id}: acción sin lazo ni comando`)
    }
    return e
  })
  return { lista, porId: Object.fromEntries(lista.map((e) => [e.id, e])) }
}

export function estadoEnclavamientos(enc) {
  const r = {}
  for (const e of enc.lista) r[e.id] = { disparado: false, condicion: false, contador: 0, puenteado: false, tDisparo: null }
  return r
}

function condicion(e, v) {
  return e.condicion.op === '>' ? v > e.condicion.limite : v < e.condicion.limite
}

/**
 * Evalúa todos los enclavamientos. Devuelve las salidas forzadas por lazo:
 * { 'WIC-101': { salida: 0, por: 'I-01' }, … }.
 */
export function pasoEnclavamientos(enc, inst, ce, ctx, dt) {
  const forzados = {}
  const t = ctx.estado.paso * ctx.modelo.dtR
  for (const e of enc.lista) {
    const s = ce.enclavamientos[e.id]
    s.condicion = condicion(e, lectura(inst, ce, e.condicion.tag))
    s.contador = s.condicion ? s.contador + dt : 0
    if (!s.disparado && !s.puenteado && s.condicion && s.contador >= (e.condicion.retardo ?? 0) - 1e-9) {
      s.disparado = true
      s.tDisparo = t
      ctx.evento('enclavamiento', { id: e.id, descripcion: e.descripcion })
      for (const a of e.acciones) if (a.comando) ctx.aplicar(a.comando)
    }
    if (s.disparado) {
      for (const a of e.acciones) if (a.lazo && !forzados[a.lazo]) forzados[a.lazo] = { salida: a.salida, por: e.id }
    }
  }
  return forzados
}

/** Comandos del operador / instructor sobre un enclavamiento. */
export function comandoEnclavamiento(enc, ce, ctx, cmd) {
  const s = ce.enclavamientos[cmd.id]
  if (cmd.accion === 'rearmar') {
    if (!s.disparado) return
    if (s.condicion) {
      ctx.evento('rearme_rechazado', { id: cmd.id })
      return
    }
    s.disparado = false
    s.tDisparo = null
    ctx.evento('rearme_enclavamiento', { id: cmd.id })
  } else if (cmd.accion === 'puentear') {
    s.puenteado = true
    s.disparado = false
    ctx.evento('puente_enclavamiento', { id: cmd.id })
  } else if (cmd.accion === 'quitar_puente') {
    s.puenteado = false
    s.contador = 0
    ctx.evento('quitar_puente_enclavamiento', { id: cmd.id })
  }
}

export function validarComandoEnclavamiento(enc, ce, cmd) {
  if (!enc.porId[cmd.id]) throw new Error(`Enclavamiento desconocido: ${cmd.id}`)
  if (!['rearmar', 'puentear', 'quitar_puente'].includes(cmd.accion)) throw new Error(`Acción de enclavamiento inválida: ${cmd.accion}`)
  if (cmd.accion === 'rearmar' && ce.enclavamientos[cmd.id].condicion) {
    throw new Error(`No se puede rearmar ${cmd.id}: la condición de disparo sigue presente`)
  }
}
