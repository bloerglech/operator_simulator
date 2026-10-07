// Equipos auxiliares del sistema de cocción (paso lento):
//   - silo de astillas con vaporización, medidor de astillas y tubo de astillas
//   - calentadores de las circulaciones (vapor de media presión, incrustación)
//   - ciclones flash 1 y 2 (el vapor vuelve al silo) y envío a evaporadores
//   - estanque de soplado
// Todo lo que entra o sale de estos equipos pasa por la contabilidad, así que
// los balances de masa y energía siguen cerrando.
//
// Entalpías (referencia 0 °C, coherentes con el resto del modelo):
//   licor y agua: ρ·cp·V·T  (con V en m³; el agua condensada se cuenta como 1 kg = 1 L)
//   vapor:        h_fg(T_s) + (ρ·cp/1000)·T_s  por kg

import { p } from './parametros.js'
import { temperaturaSaturacion, calorLatente } from './agua.js'
import { kelvin, R_GAS } from './unidades.js'
import { sumarLicor, sumarPaquete, partirPaquete, fundirParcela, paqueteVacio, volumenPaquete } from './materia.js'
import { sumarLicorA, sumarPaqueteA } from './contabilidad.js'

// ---------------------------------------------------------------------------
// Construcción (parte del modelo)

export function construirEquipos(config) {
  const { equipos: eq, energia: en, caso_base: cb } = config
  const flash = {}
  for (const [id, f] of Object.entries(eq.flash ?? {})) {
    if (id.startsWith('_')) continue
    const r = `equipos.flash.${id}`
    flash[id] = {
      P: p(f, 'P', `${r}.P`),
      V: p(f, 'volumen', `${r}.volumen`),
      sp: p(f, 'nivel_consigna', `${r}.nivel_consigna`),
      tau: p(f, 'tau_nivel', `${r}.tau_nivel`),
      destino: f.destino,
    }
  }
  const calentadores = {}
  for (const [id, c] of Object.entries(eq.calentadores ?? {})) {
    if (id.startsWith('_')) continue
    const r = `equipos.calentadores.${id}`
    calentadores[id] = {
      UA: p(c, 'UA_limpio', `${r}.UA_limpio`),
      Qvalvula: p(c, 'Q_valvula', `${r}.Q_valvula`),
      tasa: p(c, 'incrustacion', `${r}.incrustacion`),
      E: p(c, 'E_incrustacion', `${r}.E_incrustacion`),
    }
  }
  return {
    flash,
    calentadores,
    limiteEvaporadores: p(eq.evaporadores, 'limite_recepcion', 'equipos.evaporadores.limite_recepcion'),
    silo: {
      V: p(eq.silo, 'volumen', 'equipos.silo.volumen'),
      nivelInicial: p(eq.silo, 'nivel_inicial', 'equipos.silo.nivel_inicial'),
      tauVap: p(eq.silo, 'tau_vaporizacion', 'equipos.silo.tau_vaporizacion'),
      Tmax: p(eq.silo, 'T_maxima', 'equipos.silo.T_maxima'),
    },
    medidor: {
      Vrev: p(eq.medidor, 'volumen_por_revolucion', 'equipos.medidor.volumen_por_revolucion'),
      eta: p(eq.medidor, 'eficiencia_llenado', 'equipos.medidor.eficiencia_llenado'),
      sPila: p(eq.medidor, 'fraccion_astillas_pila', 'equipos.medidor.fraccion_astillas_pila'),
      rpmMax: p(eq.medidor, 'velocidad_maxima', 'equipos.medidor.velocidad_maxima'),
    },
    tubo: {
      capacidad: p(eq.tubo_astillas, 'capacidad', 'equipos.tubo_astillas.capacidad'),
      sobre: p(eq.tubo_astillas, 'sobrecapacidad_bombas', 'equipos.tubo_astillas.sobrecapacidad_bombas'),
    },
    estanque: {
      V: p(eq.estanque_soplado, 'volumen', 'equipos.estanque_soplado.volumen'),
      nivelInicial: p(eq.estanque_soplado, 'nivel_inicial', 'equipos.estanque_soplado.nivel_inicial'),
      consistencia: p(eq.estanque_soplado, 'consistencia_descarga', 'equipos.estanque_soplado.consistencia_descarga'),
    },
    vapor: {
      PMP: p(en.vapor, 'P_MP', 'energia.vapor.P_MP'),
      PBP: p(en.vapor, 'P_BP', 'energia.vapor.P_BP'),
      bpMax: p(en.vapor, 'vapor_bp_max', 'energia.vapor.vapor_bp_max'),
    },
    Tpatio: p(en, 'T_astillas_patio', 'energia.T_astillas_patio'),
    TvapConsigna: p(cb.astillas, 'T_vaporizacion', 'caso_base.astillas.T_vaporizacion'),
  }
}

/** Capacidad del medidor: kg seco por revolución con la densidad dada. */
export function kgPorRevolucion(eq, densidad) {
  return eq.medidor.Vrev * eq.medidor.eta * eq.medidor.sPila * densidad
}

// ---------------------------------------------------------------------------
// Estado inicial

export function estadoEquiposInicial(modelo, { modo, fuentes, ajustes, licorTipico }) {
  const eq = modelo.equipos
  const nEsp = modelo.especies.length
  const as = fuentes.astillas
  const operando = modo === 'operacion'
  const masaSilo = operando ? eq.silo.V * eq.silo.nivelInicial * eq.medidor.sPila * as.densidad : 0
  const flash = {}
  for (const [id, f] of Object.entries(eq.flash)) {
    flash[id] = {
      licor: operando
        ? { v: f.V * f.sp, T: temperaturaSaturacion(f.P), c: licorTipico.c.slice() }
        : { v: 0, T: modelo.tAmb, c: new Array(nEsp).fill(0) },
      lleno: false,
      vapor: 0,
      salida: 0,
      salidaConsigna: null, // m³/s si el control de nivel (Fase 2) maneja la salida
    }
  }
  const estanque = paqueteVacio(nEsp)
  if (operando) estanque.licor = { v: eq.estanque.V * eq.estanque.nivelInicial, T: 75, c: licorTipico.c.map((x) => x * 0.5) }
  const calentadores = {}
  for (const id of Object.keys(eq.calentadores)) {
    calentadores[id] = { incrustacion: [0, 0], activo: 0, Q: 0, vapor: 0, Tmax: 0, saturado: false, aperturaVapor: null, Tsalida: 0 }
  }
  return {
    estado: {
      silo: {
        masa: masaSilo, // kg secos
        agua: (masaSilo * as.humedad) / (1 - as.humedad) / 1000, // m³
        T: eq.Tpatio,
        Tsalida: operando ? eq.TvapConsigna : eq.Tpatio,
        vaporizacion: operando ? 0.95 : 0,
        vaporFlashUsado: 0,
        vaporBP: 0,
        vaporVenteado: 0,
      },
      tubo: paqueteVacio(nEsp), // astillas acumuladas si las bombas se detienen
      flash,
      vaporPendiente: { m: 0, H: 0 }, // vapor flash que llega al silo en el próximo paso
      estanque,
      calentadores,
    },
    servicios: {
      presionVaporMP: eq.vapor.PMP,
      presionVaporBP: eq.vapor.PBP,
      vaporBPMax: eq.vapor.bpMax,
      limiteEvaporadores: eq.limiteEvaporadores,
      transportadorSilo: operando ? ajustes.astillas.caudalMadera : 0, // kg/s secos
      lavado: operando ? ajustes.astillas.caudalMadera * 0.535 : 0, // kg/s de pulpa seca
      Tpatio: eq.Tpatio,
      vaporFlashSilo: 1, // fracción del vapor flash que llega al silo (el resto se ventea)
      energia: 1, // 0 durante un apagón: las bombas no pueden partir
      licorBlancoMax: 1, // m³/s de licor blanco disponible (1 m³/s = sin límite práctico)
    },
  }
}

// ---------------------------------------------------------------------------
// Silo, vaporización, medidor y tubo de astillas

/**
 * Avanza el silo y devuelve el paquete de astillas vaporizadas que las bombas
 * de astillas envían al impregnador. `factorBombas` (0–1) es la marcha de esas
 * bombas: si no alcanzan, las astillas se acumulan en el tubo de astillas.
 */
export function pasoSilo(modelo, estado, dt, factorBombas, crearParcela) {
  const eq = modelo.equipos
  const sv = estado.servicios
  const silo = estado.equipos.silo
  const as = estado.fuentes.astillas
  const cont = estado.contabilidad
  const rcp = modelo.fis.rcpLicor
  const cpW = modelo.fis.cpMadera

  // Entrada desde el patio (transportador): madera y agua a temperatura de patio.
  const mIn = (sv.energia ?? 1) > 0 ? Math.max(0, sv.transportadorSilo) * dt : 0 // sin energía el transportador no anda
  const aguaIn = (mIn * as.humedad) / (1 - as.humedad) / 1000
  if (mIn > 0) {
    // El silo se mezcla: su temperatura es el promedio ponderado por capacidad.
    const cAnt = silo.masa * cpW + silo.agua * rcp
    const cIn = mIn * cpW + aguaIn * rcp
    silo.T = (silo.T * cAnt + sv.Tpatio * cIn) / (cAnt + cIn)
    silo.masa += mIn
    silo.agua += aguaIn
    cont.entra.madera += mIn
    cont.entra.licor += aguaIn
    cont.entra.energia += (mIn * cpW + aguaIn * rcp) * sv.Tpatio
  }

  // Medidor: caudal seco proporcional a la velocidad y a la densidad.
  const kgRev = kgPorRevolucion(eq, as.densidad)
  const rpm = Math.min(estado.ajustes.astillas.velocidad, eq.medidor.rpmMax)
  let m = Math.min(rpm * kgRev * dt, silo.masa)
  const fraccion = silo.masa > 0 ? m / silo.masa : 0
  const agua = silo.agua * fraccion
  silo.masa -= m
  silo.agua -= agua

  // Vaporización: primero el vapor flash, luego vapor fresco de baja presión.
  const C = m * cpW + agua * rcp // kJ/K de la madera que sale (a T de patio)
  const Tp = silo.T
  const Tset = Math.min(eq.TvapConsigna, eq.silo.Tmax)
  const vf = estado.equipos.vaporPendiente
  const hFlash = vf.m > 0 ? vf.H / vf.m : 0
  const mFlashDisp = vf.m * Math.min(1, Math.max(0, sv.vaporFlashSilo ?? 1))
  const Tbp = temperaturaSaturacion(sv.presionVaporBP)
  const hBP = calorLatente(Tbp) + (rcp / 1000) * Tbp
  const cAgua = rcp / 1000 // kJ/(kg·K) del condensado, coherente con el licor
  // Vapor necesario para llegar a Tset con cada fuente (calor cedido por kg: h_v − c·T).
  let mFlash = 0
  let mBP = 0
  if (C > 0) {
    const necesario = C * (Tset - Tp)
    const qFlashMax = mFlashDisp * (hFlash - cAgua * Tset)
    if (qFlashMax >= necesario) mFlash = necesario / (hFlash - cAgua * Tset)
    else {
      mFlash = mFlashDisp
      const falta = necesario - qFlashMax
      mBP = Math.min(sv.vaporBPMax * dt, falta / (hBP - cAgua * Tset))
    }
  }
  // Temperatura alcanzada con el vapor condensado (balance de energía exacto).
  const Hv = mFlash * hFlash + mBP * hBP
  const mc = mFlash + mBP
  const T = C + mc * cAgua > 0 ? (C * Tp + Hv) / (C + mc * cAgua) : Tp
  // Vapor fresco: entra al sistema. Vapor flash sobrante: se ventea.
  cont.entra.licor += mBP / 1000
  cont.entra.energia += mBP * hBP
  const mVent = vf.m - mFlash
  cont.sale.licor += mVent / 1000
  cont.sale.energia += mVent * hFlash
  cont.sumideros.vapor_venteado = (cont.sumideros.vapor_venteado ?? 0) + mVent / 1000
  estado.equipos.vaporPendiente = { m: 0, H: 0 }
  silo.vaporFlashUsado = mFlash / dt
  silo.vaporBP = mBP / dt
  silo.vaporVenteado = mVent / dt
  silo.Tsalida = m > 0 ? T : silo.Tsalida
  const tRes = rpm * kgRev > 0 ? silo.masa / (rpm * kgRev) : Infinity
  const suficiencia = Tset > Tp ? Math.min(1, Math.max(0, (T - Tp) / (Tset - Tp))) : 1
  silo.vaporizacion = (1 - Math.exp(-tRes / eq.silo.tauVap)) * suficiencia
  as.T = silo.Tsalida
  as.vaporizacion = silo.vaporizacion

  // Astillas vaporizadas (con el condensado como humedad adicional).
  const paq = paqueteVacio(modelo.especies.length)
  if (m > 0) {
    const aguaTotal = agua + mc / 1000
    const humedadEf = (aguaTotal * 1000) / (aguaTotal * 1000 + m)
    paq.parcelas.push(crearParcela({ ...as, T, humedad: humedadEf, vaporizacion: silo.vaporizacion }, m))
  }

  // Tubo de astillas: si las bombas no dan, las astillas se acumulan.
  const tubo = estado.equipos.tubo
  sumarPaquete(tubo, paq)
  const masaTubo = tubo.parcelas.reduce((s, q) => s + q.m0, 0)
  const capacidad = rpm * kgRev * (1 + eq.tubo.sobre) * factorBombas * dt
  const enviar = Math.min(masaTubo, capacidad)
  let salida = paqueteVacio(modelo.especies.length)
  if (masaTubo > 0 && enviar > 0) {
    salida = enviar >= masaTubo * (1 - 1e-12) ? { parcelas: tubo.parcelas.splice(0) } : partirPaquete(tubo, enviar / masaTubo)
  }
  // Las parcelas que quedan en el tubo se funden en una sola.
  if (tubo.parcelas.length > 1) {
    const [a, ...resto] = tubo.parcelas
    for (const b of resto) fundirParcela(a, b, modelo.fis)
    tubo.parcelas = [a]
  }
  estado.ajustes.astillas.caudalMadera = rpm * kgRev // para la presión (paso rápido)
  return { licor: paqueteVacio(modelo.especies.length).licor, parcelas: salida.parcelas }
}

// ---------------------------------------------------------------------------
// Calentadores

/**
 * Calienta el licor de una circulación con vapor de media presión.
 * Con el vapor a T_s = T_sat(P_MP), la temperatura de salida máxima es
 *   T_max = T_s − (T_s − T_ent)·exp(−UA/(ṁ·cp))
 * (intercambiador con un lado isotérmico). Se alcanza la consigna si se puede.
 */
export function calentar(modelo, estado, id, licor, Tconsigna, dt) {
  const cfg = modelo.equipos.calentadores[id]
  const ec = estado.equipos.calentadores[id]
  const rcp = modelo.fis.rcpLicor
  const mcp = (licor.v * rcp) / dt // kW/K
  if (mcp <= 0) { ec.Q = 0; ec.vapor = 0; return 0 }
  const Ts = temperaturaSaturacion(estado.servicios.presionVaporMP)
  const f = ec.incrustacion[ec.activo]
  const UA = cfg.UA / (1 + f)
  const Tmax = Ts - (Ts - licor.T) * Math.exp(-UA / mcp)
  // Con la válvula de vapor manejada por el control, el calor queda limitado
  // por su apertura; sin control, se alcanza la consigna ideal.
  const Tobjetivo = ec.aperturaVapor === null || ec.aperturaVapor === undefined
    ? Tconsigna
    : licor.T + (ec.aperturaVapor * cfg.Qvalvula) / mcp
  const Tsal = Math.max(licor.T, Math.min(Tobjetivo, Tmax))
  const q = mcp * (Tsal - licor.T) * dt // kJ
  licor.T = Tsal
  ec.Q = q / dt
  ec.vapor = ec.Q / calorLatente(Ts) // kg/s
  ec.Tmax = Tmax
  ec.saturado = Tobjetivo > Tmax + 0.05
  ec.Tsalida = Tsal
  // Incrustación (CaCO₃): crece con la temperatura del licor.
  const arr = Math.exp((-cfg.E / R_GAS) * (1 / kelvin(Tsal) - 1 / kelvin(150)))
  ec.incrustacion[ec.activo] += cfg.tasa * arr * dt
  return q
}

// ---------------------------------------------------------------------------
// Ciclones flash, evaporadores y estanque de soplado

/** Agrega licor a un equipo (ciclón flash o estanque). */
export function entregarAEquipo(estado, idEquipo, paq) {
  const e = estado.equipos
  if (idEquipo === 'estanque_soplado') sumarPaquete(e.estanque, paq)
  else sumarLicor(e.flash[idEquipo].licor, paq.licor.v, paq.licor.T, paq.licor.c)
}

/** true si el destino de una corriente está lleno y no puede recibir. */
export function destinoBloqueado(estado, c) {
  const id = c.destino.equipo
  return !!(id && estado.equipos.flash[id]?.lleno)
}

/** Presión del equipo de destino de una válvula (Pa abs), si corresponde. */
export function presionDestino(modelo, c) {
  const id = c.destino.equipo
  return id && modelo.equipos.flash[id] ? modelo.equipos.flash[id].P : null
}

export function pasoFlashYEstanque(modelo, estado, dt) {
  const eq = modelo.equipos
  const cont = estado.contabilidad
  const rcp = modelo.fis.rcpLicor
  const orden = Object.keys(eq.flash) // flash1 descarga en flash2
  for (const id of orden) {
    const cfg = eq.flash[id]
    const f = estado.equipos.flash[id]
    const li = f.licor
    // Flash: el licor sobrecalentado se enfría a T_sat(P) y genera vapor.
    const Ts = temperaturaSaturacion(cfg.P)
    let mv = 0
    if (li.v > 0 && li.T > Ts) {
      const hfg = calorLatente(Ts)
      mv = Math.min((rcp * li.v * (li.T - Ts)) / hfg, li.v * 1000 * 0.5)
      const vNuevo = li.v - mv / 1000
      li.c = li.c.map((x) => (x * li.v) / vNuevo)
      li.v = vNuevo
      li.T = Ts
      const vp = estado.equipos.vaporPendiente
      vp.m += mv
      vp.H += mv * (hfg + (rcp / 1000) * Ts)
    }
    f.vapor = mv / dt
    // Nivel: control proporcional ideal, limitado aguas abajo.
    const Vsp = cfg.V * cfg.sp
    let salida = f.salidaConsigna === null || f.salidaConsigna === undefined
      ? Math.max(0, (li.v - Vsp) * (1 - Math.exp(-dt / cfg.tau)))
      : f.salidaConsigna * dt
    const destinoFlash = estado.equipos.flash[cfg.destino]
    if (destinoFlash?.lleno) salida = 0
    if (cfg.destino === 'evaporadores') salida = Math.min(salida, estado.servicios.limiteEvaporadores * dt)
    salida = Math.min(salida, li.v)
    if (salida > 0) {
      const sale = { v: salida, T: li.T, c: li.c.slice() }
      li.v -= salida
      if (destinoFlash) sumarLicor(destinoFlash.licor, sale.v, sale.T, sale.c)
      else {
        sumarLicorA(cont.sale, sale, modelo.fis)
        cont.sumideros.evaporadores = (cont.sumideros.evaporadores ?? 0) + sale.v
      }
    }
    f.salida = salida / dt
    // Rebalse si se llena: se registra y el exceso va a un sumidero.
    if (li.v > cfg.V) {
      const exceso = { v: li.v - cfg.V, T: li.T, c: li.c.slice() }
      li.v = cfg.V
      sumarLicorA(cont.sale, exceso, modelo.fis)
      cont.sumideros['rebalse_' + id] = (cont.sumideros['rebalse_' + id] ?? 0) + exceso.v
    }
    f.lleno = li.v >= cfg.V * 0.98
  }

  // Estanque de soplado: sale pulpa al lavado a la tasa pedida.
  const est = estado.equipos.estanque
  if (est.parcelas.length > 1) {
    const [a, ...resto] = est.parcelas
    for (const b of resto) fundirParcela(a, b, modelo.fis)
    est.parcelas = [a]
  }
  // El lavado toma pulpa a su tasa (kg/s); el caudal volumétrico de descarga
  // queda limitado a 1,5 veces el nominal, y con solo licor la descarga sigue.
  const pulpa = est.parcelas[0]?.m ?? 0
  const lavado = Math.max(0, estado.servicios.lavado)
  const Vest = volumenPaquete(est)
  const frVol = Vest > 0 ? (1.5 * lavado / eq.estanque.consistencia * dt) / Vest : 0
  const fr = Math.min(1, frVol, pulpa > 0 ? (lavado * dt) / pulpa : Infinity)
  if (fr > 0) {
    const sale = partirPaquete(est, fr)
    sumarPaqueteA(cont.sale, sale, modelo.fis)
    cont.sumideros.lavado = (cont.sumideros.lavado ?? 0) + sale.licor.v
  }
  const V = volumenPaquete(est)
  if (V > eq.estanque.V) {
    const sale = partirPaquete(est, (V - eq.estanque.V) / V)
    sumarPaqueteA(cont.sale, sale, modelo.fis)
    cont.sumideros.rebalse_estanque = (cont.sumideros.rebalse_estanque ?? 0) + sale.licor.v
  }
}

/** Inventario de los equipos (para la contabilidad). */
export function inventarioEquipos(estado, acc, fis) {
  const e = estado.equipos
  if (!e) return
  acc.madera += e.silo.masa
  acc.licor += e.silo.agua
  acc.energia += (e.silo.masa * fis.cpMadera + e.silo.agua * fis.rcpLicor) * e.silo.T
  sumarPaqueteA(acc, e.tubo, fis)
  for (const f of Object.values(e.flash)) sumarLicorA(acc, f.licor, fis)
  sumarPaqueteA(acc, e.estanque, fis)
  acc.licor += e.vaporPendiente.m / 1000
  acc.energia += e.vaporPendiente.H
}
