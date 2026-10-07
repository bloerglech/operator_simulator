// Motor del puente: maneja el sistema (planta + control), la aceleración,
// el historial y los pedidos de la presentación. No usa APIs del navegador:
// el reloj real lo entrega quien lo llama (worker en el navegador, pruebas en
// Node), así el mismo código se prueba sin navegador.

import { crearJuego } from '../escenarios/juego.js'
import { prepararJuego } from '../escenarios/preparar.js'
import { crearHistorial } from './historial.js'

export const VELOCIDADES = [0, 1, 10, 60, 300]
const MAX_TROZO = 5 // s simulados por llamada a avanzar (muestreo del historial)
const MAX_PUNTOS = 6 // puntos de control guardados en memoria

export function crearMotor(config) {
  let sistema = null
  let velocidad = 0
  let deuda = 0 // s simulados pedidos y aún no simulados
  let perfiles = false
  let inicioPartida = 0 // tiempo simulado en que empezó a jugar el operador
  let puntos = [] // puntos de control (guardados completos)
  let vistos = { mensaje: 0, alarma: -1 } // para volver a ×1 ante novedades
  const historial = crearHistorial()

  function estado() {
    const s = sistema.leerEstado({ perfiles })
    s.velocidad = velocidad
    s.inicioPartida = inicioPartida
    s.puntosControl = puntos.length
    return s
  }

  /** Novedades desde la última revisión: mensajes que piden ×1, puntos de control, alarmas críticas. */
  function revisarNovedades() {
    const e = sistema.estadoInterno()
    let parar = false
    for (const m of e.escenario?.mensajes ?? []) {
      if (m.n <= vistos.mensaje) continue
      vistos.mensaje = m.n
      if (m.pararAceleracion) parar = true
      if (m.puntoControl) guardarPunto()
    }
    const reg = e.control?.alarmas.registro ?? []
    const ultimo = reg.at(-1)?.t ?? -1
    if (vistos.alarma >= 0 && reg.some((r) => r.t > vistos.alarma && r.accion === 'activa' && r.prioridad === 1)) parar = true
    vistos.alarma = ultimo
    if (parar && velocidad > 1) {
      velocidad = 1
      deuda = 0
    }
    return parar
  }

  function guardarPunto() {
    // Si la misión ya terminó (p. ej. un objetivo y una falla en el mismo paso), el punto no sirve para reintentar.
    if (sistema.estadoInterno().escenario?.mision?.terminada) return
    puntos.push({ t: sistema.tiempo(), datos: { ...sistema.guardar(), inicioPartida } })
    if (puntos.length > MAX_PUNTOS) puntos.shift()
  }

  function arrancar() {
    historial.reiniciar()
    deuda = 0
    const e = sistema.estadoInterno()
    vistos = { mensaje: e.escenario?.nMensaje ?? 0, alarma: e.control?.alarmas.registro.at(-1)?.t ?? -1 }
    historial.muestrear(sistema.tiempo(), sistema.leerEstado({ soloControl: true }).control)
  }

  return {
    /**
     * Crea la planta: desde un guardado, o desde el caso base (horas previas
     * sin control) y, si se indica, la preparación e inicio de una misión.
     * generador: { activo, dificultad } para la operación libre.
     */
    iniciar({ semilla = 1, guardado = null, horasPrevias = 8, mision = null, generador = null, progreso = () => {} } = {}) {
      puntos = []
      if (guardado) {
        sistema = crearJuego(config, { semilla })
        sistema.cargar(guardado)
        inicioPartida = guardado.inicioPartida ?? 0
        guardarPunto() // con una misión en curso, el punto de carga sirve para reintentar
      } else {
        sistema = prepararJuego(config, { semilla, horasPrevias, mision, progreso })
        // Lo ocurrido durante la preparación (sin operador) no se muestra como evento de la partida.
        inicioPartida = sistema.tiempo()
        if (generador?.activo) sistema.enviarComando({ tipo: 'generador', activo: true, dificultad: generador.dificultad ?? 1 })
        sistema.avanzar(0.2)
        if (mision) guardarPunto() // el inicio de la misión es el primer punto de control
      }
      arrancar()
    },

    /** Vuelve al último punto de control (o al anterior si se pide). */
    reintentar() {
      const p = puntos.at(-1)
      if (!p) throw new Error('No hay puntos de control guardados')
      sistema = crearJuego(config, { semilla: 1 })
      sistema.cargar(p.datos)
      inicioPartida = p.datos.inicioPartida ?? 0
      arrancar()
    },

    listo: () => sistema !== null,
    tiempo: () => sistema.tiempo(),
    velocidad: () => velocidad,
    fijarVelocidad(v) {
      if (!VELOCIDADES.includes(v)) throw new Error(`Velocidad no permitida: ${v}`)
      velocidad = v
      deuda = 0
    },
    fijarPerfiles(activo) { perfiles = !!activo },

    /**
     * Avanza lo que corresponde a `segundosReales` a la velocidad actual,
     * sin pasar de `presupuestoMs` de cómputo (el reloj lo entrega `ahora`).
     * Devuelve los segundos simulados avanzados.
     */
    tic(segundosReales, presupuestoMs = 40, ahora = () => 0) {
      if (!sistema || velocidad === 0) return 0
      deuda = Math.min(deuda + segundosReales * velocidad, velocidad * 2) // no acumular más de 2 s reales
      const inicio = ahora()
      let avanzado = 0
      while (deuda > 1e-9) {
        const trozo = Math.min(deuda, MAX_TROZO, Math.max(historial.falta(sistema.tiempo()), 0.2))
        sistema.avanzar(trozo)
        deuda -= trozo
        avanzado += trozo
        if (historial.toca(sistema.tiempo())) historial.muestrear(sistema.tiempo(), sistema.leerEstado({ soloControl: true }).control)
        // Ante un evento guionado o una alarma crítica la aceleración vuelve a ×1.
        if (revisarNovedades()) break
        if (ahora() - inicio > presupuestoMs) break
      }
      return avanzado
    },

    estado,
    /** Valida y encola un comando; lanza un error con el motivo si no es válido. */
    comando(cmd) {
      sistema.enviarComando(cmd)
      revisarNovedades()
    },
    guardar: () => ({ ...sistema.guardar(), inicioPartida }),
    tendencia: (nombres, t0, t1, max) => historial.consultar(nombres, t0, t1, max),
  }
}
