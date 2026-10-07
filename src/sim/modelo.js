// Construcción del modelo (todo lo que no cambia durante la simulación) a partir
// de la configuración. Aquí se validan los parámetros y la topología; cualquier
// dato faltante produce un error con la ruta del parámetro.

import { p, validarParametros } from './parametros.js'
import { crearGeometria, celdaDeAltura } from './geometria.js'
import { indicesEspecies } from './licor.js'
import { construirCinetica } from './cinetica.js'
import { construirEquipos } from './equipos.js'
import { construirMallas } from './mallas.js'

/**
 * La configuración es un objeto con una entrada por archivo de config/:
 * { simulacion, topologia, equipos, madera, licores, hidraulica, energia, cinetica, caso_base }
 */
export function construirModelo(config) {
  const errores = validarParametros(config)
  if (errores.length > 0) throw new Error(`Configuración inválida:\n  ${errores.join('\n  ')}`)

  const { simulacion, topologia, equipos, madera, licores, hidraulica, energia } = config

  const dtR = p(simulacion, 'dt_rapido', 'simulacion.dt_rapido')
  const dtL = p(simulacion, 'dt_lento', 'simulacion.dt_lento')
  const pasosPorLento = Math.round(dtL / dtR)
  if (Math.abs(pasosPorLento * dtR - dtL) > 1e-9 || pasosPorLento < 1) {
    throw new Error('simulacion.dt_lento debe ser un múltiplo entero de dt_rapido')
  }

  const especies = licores.especies
  const idx = indicesEspecies(especies)
  const fis = {
    cpMadera: p(madera, 'cp', 'madera.cp'),
    rcpLicor: p(licores, 'densidad', 'licores.densidad') * p(licores, 'cp', 'licores.cp'),
    densidadLicor: p(licores, 'densidad', 'licores.densidad'),
  }
  const densidadBasica = p(madera, 'densidad_basica', 'madera.densidad_basica')
  const densidadPared = p(madera, 'densidad_pared_celular', 'madera.densidad_pared_celular')
  const sCol = p(hidraulica, 'fraccion_astillas_columna', 'hidraulica.fraccion_astillas_columna')
  const dif = {
    Dref: p(hidraulica.difusion, 'D_ref', 'hidraulica.difusion.D_ref'),
    Tref: p(hidraulica.difusion, 'T_ref', 'hidraulica.difusion.T_ref'),
    E: p(hidraulica.difusion, 'E', 'hidraulica.difusion.E'),
    eccsaMin: p(hidraulica.difusion, 'eccsa_min', 'hidraulica.difusion.eccsa_min'),
    eccsaMax: p(hidraulica.difusion, 'eccsa_max', 'hidraulica.difusion.eccsa_max'),
    Ke: p(hidraulica.difusion, 'K_e', 'hidraulica.difusion.K_e'),
    espesor: p(madera, 'espesor_medio', 'madera.espesor_medio'),
  }
  const penetracion = {
    kRef: p(hidraulica.penetracion, 'k_ref', 'hidraulica.penetracion.k_ref'),
    Tref: p(hidraulica.penetracion, 'T_ref', 'hidraulica.penetracion.T_ref'),
    E: p(hidraulica.penetracion, 'E', 'hidraulica.penetracion.E'),
  }
  const tAmb = p(energia, 'T_ambiente', 'energia.T_ambiente')
  const factorDifusion = especies.map((e) => p(e, 'factor_difusion', `licores.especies.${e.id}.factor_difusion`))
  const parcelasPorCelda = simulacion.parcelas_por_celda ?? 3

  // Vasos.
  const vasos = topologia.vasos.map((cv) => {
    const eq = equipos.vasos?.[cv.id]
    if (!eq) throw new Error(`Faltan las dimensiones del vaso "${cv.id}" en equipos.json`)
    const tramos = eq.tramos.map((t, i) => ({
      altura: p(t, 'altura', `equipos.vasos.${cv.id}.tramos[${i}].altura`),
      diametro: p(t, 'diametro', `equipos.vasos.${cv.id}.tramos[${i}].diametro`),
    }))
    const geom = crearGeometria(tramos, cv.celdas)
    const masaCelda = (sCol * densidadBasica * geom.volumenTotal) / geom.n
    const zonas = (cv.zonas ?? []).map((z) => {
      const desde = p(z, 'desde', `topologia.${cv.id}.zonas.${z.id}.desde`)
      const hasta = p(z, 'hasta', `topologia.${cv.id}.zonas.${z.id}.hasta`)
      const celdas = []
      for (let j = 0; j < geom.n; j++) {
        const zc = (j + 0.5) * geom.dz
        if (zc >= desde && zc < hasta) celdas.push(j)
      }
      return { id: z.id, nombre: z.nombre, desde, hasta, celdas }
    })
    return {
      id: cv.id,
      nombre: cv.nombre,
      geom,
      sCol,
      masaObjetivo: masaCelda / parcelasPorCelda,
      UA: p(energia.UA_perdidas, cv.id, `energia.UA_perdidas.${cv.id}`),
      tAmb,
      fis,
      dif,
      penetracion,
      kCalor: p(hidraulica, 'k_calor', 'hidraulica.k_calor'),
      factorDifusion,
      iOH: idx.OH,
      zonas,
      presion: leerPresion(equipos.presion?.[cv.id], cv.id, hidraulica),
      compactacion: leerCompactacion(hidraulica),
      raspador: leerRaspador(hidraulica.raspadores?.[cv.id], cv.id),
      huecoMaximo: p(hidraulica.colgamiento, 'hueco_maximo', 'hidraulica.colgamiento.hueco_maximo'),
      liberacion: {
        fraccion: p(hidraulica.colgamiento, 'fraccion_liberacion', 'hidraulica.colgamiento.fraccion_liberacion'),
        tiempo: p(hidraulica.colgamiento, 'tiempo_liberacion', 'hidraulica.colgamiento.tiempo_liberacion'),
        corrientes: (hidraulica.colgamiento.corrientes_liberacion ?? []).filter((id) => {
          if (!topologia.corrientes.some((c) => c.id === id)) throw new Error(`hidraulica.colgamiento.corrientes_liberacion: corriente desconocida "${id}"`)
          return topologia.corrientes.some((c) => c.id === id && c.origen?.vaso === cv.id)
        }),
      },
    }
  })
  const vasoPorId = Object.fromEntries(vasos.map((v) => [v.id, v]))

  // Corrientes.
  const ids = new Set()
  const corrientes = topologia.corrientes.map((cc) => {
    if (ids.has(cc.id)) throw new Error(`Corriente repetida: "${cc.id}"`)
    ids.add(cc.id)
    const c = { id: cc.id, nombre: cc.nombre, origen: {}, destino: {} }
    // Origen.
    if (cc.origen.fuente) {
      c.tipo = cc.origen.fuente === 'astillas' ? 'astillas' : 'fuente'
      c.origen.fuente = cc.origen.fuente
      if (c.tipo === 'fuente' && !licores.fuentes?.[cc.origen.fuente]) {
        throw new Error(`Corriente "${cc.id}": la fuente "${cc.origen.fuente}" no existe en licores.json`)
      }
    } else if (cc.origen.vaso) {
      const v = vasoPorId[cc.origen.vaso]
      if (!v) throw new Error(`Corriente "${cc.id}": vaso de origen desconocido "${cc.origen.vaso}"`)
      c.origen.vaso = v.id
      if (cc.origen.fondo) c.tipo = 'fondo'
      else {
        c.tipo = 'extraccion'
        c.origen.j = celdaDeAltura(v.geom, p(cc.origen, 'z', `topologia.corrientes.${cc.id}.origen.z`))
      }
    } else throw new Error(`Corriente "${cc.id}": origen inválido`)
    // Destino.
    if (cc.destino.vaso) {
      const v = vasoPorId[cc.destino.vaso]
      if (!v) throw new Error(`Corriente "${cc.id}": vaso de destino desconocido "${cc.destino.vaso}"`)
      c.destino.vaso = v.id
      c.destino.tope = !!cc.destino.tope
      c.destino.j = cc.destino.tope ? 0 : celdaDeAltura(v.geom, p(cc.destino, 'z', `topologia.corrientes.${cc.id}.destino.z`))
    } else if (cc.destino.sumidero) {
      c.destino.sumidero = cc.destino.sumidero
    } else if (cc.destino.equipo) {
      c.destino.equipo = cc.destino.equipo
    } else if (cc.destino.unir) {
      if (c.tipo !== 'fuente') throw new Error(`Corriente "${cc.id}": solo una fuente puede unirse a otra corriente`)
      c.destino.unir = cc.destino.unir
    } else throw new Error(`Corriente "${cc.id}": destino inválido`)
    // Las astillas solo pueden entrar por el tope.
    if ((c.tipo === 'astillas' || c.tipo === 'fondo') && c.destino.vaso && !c.destino.tope) {
      throw new Error(`Corriente "${cc.id}": las astillas solo pueden entrar por el tope de un vaso`)
    }
    // Tubería: obligatoria si sale de un vaso y entra a un vaso (evita lazos algebraicos).
    const vTubo = equipos.tubos?.[cc.id]
    c.volumenTubo = vTubo ? p(equipos.tubos, cc.id, `equipos.tubos.${cc.id}`) : 0
    if (c.tipo !== 'fuente' && c.tipo !== 'astillas' && c.destino.vaso && c.volumenTubo <= 0) {
      throw new Error(`Corriente "${cc.id}": entre vasos se requiere el volumen de tubería en equipos.tubos`)
    }
    if (equipos.calentadores?.[cc.id]) c.calentador = true
    return c
  })
  const corrientePorId = Object.fromEntries(corrientes.map((c) => [c.id, c]))
  for (const c of corrientes) {
    if (c.destino.unir) {
      const t = corrientePorId[c.destino.unir]
      if (!t || !t.destino.vaso) throw new Error(`Corriente "${c.id}": no se puede unir a "${c.destino.unir}"`)
    }
  }
  // Válvulas de control: las corrientes que las tienen dependen de la presión.
  const valvulas = {}
  for (const [id, cv] of Object.entries(equipos.valvulas ?? {})) {
    if (id.startsWith('_')) continue
    const c = corrientePorId[id]
    if (!c || c.tipo !== 'extraccion') throw new Error(`equipos.valvulas.${id}: debe ser una extracción de un vaso`)
    const ruta = `equipos.valvulas.${id}`
    const destinoFlash = c.destino.equipo && equipos.flash?.[c.destino.equipo]
    valvulas[id] = {
      Kv: p(cv, 'Kv', `${ruta}.Kv`),
      tipo: cv.caracteristica ?? 'lineal',
      R: cv.rangeabilidad ?? 50,
      tau: p(cv, 'tau', `${ruta}.tau`),
      carrera: p(cv, 'carrera', `${ruta}.carrera`),
      // Presión aguas abajo: la del ciclón flash de destino o la configurada.
      Pdest: destinoFlash ? p(destinoFlash, 'P', `equipos.flash.${c.destino.equipo}.P`) : p(cv, 'P_destino', `${ruta}.P_destino`),
    }
    c.valvula = valvulas[id]
  }
  // Bombas: cada corriente sabe qué bombas la mueven.
  const bombas = {}
  for (const [id, cb] of Object.entries(equipos.bombas ?? {})) {
    if (id.startsWith('_')) continue
    const ruta = `equipos.bombas.${id}`
    bombas[id] = {
      corrientes: cb.corrientes,
      tau: p(cb, 'tau', `${ruta}.tau`),
      Pcierre: cb.P_cierre ? p(cb, 'P_cierre', `${ruta}.P_cierre`) : null,
      margen: cb.margen ? p(cb, 'margen', `${ruta}.margen`) : null,
    }
    for (const cid of cb.corrientes) {
      const c = corrientePorId[cid]
      if (!c) throw new Error(`${ruta}: corriente desconocida "${cid}"`)
      c.bombas = [...(c.bombas ?? []), id]
    }
  }
  for (const c of corrientes) c.bombas ??= []

  const cin = construirCinetica(config)
  for (const v of vasos) {
    v.compactacion.kappa0 = cin.comp.lignina / cin.ligPorKappa
    v.cinLigPorKappa = cin.ligPorKappa
    v.densidadPared = densidadPared
  }
  const eq = construirEquipos(config)
  const mallas = construirMallas(config)
  for (const [id, m] of Object.entries(mallas)) {
    for (const cid of m.corrientes) {
      const c = corrientePorId[cid]
      if (!c || c.tipo !== 'extraccion') throw new Error(`equipos.mallas.${id}: "${cid}" debe ser una extracción`)
      c.malla = id
    }
  }
  for (const c of corrientes) {
    if (c.destino.equipo && c.destino.equipo !== 'estanque_soplado' && !eq.flash[c.destino.equipo]) {
      throw new Error(`Corriente "${c.id}": equipo de destino desconocido "${c.destino.equipo}"`)
    }
  }

  return {
    equipos: eq,
    mallas,
    cin,
    dtR,
    dtL,
    pasosPorLento,
    especies,
    idx,
    fis,
    densidadBasica,
    densidadPared,
    tAmb,
    vasos,
    vasoPorId,
    corrientes,
    corrientePorId,
    valvulas,
    bombas,
    config,
  }
}

/** Datos de presión y elementos de seguridad de un vaso. */
function leerPresion(cp, id, hidraulica) {
  if (!cp) throw new Error(`Faltan los datos de presión del vaso "${id}" en equipos.presion`)
  const r = `equipos.presion.${id}`
  return {
    Pdis: p(cp, 'P_diseno', `${r}.P_diseno`),
    beta: p(hidraulica, 'compresibilidad_licor', 'hidraulica.compresibilidad_licor') +
      p(hidraulica, 'compresibilidad_vaso', 'hidraulica.compresibilidad_vaso'),
    margenEbullicion: p(hidraulica, 'margen_ebullicion', 'hidraulica.margen_ebullicion'),
    alivio: {
      Pset: p(cp.alivio, 'P_ajuste', `${r}.alivio.P_ajuste`),
      dP: p(cp.alivio, 'sobrepresion', `${r}.alivio.sobrepresion`),
      Kv: p(cp.alivio, 'Kv', `${r}.alivio.Kv`),
      Pdest: p(cp.alivio, 'P_destino', `${r}.alivio.P_destino`),
    },
    seguridad: {
      Pset: p(cp.seguridad, 'P_ajuste', `${r}.seguridad.P_ajuste`),
      purga: p(cp.seguridad, 'purga', `${r}.seguridad.purga`),
      Kv: p(cp.seguridad, 'Kv', `${r}.seguridad.Kv`),
      Pdest: p(cp.seguridad, 'P_destino', `${r}.seguridad.P_destino`),
    },
  }
}

function leerCompactacion(h) {
  const c = h.compactacion
  const r = 'hidraulica.compactacion'
  return {
    s0: p(c, 's0', `${r}.s0`),
    sMax: p(c, 's_max', `${r}.s_max`),
    cKappa: p(c, 'c_kappa', `${r}.c_kappa`),
    cSigma: p(c, 'c_esfuerzo', `${r}.c_esfuerzo`),
    sigmaRef: p(c, 'esfuerzo_ref', `${r}.esfuerzo_ref`),
    muK: p(c, 'mu_K', `${r}.mu_K`),
    kArrastre: p(c, 'k_arrastre', `${r}.k_arrastre`),
    tau: p(c, 'tau', `${r}.tau`),
  }
}

function leerRaspador(c, id) {
  if (!c) throw new Error(`Faltan los datos del raspador del vaso "${id}" en hidraulica.raspadores`)
  const r = `hidraulica.raspadores.${id}`
  return {
    T0: p(c, 'torque_vacio', `${r}.torque_vacio`),
    kT: p(c, 'k_torque', `${r}.k_torque`),
    I0: p(c, 'corriente_vacio', `${r}.corriente_vacio`),
    kI: p(c, 'k_corriente', `${r}.k_corriente`),
    Ialarma: p(c, 'corriente_alarma', `${r}.corriente_alarma`),
  }
}
