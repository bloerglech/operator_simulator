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

const copiar = (x) => JSON.parse(JSON.stringify(x))

export function crearPlanta(config, opciones = {}) {
  let modelo = construirModelo(config)
  let estado = crearEstadoInicial(modelo, opciones)
  let cola = [] // comandos pendientes
  let pendiente = 0 // segundos solicitados aún no simulados

  function avanzar(segundos) {
    pendiente += segundos
    const n = Math.floor(pendiente / modelo.dtR + 1e-9)
    pendiente -= n * modelo.dtR
    if (pendiente < 0) pendiente = 0
    for (let i = 0; i < n; i++) pasoRapido()
  }

  function pasoRapido() {
    if (cola.length > 0) {
      for (const cmd of cola) aplicarComando(modelo, estado, cmd)
      cola = []
    }
    pasoRapidoEquipos(modelo, estado, modelo.dtR)
    estado.paso += 1
    if (estado.paso % modelo.pasosPorLento === 0) pasoLento(modelo, estado)
  }

  function enviarComando(cmd) {
    validarComando(modelo, estado, cmd)
    cola.push(copiar(cmd))
  }

  return {
    avanzar,
    enviarComando,
    leerEstado: (op) => instantanea(modelo, estado, op),
    balances: () => cierreBalances(modelo, estado),
    tiempo: () => estado.paso * modelo.dtR,
    guardar: () => copiar({ formato: 'simulador-digestor', version: 1, config: modelo.config, estado, cola, pendiente }),
    cargar(json) {
      const datos = typeof json === 'string' ? JSON.parse(json) : copiar(json)
      if (datos.formato !== 'simulador-digestor') throw new Error('Archivo de guardado no reconocido')
      modelo = construirModelo(datos.config)
      estado = datos.estado
      cola = datos.cola ?? []
      pendiente = datos.pendiente ?? 0
    },
    /** Acceso de solo lectura al modelo (geometría, corrientes) para herramientas y pruebas. */
    modelo: () => modelo,
    /** Estado interno (solo para pruebas y herramientas; las pantallas usan leerEstado). */
    estadoInterno: () => estado,
  }
}

// ---------------------------------------------------------------------------
// Comandos

const CAMPOS_CORRIENTE = ['caudal', 'caudalMadera', 'T_salida']

/**
 * Comandos:
 *   { tipo: 'ajustar', id: corriente, campo: 'caudal'|'caudalMadera'|'T_salida', valor }
 *   { tipo: 'fuente', id: fuente, campo, valor }        (composición o propiedad de una fuente)
 *   { tipo: 'valvula', id, valor }                       (comando de apertura 0–1)
 *   { tipo: 'bomba', id, accion: 'partir' | 'detener' }
 *   { tipo: 'venteo', id: vaso, accion: 'abrir' | 'cerrar' }
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
  } else if (cmd.tipo === 'venteo') {
    if (!modelo.vasoPorId[cmd.id]) throw new Error(`Vaso desconocido: ${cmd.id}`)
    if (!['abrir', 'cerrar'].includes(cmd.accion)) throw new Error('Acción de venteo: abrir o cerrar')
  } else throw new Error(`Comando desconocido: ${cmd.tipo}`)
}

function aplicarComando(modelo, estado, cmd) {
  if (cmd.tipo === 'ajustar') {
    const v = cmd.campo === 'T_salida' ? cmd.valor : Math.max(0, cmd.valor)
    estado.ajustes[cmd.id][cmd.campo] = v
  } else if (cmd.tipo === 'fuente') {
    const f = estado.fuentes[cmd.id]
    if (modelo.idx[cmd.campo] !== undefined && f.c) f.c[modelo.idx[cmd.campo]] = Math.max(0, cmd.valor)
    else f[cmd.campo] = cmd.valor
  } else if (cmd.tipo === 'valvula') {
    estado.valvulas[cmd.id].comando = Math.min(1, Math.max(0, cmd.valor))
  } else if (cmd.tipo === 'bomba') {
    estado.bombas[cmd.id].marcha = cmd.accion === 'partir'
    registrarEvento(modelo, estado, cmd.accion === 'partir' ? 'partida_bomba' : 'detencion_bomba', { equipo: cmd.id })
  } else if (cmd.tipo === 'venteo') {
    const pr = estado.vasos[cmd.id].presion
    pr.venteo = cmd.accion === 'abrir'
    if (!pr.venteo) pr.Pref = pr.P // al cerrar, el vaso queda a la presión del momento
  }
  estado.registro.push({ paso: estado.paso, ...cmd })
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
      const paq = paqueteVacio(nEsp)
      const m = a.caudalMadera * dt * fc
      if (m > 0) paq.parcelas.push(parcelaFresca(modelo, estado.fuentes.astillas, m))
      sumarPaqueteA(cont.entra, paq, fis)
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
  // 3. Calentadores.
  for (const c of modelo.corrientes) {
    if (!c.calentador || !paquetes[c.id]) continue
    const li = paquetes[c.id].licor
    const C = li.v * fis.rcpLicor
    if (C <= 0) continue
    const q = Math.min(c.calentador.Qmax * dt, Math.max(0, C * (estado.ajustes[c.id].T_salida - li.T)))
    li.T += q / C
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
  //    descargan desde el tope.
  for (const v of modelo.vasos) {
    const pr = estado.vasos[v.id].presion
    const e = entradas[v.id]
    e.venteo = pr.venteo
    if (pr.acumulado.alivio > 0) e.extracciones.push({ id: '__alivio', j: 0, v: pr.acumulado.alivio })
    if (pr.acumulado.seguridad > 0) e.extracciones.push({ id: '__seguridad', j: 0, v: pr.acumulado.seguridad })
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

/** Lo que sale de un vaso por una corriente va a su tubería o a su sumidero. */
function salidaCorriente(modelo, estado, id, paq) {
  const c = modelo.corrientePorId[id]
  const vol = volumenPaquete(paq)
  registrarCaudal(estado, id, vol / modelo.dtL, paq.licor.v > 0 ? paq.licor.T : estado.corrientes[id].T, paq.licor.v > 0 ? paq.licor.c : null)
  if (c.volumenTubo > 0) {
    empujar(estado.tubos[id], paq)
    estado.corrientes[id].vUltimo = vol
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
