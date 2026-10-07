// Ayuda contextual (Fase 7): cada transmisor y cada análisis de laboratorio
// tiene su explicación completa, y la ayuda no nombra tags inexistentes.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { config } from './ayuda.js'

const ayuda = JSON.parse(readFileSync(new URL('../config/ayuda.json', import.meta.url)))

describe('ayuda contextual', () => {
  const inst = config().instrumentos
  it('cada transmisor tiene qué mide, por qué importa, y qué pasa si sube o baja', () => {
    for (const t of inst.transmisores) {
      const a = ayuda.variables[t.tag]
      expect(a, t.tag).toBeTruthy()
      for (const campo of ['mide', 'importa', 'sube', 'baja']) expect(a[campo]?.length, `${t.tag}.${campo}`).toBeGreaterThan(10)
    }
  })
  it('no hay ayuda de tags que no existen', () => {
    const tags = new Set(inst.transmisores.map((t) => t.tag))
    for (const tag of Object.keys(ayuda.variables)) expect(tags.has(tag), tag).toBe(true)
  })
  it('cada análisis de laboratorio tiene su explicación', () => {
    for (const id of Object.keys(inst.laboratorio.analisis)) expect(ayuda.laboratorio[id]?.length, id).toBeGreaterThan(10)
  })
})
