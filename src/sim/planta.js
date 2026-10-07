// Planta: interfaz única entre la simulación y cualquier presentación.
//
//   const planta = crearPlanta(config, { semilla, modo })
//   planta.avanzar(segundos)      // pasos fijos internos; no depende de cómo se parta el tiempo
//   planta.enviarComando(cmd)     // se aplica al inicio del próximo paso rápido
//   planta.leerEstado(opciones)   // instantánea (copia) para pantallas, 3D y misiones
//   planta.guardar() / planta.cargar(json)
//
// No usa DOM, reloj del sistema ni Math.random: el tiempo es el contador de
// pasos y el azar viene de los generadores con semilla del estado.

import { construirModelo } from './modelo.js'
import { crearEstadoInicial, parcelaFresca } from './estadoInicial.js'
import { pasoVaso } from './vaso.js'
import { empujar, extraer } from './tubo.js'
import { paqueteVacio, sumarPaquete, volumenPaquete } from './materia.js'
import { sumarPaqueteA, cierreBalances } from './contabilidad.js'
import { incrementoH } from './factorH.js'
import { reaccionarParcela, calidadPulpa } from './cinetica.js'
import { instantanea } from './instantanea.js'
import { pasoRapidoEquipos, factorCorriente, cerrarPresion, registrarEvento } from './pasoRapido.js'
import { pasoSilo, calentar, entregarAEquipo, pasoFlashYEstanque, kgPorRevolucion } from './equipos.js'
import { pasoMalla } from './mallas.js'

const copiar = (x) => JSON.parse(JSON.stringify(x))

/**
 * opciones: { semilla, modo: 'operacion' | 'vacio', extension }
 * `extension` es una fábrica (o una lista de fábricas) (config) => { clave,
 * inicializar, pasoRapido, maneja, validar, comando, instantanea } que agrega
 * capas sobre el proceso (el control en src/control, el director de
 * escenarios y misiones en src/escenarios) sin que el simulador dependa de
 * ellas. Cada una guarda su estado en estado[clave] y corre en cada paso
 * rápido, en el orden de la lista, antes de los equipos.
 */
export function crearPlanta(config, opciones = {}) {
  let modelo = construirModelo(config)
  let estado = crearEstadoInicial(modelo, opciones)
  let cola = [] // comandos pendientes
  let pendiente = 0 // segundos solicitados aún no simulados
  const fabricas = [opciones.extension ?? []].flat()
  let exts = []
  const extPara = (cmd) => exts.find((e) => e.maneja(cmd))
  const ctx = () => ({
    modelo,
    estado,
    dt: modelo.dtR,
    aplicar: (cmd) => aplicarComando(modelo, estado, cmd, true),
    validar: (cmd) => validarComando(modelo, estado, cmd),
    /** Ejecuta cualquier comando (del proceso o de una extensión) desde una extensión. */
    ejecutar(cmd) {
      const e = extPara(cmd)
      if (e) {
        e.validar(ctx(), cmd)
        e.comando(ctx(), cmd)
      } else {
        validarComando(modelo, estado, cmd)
        aplicarComando(modelo, estado, cmd, true)
      }
    },
    /** Instantánea de otra extensión (p. ej. 'control'). */
    leer: (clave, op) => exts.find((e) => e.clave === clave)?.instantanea(ctx(), op ?? {}) ?? null,
    evento: (tipo, datos) => registrarEvento(modelo, estado, tipo, datos),
  })
  function crearExtensiones() {
    exts = fabricas.map((f) => f(modelo.config))
    for (const e of exts) if (!estado[e.clave]) e.inicializar(ctx())
  }
  crearExtensiones()

  function avanzar(segundos) {
    pendiente += segundos
    const n = Math.floor(pendiente / modelo.dtR + 1e-9)
    pendiente -= n * modelo.dtR
    if (pendiente < 0) pendiente = 0
    for (let i = 0; i < n; i++) pasoRapido()
  }

  function pasoRapido() {
    if (cola.length > 0) {
      // La cola se vacía antes de aplicar: un comando que falla no se repite en cada paso.
      const lote = cola
      cola = []
      for (const cmd of lote) {
        try {
          const e = extPara(cmd)
          if (e) {
            e.comando(ctx(), cmd)
            anotarComando(estado, cmd)
          } else aplicarComando(modelo, estado, cmd)
        } catch (err) {
          registrarEvento(modelo, estado, 'comando_fallido', { comando: cmd.tipo, error: String(err?.message ?? err) })
        }
      }
    }
    for (const e of exts) e.pasoRapido(ctx())
    pasoRapidoEquipos(modelo, estado, modelo.dtR)
    estado.paso += 1
    if (estado.paso % modelo.pasosPorLento === 0) pasoLento(modelo, estado)
  }

  function enviarComando(cmd) {
    const e = extPara(cmd)
    if (e) e.validar(ctx(), cmd)
    else validarComando(modelo, estado, cmd)
    cola.push(copiar(cmd))
  }

  return {
    avanzar,
    enviarComando,
    leerEstado: (op) => {
      // soloControl: solo la instantánea del control (más liviana: tendencias).
      if (op?.soloControl) return { t: estado.paso * modelo.dtR, control: ctx().leer('control', op) }
      const s = instantanea(modelo, estado, op)
      for (const e of exts) s[e.clave] = e.instantanea(ctx(), op ?? {})
      return s
    },
    balances: () => cierreBalances(modelo, estado),
    tiempo: () => estado.paso * modelo.dtR,
    guardar: () => copiar({ formato: 'simulador-digestor', version: 1, config: modelo.config, estado, cola, pendiente }),
    cargar(json) {
      const datos = typeof json === 'string' ? JSON.parse(json) : copiar(json)
      if (datos.formato !== 'simulador-digestor') throw new Error('Archivo de guardado no reconocido')
      // Una partida guardada con una versión anterior no trae los parámetros
      // nuevos: se completan con los de la configuración actual.
      modelo = construirModelo(completarConfig(datos.config, config))
      estado = datos.estado
      cola = datos.cola ?? []
      pendiente = datos.pendiente ?? 0
      crearExtensiones()
    },
    /** Acceso de solo lectura al modelo (geometría, corrientes) para herramientas y pruebas. */
    modelo: () => modelo,
    /** Estado interno (solo para pruebas y herramientas; las pantallas usan leerEstado). */
    estadoInterno: () => estado,
  }
}

/**
 * Agrega a `guardada` las claves de objeto que solo existen en `actual`
 * (recursivo). Los valores y las listas guardadas se respetan: describen el
 * estado de esa partida.
 */
export function completarConfig(guardada, actual) {
  if (!guardada || typeof guardada !== 'object' || Array.isArray(guardada)) return guardada
  if (!actual || typeof actual !== 'object' || Array.isArray(actual)) return guardada
  const r = { ...guardada }
  for (const [k, v] of Object.entries(actual)) r[k] = k in r ? completarConfig(r[k], v) : v
  return r
}

// ---------------------------------------------------------------------------
// Comandos

const CAMPOS_CORRIENTE = ['caudal', 'caudalMadera', 'T_salida', 'velocidad']
const MAX_REGISTRO = 5000 // comandos del operador que se conservan (para repetir una partida)

function anotarComando(estado, cmd) {
  estado.registro.push({ paso: estado.paso, ...cmd })
  if (estado.registro.length > MAX_REGISTRO) estado.registro.splice(0, estado.registro.length - MAX_REGISTRO)
}

/**
 * Comandos:
 *   { tipo: 'ajustar', id: corriente, campo: 'caudal'|'caudalMadera'|'T_salida', valor }
 *   { tipo: 'fuente', id: fuente, campo, valor }        (composición o propiedad de una fuente)
 *   { tipo: 'valvula', id, valor }                       (comando de apertura 0–1)
 *   { tipo: 'bomba', id, accion: 'partir' | 'detener' }
 *   { tipo: 'venteo', id: vaso, accion: 'abrir' | 'cerrar' }
 *   { tipo: 'calentador', id, accion: 'conmutar' | 'lavado_acido' }  (unidad de respaldo; limpieza)
 *   { tipo: 'calentador', id, accion: 'vapor', valor }  (apertura de la válvula de vapor 0–1; null = consigna ideal)
 *   { tipo: 'flash', id, valor }  (caudal de salida m³/s; null = control de nivel ideal)
 *   { tipo: 'servicio', id, valor }  (presionVaporMP, presionVaporBP, vaporBPMax, limiteEvaporadores, energia (0/1),
 *                                     transportadorSilo, lavado, Tpatio, vaporFlashSilo — también perturbaciones)
 *   { tipo: 'mallas', id, accion: 'retrolavar' | 'conmutacion_on' | 'conmutacion_off' | 'lavado_acido' }
 *   { tipo: 'perturbar', id: 'colgamiento', vaso, valor: altura (m) } · { id: 'soltar_columna', vaso }
 *   { tipo: 'perturbar', id: 'friccion', vaso, valor } · { id: 'finos', valor }  (multiplicadores)
 *   { tipo: 'perturbar', id: 'incrustacion', equipo: calentador, valor }  (factor f de la unidad activa)
 *   { tipo: 'perturbar', id: 'canalizacion', vaso, valor }  (fracción 0–0,9 del contacto licor-astilla que se pierde)
 *   { tipo: 'perturbar', id: 'taponamiento', malla, valor }  (aumento de la resistencia por finos, en R0)
 * En las astillas, 'caudalMadera' fija la velocidad del medidor para ese caudal con la densidad actual.
 */
function validarComando(modelo, estado, cmd) {
  const numero = () => {
    if (typeof cmd.valor !== 'number' || !Number.isFinite(cmd.valor)) throw new Error('El valor debe ser un número')
  }
  if (cmd.tipo === 'ajustar') {
    if (!modelo.corrientePorId[cmd.id]) throw new Error(`Corriente desconocida: ${cmd.id}`)
    if (!CAMPOS_CORRIENTE.includes(cmd.campo) || estado.ajustes[cmd.id][cmd.campo] === undefined) {
      throw new Error(`La corriente ${cmd.id} no tiene el campo ajustable "${cmd.campo}"`)
    }
    numero()
  } else if (cmd.tipo === 'fuente') {
    const f = estado.fuentes[cmd.id]
    if (!f) throw new Error(`Fuente desconocida: ${cmd.id}`)
    const esEspecie = modelo.idx[cmd.campo] !== undefined && f.c
    if (!esEspecie && !(cmd.campo in f && cmd.campo !== 'c')) {
      throw new Error(`La fuente ${cmd.id} no tiene el campo "${cmd.campo}"`)
    }
    numero()
  } else if (cmd.tipo === 'valvula') {
    if (!modelo.valvulas[cmd.id]) throw new Error(`Válvula desconocida: ${cmd.id}`)
    numero()
  } else if (cmd.tipo === 'bomba') {
    if (!modelo.bombas[cmd.id]) throw new Error(`Bomba desconocida: ${cmd.id}`)
    if (!['partir', 'detener'].includes(cmd.accion)) throw new Error('Acción de bomba: partir o detener')
    if (cmd.accion === 'partir' && (estado.servicios.energia ?? 1) <= 0) throw new Error('Sin energía eléctrica: la bomba no puede partir')
  } else if (cmd.tipo === 'venteo') {
    if (!modelo.vasoPorId[cmd.id]) throw new Error(`Vaso desconocido: ${cmd.id}`)
    if (!['abrir', 'cerrar'].includes(cmd.accion)) throw new Error('Acción de venteo: abrir o cerrar')
  } else if (cmd.tipo === 'calentador') {
    if (!modelo.equipos.calentadores[cmd.id]) throw new Error(`Calentador desconocido: ${cmd.id}`)
    if (!['conmutar', 'lavado_acido', 'vapor'].includes(cmd.accion)) throw new Error('Acción de calentador: conmutar, lavado_acido o vapor')
    if (cmd.accion === 'vapor' && cmd.valor !== null) numero()
  } else if (cmd.tipo === 'flash') {
    if (!modelo.equipos.flash[cmd.id]) throw new Error(`Ciclón flash desconocido: ${cmd.id}`)
    if (cmd.valor !== null) numero()
  } else if (cmd.tipo === 'servicio') {
    if (!(cmd.id in estado.servicios) && cmd.id !== 'energia') throw new Error(`Servicio desconocido: ${cmd.id}`)
    numero()
  } else if (cmd.tipo === 'mallas') {
    if (!modelo.mallas[cmd.id]) throw new Error(`Mallas desconocidas: ${cmd.id}`)
    if (!['retrolavar', 'conmutacion_on', 'conmutacion_off', 'lavado_acido'].includes(cmd.accion)) throw new Error('Acción de mallas inválida')
  } else if (cmd.tipo === 'perturbar') {
    if (['colgamiento', 'soltar_columna', 'friccion', 'canalizacion'].includes(cmd.id)) {
      if (!modelo.vasoPorId[cmd.vaso]) throw new Error(`Vaso desconocido: ${cmd.vaso}`)
    } else if (cmd.id === 'incrustacion') {
      if (!modelo.equipos.calentadores[cmd.equipo]) throw new Error(`Calentador desconocido: ${cmd.equipo}`)
    } else if (cmd.id === 'taponamiento') {
      if (!modelo.mallas[cmd.malla]) throw new Error(`Mallas desconocidas: ${cmd.malla}`)
    } else if (cmd.id !== 'finos') throw new Error(`Perturbación desconocida: ${cmd.id}`)
    if (cmd.id !== 'soltar_columna') numero()
  } else throw new Error(`Comando desconocido: ${cmd.tipo}`)
}

function aplicarComando(modelo, estado, cmd, interno = false) {
  if (cmd.tipo === 'ajustar') {
    const v = cmd.campo === 'T_salida' ? cmd.valor : Math.max(0, cmd.valor)
    if (cmd.campo === 'caudalMadera' && estado.ajustes[cmd.id].velocidad !== undefined) {
      estado.ajustes[cmd.id].velocidad = v / kgPorRevolucion(modelo.equipos, estado.fuentes.astillas.densidad)
    }
    estado.ajustes[cmd.id][cmd.campo] = v
  } else if (cmd.tipo === 'calentador') {
    const c = estado.equipos.calentadores[cmd.id]
    if (cmd.accion === 'vapor') c.aperturaVapor = cmd.valor === null ? null : Math.min(1, Math.max(0, cmd.valor))
    else {
      if (cmd.accion === 'conmutar') c.activo = 1 - c.activo
      else c.incrustacion[c.activo] = 0
      registrarEvento(modelo, estado, cmd.accion === 'conmutar' ? 'conmutacion_calentador' : 'lavado_acido', { equipo: cmd.id })
    }
  } else if (cmd.tipo === 'flash') {
    estado.equipos.flash[cmd.id].salidaConsigna = cmd.valor === null ? null : Math.max(0, cmd.valor)
  } else if (cmd.tipo === 'servicio') {
    estado.servicios[cmd.id] = cmd.valor
  } else if (cmd.tipo === 'mallas') {
    const m = estado.mallas[cmd.id]
    if (cmd.accion === 'retrolavar') m.rf *= 1 - modelo.mallas[cmd.id].retro
    else if (cmd.accion === 'lavado_acido') m.rinc = 0
    else m.conmutacion = cmd.accion === 'conmutacion_on'
    registrarEvento(modelo, estado, 'mallas_' + cmd.accion, { equipo: cmd.id })
  } else if (cmd.tipo === 'perturbar') {
    const v = modelo.vasoPorId[cmd.vaso]
    if (cmd.id === 'colgamiento') colgarColumna(modelo, estado, v, cmd.valor)
    else if (cmd.id === 'soltar_columna') soltarColumna(modelo, estado, v)
    else if (cmd.id === 'friccion') estado.vasos[v.id].friccion = Math.max(0.01, cmd.valor)
    else if (cmd.id === 'canalizacion') estado.vasos[v.id].canalizacion = Math.min(0.9, Math.max(0, cmd.valor))
    else if (cmd.id === 'taponamiento') estado.mallas[cmd.malla].rf += Math.max(0, cmd.valor)
    else if (cmd.id === 'incrustacion') {
      const c = estado.equipos.calentadores[cmd.equipo]
      c.incrustacion[c.activo] = Math.max(0, cmd.valor)
    }
    else estado.perturbaciones.finos = Math.max(0, cmd.valor)
  } else if (cmd.tipo === 'fuente') {
    const f = estado.fuentes[cmd.id]
    if (modelo.idx[cmd.campo] !== undefined && f.c) f.c[modelo.idx[cmd.campo]] = Math.max(0, cmd.valor)
    else f[cmd.campo] = cmd.valor
  } else if (cmd.tipo === 'valvula') {
    estado.valvulas[cmd.id].comando = Math.min(1, Math.max(0, cmd.valor))
  } else if (cmd.tipo === 'bomba') {
    if (estado.bombas[cmd.id].marcha === (cmd.accion === 'partir')) return
    estado.bombas[cmd.id].marcha = cmd.accion === 'partir'
    registrarEvento(modelo, estado, cmd.accion === 'partir' ? 'partida_bomba' : 'detencion_bomba', { equipo: cmd.id })
  } else if (cmd.tipo === 'venteo') {
    const pr = estado.vasos[cmd.id].presion
    pr.venteo = cmd.accion === 'abrir'
    if (!pr.venteo) pr.Pref = pr.P // al cerrar, el vaso queda a la presión del momento
  }
  if (!interno) anotarComando(estado, cmd)
}

// ---------------------------------------------------------------------------
// Paso lento: corrientes → vasos → corrientes

function pasoLento(modelo, estado) {
  const dt = modelo.dtL
  const { fis } = modelo
  const nEsp = modelo.especies.length
  const cont = estado.contabilidad

  // 1. Paquetes que llegan por cada corriente.
  const paquetes = {}
  for (const c of modelo.corrientes) {
    const a = estado.ajustes[c.id]
    const fc = factorCorriente(modelo, estado, c)
    if (c.tipo === 'astillas') {
      // Silo, vaporización, medidor y tubo de astillas (la entrada al sistema
      // se contabiliza en el silo).
      const paq = pasoSilo(modelo, estado, dt, fc, (props, m) => parcelaFresca(modelo, props, m))
      registrarCaudal(estado, c.id, volumenPaquete(paq) / dt, estado.fuentes.astillas.T)
      paquetes[c.id] = paq
    } else if (c.tipo === 'fuente') {
      const f = estado.fuentes[c.origen.fuente]
      const paq = paqueteVacio(nEsp)
      paq.licor = { v: a.caudal * dt * fc, T: f.T, c: f.c.slice() }
      sumarPaqueteA(cont.entra, paq, fis)
      registrarCaudal(estado, c.id, a.caudal * fc, f.T, f.c)
      paquetes[c.id] = paq
    } else if (c.volumenTubo > 0) {
      paquetes[c.id] = extraer(estado.tubos[c.id], estado.corrientes[c.id].vUltimo, nEsp)
    }
  }
  // 2. Uniones (licor blanco y filtrado a las circulaciones).
  for (const c of modelo.corrientes) {
    if (!c.destino.unir) continue
    sumarPaquete(paquetes[c.destino.unir], paquetes[c.id])
    delete paquetes[c.id]
  }
  // 3. Calentadores (vapor de media presión).
  for (const c of modelo.corrientes) {
    if (!c.calentador || !paquetes[c.id]) continue
    const q = calentar(modelo, estado, c.id, paquetes[c.id].licor, estado.ajustes[c.id].T_salida, dt)
    cont.entra.energia += q
    cont.calentadores += q
    estado.corrientes[c.id].calor = q / dt
  }
  // 4. Entregas a los vasos.
  const entradas = {}
  for (const v of modelo.vasos) {
    entradas[v.id] = { adiciones: [], parcelasTope: [], extracciones: [], fondo: { masa: 0, licor: 0 } }
  }
  for (const c of modelo.corrientes) {
    const paq = paquetes[c.id]
    if (!paq || !c.destino.vaso) continue
    const e = entradas[c.destino.vaso]
    if (paq.licor.v > 0) e.adiciones.push({ j: c.destino.j, licor: paq.licor })
    for (const par of paq.parcelas) e.parcelasTope.push(par)
    if (c.tipo !== 'astillas' && c.tipo !== 'fuente') registrarCaudal(estado, c.id, volumenPaquete(paq) / dt, paq.licor.T, paq.licor.c)
  }
  // 5. Extracciones y salidas solicitadas. Las corrientes con válvula sacan lo
  //    que acumuló el paso rápido según la presión; el alivio y la seguridad
  //    descargan el licor libre más alto (si el tope está lleno de astillas, el
  //    licor llega a la válvula a través del lecho).
  for (const v of modelo.vasos) {
    const ev = estado.vasos[v.id]
    const pr = ev.presion
    const e = entradas[v.id]
    e.venteo = pr.venteo
    const jDescarga = Math.max(0, ev.vf.findIndex((x) => x > 0.01))
    if (pr.acumulado.alivio > 0) e.extracciones.push({ id: '__alivio', j: jDescarga, v: pr.acumulado.alivio })
    if (pr.acumulado.seguridad > 0) e.extracciones.push({ id: '__seguridad', j: jDescarga, v: pr.acumulado.seguridad })
  }
  for (const c of modelo.corrientes) {
    if (!c.origen.vaso) continue
    const e = entradas[c.origen.vaso]
    const a = estado.ajustes[c.id]
    const fc = factorCorriente(modelo, estado, c)
    if (c.tipo === 'fondo') e.fondo = { masa: a.caudalMadera * dt * fc, licor: a.caudal * dt * fc }
    else if (c.valvula) e.extracciones.push({ id: c.id, j: c.origen.j, v: estado.vasos[c.origen.vaso].presion.acumulado[c.id] ?? 0 })
    else e.extracciones.push({ id: c.id, j: c.origen.j, v: a.caudal * dt * fc })
  }

  // 6. Vasos.
  for (const v of modelo.vasos) {
    const res = pasoVaso(v, estado.vasos[v.id], entradas[v.id], dt)
    cont.sale.energia += res.perdidas
    cont.perdidas += res.perdidas
    for (const [id, licor] of Object.entries(res.extraidos)) {
      if (id.startsWith('__')) aSumidero(modelo, estado, 'descarga' + id.slice(1), { licor, parcelas: [] })
      else salidaCorriente(modelo, estado, id, { licor, parcelas: [] })
    }
    if (res.cierre.v > 0) aSumidero(modelo, estado, 'rebalse_' + v.id, { licor: res.cierre, parcelas: [] })
    cerrarPresion(modelo, estado, v, res)
    const cf = modelo.corrientes.find((c) => c.tipo === 'fondo' && c.origen.vaso === v.id)
    if (cf) salidaCorriente(modelo, estado, cf.id, res.fondo)
    estado.diag[v.id] = {
      nivelAstillas: res.nivelAstillas,
      lleno: res.lleno,
      rebalseColumna: res.rebalseColumna,
      residuoHidraulico: res.residuoHidraulico,
      flujo: res.flujo,
      edadSalida: promedioMasa(res.fondo.parcelas, 'edad'),
      HSalida: promedioMasa(res.fondo.parcelas, 'H'),
      marcaSalida: promedioMasa(res.fondo.parcelas, 'marca'),
      maderaSalida: res.fondo.parcelas.reduce((s, q) => s + q.m, 0) / dt,
      maderaOriginalSalida: res.fondo.parcelas.reduce((s, q) => s + (q.m0 ?? q.m), 0) / dt,
      retenidoSalida: res.fondo.parcelas.reduce((s, q) => s + q.vr, 0) / dt,
      calidadSalida: calidadPulpa(res.fondo.parcelas, modelo.cin),
      licorSalida: licorTotal(res.fondo, nEsp),
    }
  }

  // 6b. Ciclones flash, evaporadores y estanque de soplado.
  pasoFlashYEstanque(modelo, estado, dt)

  // 6c. Mallas (taponamiento e incrustación) y colgamientos.
  const finos = (modelo.cin.clases.find((k) => k.id === 'finos')?.w ?? 0.06) / 0.06 * (estado.perturbaciones.finos ?? 1)
  for (const [id, m] of Object.entries(modelo.mallas)) {
    const q = m.corrientes.reduce((s, cid) => s + (estado.corrientes[cid].caudalReal ?? 0), 0)
    const c0 = modelo.corrientePorId[m.corrientes[0]]
    const T = estado.vasos[c0.origen.vaso].T[c0.origen.j]
    pasoMalla(m, estado.mallas[id], q, T, finos, dt)
  }
  for (const v of modelo.vasos) {
    const ev = estado.vasos[v.id]
    if (ev.hueco > v.huecoMaximo) soltarColumna(modelo, estado, v)
    else if (ev.colgamiento) {
      // Con las extracciones bajo la columna reducidas, la columna se suelta sin caer de golpe.
      const lib = v.liberacion
      const q = lib.corrientes.reduce((s, id) => s + (estado.corrientes[id].caudalReal ?? 0), 0)
      ev.colgamiento.tBajo = q < lib.fraccion * ev.colgamiento.q0 ? ev.colgamiento.tBajo + dt : 0
      if (ev.colgamiento.tBajo >= lib.tiempo) soltarColumna(modelo, estado, v, true)
    }
  }

  // 7. Reacciones de cocción, envejecimiento y factor H de todas las parcelas
  //    (en los vasos y en las tuberías).
  const pr = cont.produccion
  const procesar = (par) => {
    const d = reaccionarParcela(par, modelo.cin, dt, modelo.idx, nEsp, modelo.densidadPared, fis.cpMadera)
    if (d) {
      pr.madera += d.madera
      pr.energia += d.energia
      for (let k = 0; k < nEsp; k++) pr.esp[k] += d.esp[k]
    }
    par.H += incrementoH(par.T, dt)
    par.edad += dt
  }
  for (const v of modelo.vasos) estado.vasos[v.id].parcelas.forEach(procesar)
  for (const tubo of Object.values(estado.tubos)) for (const q of tubo.paquetes) q.parcelas.forEach(procesar)
}

/**
 * La parte colgada de la columna se suelta y cae sobre el hueco. suave: la
 * soltó el operador bajando las extracciones (liberacion_columna); si no, cae
 * de golpe al llenarse el hueco o por orden del instructor (caida_columna).
 */
function soltarColumna(modelo, estado, v, suave = false) {
  const ev = estado.vasos[v.id]
  const caida = ev.hueco / v.geom.A[v.geom.n - 1]
  for (const par of ev.parcelas) delete par.colgada
  registrarEvento(modelo, estado, suave ? 'liberacion_columna' : 'caida_columna', { vaso: v.id, caida })
  ev.hueco = 0
  ev.colgamiento = null
}

/** Cuelga la columna de un vaso desde una altura (m sobre el fondo). */
function colgarColumna(modelo, estado, v, altura) {
  const ev = estado.vasos[v.id]
  let base = 0
  for (const par of ev.parcelas) {
    const h = base / v.geom.A[v.geom.n - 1]
    if (h >= altura) par.colgada = true
    base += par.vol / (par.sc ?? v.sCol)
  }
  // Caudal de las extracciones bajo la columna al colgarse (referencia para soltarla).
  const q0 = v.liberacion.corrientes.reduce((s, id) => s + (estado.corrientes[id].caudalReal ?? 0), 0)
  ev.colgamiento = { q0, tBajo: 0 }
  registrarEvento(modelo, estado, 'colgamiento', { vaso: v.id, altura })
}

/** Lo que sale de un vaso por una corriente va a su tubería o a su sumidero. */
function salidaCorriente(modelo, estado, id, paq) {
  const c = modelo.corrientePorId[id]
  const vol = volumenPaquete(paq)
  registrarCaudal(estado, id, vol / modelo.dtL, paq.licor.v > 0 ? paq.licor.T : estado.corrientes[id].T, paq.licor.v > 0 ? paq.licor.c : null)
  if (c.volumenTubo > 0) {
    empujar(estado.tubos[id], paq)
    estado.corrientes[id].vUltimo = vol
  } else if (c.destino.equipo) {
    entregarAEquipo(estado, c.destino.equipo, paq)
  } else {
    aSumidero(modelo, estado, c.destino.sumidero, paq)
  }
}

function aSumidero(modelo, estado, nombre, paq) {
  const cont = estado.contabilidad
  sumarPaqueteA(cont.sale, paq, modelo.fis)
  cont.sumideros[nombre] = (cont.sumideros[nombre] ?? 0) + paq.licor.v
}

function registrarCaudal(estado, id, q, T, c) {
  const ec = estado.corrientes[id]
  ec.caudalReal = q
  ec.T = T
  if (c) ec.c = c.slice()
}

/** Licor total (libre + retenido en las astillas) de un paquete. */
function licorTotal(paq, nEsp) {
  let v = paq.licor.v
  const c = paq.licor.c.map((x) => x * paq.licor.v)
  for (const par of paq.parcelas) {
    v += par.vr
    for (let k = 0; k < nEsp; k++) c[k] += par.cr[k] * par.vr
  }
  return { v, c: v > 0 ? c.map((x) => x / v) : c }
}

function promedioMasa(parcelas, campo) {
  let m = 0
  let s = 0
  for (const par of parcelas) {
    m += par.m
    s += par.m * par[campo]
  }
  return m > 0 ? s / m : null
}
