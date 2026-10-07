// Estados iniciales de la planta.
//  - "operacion": vasos llenos de licor, columnas de astillas a su nivel,
//    caudales del caso base. Desde aquí se corre hasta estado estacionario.
//  - "vacio": vasos y tuberías vacíos, fríos y con todos los caudales en cero.

import { p } from './parametros.js'
import { composicionFuente } from './licor.js'
import { estadoVasoVacio } from './vaso.js'
import { crearTubo } from './tubo.js'
import { ubicarColumna } from './columna.js'
import { cantidadesVacias, inventario } from './contabilidad.js'
import { estadoInicial as estadoAleatorio } from './aleatorio.js'

/** Caudal de madera seca (kg/s) para una producción (ADt/d) y un rendimiento. */
export function maderaDesdeProduccion(produccion, rendimiento) {
  return (produccion * 0.9 * 1000) / 86400 / rendimiento
}

/** Ajustes (caudales y consignas manipulables) del caso base. */
export function ajustesCasoBase(modelo, fuentes) {
  const cb = modelo.config.caso_base
  const madera = maderaDesdeProduccion(
    p(cb, 'produccion', 'caso_base.produccion'),
    p(cb, 'rendimiento_nominal', 'caso_base.rendimiento_nominal'),
  )
  // Licor blanco: caudal total para la carga de álcali, repartido por corriente.
  const carga = p(cb.alcali, 'carga_EA', 'caso_base.alcali.carga_EA')
  const ohLB = fuentes.licor_blanco.c[modelo.idx.OH]
  const qLB = (carga * madera) / (40 * ohLB) // m³/s (EA en kg NaOH/s ÷ concentración)
  const ajustes = {}
  for (const c of modelo.corrientes) {
    const a = { caudal: 0 }
    if (cb.alcali.reparto[c.id]) a.caudal = qLB * p(cb.alcali.reparto, c.id, `caso_base.alcali.reparto.${c.id}`)
    else if (cb.caudales[c.id]) a.caudal = p(cb.caudales, c.id, `caso_base.caudales.${c.id}`)
    if (c.tipo === 'astillas' || c.tipo === 'fondo') a.caudalMadera = madera
    if (c.calentador) {
      a.T_salida = p(cb.temperaturas_calentadores, c.id, `caso_base.temperaturas_calentadores.${c.id}`)
    }
    ajustes[c.id] = a
  }
  return ajustes
}

/** Estado de las fuentes externas (modificable por comandos y perturbaciones). */
export function fuentesIniciales(modelo) {
  const { licores, caso_base: cb } = modelo.config
  const fuentes = {}
  for (const [id, f] of Object.entries(licores.fuentes)) {
    fuentes[id] = {
      T: p(f, 'T', `licores.fuentes.${id}.T`),
      c: composicionFuente(f, modelo.especies, `licores.fuentes.${id}`),
    }
  }
  fuentes.astillas = {
    T: p(cb.astillas, 'T', 'caso_base.astillas.T'),
    humedad: p(cb.astillas, 'humedad', 'caso_base.astillas.humedad'),
    densidad: modelo.densidadBasica,
    marca: 0,
  }
  return fuentes
}

/** Crea una parcela de astillas frescas. */
export function parcelaFresca(modelo, astillas, m) {
  const vol = m / astillas.densidad
  const vp = Math.max(0, vol - m / modelo.densidadPared)
  const agua = (m * astillas.humedad) / (1 - astillas.humedad) / 1000 // m³ de agua
  return {
    m,
    vol,
    vp,
    vr: Math.min(agua, vp),
    T: astillas.T,
    cr: new Array(modelo.especies.length).fill(0),
    H: 0,
    edad: 0,
    marca: astillas.marca,
  }
}

/** Estado completo inicial. modo: "operacion" | "vacio". */
export function crearEstadoInicial(modelo, { modo = 'operacion', semilla } = {}) {
  const nEsp = modelo.especies.length
  const sem = semilla ?? modelo.config.simulacion.semilla ?? 1
  const fuentes = fuentesIniciales(modelo)
  const ajustes = ajustesCasoBase(modelo, fuentes)
  const estado = {
    version: 1,
    paso: 0,
    semilla: sem,
    ajustes,
    fuentes,
    vasos: {},
    tubos: {},
    corrientes: {},
    contabilidad: null,
    aleatorio: {
      instrumentos: estadoAleatorio(sem, 'instrumentos'),
      eventos: estadoAleatorio(sem, 'eventos'),
      laboratorio: estadoAleatorio(sem, 'laboratorio'),
    },
    diag: {},
    registro: [], // comandos aplicados, con el paso en que se aplicaron
  }

  const licorInicial = {}
  for (const v of modelo.vasos) {
    const ev = estadoVasoVacio(v.geom.n, nEsp, modelo.tAmb)
    if (modo === 'operacion') {
      const ci = modelo.config.caso_base.estado_inicial[v.id]
      const T = p(ci, 'T', `caso_base.estado_inicial.${v.id}.T`)
      const c = fuentes[ci.licor]?.c
      if (!c) throw new Error(`caso_base.estado_inicial.${v.id}.licor: fuente desconocida "${ci.licor}"`)
      licorInicial[v.id] = { T, c }
      llenarColumna(modelo, v, ev, p(ci, 'nivel_astillas', `caso_base.estado_inicial.${v.id}.nivel_astillas`), T, c)
      const col = ubicarColumna(ev.parcelas, v.geom, v.sCol)
      for (let j = 0; j < v.geom.n; j++) {
        ev.vf[j] = Math.max(0, v.geom.V[j] - col.volAstilla[j])
        ev.T[j] = T
        for (let k = 0; k < nEsp; k++) ev.c[k][j] = c[k]
      }
    }
    estado.vasos[v.id] = ev
  }

  for (const c of modelo.corrientes) {
    const a = ajustes[c.id]
    if (modo === 'vacio') {
      a.caudal = 0
      if (a.caudalMadera !== undefined) a.caudalMadera = 0
    }
    estado.corrientes[c.id] = { vUltimo: 0, caudalReal: 0, T: modelo.tAmb }
    if (c.volumenTubo > 0) {
      const li = modo === 'operacion' && c.origen.vaso ? licorInicial[c.origen.vaso] : null
      estado.tubos[c.id] = li
        ? crearTubo(c.volumenTubo, li)
        : { paquetes: [] }
      if (modo === 'operacion') {
        let v = a.caudal * modelo.dtL
        if (c.tipo === 'fondo') v += (a.caudalMadera * modelo.dtL) / fuentes.astillas.densidad
        estado.corrientes[c.id].vUltimo = v
      }
    }
  }

  const inv0 = inventario(modelo, estado)
  estado.contabilidad = {
    inv0,
    entra: cantidadesVacias(nEsp),
    sale: cantidadesVacias(nEsp),
    calentadores: 0, // kJ entregados
    perdidas: 0, // kJ perdidos al ambiente
    sumideros: {}, // volumen de licor por sumidero (m³)
  }
  return estado
}

/** Apila parcelas frescas (ya impregnadas con el licor inicial) hasta el nivel indicado. */
function llenarColumna(modelo, v, ev, nivel, T, c) {
  const { geom } = v
  // Volumen de vaso bajo la altura `nivel` (m sobre el fondo).
  let volObjetivo = 0
  let h = 0
  for (let j = geom.n - 1; j >= 0 && h < nivel; j--) {
    const dh = Math.min(geom.dz, nivel - h)
    volObjetivo += geom.A[j] * dh
    h += dh
  }
  const astillas = { ...fuentesIniciales(modelo).astillas, T, marca: 0 }
  let vol = 0
  while (vol < volObjetivo - 1e-9) {
    const mMax = v.masaObjetivo
    const m = Math.min(mMax, ((volObjetivo - vol) * v.sCol) * astillas.densidad)
    const par = parcelaFresca(modelo, astillas, m)
    par.vr = par.vp
    par.cr = c.slice()
    ev.parcelas.push(par)
    vol += par.vol / v.sCol
  }
}
