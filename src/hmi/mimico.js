// Mímicos de proceso en SVG a partir de una definición declarativa.
//
// Una pantalla describe sus elementos con coordenadas en un lienzo de
// `ancho × alto` (el SVG se escala al espacio disponible). Tipos:
//   vaso {x,y,w,h,etiqueta,etiquetaIzq}          zona {x,y,w,h,etiqueta}
//   tubo {p:[[x,y],…], clase}         texto {x,y,t,clase,ancla}
//   valor {tag,x,y,w,etiqueta}        lazo {tag,x,y}
//   bomba {id,x,y}                    nivel {tag,x,y,w,h}
//   malla {id,x,y,h}                  calentador {id,x,y}
//   columna {vaso,x,y,w,h,altura}     boton {x,y,w,texto,accion}
//   venteo {vaso,x,y}
// `actualizar(estado)` refresca valores, colores y estados sin rehacer el SVG.

import { s } from './dom.js'
import { num } from './formato.js'

const ALTO_VALOR = 34
const ANCHO_LAZO = 132
const ALTO_LAZO = 52

/** Prioridad de alarma más alta (1 = crítica) por tag, y si hay alguna sin reconocer. */
export function alarmasPorTag(estado) {
  const r = {}
  for (const a of estado.control.alarmas.lista) {
    if (!a.tag) continue
    const x = r[a.tag] ?? { prioridad: 9, sinReconocer: false }
    x.prioridad = Math.min(x.prioridad, a.prioridad)
    x.sinReconocer ||= !a.reconocida
    r[a.tag] = x
  }
  return r
}

export function crearMimico(def, app) {
  const raiz = s('svg', { class: 'mimico', viewBox: `0 0 ${def.ancho} ${def.alto}`, preserveAspectRatio: 'xMidYMin meet' })
  const actualizadores = []
  // Primero tubos y vasos (fondo), después instrumentos (encima).
  const orden = { vaso: 0, zona: 1, columna: 1, tubo: 2, malla: 3, venteo: 3, texto: 4 }
  const elementos = [...def.elementos].sort((a, b) => (orden[a.tipo] ?? 5) - (orden[b.tipo] ?? 5))
  for (const e of elementos) {
    const r = DIBUJAR[e.tipo]?.(e, app)
    if (!r) throw new Error(`Elemento de mímico desconocido: ${e.tipo}`)
    raiz.append(r.nodo)
    if (r.actualizar) actualizadores.push(r.actualizar)
  }
  return {
    elemento: raiz,
    actualizar(estado) {
      const alarmas = alarmasPorTag(estado)
      for (const f of actualizadores) f(estado, alarmas)
    },
  }
}

function claseAlarma(a) {
  if (!a) return ''
  return ` alarma-${a.prioridad}${a.sinReconocer ? ' parpadea' : ''}`
}

const DIBUJAR = {
  vaso: (e) => ({
    nodo: s('g', {},
      s('rect', { class: 'vaso', x: e.x, y: e.y, width: e.w, height: e.h, rx: e.r ?? Math.min(e.w / 2, 14) }),
      e.etiqueta ? (e.etiquetaIzq
        ? s('text', { class: 'titulo', x: e.x - 6, y: e.y + 14, 'text-anchor': 'end', texto: e.etiqueta })
        : s('text', { class: 'titulo', x: e.x + e.w / 2, y: e.y - 6, 'text-anchor': 'middle', texto: e.etiqueta })) : null),
  }),

  zona: (e) => ({
    nodo: s('g', {},
      s('rect', { class: 'zona', x: e.x, y: e.y, width: e.w, height: e.h }),
      e.etiqueta ? s('text', { class: 'suave', x: e.x + 4, y: e.y + 13, texto: e.etiqueta }) : null),
  }),

  tubo: (e) => ({
    nodo: s('polyline', { class: `tubo ${e.clase ?? ''}`, points: e.p.map((q) => q.join(',')).join(' ') }),
  }),

  texto: (e) => ({
    nodo: s('text', { x: e.x, y: e.y, class: e.clase ?? '', 'text-anchor': e.ancla ?? 'start', texto: e.t }),
  }),

  /** Caja con el valor de un transmisor. Clic: carátula del lazo que lo usa, o tendencia del tag. */
  valor: (e, app) => {
    const w = e.w ?? 116
    const caja = s('rect', { class: 'caja', x: e.x, y: e.y, width: w, height: ALTO_VALOR, rx: 2 })
    const valor = s('text', { class: 'valor', x: e.x + w - 5, y: e.y + 28, 'text-anchor': 'end' })
    const nodo = s('g', { class: 'clic', 'data-tag': e.tag, onclick: () => app.abrirTag(e.tag) },
      caja,
      s('text', { class: 'suave', x: e.x + 4, y: e.y + 12, texto: e.etiqueta ?? e.tag }),
      valor)
    return {
      nodo,
      actualizar(estado, alarmas) {
        const t = estado.control.transmisores[e.tag]
        if (!t) return
        valor.textContent = `${num(t.valor, t.decimales)} ${t.unidad}`
        caja.setAttribute('class', `caja${t.calidad === 'mala' ? ' mala' : ''}${claseAlarma(alarmas[e.tag])}`)
      },
    }
  },

  /** Bloque de lazo: tag, modo, PV, SP y salida. Clic: carátula. */
  lazo: (e, app) => {
    const caja = s('rect', { class: 'caja', x: e.x, y: e.y, width: ANCHO_LAZO, height: ALTO_LAZO, rx: 2 })
    const modo = s('text', { x: e.x + ANCHO_LAZO - 5, y: e.y + 13, 'text-anchor': 'end', 'font-weight': 700 })
    const pv = s('text', { class: 'valor', x: e.x + ANCHO_LAZO - 5, y: e.y + 30, 'text-anchor': 'end' })
    const sp = s('text', { class: 'suave', x: e.x + 4, y: e.y + 46 })
    const nodo = s('g', { class: 'clic', 'data-tag': e.tag, onclick: () => app.abrirLazo(e.tag) },
      caja,
      s('text', { x: e.x + 4, y: e.y + 13, 'font-weight': 600, texto: e.tag }),
      modo, pv, sp)
    return {
      nodo,
      actualizar(estado, alarmas) {
        const l = estado.control.lazos[e.tag]
        if (!l) return
        const tx = estado.control.transmisores[l.transmisor]
        const d = tx?.decimales ?? 1
        pv.textContent = `${num(l.pv, d)} ${l.unidad}`
        sp.textContent = `SP ${num(l.sp, d)}  OUT ${num(l.salida, 0)} %`
        modo.textContent = l.forzado ? `${l.modo} ENC` : l.modo
        modo.setAttribute('class', `modo-${l.modo}`)
        const a = alarmas[l.transmisor] ?? alarmas[e.tag]
        caja.setAttribute('class', `caja${tx?.calidad === 'mala' ? ' mala' : ''}${claseAlarma(a)}`)
      },
    }
  },

  /** Bomba: círculo lleno en marcha, vacío detenida. Clic: partir / detener. */
  bomba: (e, app) => {
    const r = e.r ?? 11
    const circ = s('circle', { class: 'bomba', cx: e.x, cy: e.y, r })
    const nodo = s('g', { class: 'clic', onclick: (ev) => app.menuBomba(e.id, ev) },
      circ,
      s('polygon', { points: `${e.x - 4},${e.y - 6} ${e.x - 4},${e.y + 6} ${e.x + 7},${e.y}`, fill: '#9a9a9a' }),
      e.etiqueta ? s('text', { class: 'suave', x: e.x, y: e.y + r + 13, 'text-anchor': 'middle', texto: e.etiqueta }) : null)
    return {
      nodo,
      actualizar(estado) {
        const b = estado.bombas[e.id]
        if (b) circ.setAttribute('class', `bomba ${b.marcha ? 'marcha' : 'detenida'}`)
      },
    }
  },

  /** Barra vertical de nivel de un transmisor. */
  nivel: (e, app) => {
    const barra = s('rect', { class: 'nivel-barra', x: e.x + 1, width: e.w - 2 })
    const nodo = s('g', { class: 'clic', onclick: () => app.abrirTag(e.tag) },
      s('rect', { class: 'nivel-fondo', x: e.x, y: e.y, width: e.w, height: e.h }), barra)
    return {
      nodo,
      actualizar(estado) {
        const t = estado.control.transmisores[e.tag]
        if (!t) return
        const f = Math.min(1, Math.max(0, (t.valor - t.rango[0]) / (t.rango[1] - t.rango[0])))
        barra.setAttribute('y', e.y + e.h * (1 - f))
        barra.setAttribute('height', e.h * f)
      },
    }
  },

  /** Malla (línea punteada en la pared del vaso). Clic: retrolavado, conmutación, lavado ácido. */
  malla: (e, app) => {
    const linea = s('line', { class: 'malla', x1: e.x, y1: e.y, x2: e.x, y2: e.y + e.h })
    const nodo = s('g', { class: 'clic', onclick: (ev) => app.menuMalla(e.id, ev) },
      s('rect', { x: e.x - 6, y: e.y, width: 12, height: e.h, fill: 'transparent' }), linea)
    return {
      nodo,
      actualizar(estado) {
        const m = estado.mallas[e.id]
        if (m) linea.setAttribute('class', `malla${m.dP > 0.8 * m.dPmax ? ' alta' : ''}`)
      },
    }
  },

  /** Venteo del tope de un vaso (válvula manual a la atmósfera). Clic: abrir o cerrar. */
  venteo: (e, app) => {
    const marca = s('rect', { class: 'venteo', x: e.x, y: e.y, width: 40, height: 18, rx: 3 })
    const texto = s('text', { x: e.x + 20, y: e.y + 13, 'text-anchor': 'middle', class: 'suave', texto: 'Venteo' })
    return {
      nodo: s('g', { class: 'clic', onclick: (ev) => app.menuVenteo(e.vaso, ev) }, marca, texto),
      actualizar(estado) {
        const abierto = !!estado.vasos[e.vaso]?.presion?.venteo
        marca.setAttribute('class', `venteo${abierto ? ' abierto' : ''}`)
        texto.textContent = abierto ? 'Venteo ABIERTO' : 'Venteo'
      },
    }
  },

  /** Calentador (intercambiador de tubos). Clic: conmutar a respaldo, lavado ácido. */
  calentador: (e, app) => {
    const w = 46
    const hgt = 26
    const zig = []
    for (let i = 0; i <= 6; i++) zig.push(`${e.x + 4 + (i * (w - 8)) / 6},${e.y + (i % 2 ? hgt - 6 : 6)}`)
    return {
      nodo: s('g', { class: 'clic', onclick: (ev) => app.menuCalentador(e.id, ev) },
        s('rect', { class: 'vaso', x: e.x, y: e.y, width: w, height: hgt, rx: 4 }),
        s('polyline', { points: zig.join(' '), fill: 'none', stroke: '#2f2f2f', 'stroke-width': 1.5 }),
        e.etiqueta ? s('text', { class: 'suave', x: e.x + w / 2, y: e.y + hgt + 13, 'text-anchor': 'middle', texto: e.etiqueta }) : null),
    }
  },

  /** Columna de astillas dentro de un vaso (alto según el nivel de astillas). */
  columna: (e) => {
    const rect = s('rect', { class: 'astillas-col', x: e.x, width: e.w })
    return {
      nodo: rect,
      actualizar(estado) {
        const n = estado.vasos[e.vaso]?.nivelAstillas ?? 0
        const f = Math.min(1, Math.max(0, n / e.altura))
        rect.setAttribute('y', e.y + e.h * (1 - f))
        rect.setAttribute('height', e.h * f)
      },
    }
  },

  /** Perfil vertical de una variable por celda (solo con los perfiles habilitados). */
  perfil: (e) => {
    const linea = s('polyline', { class: 'perfil' })
    const aviso = s('text', { class: 'suave', x: e.x + 4, y: e.y + e.h / 2, texto: '' })
    const marcas = []
    for (let i = 0; i <= 2; i++) {
      const v = e.min + ((e.max - e.min) * i) / 2
      marcas.push(s('text', { class: 'suave', x: e.x + (e.w * i) / 2, y: e.y + e.h + 13, 'text-anchor': 'middle', texto: String(Math.round(v)) }))
    }
    const nodo = s('g', {},
      s('rect', { class: 'nivel-fondo', x: e.x, y: e.y, width: e.w, height: e.h }),
      s('text', { class: 'suave', x: e.x + e.w / 2, y: e.y - 5, 'text-anchor': 'middle', texto: e.etiqueta }),
      marcas, linea, aviso)
    return {
      nodo,
      actualizar(estado) {
        const p = estado.vasos[e.vaso]?.perfil
        if (!p) {
          linea.setAttribute('points', '')
          aviso.textContent = 'perfiles desactivados'
          return
        }
        aviso.textContent = ''
        const valores = e.especie ? p.especies[e.especie] : p[e.serie]
        const n = valores.length
        const pts = []
        valores.forEach((v, i) => {
          if (v === null || !Number.isFinite(v)) return
          const f = Math.min(1, Math.max(0, (v * (e.factor ?? 1) - e.min) / (e.max - e.min)))
          pts.push(`${(e.x + f * e.w).toFixed(1)},${(e.y + (e.h * (i + 0.5)) / n).toFixed(1)}`)
        })
        linea.setAttribute('points', pts.join(' '))
      },
    }
  },

  boton: (e, app) => {
    const w = e.w ?? 110
    return {
      nodo: s('g', { class: 'clic', onclick: (ev) => e.accion(app, ev) },
        s('rect', { class: 'caja', x: e.x, y: e.y, width: w, height: 26, rx: 3 }),
        s('text', { x: e.x + w / 2, y: e.y + 17, 'text-anchor': 'middle', texto: e.texto })),
    }
  },
}
