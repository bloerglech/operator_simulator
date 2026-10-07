import { describe, it, expect } from 'vitest'
import { velocidadRelativa, incrementoH } from '../src/sim/factorH.js'

describe('factor H (Vroom)', () => {
  it('una hora a 100 °C da ≈ 1 (la fórmula da 1,014; tolerancia 2 %)', () => {
    expect(incrementoH(100, 3600)).toBeCloseTo(1.014, 3)
    expect(Math.abs(incrementoH(100, 3600) - 1)).toBeLessThan(0.02)
  })
  it('coincide con los valores de referencia a 150 y 160 °C', () => {
    // Valores calculados con exp(43,2 − 16115/T), documentados en docs/MODELO.md §6.2.
    expect(velocidadRelativa(150)).toBeCloseTo(166.8, 1)
    expect(velocidadRelativa(160)).toBeCloseTo(401.7, 1)
  })
  it('crece con la temperatura', () => {
    expect(velocidadRelativa(152)).toBeGreaterThan(velocidadRelativa(148))
  })
})
