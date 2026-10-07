// Sistema de control distribuido (DCS) como extensión de la planta.
//
// Reúne instrumentos, lazos, bloques de cálculo, enclavamientos, alarmas y
// laboratorio. Corre en cada paso rápido antes de los equipos:
//   1. los transmisores leen el proceso (valor verdadero del paso anterior),
//   2. los enclavamientos evalúan sus condiciones,
//   3. los bloques y lazos calculan y escriben en los actuadores,
//   4. las alarmas evalúan sus condiciones y los eventos nuevos.
// Todo el estado vive en estado.control (se guarda y carga con la planta).
//
// Comandos (además de los del proceso):
//   { tipo: 'lazo', id, accion: 'modo', valor: 'MAN' | 'AUTO' | 'CAS' }
//   { tipo: 'lazo', id, accion: 'consigna', valor }          (unidad del PV)
//   { tipo: 'lazo', id, accion: 'salida', valor }            (% , solo en MAN)
//   { tipo: 'lazo', id, accion: 'sintonia', Kc, Ti, Td }
//   { tipo: 'lazo', id, accion: 'maestro', valor }          (elige entre los "maestros" configurados)
//   { tipo: 'bloque', id, accion: 'activar' | 'desactivar' }
//   { tipo: 'bloque', id, accion: 'parametro', campo, valor }
//   { tipo: 'enclavamiento', id, accion: 'rearmar' | 'puentear' | 'quitar_puente' }
//   { tipo: 'alarma', id | '*', accion: 'reconocer' | 'archivar' | 'desarchivar', duracion? }
//   { tipo: 'laboratorio', analisis }
//   { tipo: 'instrumento', id, falla: null | 'congelado' | 'alto' | 'bajo' | 'deriva' }
//   { tipo: 'actuador', id: lazo, falla: null | 'pegado' }      (instructor)

import { construirInstrumentos, estadoInstrumentos, pasoInstrumentos, pedirMuestra, lectura } from './instrumentos.js'
import { construirLazos, estadoLazos, pasoLazos, cambiarModo } from './lazos.js'
import { construirEnclavamientos, estadoEnclavamientos, pasoEnclavamientos, comandoEnclavamiento, validarComandoEnclavamiento } from './enclavamientos.js'
import { construirAlarmas, estadoAlarmas, pasoAlarmas, comandoAlarma, validarComandoAlarma, listaAlarmas } from './alarmas.js'

const TIPOS = new Set(['lazo', 'bloque', 'enclavamiento', 'alarma', 'laboratorio', 'instrumento', 'actuador'])
const FALLAS = [null, 'congelado', 'alto', 'bajo', 'deriva']
const copiar = (x) => JSON.parse(JSON.stringify(x))

// Rangos admisibles de los parámetros que el operador puede cambiar en los bloques.
const RANGOS_BLOQUE = {
  carga_alcali: { carga: [8, 30], EA_licor_blanco: [60, 180] },
  licor_madera: { relacion: [2, 6], humedad: [20, 70] },
  seguimiento: { ganancia: [0, 2] },
  ritmo: { produccion: [500, 4000], rampa: [10, 600], rendimiento: [40, 65] },
  factor_h: { objetivo: [200, 900], tiempo_superior: [0.2, 4], tiempo_inferior: [0.2, 4], H_resto: [0, 300], ganancia: [0, 0.05], bias_max: [0, 15] },
  kappa: { objetivo: [8, 40], ganancia: [0, 30], Ti: [600, 86400] },
}

/** Fábrica de la extensión de control para crearPlanta(config, { extension }). */
export function extensionControl(config) {
  let sis = null
  const construir = (modelo) => {
    if (sis && sis.modelo === modelo) return sis
    const inst = construirInstrumentos(config, modelo)
    const lz = construirLazos(config, inst)
    const enc = construirEnclavamientos(config, inst, lz)
    const al = construirAlarmas(config, inst, lz, enc)
    sis = { modelo, inst, lz, enc, al }
    return sis
  }

  return {
    clave: 'control',
    inicializar(ctx) {
      const { inst, lz, enc, al } = construir(ctx.modelo)
      const ce = estadoInstrumentos(inst, ctx.modelo, ctx.estado)
      ctx.estado.control = ce
      Object.assign(ce, estadoLazos(lz, inst, ctx, ce))
      ce.enclavamientos = estadoEnclavamientos(enc)
      ce.alarmas = estadoAlarmas(al, ctx.estado)
      // Hasta el primer paso lento no existen los diagnósticos del proceso
      // (niveles, temperaturas de salida): el control arranca después.
      // Si se parte de un estado guardado, ya existen y el control arranca de inmediato.
      ce.listo = !!ctx.estado.diag?.dig
    },

    pasoRapido(ctx) {
      const { inst, lz, enc, al } = construir(ctx.modelo)
      let ce = ctx.estado.control
      if (!ce.listo) {
        if (!ctx.estado.diag?.dig) return
        // Instrumentos y lazos parten del valor actual del proceso (sin golpe).
        const { enclavamientos, alarmas } = ce
        ce = estadoInstrumentos(inst, ctx.modelo, ctx.estado)
        ctx.estado.control = ce
        Object.assign(ce, estadoLazos(lz, inst, ctx, ce), { enclavamientos, alarmas, listo: true })
      }
      pasoInstrumentos(inst, ce, ctx.modelo, ctx.estado, ctx.dt)
      const forzados = pasoEnclavamientos(enc, inst, ce, ctx, ctx.dt)
      pasoLazos(lz, inst, ctx, ce, ctx.dt, forzados)
      pasoAlarmas(al, inst, lz, ce, ctx, ctx.dt)
    },

    maneja: (cmd) => TIPOS.has(cmd?.tipo),

    validar(ctx, cmd) {
      const { inst, lz, enc, al } = construir(ctx.modelo)
      const ce = ctx.estado.control
      if (!ce.listo) throw new Error('El sistema de control todavía está arrancando: intente en unos segundos')
      const numero = (v, nombre = 'valor') => {
        if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`El ${nombre} debe ser un número`)
      }
      if (cmd.tipo === 'lazo') {
        const l = lz.lazos[cmd.id]
        if (!l) throw new Error(`Lazo desconocido: ${cmd.id}`)
        if (cmd.accion === 'modo') {
          if (!['MAN', 'AUTO', 'CAS'].includes(cmd.valor)) throw new Error(`Modo inválido: ${cmd.valor}`)
          if (cmd.valor === 'CAS' && !ce.lazos[cmd.id].maestro) throw new Error(`${cmd.id} no tiene maestro: no admite cascada`)
          if (cmd.valor !== 'MAN' && ce.lazos[cmd.id].forzado) throw new Error(`${cmd.id} está forzado por el enclavamiento ${ce.lazos[cmd.id].forzado}`)
        } else if (cmd.accion === 'consigna') {
          numero(cmd.valor)
          if (cmd.valor < l.pvMin || cmd.valor > l.pvMax) throw new Error(`Consigna fuera del rango ${l.pvMin}–${l.pvMax} ${l.unidadPV}`)
        } else if (cmd.accion === 'salida') {
          numero(cmd.valor)
          if (cmd.valor < 0 || cmd.valor > 100) throw new Error('La salida va de 0 a 100 %')
          if (ce.lazos[cmd.id].modo !== 'MAN') throw new Error('La salida solo se fija en manual')
          if (ce.lazos[cmd.id].forzado) throw new Error(`${cmd.id} está forzado por el enclavamiento ${ce.lazos[cmd.id].forzado}`)
        } else if (cmd.accion === 'maestro') {
          if (!l.maestros.includes(cmd.valor)) throw new Error(`${cmd.id} admite como maestro solo ${l.maestros.join(', ') || 'ninguno'}`)
        } else if (cmd.accion === 'sintonia') {
          for (const k of ['Kc', 'Ti', 'Td']) {
            if (cmd[k] === undefined) continue
            numero(cmd[k], k)
            if (cmd[k] < 0) throw new Error(`${k} no puede ser negativo`)
          }
          if (cmd.Kc !== undefined && cmd.Kc === 0) throw new Error('Kc no puede ser cero')
        } else throw new Error(`Acción de lazo inválida: ${cmd.accion}`)
      } else if (cmd.tipo === 'bloque') {
        const b = lz.bloques[cmd.id]
        if (!b) throw new Error(`Bloque desconocido: ${cmd.id}`)
        if (cmd.accion === 'parametro') {
          if (!(cmd.campo in ce.bloques[cmd.id].parametros) || typeof ce.bloques[cmd.id].parametros[cmd.campo] !== 'number') {
            throw new Error(`El bloque ${cmd.id} no tiene el parámetro numérico "${cmd.campo}"`)
          }
          numero(cmd.valor)
          const r = RANGOS_BLOQUE[b.tipo]?.[cmd.campo]
          if (r && (cmd.valor < r[0] || cmd.valor > r[1])) throw new Error(`${cmd.campo} debe estar entre ${r[0]} y ${r[1]}`)
          if (!r && !(cmd.valor > 0)) throw new Error(`${cmd.campo} debe ser positivo`)
        } else if (cmd.accion === 'activar') {
          if (b.tipo === 'ritmo' && !(ce.lazos['WIC-101'].sp > 1)) throw new Error('Con la alimentación detenida no hay ritmo que coordinar: fije antes la consigna de WIC-101')
        } else if (cmd.accion !== 'desactivar') throw new Error(`Acción de bloque inválida: ${cmd.accion}`)
      } else if (cmd.tipo === 'enclavamiento') validarComandoEnclavamiento(enc, ce, cmd)
      else if (cmd.tipo === 'alarma') validarComandoAlarma(al, cmd)
      else if (cmd.tipo === 'laboratorio') {
        if (!inst.laboratorio.analisis[cmd.analisis]) throw new Error(`Análisis desconocido: ${cmd.analisis}`)
      } else if (cmd.tipo === 'instrumento') {
        if (!inst.transmisores[cmd.id]) throw new Error(`Instrumento desconocido: ${cmd.id}`)
        if (!FALLAS.includes(cmd.falla ?? null)) throw new Error(`Falla inválida: ${cmd.falla}`)
      } else if (cmd.tipo === 'actuador') {
        if (!lz.lazos[cmd.id]?.act) throw new Error(`El lazo ${cmd.id} no tiene actuador propio`)
        if (![null, 'pegado'].includes(cmd.falla ?? null)) throw new Error(`Falla inválida: ${cmd.falla}`)
      }
    },

    comando(ctx, cmd) {
      const { inst, lz, enc, al } = construir(ctx.modelo)
      const ce = ctx.estado.control
      if (cmd.tipo === 'lazo') {
        const s = ce.lazos[cmd.id]
        if (cmd.accion === 'modo') {
          if (s.forzado && cmd.valor !== 'MAN') return
          cambiarModo(s, cmd.valor)
        } else if (cmd.accion === 'consigna') {
          s.sp = cmd.valor
          // Si el lazo estaba en cascada, el operador toma la consigna: pasa a AUTO.
          if (s.modo === 'CAS') cambiarModo(s, 'AUTO')
        } else if (cmd.accion === 'salida') {
          if (s.modo === 'MAN' && !s.forzado) s.salida = cmd.valor
        } else if (cmd.accion === 'maestro') {
          s.maestro = cmd.valor
        } else if (cmd.accion === 'sintonia') {
          for (const k of ['Kc', 'Ti', 'Td']) if (cmd[k] !== undefined) s[k] = cmd[k]
          // El integral se recalcula para que la salida no salte.
          s.inicializar = true
        }
      } else if (cmd.tipo === 'bloque') {
        const sb = ce.bloques[cmd.id]
        if (cmd.accion === 'activar' && !sb.activo) {
          sb.activo = true
          // Cada activación toma como base el estado actual (la coordinación de
          // ritmo ya la trae: la renueva mientras está inactiva, ver lazos.js).
          if (lz.bloques[cmd.id].tipo !== 'ritmo' || !sb.base) sb.base = null
          sb.bias = 0
          delete sb.ultimo
          delete sb.Wbase
          delete sb.filtros // los filtros parten del valor actual, no del de la última activación
        } else if (cmd.accion === 'desactivar') sb.activo = false
        else if (cmd.accion === 'parametro') sb.parametros[cmd.campo] = cmd.valor
      } else if (cmd.tipo === 'enclavamiento') comandoEnclavamiento(enc, ce, ctx, cmd)
      else if (cmd.tipo === 'alarma') comandoAlarma(al, ce, ctx, cmd)
      else if (cmd.tipo === 'laboratorio') pedirMuestra(inst, ce, ctx.modelo, ctx.estado, cmd.analisis)
      else if (cmd.tipo === 'instrumento') {
        const s = ce.tx[cmd.id]
        s.falla = cmd.falla ?? null
        if (!s.falla) s.deriva = 0
        ctx.evento('falla_instrumento', { tag: cmd.id, falla: s.falla })
      } else if (cmd.tipo === 'actuador') {
        ce.lazos[cmd.id].act.pegado = cmd.falla === 'pegado'
        ctx.evento('falla_actuador', { lazo: cmd.id, falla: cmd.falla ?? null })
      }
    },

    instantanea(ctx) {
      const { inst, lz, enc, al } = construir(ctx.modelo)
      const ce = ctx.estado.control
      const t = ctx.estado.paso * ctx.modelo.dtR
      const transmisores = {}
      for (const tx of Object.values(inst.transmisores)) {
        const s = ce.tx[tx.tag]
        transmisores[tx.tag] = {
          valor: lectura(inst, ce, tx.tag),
          unidad: tx.etiqueta,
          rango: tx.rangoMostrar,
          decimales: tx.decimales,
          descripcion: tx.descripcion,
          calidad: s.falla === 'alto' || s.falla === 'bajo' ? 'mala' : 'buena',
          analizador: tx.periodo > 0,
        }
      }
      const lazos = {}
      for (const l of Object.values(lz.lazos)) {
        const s = ce.lazos[l.tag]
        lazos[l.tag] = {
          descripcion: l.descripcion, pv: s.pv, sp: s.sp, salida: s.salida, modo: s.modo, unidad: l.unidadPV, rango: [l.pvMin, l.pvMax],
          Kc: s.Kc, Ti: s.Ti, Td: s.Td, accion: l.accion, maestro: s.maestro, maestros: l.maestros, forzado: s.forzado, siguiendo: !!s.siguiendo, retenido: !!s.retenido,
          transmisor: l.pv, actuador: l.salida, posicion: s.act ? s.act.pos : null, pegado: !!s.act?.pegado,
        }
      }
      const bloques = {}
      for (const b of Object.values(lz.bloques)) {
        const sb = ce.bloques[b.tag]
        bloques[b.tag] = { descripcion: b.descripcion, tipo: b.tipo, activo: sb.activo, parametros: copiar(sb.parametros), salida: sb.salida, Hprevisto: sb.Hprevisto ?? null }
      }
      const enclavamientos = {}
      for (const e of enc.lista) {
        const se = ce.enclavamientos[e.id]
        // condicion: la regla configurada; presente: si la condición se cumple ahora.
        enclavamientos[e.id] = { descripcion: e.descripcion, condicion: e.condicion, presente: se.condicion, disparado: se.disparado, puenteado: se.puenteado, tDisparo: se.tDisparo }
      }
      return {
        t,
        transmisores,
        lazos,
        bloques,
        enclavamientos,
        alarmas: {
          lista: listaAlarmas(al, ce),
          registro: ce.alarmas.registro.slice(-200),
          suprimidas: ce.alarmas.supresion.activa,
          activacionesUltimos10min: ce.alarmas.activaciones.length,
          archivadas: Object.entries(ce.alarmas.a).filter(([, s]) => s.archivadaHasta !== null).map(([id, s]) => ({ id, hasta: s.archivadaHasta })),
        },
        laboratorio: {
          analisis: Object.fromEntries(Object.values(inst.laboratorio.analisis).map((a) => [a.id, { nombre: a.nombre, unidad: a.etiqueta }])),
          pendientes: ce.laboratorio.pendientes.map((p) => ({ analisis: p.analisis, nombre: p.nombre, tMuestra: p.tMuestra })),
          resultados: copiar(ce.laboratorio.resultados.slice(-30)),
        },
      }
    },
  }
}
