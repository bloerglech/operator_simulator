// Motor del puente: maneja el sistema (planta + control), la aceleración,
// el historial y los pedidos de la presentación. No usa APIs del navegador:
// el reloj real lo entrega quien lo llama (worker en el navegador, pruebas en
// Node), así el mismo código se prueba sin navegador.

import { crearPlanta } from '../sim/planta.js'
import { crearSistema } from '../control/sistema.js'
import { crearHistorial } from './historial.js'

export const VELOCIDADES = [0, 1, 10, 60, 300]
const MAX_TROZO = 5 // s simulados por llamada a avanzar (muestreo del historial)

export function crearMotor(config) {
  let sistema = null
  let velocidad = 0
  let deuda = 0 // s simulados pedidos y aún no simulados
  let perfiles = false
  let inicioPartida = 0 // tiempo simulado en que empezó a jugar el operador
  const historial = crearHistorial()

  function estado() {
    const s = sistema.leerEstado({ perfiles })
    s.velocidad = velocidad
    s.inicioPartida = inicioPartida
    return s
  }

  return {
    /** Crea la planta: desde un guardado o desde el caso base (con horas previas sin control). */
    iniciar({ semilla = 1, guardado = null, horasPrevias = 8, progreso = () => {} } = {}) {
      historial.reiniciar()
      deuda = 0
      sistema = crearSistema(config, { semilla })
      if (guardado) {
        sistema.cargar(guardado)
        inicioPartida = guardado.inicioPartida ?? 0
      } else if (horasPrevias > 0) {
        // Se corre el caso base sin control hasta cerca del estado estacionario.
        const previa = crearPlanta(config, { semilla })
        const pasos = Math.ceil(horasPrevias * 4)
        for (let i = 0; i < pasos; i++) {
          previa.avanzar(900)
          progreso((i + 1) / pasos)
        }
        sistema.cargar(previa.guardar())
      }
      // Lo ocurrido durante la preparación (sin operador) no se muestra como evento de la partida.
      if (!guardado) inicioPartida = sistema.tiempo()
      sistema.avanzar(10) // el control arranca en el primer paso lento
      historial.muestrear(sistema.tiempo(), sistema.leerEstado({ soloControl: true }).control)
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
        if (ahora() - inicio > presupuestoMs) break
      }
      return avanzado
    },

    estado,
    /** Valida y encola un comando; lanza un error con el motivo si no es válido. */
    comando(cmd) { sistema.enviarComando(cmd) },
    guardar: () => ({ ...sistema.guardar(), inicioPartida }),
    tendencia: (nombres, t0, t1, max) => historial.consultar(nombres, t0, t1, max),
  }
}
