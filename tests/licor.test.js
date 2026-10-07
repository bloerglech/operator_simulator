import { describe, it, expect } from 'vitest'
import { licorBlanco, sulfidez } from '../src/sim/licor.js'
import { aInterno } from '../src/sim/unidades.js'

describe('licor blanco', () => {
  it('reproduce el álcali efectivo y la sulfidez', () => {
    const lb = licorBlanco({ ea: aInterno(117.5, 'g/L NaOH'), sulfidez: 0.32, caustificacion: 0.82 })
    expect(lb.OH * 40).toBeCloseTo(117.5, 10) // EA = [OH⁻]
    expect(sulfidez(lb.OH, lb.HS)).toBeCloseTo(0.32, 12)
    expect(lb.SI).toBeGreaterThan(0) // carbonato por caustificación incompleta
  })
  it('con caustificación completa no hay carbonato', () => {
    expect(licorBlanco({ ea: 3, sulfidez: 0.3, caustificacion: 1 }).SI).toBeCloseTo(0, 12)
  })
})
