// Eventos del catálogo, generador aleatorio, indicadores y guardado con el director.
import { describe, it, expect, beforeAll } from 'vitest'
import { config } from './ayuda.js'
import { crearPlanta } from '../src/sim/planta.js'
import { crearJuego } from '../src/escenarios/juego.js'

let caliente = null
beforeAll(() => {
  const p = crearPlanta(config(), { semilla: 9 })
  p.avanzar(8 * 3600)
  caliente = p.guardar()
})
function juego() {
  const j = crearJuego(config(), { semilla: 9 })
  j.cargar(caliente)
  j.avanzar(10)
  return j
}
const H = 3600

describe('eventos', () => {
  it('una rampa llega a su valor, dura lo indicado y revierte', () => {
    const j = juego()
    j.enviarComando({ tipo: 'evento', accion: 'iniciar', id: 'licor_debil' })
    j.avanzar(1800)
    const mitad = j.estadoInterno().fuentes.licor_blanco.c[j.modelo().idx.OH] * 40
    expect(mitad).toBeGreaterThan(108)
    expect(mitad).toBeLessThan(116)
    j.avanzar(1800)
    expect(j.estadoInterno().fuentes.licor_blanco.c[j.modelo().idx.OH] * 40).toBeCloseTo(106, 1)
    expect(j.leerEstado().escenario.eventosActivos.map((e) => e.id)).toContain('licor_debil')
    j.avanzar(8 * H + 60) // dura 8 h y vuelve en 1 h
    expect(j.estadoInterno().fuentes.licor_blanco.c[j.modelo().idx.OH] * 40).toBeCloseTo(117.5, 1)
    expect(j.leerEstado().escenario.eventosActivos).toEqual([])
  })

  it('cada evento del catálogo se puede iniciar sin errores', () => {
    const j = juego()
    for (const e of config().eventos.eventos) j.enviarComando({ tipo: 'evento', accion: 'iniciar', id: e.id })
    j.avanzar(1200)
    const s = j.leerEstado()
    expect(s.escenario.eventosActivos.length).toBeGreaterThan(10)
    expect(Number.isFinite(s.kpi.kappa ?? 0)).toBe(true)
  })

  it('un evento con parámetro aplica la opción elegida (válvula pegada)', () => {
    const j = juego()
    j.enviarComando({ tipo: 'evento', accion: 'iniciar', id: 'valvula_pegada', parametros: { lazo: 'FIC-401' } })
    j.avanzar(5)
    expect(j.leerEstado().control.lazos['FIC-401'].pegado).toBe(true)
    j.enviarComando({ tipo: 'evento', accion: 'terminar', id: 'valvula_pegada' })
    j.avanzar(5)
    expect(j.leerEstado().control.lazos['FIC-401'].pegado).toBe(false)
  })
})

describe('eventos superpuestos y comandos que fallan', () => {
  const humedad = (j) => j.estadoInterno().fuentes.astillas.humedad
  it('dos eventos sobre la misma variable vuelven al valor de antes de ambos', () => {
    const j = juego()
    const h0 = humedad(j)
    j.enviarComando({ tipo: 'evento', accion: 'iniciar', id: 'lluvia' })
    j.avanzar(4000)
    j.enviarComando({ tipo: 'evento', accion: 'iniciar', id: 'lluvia_fuerte' })
    j.avanzar(4000)
    const alta = humedad(j)
    expect(alta).toBeGreaterThan(h0)
    j.avanzar(24 * H)
    expect(j.leerEstado().escenario.eventosActivos).toEqual([])
    expect(humedad(j)).toBeCloseTo(h0, 4)
  })
  it('la parada del lavado devuelve el agua de lavado al terminar', () => {
    const j = juego()
    const lavado = j.estadoInterno().servicios.lavado
    j.enviarComando({ tipo: 'evento', accion: 'iniciar', id: 'parada_lavado' })
    j.avanzar(60)
    expect(j.estadoInterno().servicios.lavado).toBe(0)
    j.avanzar(2 * H)
    expect(j.estadoInterno().servicios.lavado).toBeCloseTo(lavado, 6)
  })
  it('un parámetro de evento inválido se rechaza al enviarlo', () => {
    const j = juego()
    expect(() => j.enviarComando({ tipo: 'evento', accion: 'iniciar', id: 'valvula_pegada', parametros: { lazo: 'NO-EXISTE' } })).toThrow(/Parámetro inválido/)
  })
})

describe('generador aleatorio', () => {
  it('genera eventos con la frecuencia de la dificultad y es determinista', () => {
    const a = juego()
    const b = juego()
    for (const j of [a, b]) j.enviarComando({ tipo: 'generador', activo: true, dificultad: 3 })
    a.avanzar(12 * H)
    b.avanzar(12 * H)
    const ea = a.estadoInterno().eventos.filter((e) => e.tipo === 'perturbacion').map((e) => e.evento)
    const eb = b.estadoInterno().eventos.filter((e) => e.tipo === 'perturbacion').map((e) => e.evento)
    expect(ea).toEqual(eb)
    expect(ea.length).toBeGreaterThanOrEqual(1) // media 1,5 h en dificultad 3
  })
})

describe('director: indicadores, libro y guardado', () => {
  it('acumula la producción del turno y guarda/carga sin perder el escenario', () => {
    const j = juego()
    j.enviarComando({ tipo: 'nota', texto: 'Cambio de turno sin novedad' })
    j.enviarComando({ tipo: 'evento', accion: 'iniciar', id: 'lluvia' })
    j.avanzar(H)
    const t = j.leerEstado().escenario.turno
    expect(t.adt).toBeGreaterThan(110) // ≈ 125 ADt por hora a 3 000 ADt/d
    expect(t.adt).toBeLessThan(140)
    expect(j.leerEstado().escenario.libro.some((x) => x.tipo === 'nota')).toBe(true)
    const g = j.guardar()
    const k = crearJuego(config(), { semilla: 1 })
    k.cargar(g)
    j.avanzar(1800)
    k.avanzar(1800)
    expect(JSON.stringify(k.estadoInterno())).toBe(JSON.stringify(j.estadoInterno()))
  })
})
