// Pruebas unitarias del PID (forma ISA, anti-windup, transferencia sin golpe).
import { describe, it, expect } from 'vitest'
import { crearPID, pasoPID, cambiarModo } from '../src/control/pid.js'

const cfgBase = { Kc: 1, Ti: 20, Td: 0, directa: false, lim: [0, 100], pvMin: 0, pvMax: 100 }

/** Proceso de primer orden: tau·dy/dt = K·u − y. */
function simular(cfg, { sp, pasos, dt = 0.2, K = 1, tau = 10, y0 = 0, u0 = 0, perturbacion = 0 }) {
  const st = crearPID({ sp, salida: u0, modo: 'AUTO' })
  let y = y0
  const hist = []
  for (let i = 0; i < pasos; i++) {
    const u = pasoPID(st, cfg, y, dt)
    y += ((K * u + perturbacion - y) * dt) / tau
    hist.push({ y, u })
  }
  return { st, y, hist }
}

describe('PID', () => {
  it('lleva un proceso de primer orden a la consigna sin error permanente', () => {
    const { y } = simular(cfgBase, { sp: 50, pasos: 3000 })
    expect(Math.abs(y - 50)).toBeLessThan(0.05)
  })

  it('rechaza una perturbación de carga (acción integral)', () => {
    const { y } = simular(cfgBase, { sp: 40, pasos: 4000, perturbacion: -15, y0: 40, u0: 40 })
    expect(Math.abs(y - 40)).toBeLessThan(0.05)
  })

  it('acción directa e inversa tienen signos opuestos', () => {
    const inv = crearPID({ sp: 50, salida: 50, modo: 'AUTO' })
    const dir = crearPID({ sp: 50, salida: 50, modo: 'AUTO' })
    pasoPID(inv, cfgBase, 60, 0.2)
    pasoPID(dir, { ...cfgBase, directa: true }, 60, 0.2)
    expect(inv.salida).toBeLessThan(50)
    expect(dir.salida).toBeGreaterThan(50)
  })

  it('anti-windup: tras saturar, sale de la saturación sin demora', () => {
    // Consigna inalcanzable durante mucho tiempo (salida saturada en 100 %).
    const st = crearPID({ sp: 90, salida: 50, modo: 'AUTO' })
    const cfg = { ...cfgBase }
    for (let i = 0; i < 5000; i++) pasoPID(st, cfg, 20, 0.2)
    expect(st.salida).toBe(100)
    expect(st.integral).toBeLessThan(102)
    // Al bajar la consigna bajo el PV, la salida baja en pocos pasos.
    st.sp = 10
    let n = 0
    while (st.salida >= 100 && n < 100) { pasoPID(st, cfg, 20, 0.2); n++ }
    expect(n).toBeLessThan(5)
  })

  it('transferencia sin golpe de MAN a AUTO', () => {
    const st = crearPID({ sp: 30, salida: 63, modo: 'MAN' })
    for (let i = 0; i < 10; i++) pasoPID(st, cfgBase, 45, 0.2)
    expect(st.salida).toBe(63)
    cambiarModo(st, 'AUTO')
    const u = pasoPID(st, cfgBase, 45, 0.2)
    expect(Math.abs(u - 63)).toBeLessThan(0.5) // solo el pequeño paso integral
  })

  it('la derivada actúa sobre el PV: un cambio de consigna no produce un pico', () => {
    const cfg = { ...cfgBase, Td: 5 }
    const st = crearPID({ sp: 50, salida: 50, modo: 'AUTO' })
    pasoPID(st, cfg, 50, 0.2)
    pasoPID(st, cfg, 50, 0.2)
    st.sp = 60
    const u = pasoPID(st, cfg, 50, 0.2)
    // Solo la acción proporcional (Kc·Δe = 10) y un paso integral.
    expect(u - 50).toBeLessThan(10.5)
  })
})
