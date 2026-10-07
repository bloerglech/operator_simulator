// Web Worker de la simulación. Recibe pedidos del cliente (cliente.js) y
// publica instantáneas del estado unas 5 veces por segundo real.
//
// Mensajes de entrada: { id, tipo, ... } con tipo
//   iniciar { semilla, guardado, horasPrevias, mision, generador } · velocidad { valor } · reintentar
//   comando { cmd } · guardar · tendencia { nombres, t0, t1, max } · perfiles { activo }
// Mensajes de salida:
//   { tipo: 'progreso', fraccion } · { tipo: 'estado', estado, rendimiento }
//   { tipo: 'respuesta', id, ok, datos | error }

import { crearMotor } from './motor.js'
import { configuracion } from './configuracion.js'
import { MISIONES, MODOS } from '../misiones/campana.js'

const motor = crearMotor(configuracion())
const TIC_MS = 50 // ciclo del worker
const PUBLICAR_MS = 200 // instantáneas a la interfaz
let ultimoTic = performance.now()
let ultimaPublicacion = 0
let ocupado = 0 // fracción del tiempo real usada por la simulación (promedio)
let simuladoPorSegundo = 0

function responder(id, ok, datos, error) {
  self.postMessage({ tipo: 'respuesta', id, ok, datos, error })
}

function publicar() {
  if (!motor.listo()) return
  self.postMessage({ tipo: 'estado', estado: motor.estado(), rendimiento: { ocupado, simuladoPorSegundo } })
}

self.onmessage = (ev) => {
  const m = ev.data
  try {
    switch (m.tipo) {
      case 'iniciar':
        motor.iniciar({
          semilla: m.semilla ?? 1,
          guardado: m.guardado ?? null,
          horasPrevias: m.horasPrevias ?? 8,
          mision: m.mision ?? null,
          generador: m.generador ?? null,
          progreso: (f) => self.postMessage({ tipo: 'progreso', fraccion: f }),
        })
        motor.fijarVelocidad(m.velocidad ?? 1)
        responder(m.id, true)
        publicar()
        break
      case 'velocidad':
        motor.fijarVelocidad(m.valor)
        responder(m.id, true)
        publicar()
        break
      case 'comando':
        motor.comando(m.cmd)
        responder(m.id, true)
        break
      case 'catalogo': {
        const cfg = configuracion()
        responder(m.id, true, {
          misiones: cfg.campana.orden.map((id) => {
            const d = MISIONES[id]
            return { id, capitulo: d.capitulo, titulo: d.titulo, resumen: d.resumen, ensena: d.ensena }
          }),
          modos: Object.values(MODOS).map((d) => ({ id: d.id, titulo: d.titulo, resumen: d.resumen })),
          dificultades: cfg.campana.dificultades,
        })
        break
      }
      case 'reintentar':
        motor.reintentar()
        motor.fijarVelocidad(1)
        responder(m.id, true)
        publicar()
        break
      case 'guardar':
        responder(m.id, true, motor.guardar())
        break
      case 'tendencia':
        responder(m.id, true, motor.tendencia(m.nombres, m.t0, m.t1, m.max))
        break
      case 'perfiles':
        motor.fijarPerfiles(m.activo)
        responder(m.id, true)
        break
      default:
        throw new Error(`Pedido desconocido: ${m.tipo}`)
    }
  } catch (e) {
    responder(m.id, false, null, e.message)
  }
}

function ciclo() {
  const ahora = performance.now()
  const real = (ahora - ultimoTic) / 1000
  ultimoTic = ahora
  try {
    paso(ahora, real)
  } catch (e) {
    // Un error del motor no detiene el ciclo, pero la simulación queda en pausa
    // (no se repite un paso a medias en cada ciclo) y se avisa a la interfaz.
    try { if (motor.listo()) motor.fijarVelocidad(0) } catch { /* sin motor */ }
    self.postMessage({ tipo: 'error', error: String(e?.message ?? e) })
  }
  setTimeout(ciclo, TIC_MS)
}

function paso(ahora, real) {
  if (motor.listo()) {
    const t0 = performance.now()
    const sim = motor.tic(real, TIC_MS * 0.8, () => performance.now())
    const uso = (performance.now() - t0) / Math.max(1, real * 1000)
    ocupado += (uso - ocupado) * 0.1
    simuladoPorSegundo += (sim / Math.max(real, 1e-3) - simuladoPorSegundo) * 0.1
    if (ahora - ultimaPublicacion >= PUBLICAR_MS) {
      ultimaPublicacion = ahora
      publicar()
    }
  }
}
ciclo()
