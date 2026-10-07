// Sala 3D: configuración (sala.json) y jugador (colisiones e interacción), sin navegador.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { crearJugador } from '../src/mundo3d/jugador.js'

const sala = JSON.parse(readFileSync(new URL('../config/sala.json', import.meta.url), 'utf8'))

describe('config/sala.json', () => {
  it('objetos y anclajes con identificador único, tipos conocidos y pantallas existentes', () => {
    const ids = [...sala.objetos, ...sala.anclajes].map((o) => o.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const o of sala.objetos) expect(['caja', 'cilindro', 'esfera', 'plano', 'vidrio']).toContain(o.tipo)
    const pantallas = ['alimentacion', 'digestor', 'circulaciones', 'extracciones', 'fondo', 'calidad', 'tendencias', 'alarmas', 'perfiles']
    for (const a of sala.anclajes) {
      if (a.tipo === 'pantalla') expect([...pantallas, 'mural']).toContain(a.contenido)
      if (a.tipo === 'interaccion') expect(pantallas).toContain(a.pantalla)
    }
    for (const e of sala.efectos) {
      for (const id of e.anclajes ?? (e.anclaje ? [e.anclaje] : [])) expect(sala.anclajes.some((a) => a.id === id)).toBe(true)
    }
    for (const c of sala.colisiones) for (let k = 0; k < 3; k++) expect(c.max[k]).toBeGreaterThan(c.min[k])
  })

  it('el punto de inicio está libre y cada consola se alcanza sin atravesar nada', () => {
    const j = crearJugador(sala.jugador, sala.colisiones)
    expect(j.choca(sala.jugador.inicio[0], sala.jugador.inicio[2])).toBe(false)
    for (const a of sala.anclajes.filter((x) => x.tipo === 'interaccion')) {
      // Desde el anclaje hacia el jugador hay un punto libre dentro del radio.
      let libre = false
      for (let d = 0; d <= a.radio; d += 0.05) {
        const z = a.pos[2] + (a.pos[2] < sala.jugador.inicio[2] ? d : -d)
        if (!j.choca(a.pos[0], z)) { libre = true; break }
      }
      expect(libre, a.id).toBe(true)
    }
  })
})

describe('jugador', () => {
  it('camina hacia adelante (−Z con mirada 0) y no atraviesa una consola', () => {
    const j = crearJugador(sala.jugador, sala.colisiones)
    const z0 = j.estado.z
    for (let i = 0; i < 600; i++) j.mover(1, 0, 1 / 60)
    expect(j.estado.z).toBeLessThan(z0)
    // La consola central ocupa z ∈ [−0,45; 0,45]; con radio 0,3 se detiene en 0,75.
    expect(j.estado.z).toBeGreaterThanOrEqual(0.45 + sala.jugador.radio - 1e-6)
  })

  it('se desliza por una pared en diagonal y no sale de la sala', () => {
    const j = crearJugador(sala.jugador, sala.colisiones)
    j.estado.x = 6
    j.estado.z = 2
    for (let i = 0; i < 2000; i++) j.mover(0.7, 0.7, 1 / 60, true) // hacia +X y −Z
    expect(j.estado.x).toBeLessThan(8 - sala.jugador.radio + 1e-6)
    expect(j.estado.x).toBeGreaterThan(7)
    expect(j.estado.z).toBeLessThan(1) // siguió avanzando en Z junto a la pared
  })

  it('la interacción cercana requiere estar en el radio y mirando hacia el anclaje', () => {
    const j = crearJugador(sala.jugador, sala.colisiones)
    const anclajes = sala.anclajes.filter((a) => a.radio)
    j.estado.x = 0
    j.estado.z = 2.0
    expect(j.interaccionCercana(anclajes)?.id).toBe('interaccion_consola_2')
    j.estado.yaw = Math.PI // de espaldas
    expect(j.interaccionCercana(anclajes)).toBe(null)
    j.estado.yaw = 0
    j.estado.z = 4.5
    expect(j.interaccionCercana(anclajes)).toBe(null)
  })
})
