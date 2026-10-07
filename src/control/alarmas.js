// Sistema de alarmas (inspirado en ISA-18.2).
//
// Cada alarma tiene una condición (alta, baja, desviación de un lazo, evento
// del proceso, enclavamiento disparado o falla de un transmisor), banda
// muerta, retardo de activación y prioridad (1 crítica … 4 baja).
//
// Estados: normal → activa sin reconocer → (reconocer) activa reconocida →
// (la condición desaparece) normal. Si la condición desaparece antes del
// reconocimiento, queda "retornada sin reconocer" hasta que el operador la
// reconoce. Las alarmas de evento retornan de inmediato.
//
// Supresión por estado de planta: con la alimentación detenida (WI-101 bajo
// el límite durante el retardo configurado) se suprime el grupo "proceso".
// El operador puede archivar (shelve) una alarma por un tiempo limitado.

import { lectura } from './instrumentos.js'

const PRIORIDAD_ENCLAVAMIENTO = 1
const PRIORIDAD_FALLA = 3
const VENTANA_INUNDACION = 600 // s (10 min, criterio ISA-18.2)
const MAX_REGISTRO = 1000

export function construirAlarmas(config, inst, lz, enc) {
  const cfg = config.alarmas
  const lista = []
  for (const a of cfg.alarmas) {
    const def = { ...a, banda: a.banda ?? 0, retardo: a.retardo ?? 0 }
    const [clase, ref] = a.fuente.includes(':') ? a.fuente.split(':') : ['tag', a.fuente]
    if (clase === 'tag') {
      if (!inst.transmisores[ref]) throw new Error(`Alarma ${a.id}: transmisor desconocido "${ref}"`)
      def.clase = 'tag'
      def.tag = ref
      def.unidad = inst.transmisores[ref].etiqueta
    } else if (clase === 'lazo') {
      if (!lz.lazos[ref]) throw new Error(`Alarma ${a.id}: lazo desconocido "${ref}"`)
      def.clase = 'lazo'
      def.lazo = ref
      def.unidad = lz.lazos[ref].unidadPV
    } else if (clase === 'evento') {
      def.clase = 'evento'
      def.evento = ref
    } else throw new Error(`Alarma ${a.id}: fuente inválida "${a.fuente}"`)
    if (!['alta', 'baja', 'desviacion', 'evento'].includes(a.tipo)) throw new Error(`Alarma ${a.id}: tipo inválido "${a.tipo}"`)
    if (![1, 2, 3, 4].includes(a.prioridad)) throw new Error(`Alarma ${a.id}: prioridad inválida`)
    lista.push(def)
  }
  // Alarmas generadas: un enclavamiento disparado y la falla de señal de cada transmisor.
  for (const e of enc.lista) {
    lista.push({
      id: `ENC-${e.id}`, clase: 'enclavamiento', enclavamiento: e.id, tipo: 'evento', prioridad: PRIORIDAD_ENCLAVAMIENTO,
      mensaje: `Enclavamiento ${e.id} disparado: ${e.descripcion}`, banda: 0, retardo: 0, grupo: 'seguridad',
    })
  }
  for (const t of Object.values(inst.transmisores)) {
    lista.push({
      id: `${t.tag}-FS`, clase: 'falla', tag: t.tag, tipo: 'evento', prioridad: PRIORIDAD_FALLA,
      mensaje: `${t.tag}: señal fuera de rango (falla de instrumento)`, banda: 0, retardo: 0, grupo: 'instrumentos',
    })
  }
  const ids = new Set()
  for (const a of lista) {
    if (ids.has(a.id)) throw new Error(`Alarma repetida: ${a.id}`)
    ids.add(a.id)
  }
  const eventos = {}
  for (const a of lista) if (a.clase === 'evento') (eventos[a.evento] ??= []).push(a)
  return { lista, porId: Object.fromEntries(lista.map((a) => [a.id, a])), eventos, supresion: cfg.supresion }
}

export function estadoAlarmas(al, estado) {
  const a = {}
  for (const d of al.lista) a[d.id] = { activa: false, reconocida: true, contador: 0, tActivacion: null, valor: null, archivadaHasta: null }
  return {
    a,
    registro: [], // { t, id, accion: 'activa' | 'retorna' | 'reconocida' | 'archivada' | 'desarchivada', prioridad, mensaje }
    ultimoEvento: estado.nEventos ?? 0,
    supresion: { contador: 0, activa: false },
    activaciones: [], // tiempos de activación en la ventana de inundación
  }
}

function anotar(ca, t, def, accion, valor = null) {
  ca.registro.push({ t, id: def.id, accion, prioridad: def.prioridad, mensaje: def.mensaje, valor })
  if (ca.registro.length > MAX_REGISTRO) ca.registro.splice(0, ca.registro.length - MAX_REGISTRO)
}

function activar(ca, s, def, t, valor) {
  s.activa = true
  s.reconocida = false
  s.tActivacion = t
  s.valor = valor
  ca.activaciones.push(t)
  anotar(ca, t, def, 'activa', valor)
}

export function pasoAlarmas(al, inst, lz, ce, ctx, dt) {
  const ca = ce.alarmas
  const { estado, modelo } = ctx
  const t = estado.paso * modelo.dtR
  // Supresión por planta detenida.
  const sup = al.supresion
  if (sup) {
    const bajo = lectura(inst, ce, sup.tag) < sup.bajo
    ca.supresion.contador = bajo ? ca.supresion.contador + dt : 0
    ca.supresion.activa = ca.supresion.contador >= sup.retardo
  }
  // Eventos nuevos del proceso.
  const nuevos = []
  const ultimo = ca.ultimoEvento
  for (let i = estado.eventos.length - 1; i >= 0 && (estado.eventos[i].n ?? 0) > ultimo; i--) nuevos.push(estado.eventos[i])
  ca.ultimoEvento = estado.nEventos ?? ultimo
  for (const ev of nuevos.reverse()) {
    for (const def of al.eventos[ev.tipo] ?? []) {
      const s = ca.a[def.id]
      if (s.archivadaHasta !== null && t < s.archivadaHasta) continue
      activar(ca, s, def, t, ev.vaso ?? ev.equipo ?? null)
      s.activa = false // las alarmas de evento retornan de inmediato
    }
  }
  for (const def of al.lista) {
    const s = ca.a[def.id]
    if (s.archivadaHasta !== null && t >= s.archivadaHasta) {
      s.archivadaHasta = null
      anotar(ca, t, def, 'desarchivada')
    }
    if (def.clase === 'evento') continue
    const suprimida = (ca.supresion.activa && def.grupo === 'proceso') || s.archivadaHasta !== null
    let entra = false
    let sale = true
    let valor = null
    if (def.clase === 'tag') {
      valor = lectura(inst, ce, def.tag)
      if (def.tipo === 'alta') { entra = valor > def.limite; sale = valor < def.limite - def.banda }
      else { entra = valor < def.limite; sale = valor > def.limite + def.banda }
    } else if (def.clase === 'lazo') {
      const sl = ce.lazos[def.lazo]
      if (sl.modo !== 'MAN' && sl.pv !== undefined) {
        valor = sl.pv - sl.sp
        entra = Math.abs(valor) > def.limite
        sale = Math.abs(valor) < def.limite - def.banda
      }
    } else if (def.clase === 'enclavamiento') {
      entra = ce.enclavamientos[def.enclavamiento].disparado
      sale = !entra
    } else if (def.clase === 'falla') {
      const f = ce.tx[def.tag].falla
      entra = f === 'alto' || f === 'bajo'
      sale = !entra
    }
    if (suprimida) { entra = false; sale = true }
    s.valor = valor
    if (!s.activa) {
      s.contador = entra ? s.contador + dt : 0
      if (entra && s.contador >= def.retardo - 1e-9) activar(ca, s, def, t, valor)
    } else if (sale) {
      s.activa = false
      s.contador = 0
      anotar(ca, t, def, 'retorna', valor)
    }
  }
  // Ventana de inundación.
  while (ca.activaciones.length > 0 && ca.activaciones[0] < t - VENTANA_INUNDACION) ca.activaciones.shift()
}

/** Reconoce una alarma, un grupo de alarmas (id '*' = todas) o archiva/desarchiva. */
export function comandoAlarma(al, ce, ctx, cmd) {
  const ca = ce.alarmas
  const t = ctx.estado.paso * ctx.modelo.dtR
  if (cmd.accion === 'reconocer') {
    for (const def of al.lista) {
      if (cmd.id !== '*' && def.id !== cmd.id) continue
      const s = ca.a[def.id]
      if (!s.reconocida) {
        s.reconocida = true
        anotar(ca, t, def, 'reconocida')
      }
    }
  } else if (cmd.accion === 'archivar') {
    const def = al.porId[cmd.id]
    const s = ca.a[cmd.id]
    s.archivadaHasta = t + (cmd.duracion ?? 3600)
    s.reconocida = true
    s.activa = false
    s.contador = 0
    anotar(ca, t, def, 'archivada')
  } else if (cmd.accion === 'desarchivar') {
    const s = ca.a[cmd.id]
    if (s.archivadaHasta !== null) {
      s.archivadaHasta = null
      anotar(ca, t, al.porId[cmd.id], 'desarchivada')
    }
  }
}

export function validarComandoAlarma(al, cmd) {
  if (!['reconocer', 'archivar', 'desarchivar'].includes(cmd.accion)) throw new Error(`Acción de alarma inválida: ${cmd.accion}`)
  if (!(cmd.accion === 'reconocer' && cmd.id === '*') && !al.porId[cmd.id]) throw new Error(`Alarma desconocida: ${cmd.id}`)
  if (cmd.accion === 'archivar') {
    if (al.porId[cmd.id].prioridad === 1) throw new Error('Las alarmas críticas no se pueden archivar')
    if (cmd.duracion !== undefined && !(typeof cmd.duracion === 'number' && cmd.duracion > 0 && cmd.duracion <= 8 * 3600)) throw new Error('Duración de archivo inválida (máx. 8 h)')
  }
}

/** Lista para la pantalla: alarmas activas o sin reconocer, ordenadas por prioridad y tiempo. */
export function listaAlarmas(al, ce) {
  const ca = ce.alarmas
  const r = []
  for (const def of al.lista) {
    const s = ca.a[def.id]
    if (!s.activa && s.reconocida) continue
    r.push({
      id: def.id, tag: def.tag ?? def.lazo ?? def.enclavamiento ?? null, prioridad: def.prioridad, mensaje: def.mensaje, grupo: def.grupo, activa: s.activa, reconocida: s.reconocida,
      t: s.tActivacion, valor: s.valor, limite: def.limite ?? null, unidad: def.unidad ?? null,
    })
  }
  r.sort((a, b) => a.prioridad - b.prioridad || b.t - a.t)
  return r
}
