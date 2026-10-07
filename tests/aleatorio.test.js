import { describe, it, expect } from 'vitest'
import { estadoInicial, uniforme, normal } from '../src/sim/aleatorio.js'

describe('generador aleatorio con semilla', () => {
  it('es reproducible', () => {
    const a = estadoInicial(42, 'eventos')
    const b = estadoInicial(42, 'eventos')
    for (let i = 0; i < 100; i++) expect(uniforme(a)).toBe(uniforme(b))
  })
  it('los flujos con distinto nombre o semilla son distintos', () => {
    const a = estadoInicial(42, 'eventos')
    const b = estadoInicial(42, 'instrumentos')
    const c = estadoInicial(43, 'eventos')
    expect(uniforme(a)).not.toBe(uniforme(b))
    expect(uniforme(estadoInicial(42, 'eventos'))).not.toBe(uniforme(c))
  })
  it('uniforme en [0,1) y normal con media 0 y desviación 1', () => {
    const s = estadoInicial(7, 'prueba')
    let suma = 0
    let suma2 = 0
    const n = 20000
    for (let i = 0; i < n; i++) {
      const u = uniforme(s)
      expect(u).toBeGreaterThanOrEqual(0)
      expect(u).toBeLessThan(1)
      const z = normal(s)
      suma += z
      suma2 += z * z
    }
    expect(Math.abs(suma / n)).toBeLessThan(0.03)
    expect(Math.abs(Math.sqrt(suma2 / n) - 1)).toBeLessThan(0.03)
  })
  it('el estado es un arreglo serializable que continúa igual tras JSON', () => {
    const s = estadoInicial(1, 'x')
    uniforme(s)
    const copia = JSON.parse(JSON.stringify(s))
    expect(uniforme(copia)).toBe(uniforme(s))
  })
})
