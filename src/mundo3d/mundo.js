// Mundo 3D: sala de control caminable. Une la escena (construir.js), el
// jugador con colisiones, las entradas, las pantallas con textura del DCS y
// los efectos. Al interactuar con una consola se abre el DCS en 2D (la misma
// aplicación de src/hmi) a pantalla completa.
// Solo lee el estado que entrega el cliente del puente: no afecta la simulación.

import * as THREE from 'three'
import { construirSala } from './construir.js'
import { crearJugador } from './jugador.js'
import { crearEntrada } from './entrada.js'
import { crearEfectos } from './efectos.js'
import { crearPintor } from './texturas.js'

export const NIVELES_CALIDAD = ['bajo', 'medio', 'alto']

/**
 * opciones: { sala (config), calidad ('bajo'|'medio'|'alto'), alInteractuar(anclaje), alCambiarCercana(anclaje|null) }
 */
export function crearMundo(contenedor, cliente, opciones) {
  const sala = opciones.sala
  const cal = sala.calidad[opciones.calidad] ?? sala.calidad.medio
  const renderer = new THREE.WebGLRenderer({ antialias: cal.antialias, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cal.pixelRatio))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = false // sin sombras dinámicas (presupuesto de celular)
  contenedor.append(renderer.domElement)
  renderer.domElement.className = 'lienzo-3d'

  const escena = new THREE.Scene()
  const amb = sala.ambiente
  escena.background = new THREE.Color(amb.fondo)
  escena.fog = new THREE.Fog(amb.niebla.color, amb.niebla.cerca, amb.niebla.lejos)
  escena.add(new THREE.AmbientLight('#ffffff', amb.luz_ambiente))
  escena.add(new THREE.HemisphereLight('#dfe6ee', '#3a3a36', amb.luz_cielo))
  const sol = new THREE.DirectionalLight('#fff4e0', amb.luz_ventanal)
  sol.position.set(-30, 40, 10)
  escena.add(sol)

  const sala3d = construirSala(sala, { calidad: cal })
  escena.add(sala3d.grupo)
  const camara = new THREE.PerspectiveCamera(70, 1, 0.05, 400)
  const jugador = crearJugador(sala.jugador, sala.colisiones)
  if (opciones.jugador) Object.assign(jugador.estado, opciones.jugador) // se conserva al cambiar la calidad
  const efectos = crearEfectos(sala.efectos, sala3d)
  const pintores = sala3d.pantallas.map((p) => ({ ...p, pintor: crearPintor(p.contenido, p.canvas, cliente, () => { p.textura.needsUpdate = true }) }))

  let cercana = null
  let activo = true
  const entrada = crearEntrada(renderer.domElement, {
    alInteractuar: () => { if (activo && cercana) opciones.alInteractuar(cercana) },
  })

  function ajustarTamano() {
    const w = contenedor.clientWidth || window.innerWidth
    const h = contenedor.clientHeight || window.innerHeight
    renderer.setSize(w, h)
    camara.aspect = w / h
    camara.updateProjectionMatrix()
  }
  window.addEventListener('resize', ajustarTamano)
  ajustarTamano()

  // Las pantallas se repintan por turno (una por vez) para repartir el costo.
  let turno = 0
  let ultimoPintado = 0
  const intervalo = (cal.refresco_pantallas * 1000) / Math.max(1, pintores.length)

  let previo = performance.now()
  const medicion = { cuadros: 0, desde: previo, fps: 0 }
  renderer.setAnimationLoop((ahoraMs) => {
    const dt = Math.min(0.1, (ahoraMs - previo) / 1000)
    previo = ahoraMs
    if (!activo) return
    const e = entrada.leer()
    jugador.mirar(e.mirarX, e.mirarY)
    jugador.mover(e.adelante, e.derecha, dt, e.correr)
    const j = jugador.estado
    const estado = cliente.estado()
    const { sacudida } = efectos.actualizar(estado, ahoraMs / 1000)
    camara.position.set(j.x + (Math.random() - 0.5) * sacudida, j.ojos + (Math.random() - 0.5) * sacudida, j.z)
    camara.rotation.set(j.pitch, j.yaw, 0, 'YXZ')
    const c = jugador.interaccionCercana(sala3d.interacciones)
    if (c !== cercana) {
      cercana = c
      opciones.alCambiarCercana?.(c)
    }
    if (estado && ahoraMs - ultimoPintado > intervalo && pintores.length) {
      ultimoPintado = ahoraMs
      const p = pintores[turno++ % pintores.length]
      p.pintor.pintar(estado) // al terminar de dibujar marca la textura para subirla
    }
    opciones.alCuadro?.()
    renderer.render(escena, camara)
    medicion.cuadros++
    if (ahoraMs - medicion.desde > 1000) {
      medicion.fps = (medicion.cuadros * 1000) / (ahoraMs - medicion.desde)
      medicion.cuadros = 0
      medicion.desde = ahoraMs
    }
  })

  return {
    /** Pausa el mundo (al abrir el DCS en 2D) o lo reanuda. */
    activar(si) {
      activo = si
      entrada.habilitar(si)
      if (si) efectos.sincronizar(cliente.estado())
      renderer.domElement.style.visibility = si ? 'visible' : 'hidden'
      previo = performance.now()
    },
    interactuar() { if (cercana) opciones.alInteractuar(cercana) },
    /** Ubica al jugador (pruebas y misiones): x, z en m, yaw en grados (0 = hacia −Z). */
    ubicar(x, z, yawGrados = 0, pitchGrados = 0) {
      Object.assign(jugador.estado, { x, z, yaw: (yawGrados * Math.PI) / 180, pitch: (pitchGrados * Math.PI) / 180 })
    },
    esTactil: entrada.esTactil,
    palanca: entrada.palanca,
    info: () => ({ fps: medicion.fps, llamadas: renderer.info.render.calls, triangulos: renderer.info.render.triangles, jugador: { ...jugador.estado } }),
    destruir() {
      renderer.setAnimationLoop(null)
      entrada.destruir()
      window.removeEventListener('resize', ajustarTamano)
      // Libera geometrías, materiales y texturas, y el contexto WebGL.
      escena.traverse((o) => {
        o.geometry?.dispose()
        for (const m of [o.material].flat()) {
          if (!m) continue
          m.map?.dispose()
          m.dispose()
        }
      })
      renderer.forceContextLoss()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
