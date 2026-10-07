// Director de escenarios: extensión de la planta que maneja los eventos del
// catálogo (a mano o con el generador aleatorio), los indicadores del turno,
// la misión en curso, los mensajes para la interfaz (radio, teléfono,
// objetivos, pistas) y el libro de novedades. Determinista y guardable:
// todo su estado vive en estado.escenario.
//
// Comandos:
//   { tipo: 'evento', accion: 'iniciar', id, parametros? } · { tipo: 'evento', accion: 'terminar', id }
//   { tipo: 'generador', activo, dificultad }
//   { tipo: 'mision', accion: 'iniciar', id } · { tipo: 'mision', accion: 'abandonar' }
//   { tipo: 'jugador', evento, valor? }      acciones de la interfaz (pantalla abierta, carátula, radio…)
//   { tipo: 'pistas', activo }
//   { tipo: 'nota', texto }                  nota del operador en el libro de novedades

import { construirCatalogo, estadoEventos, iniciarEvento, terminarEvento, pasoEventos } from './eventos.js'
import { estadoIndicadores, acumular, resumen } from './indicadores.js'
import { iniciarMision, pasoMision, vistaMision } from '../misiones/motor.js'
import { buscarMision } from '../misiones/campana.js'

const TIPOS = new Set(['evento', 'generador', 'mision', 'jugador', 'pistas', 'nota'])
const MAX_MENSAJES = 200
const MAX_LIBRO = 500

/** Incidentes ocurridos desde el inicio del turno. */
function incidentesDesde(ahora, antes = {}) {
  return Object.fromEntries(Object.entries(ahora).map(([k, v]) => [k, v - (antes[k] ?? 0)]))
}

export function extensionDirector(config) {
  const cat = construirCatalogo(config)

  function emitir(se, ctx, m) {
    const t = ctx.estado.paso * ctx.modelo.dtR
    se.mensajes.push({ n: ++se.nMensaje, t, ...m })
    if (se.mensajes.length > MAX_MENSAJES) se.mensajes.splice(0, se.mensajes.length - MAX_MENSAJES)
    if (m.texto) anotar(se, t, m.tipo, m.quien ? `${m.quien}: ${m.texto}` : m.texto)
  }
  function anotar(se, t, tipo, texto) {
    se.libro.push({ t, tipo, texto })
    if (se.libro.length > MAX_LIBRO) se.libro.splice(0, se.libro.length - MAX_LIBRO)
  }
  const avisoEvento = (se, ctx) => (def) => {
    if (def.aviso) emitir(se, ctx, { tipo: 'dialogo', ...def.aviso })
    else anotar(se, ctx.estado.paso * ctx.modelo.dtR, 'evento', def.nombre)
  }

  return {
    clave: 'escenario',
    inicializar(ctx) {
      ctx.estado.escenario = {
        eventos: estadoEventos(),
        mensajes: [], nMensaje: 0, libro: [],
        jugador: [], pistas: true, mision: null,
        turno: { ...estadoIndicadores(ctx.estado.paso * ctx.modelo.dtR), incidentes0: { ...ctx.estado.incidentes } },
      }
    },

    pasoRapido(ctx) {
      const se = ctx.estado.escenario
      pasoEventos(cat, se, ctx, avisoEvento(se, ctx))
      if ((ctx.estado.paso + 1) % ctx.modelo.pasosPorLento !== 0) return
      // Una vez por paso lento (los diagnósticos del proceso cambian a ese ritmo).
      const dtL = ctx.modelo.dtL
      acumular(se.turno, ctx, config.campana.especificacion, dtL)
      if (se.mision && !se.mision.terminada) {
        const def = buscarMision(se.mision.id)
        pasoMision(def, se, ctx, dtL, {
          emitir: (m) => emitir(se, ctx, m),
          evento: (id, p) => iniciarEvento(cat, se, ctx, id, p),
        })
      }
    },

    maneja: (cmd) => TIPOS.has(cmd?.tipo),

    validar(ctx, cmd) {
      const se = ctx.estado.escenario
      if (cmd.tipo === 'evento') {
        if (!['iniciar', 'terminar'].includes(cmd.accion)) throw new Error(`Acción de evento inválida: ${cmd.accion}`)
        if (!cat.porId[cmd.id]) throw new Error(`Evento desconocido: ${cmd.id}`)
        if (cmd.accion === 'iniciar') {
          const ops = cat.porId[cmd.id].opciones ?? {}
          for (const [k, v] of Object.entries(cmd.parametros ?? {})) {
            if (!ops[k]?.includes(v)) throw new Error(`Parámetro inválido del evento ${cmd.id}: ${k}=${v}`)
          }
        }
        if (cmd.accion === 'terminar' && !se.eventos.activos.some((a) => a.id === cmd.id && a.fase === 'activo')) throw new Error(`El evento ${cmd.id} no está activo`)
      } else if (cmd.tipo === 'generador') {
        if (typeof cmd.activo !== 'boolean') throw new Error('generador: activo debe ser true o false')
        if (cmd.dificultad !== undefined && !cat.generador.intervalo_medio[cmd.dificultad]) throw new Error('Dificultad inválida (1 a 3)')
      } else if (cmd.tipo === 'mision') {
        if (cmd.accion === 'iniciar' && !buscarMision(cmd.id)) throw new Error(`Misión desconocida: ${cmd.id}`)
        if (!['iniciar', 'abandonar'].includes(cmd.accion)) throw new Error(`Acción de misión inválida: ${cmd.accion}`)
      } else if (cmd.tipo === 'jugador') {
        if (typeof cmd.evento !== 'string' || cmd.evento.length > 40) throw new Error('Evento del jugador inválido')
      } else if (cmd.tipo === 'nota') {
        if (typeof cmd.texto !== 'string' || !cmd.texto.trim() || cmd.texto.length > 500) throw new Error('La nota debe tener entre 1 y 500 caracteres')
      }
    },

    comando(ctx, cmd) {
      const se = ctx.estado.escenario
      const t = ctx.estado.paso * ctx.modelo.dtR
      if (cmd.tipo === 'evento') {
        if (cmd.accion === 'iniciar') iniciarEvento(cat, se, ctx, cmd.id, cmd.parametros ?? {}, avisoEvento(se, ctx))
        else {
          const inst = se.eventos.activos.find((a) => a.id === cmd.id && a.fase === 'activo')
          if (inst) terminarEvento(cat, se, ctx, inst)
        }
      } else if (cmd.tipo === 'generador') {
        se.eventos.generador.activo = cmd.activo
        if (cmd.dificultad !== undefined) se.eventos.generador.dificultad = cmd.dificultad
        se.eventos.generador.proximo = null
      } else if (cmd.tipo === 'mision') {
        if (cmd.accion === 'iniciar') {
          const def = buscarMision(cmd.id)
          iniciarMision(def, se, ctx)
          se.turno = { ...estadoIndicadores(t), incidentes0: { ...ctx.estado.incidentes } }
          emitir(se, ctx, { tipo: 'mision', texto: `${def.capitulo}. ${def.titulo}`, titulo: true, capitulo: def.capitulo, nombre: def.titulo })
        } else se.mision = null
      } else if (cmd.tipo === 'jugador') {
        const clave = cmd.valor !== undefined ? `${cmd.evento}:${cmd.valor}` : cmd.evento
        if (!se.jugador.includes(clave)) {
          se.jugador.push(clave)
          if (se.jugador.length > 300) se.jugador.shift()
        }
      } else if (cmd.tipo === 'pistas') se.pistas = !!cmd.activo
      else if (cmd.tipo === 'nota') anotar(se, t, 'nota', cmd.texto.trim())
    },

    instantanea(ctx) {
      const se = ctx.estado.escenario
      const def = se.mision ? buscarMision(se.mision.id) : null
      return {
        mensajes: se.mensajes.slice(-40),
        libro: se.libro.slice(-150),
        eventosActivos: se.eventos.activos.map((a) => ({ id: a.id, nombre: cat.porId[a.id].nombre, fase: a.fase, t0: a.t0, fin: a.fin })),
        catalogo: cat.lista.map((e) => ({ id: e.id, nombre: e.nombre, categoria: e.categoria, dificultad: e.dificultad })),
        generador: { ...se.eventos.generador },
        pistas: se.pistas,
        mision: def ? vistaMision(def, se) : null,
        turno: resumen(se.turno, config.campana.economia, incidentesDesde(ctx.estado.incidentes, se.turno.incidentes0)),
      }
    },
  }
}
