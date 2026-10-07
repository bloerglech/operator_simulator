// Pruebas del puente (motor del worker) e historial de tendencias, en Node.
import { describe, it, expect, beforeAll } from 'vitest'
import { config } from './ayuda.js'
import { crearMotor } from '../src/puente/motor.js'
import { crearHistorial } from '../src/puente/historial.js'
import { crearPlanta } from '../src/sim/planta.js'

let caliente = null
beforeAll(() => {
  const p = crearPlanta(config(), { semilla: 3 })
  p.avanzar(8 * 3600)
  caliente = p.guardar()
})

function motor() {
  const m = crearMotor(config())
  m.iniciar({ guardado: caliente })
  return m
}

describe('historial de tendencias', () => {
  it('muestrea cada periodo, recorta a la capacidad y reduce puntos al consultar', () => {
    const hst = crearHistorial({ periodo: 5, horas: 1 })
    const control = (v) => ({ transmisores: { A: { valor: v } }, lazos: { L: { sp: 2 * v, salida: 50 } } })
    for (let t = 0; t <= 2 * 3600; t += 1) if (hst.toca(t)) hst.muestrear(t, control(t))
    expect(hst.cantidad()).toBe(hst.capacidad)
    const r = hst.consultar(['A', 'L.sp', 'X'], 0, Infinity, 100)
    expect(r.t[0]).toBeGreaterThanOrEqual(3600) // lo más antiguo se descartó
    expect(r.t.length).toBeLessThanOrEqual(101)
    expect(r.datos.A.at(-1)).toBe(7200)
    expect(r.datos['L.sp'].at(-1)).toBe(14400)
    expect(r.datos.X.every((x) => x === null)).toBe(true)
  })
})

describe('motor del puente', () => {
  it('avanza según la velocidad y muestrea el historial cada 5 s simulados', () => {
    const m = motor()
    const t0 = m.tiempo()
    m.fijarVelocidad(300)
    for (let i = 0; i < 20; i++) m.tic(0.05, 1000)
    expect(m.tiempo() - t0).toBeCloseTo(300, 0)
    const r = m.tendencia(['PI-301', 'PIC-301.sp'], t0, Infinity)
    expect(r.t.length).toBeGreaterThanOrEqual(60)
    expect(r.datos['PI-301'].every((x) => x > 4 && x < 8)).toBe(true)
    m.fijarVelocidad(0)
    const t1 = m.tiempo()
    m.tic(1, 1000)
    expect(m.tiempo()).toBe(t1)
    expect(() => m.fijarVelocidad(7)).toThrow()
  })

  it('el resultado no depende de cómo se reparte el tiempo real', () => {
    const a = motor()
    const b = motor()
    a.fijarVelocidad(60)
    b.fijarVelocidad(60)
    for (let i = 0; i < 40; i++) a.tic(0.25, 1e6) // 10 s reales en trozos de 0,25 s
    for (let i = 0; i < 10; i++) b.tic(1, 1e6) // 10 s reales en trozos de 1 s
    expect(a.tiempo()).toBe(b.tiempo())
    expect(JSON.stringify(a.estado().control)).toBe(JSON.stringify(b.estado().control))
  })

  it('rechaza comandos inválidos con su motivo y guarda/carga con el inicio de la partida', () => {
    const m = crearMotor(config())
    m.iniciar({ semilla: 5, horasPrevias: 0.25 })
    expect(() => m.comando({ tipo: 'lazo', id: 'NO-EXISTE', accion: 'modo', valor: 'MAN' })).toThrow(/desconocido/)
    m.comando({ tipo: 'lazo', id: 'TIC-402', accion: 'consigna', valor: 157 })
    m.fijarVelocidad(10)
    m.tic(1, 1e6)
    const g = m.guardar()
    expect(g.inicioPartida).toBeGreaterThan(0)
    const n = crearMotor(config())
    n.iniciar({ guardado: g })
    expect(n.estado().inicioPartida).toBe(g.inicioPartida)
    expect(n.estado().control.lazos['TIC-402'].sp).toBe(157)
  })
})

describe('motor del puente con misiones', () => {
  it('inicia una misión con punto de control, vuelve a ×1 ante un diálogo y reintenta', () => {
    const m = crearMotor(config())
    m.iniciar({ semilla: 5, horasPrevias: 1, mision: 'turno_noche' })
    expect(m.estado().escenario.mision.id).toBe('turno_noche')
    expect(m.estado().puntosControl).toBe(1)
    m.fijarVelocidad(60)
    m.tic(0.5, 1e6) // el guion manda el saludo de la jefa de turno: vuelve a ×1
    expect(m.velocidad()).toBe(1)
    const t = m.tiempo()
    m.fijarVelocidad(300)
    m.tic(1, 1e6)
    expect(m.tiempo()).toBeGreaterThan(t)
    m.reintentar()
    expect(m.tiempo()).toBeLessThan(t + 1)
    expect(m.estado().escenario.mision.terminada).toBe(false)
  })

  it('repetir una misión carga la preparación guardada y continúa igual', () => {
    const m = crearMotor(config())
    const avances = []
    m.iniciar({ semilla: 5, horasPrevias: 1, mision: 'turno_noche', progreso: (f) => avances.push(f) })
    const pasos1 = avances.length
    m.fijarVelocidad(300)
    m.tic(2, 1e6)
    const a = JSON.stringify(m.estado().control.transmisores['AI-504'])
    m.iniciar({ semilla: 5, horasPrevias: 1, mision: 'turno_noche', progreso: (f) => avances.push(f) })
    expect(avances.length - pasos1).toBe(1) // sin volver a simular la preparación
    m.fijarVelocidad(300)
    m.tic(2, 1e6)
    expect(JSON.stringify(m.estado().control.transmisores['AI-504'])).toBe(a)
  })
})
