import { describe, it, expect } from 'vitest'
import { presionSaturacion, temperaturaSaturacion, calorLatente } from '../src/sim/agua.js'

// Valores de referencia de las tablas de vapor (IAPWS-IF97).
describe('propiedades del agua', () => {
  it('presión de saturación coincide con las tablas de vapor', () => {
    expect(presionSaturacion(100) / 1e6).toBeCloseTo(0.101418, 5)
    expect(presionSaturacion(150) / 1e6).toBeCloseTo(0.4761, 3)
    expect(presionSaturacion(200) / 1e6).toBeCloseTo(1.5549, 3)
  })
  it('la temperatura de saturación es la inversa', () => {
    for (const t of [80, 120, 150, 175, 190]) expect(temperaturaSaturacion(presionSaturacion(t))).toBeCloseTo(t, 6)
    expect(temperaturaSaturacion(1e6)).toBeCloseTo(179.88, 1) // 10 bar(a)
  })
  it('calor latente con error < 0,1 % entre 100 y 200 °C', () => {
    const tabla = { 100: 2256.4, 125: 2188.5, 150: 2113.7, 175: 2031.7, 200: 1940.7 }
    for (const [t, h] of Object.entries(tabla)) expect(Math.abs(calorLatente(Number(t)) / h - 1)).toBeLessThan(0.001)
  })
})
