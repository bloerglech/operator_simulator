// Condiciones de las misiones, escritas como datos. Formas admitidas:
//   { tiempo: s }                         tiempo de misión ≥ s
//   { tag, op, valor } · { tag, entre }   lectura de un transmisor (unidad del DCS)
//   { lazo, modo } · { lazo, campo, op, valor }   modo o campo (sp, salida, pv) de un lazo
//   { kpi, op, valor }                    valor verdadero: kappa, rechazos, viscosidad, rendimiento, produccion
//   { indicador, op, valor }              indicador acumulado de la misión (ver indicadores.js → resumen)
//   { jugador, valor? }                   acción del jugador informada por la interfaz (pantalla, caratula, tendencia, radio, cerca, velocidad…)
//   { comando: { tipo, accion?, id?, … } } el operador envió un comando que coincide (en un objetivo:
//                                         después de que se mostró)
//   { malla: id, conmutacion: bool }       estado de la conmutación de un juego de mallas
//   { laboratorio: análisis }             llegó un resultado de laboratorio de ese análisis
//   { alarmasSinReconocer: n }            a lo más n alarmas sin reconocer
//   { objetivo: id } · { paso: id }       objetivo cumplido · paso del guion ejecutado
//   { enclavamiento: id }                 enclavamiento disparado
//   { incidente: tipo, desde?, op?, valor? } ocurrió un evento del proceso (apertura_alivio, …) en la misión
//                                         (o desde que se ejecutó el paso del guion `desde`); con op, cuántas veces
//   { bomba: id, marcha: bool }           estado de una bomba
//   { y: [...] } · { o: [...] } · { no: c }
// op: '<', '<=', '>', '>=', '=='; entre: [mín, máx].

function comparar(v, c) {
  if (v === null || v === undefined || !Number.isFinite(v)) return false
  if (c.entre) return v >= c.entre[0] && v <= c.entre[1]
  switch (c.op) {
    case '<': return v < c.valor
    case '<=': return v <= c.valor
    case '>': return v > c.valor
    case '>=': return v >= c.valor
    case '==': return v === c.valor
    default: throw new Error(`Operador desconocido en una condición: ${c.op}`)
  }
}

/** true si todos los campos del patrón coinciden con el comando. */
function coincide(cmd, patron) {
  return Object.entries(patron).every(([k, v]) => (v !== null && typeof v === 'object' ? coincide(cmd[k] ?? {}, v) : cmd[k] === v))
}

export function evaluar(c, cx) {
  if (c.y) return c.y.every((x) => evaluar(x, cx))
  if (c.o) return c.o.some((x) => evaluar(x, cx))
  if (c.no) return !evaluar(c.no, cx)
  if (c.tiempo !== undefined) return cx.t >= c.tiempo
  if (c.tag) return comparar(cx.control().transmisores[c.tag]?.valor, c)
  if (c.lazo) {
    const l = cx.control().lazos[c.lazo]
    if (c.modo) return l?.modo === c.modo
    return comparar(l?.[c.campo ?? 'sp'], c)
  }
  if (c.kpi) return comparar(cx.kpi(c.kpi), c)
  if (c.indicador) return comparar(cx.indicador(c.indicador), c)
  if (c.jugador) return cx.jugador.includes(c.valor !== undefined ? `${c.jugador}:${c.valor}` : c.jugador) ||
    (c.valor === undefined && cx.jugador.some((x) => x.startsWith(`${c.jugador}:`)))
  if (c.comando) return cx.comandos().some((r) => coincide(r, c.comando))
  if (c.malla) return cx.mallas()[c.malla]?.conmutacion === c.conmutacion
  if (c.laboratorio) return cx.laboratorio().some((r) => r.analisis === c.laboratorio)
  if (c.alarmasSinReconocer !== undefined) return cx.sinReconocer() <= c.alarmasSinReconocer
  if (c.objetivo) return cx.objetivos[c.objetivo]?.estado === 'cumplido'
  if (c.paso) return !!cx.guion[c.paso]
  if (c.enclavamiento) return !!cx.control().enclavamientos[c.enclavamiento]?.disparado
  if (c.incidente) return c.op ? comparar(cx.incidente(c.incidente, c.desde), c) : cx.incidente(c.incidente, c.desde) > 0
  if (c.bomba) return !!cx.bombas()[c.bomba]?.marcha === c.marcha
  throw new Error(`Condición desconocida: ${JSON.stringify(c)}`)
}

/** Revisa la forma de una condición (para validar las misiones al cargarlas). */
export function revisar(c, ruta) {
  if (!c || typeof c !== 'object') throw new Error(`${ruta}: condición inválida`)
  for (const k of ['y', 'o']) if (c[k]) return c[k].forEach((x, i) => revisar(x, `${ruta}.${k}[${i}]`))
  if (c.no) return revisar(c.no, `${ruta}.no`)
  const claves = ['tiempo', 'tag', 'lazo', 'kpi', 'indicador', 'jugador', 'comando', 'malla', 'laboratorio', 'alarmasSinReconocer', 'objetivo', 'paso', 'enclavamiento', 'incidente', 'bomba']
  if (!claves.some((k) => c[k] !== undefined)) throw new Error(`${ruta}: condición sin tipo conocido`)
  if (c.malla && typeof c.conmutacion !== 'boolean') throw new Error(`${ruta}: falta conmutacion (true o false)`)
  if (c.bomba && typeof c.marcha !== 'boolean') throw new Error(`${ruta}: falta marcha (true o false)`)
  if ((c.tag || c.kpi || c.indicador || (c.lazo && !c.modo)) && !c.entre && !c.op) throw new Error(`${ruta}: falta op o entre`)
}
