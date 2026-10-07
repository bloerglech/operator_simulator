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
import { instantanea } from './instantanea.js'

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

function validarComando(modelo, estado, cmd) {
  if (cmd.tipo === 'ajustar') {
    if (!modelo.corrientePorId[cmd.id]) throw new Error(`Corriente desconocida: ${cmd.id}`)
    if (!CAMPOS_CORRIENTE.includes(cmd.campo) || estado.ajustes[cmd.id][cmd.campo] === undefined) {
      throw new Error(`La corriente ${cmd.id} no tiene el campo ajustable "${cmd.campo}"`)
    }
  } else if (cmd.tipo === 'fuente') {
    const f = estado.fuentes[cmd.id]
    if (!f) throw new Error(`Fuente desconocida: ${cmd.id}`)
    const esEspecie = modelo.idx[cmd.campo] !== undefined && f.c
    if (!esEspecie && !(cmd.campo in f && cmd.campo !== 'c')) {
      throw new Error(`La fuente ${cmd.id} no tiene el campo "${cmd.campo}"`)
    }
  } else throw new Error(`Comando desconocido: ${cmd.tipo}`)
  if (typeof cmd.valor !== 'number' || !Number.isFinite(cmd.valor)) throw new Error('El valor debe ser un número')
}

function aplicarComando(modelo, estado, cmd) {
  if (cmd.tipo === 'ajustar') {
    const v = cmd.campo === 'T_salida' ? cmd.valor : Math.max(0, cmd.valor)
    estado.ajustes[cmd.id][cmd.campo] = v
  } else if (cmd.tipo === 'fuente') {
    const f = estado.fuentes[cmd.id]
    if (modelo.idx[cmd.campo] !== undefined && f.c) f.c[modelo.idx[cmd.campo]] = Math.max(0, cmd.valor)
    else f[cmd.campo] = cmd.valor
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
    if (c.tipo === 'astillas') {
      const paq = paqueteVacio(nEsp)
      const m = a.caudalMadera * dt
      if (m > 0) paq.parcelas.push(parcelaFresca(modelo, estado.fuentes.astillas, m))
      sumarPaqueteA(cont.entra, paq, fis)
      registrarCaudal(estado, c.id, volumenPaquete(paq) / dt, estado.fuentes.astillas.T)
      paquetes[c.id] = paq
    } else if (c.tipo === 'fuente') {
      const f = estado.fuentes[c.origen.fuente]
      const paq = paqueteVacio(nEsp)
      paq.licor = { v: a.caudal * dt, T: f.T, c: f.c.slice() }
      sumarPaqueteA(cont.entra, paq, fis)
      registrarCaudal(estado, c.id, a.caudal, f.T)
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
    if (c.tipo !== 'astillas' && c.tipo !== 'fuente') registrarCaudal(estado, c.id, volumenPaquete(paq) / dt, paq.licor.T)
  }
  // 5. Extracciones y salidas solicitadas.
  for (const c of modelo.corrientes) {
    if (!c.origen.vaso) continue
    const e = entradas[c.origen.vaso]
    const a = estado.ajustes[c.id]
    if (c.tipo === 'fondo') e.fondo = { masa: a.caudalMadera * dt, licor: a.caudal * dt }
    else if (modelo.vasoPorId[c.origen.vaso].corrienteCierre !== c.id) {
      e.extracciones.push({ id: c.id, j: c.origen.j, v: a.caudal * dt })
    }
  }

  // 6. Vasos.
  for (const v of modelo.vasos) {
    const res = pasoVaso(v, estado.vasos[v.id], entradas[v.id], dt)
    cont.sale.energia += res.perdidas
    cont.perdidas += res.perdidas
    for (const [id, licor] of Object.entries(res.extraidos)) salidaCorriente(modelo, estado, id, { licor, parcelas: [] })
    const idCierre = v.corrienteCierre
    if (idCierre) salidaCorriente(modelo, estado, idCierre, { licor: res.cierre, parcelas: [] })
    else if (res.cierre.v > 0) aSumidero(modelo, estado, 'rebalse_' + v.id, { licor: res.cierre, parcelas: [] })
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
      retenidoSalida: res.fondo.parcelas.reduce((s, q) => s + q.vr, 0) / dt,
    }
  }

  // 7. Envejecimiento y factor H de todas las parcelas (vasos y tuberías).
  const envejecer = (par) => {
    par.H += incrementoH(par.T, dt)
    par.edad += dt
  }
  for (const v of modelo.vasos) estado.vasos[v.id].parcelas.forEach(envejecer)
  for (const tubo of Object.values(estado.tubos)) for (const q of tubo.paquetes) q.parcelas.forEach(envejecer)
}

/** Lo que sale de un vaso por una corriente va a su tubería o a su sumidero. */
function salidaCorriente(modelo, estado, id, paq) {
  const c = modelo.corrientePorId[id]
  const vol = volumenPaquete(paq)
  registrarCaudal(estado, id, vol / modelo.dtL, paq.licor.v > 0 ? paq.licor.T : estado.corrientes[id].T)
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

function registrarCaudal(estado, id, q, T) {
  const ec = estado.corrientes[id]
  ec.caudalReal = q
  ec.T = T
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
