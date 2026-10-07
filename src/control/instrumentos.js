// Instrumentación: transmisores, analizadores en línea y laboratorio.
//
// Transmisor: medida = filtro(retardo(valor verdadero)) + ruido + deriva,
// en unidades de ingeniería y saturada a su rango. Fallas posibles:
// 'congelado', 'alto', 'bajo' (fuera de rango) y 'deriva' (lenta).
// Analizador: toma una muestra cada `periodo`, la publica después de
// `analisis` segundos con un error aleatorio y la mantiene hasta la próxima.
// Laboratorio: el operador pide un análisis; el resultado llega entre 20 y
// 40 minutos después, con su propio error.

import { aInterno, desdeInterno } from '../sim/unidades.js'
import { normal, uniforme } from '../sim/aleatorio.js'
import { resolverVariable } from './mediciones.js'

/**
 * Formato compacto de config/instrumentos.json (todos los datos son
 * "supuesto" salvo indicación): rango [mín, máx] y error en la unidad del
 * instrumento; ruido en % del rango; tau, retardo, periodo y análisis en s.
 */
export function construirInstrumentos(config, modelo) {
  const cfg = config.instrumentos
  const transmisores = {}
  for (const t of cfg.transmisores) {
    if (transmisores[t.tag]) throw new Error(`Instrumento repetido: ${t.tag}`)
    if (!Array.isArray(t.rango) || t.rango.length !== 2) throw new Error(`instrumentos.${t.tag}: rango [mín, máx] requerido`)
    const rango = t.rango.map((x) => aInterno(x, t.unidad))
    transmisores[t.tag] = {
      tag: t.tag,
      descripcion: t.descripcion,
      medir: resolverVariable(modelo, t.variable),
      unidad: t.unidad, // unidad de conversión (ver unidades.js)
      etiqueta: t.etiqueta ?? t.unidad,
      rango, // en unidades internas
      rangoMostrar: t.rango,
      ruido: (t.ruido ?? 0) / 100, // fracción del rango
      tau: t.tau ?? 0,
      retardo: t.retardo ?? 0,
      periodo: t.periodo ?? 0, // analizador
      analisis: t.analisis ?? 0,
      error: t.error ? aInterno(t.error, t.unidad) - aInterno(0, t.unidad) : 0, // analizador
      decimales: t.decimales ?? 1,
    }
  }
  const lab = cfg.laboratorio
  const analisis = {}
  for (const [id, a] of Object.entries(lab.analisis)) {
    analisis[id] = {
      id,
      nombre: a.nombre,
      medir: resolverVariable(modelo, a.variable),
      unidad: a.unidad,
      etiqueta: a.etiqueta ?? a.unidad,
      error: aInterno(a.error, a.unidad) - aInterno(0, a.unidad),
      decimales: a.decimales ?? 1,
    }
  }
  return {
    transmisores,
    laboratorio: { analisis, retardoMin: lab.retardo_min * 60, retardoMax: lab.retardo_max * 60 },
  }
}

/** Estado inicial de los instrumentos a partir del valor actual del proceso. */
export function estadoInstrumentos(inst, modelo, estado) {
  const tx = {}
  for (const t of Object.values(inst.transmisores)) {
    const v = t.medir(modelo, estado) ?? 0
    const n = Math.max(1, Math.round(t.retardo / modelo.dtR))
    tx[t.tag] = {
      buf: t.retardo > 0 ? new Array(n).fill(v) : [],
      i: 0,
      filtro: v,
      valor: v, // unidades internas
      deriva: 0,
      falla: null,
      proximaMuestra: t.periodo > 0 ? estado.paso * modelo.dtR : 0,
      pendiente: null,
    }
  }
  return { tx, laboratorio: { pendientes: [], resultados: [] } }
}

/** Avanza todos los transmisores un paso rápido. */
export function pasoInstrumentos(inst, ce, modelo, estado, dt) {
  const t0 = estado.paso * modelo.dtR
  const rng = estado.aleatorio.instrumentos
  for (const t of Object.values(inst.transmisores)) {
    const s = ce.tx[t.tag]
    let v = t.medir(modelo, estado)
    if (v === null || v === undefined || !Number.isFinite(v)) v = s.filtro
    if (t.periodo > 0) {
      // Analizador: muestreo discreto con resultado demorado.
      if (t0 >= s.proximaMuestra) {
        s.pendiente = { t: t0 + t.analisis, valor: v + t.error * normal(rng) }
        s.proximaMuestra = t0 + t.periodo
      }
      if (s.falla === 'deriva') s.deriva += ((t.rango[1] - t.rango[0]) * 0.01 * dt) / 3600
      if (s.pendiente && t0 >= s.pendiente.t) {
        if (s.falla !== 'congelado') s.valor = s.pendiente.valor + s.deriva
        s.pendiente = null
      }
    } else {
      if (t.retardo > 0) {
        const salida = s.buf[s.i]
        s.buf[s.i] = v
        s.i = (s.i + 1) % s.buf.length
        v = salida
      }
      s.filtro = t.tau > 0 ? s.filtro + (v - s.filtro) * (1 - Math.exp(-dt / t.tau)) : v
      if (s.falla === 'deriva') s.deriva += ((t.rango[1] - t.rango[0]) * 0.01 * dt) / 3600 // 1 % del rango por hora
      if (s.falla !== 'congelado') {
        const ruido = t.ruido > 0 ? t.ruido * (t.rango[1] - t.rango[0]) * normal(rng) : 0
        s.valor = s.filtro + ruido + s.deriva
      }
    }
    if (s.falla === 'alto') s.valor = t.rango[1]
    else if (s.falla === 'bajo') s.valor = t.rango[0]
    s.valor = Math.min(t.rango[1], Math.max(t.rango[0], s.valor))
  }
  // Laboratorio: publicar resultados vencidos.
  const lab = ce.laboratorio
  for (let i = lab.pendientes.length - 1; i >= 0; i--) {
    const pnd = lab.pendientes[i]
    if (t0 >= pnd.t) {
      lab.resultados.push(pnd)
      lab.pendientes.splice(i, 1)
      if (lab.resultados.length > 100) lab.resultados.shift()
    }
  }
}

/** Valor de un transmisor en unidades de ingeniería. */
export function lectura(inst, ce, tag) {
  const t = inst.transmisores[tag]
  return desdeInterno(ce.tx[tag].valor, t.unidad)
}

/** Pide un análisis al laboratorio. Devuelve el pedido. */
export function pedirMuestra(inst, ce, modelo, estado, idAnalisis) {
  const a = inst.laboratorio.analisis[idAnalisis]
  const rng = estado.aleatorio.laboratorio
  const t0 = estado.paso * modelo.dtR
  const verdadero = a.medir(modelo, estado) ?? 0
  const lab = inst.laboratorio
  const pedido = {
    analisis: idAnalisis,
    nombre: a.nombre,
    tMuestra: t0,
    t: t0 + lab.retardoMin + (lab.retardoMax - lab.retardoMin) * uniforme(rng),
    valor: desdeInterno(verdadero + a.error * normal(rng), a.unidad),
    unidad: a.etiqueta,
  }
  ce.laboratorio.pendientes.push(pedido)
  return pedido
}
