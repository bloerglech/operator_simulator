// Equipos de la Fase 1c: silo y vaporización, calentadores, ciclones flash,
// mallas, compactación, colgamiento, raspadores, tubo de astillas.
import { describe, it, expect, beforeAll } from 'vitest'
import { config, tieneNoFinitos, peorBalance } from './ayuda.js'
import { crearPlanta } from '../src/sim/planta.js'

let base
const desdeBase = () => {
  const p = crearPlanta(config())
  p.cargar(base)
  return p
}
const barg = (P) => (P - 101325) / 1e5

beforeAll(() => {
  const p = crearPlanta(config())
  p.avanzar(6 * 3600)
  base = p.guardar()
})

describe('silo y vaporización', () => {
  it('el vapor flash calienta las astillas a ≈ 100 °C y el resto se ventea', () => {
    const s = desdeBase().leerEstado()
    expect(s.equipos.silo.Tsalida).toBeGreaterThan(98)
    expect(s.equipos.silo.vaporFlash).toBeGreaterThan(5) // kg/s
    expect(s.equipos.silo.vaporizacion).toBeGreaterThan(0.9)
  })
  it('sin vapor fresco y con poco vapor flash, la vaporización empeora y suben los rechazos', () => {
    const p = desdeBase()
    p.enviarComando({ tipo: 'servicio', id: 'vaporBPMax', valor: 0 })
    p.enviarComando({ tipo: 'servicio', id: 'vaporFlashSilo', valor: 0.3 })
    const rech0 = p.leerEstado().kpi.rechazos
    p.avanzar(8 * 3600)
    const s = p.leerEstado()
    expect(s.equipos.silo.Tsalida).toBeLessThan(98)
    expect(s.kpi.rechazos).toBeGreaterThan(rech0)
  })
})

describe('calentadores', () => {
  it('la incrustación limita la temperatura; el calentador de respaldo la recupera', () => {
    const p = desdeBase()
    p.enviarComando({ tipo: 'perturbar', id: 'incrustacion', equipo: 'circ_inf', valor: 3 })
    p.avanzar(1800)
    let s = p.leerEstado()
    expect(s.equipos.calentadores.circ_inf.saturado).toBe(true)
    const Tinf = s.vasos.dig.zonas.coccion_inferior.T
    p.enviarComando({ tipo: 'calentador', id: 'circ_inf', accion: 'conmutar' })
    p.avanzar(2 * 3600)
    s = p.leerEstado()
    expect(s.equipos.calentadores.circ_inf.saturado).toBe(false)
    expect(s.vasos.dig.zonas.coccion_inferior.T).toBeGreaterThan(Tinf + 1)
  })
  it('una caída de presión del vapor de media presión baja la temperatura de cocción', () => {
    const p = desdeBase()
    const T0 = p.leerEstado().vasos.dig.zonas.coccion_superior.T
    p.enviarComando({ tipo: 'servicio', id: 'presionVaporMP', valor: 4.5e5 })
    p.avanzar(3600)
    expect(p.leerEstado().vasos.dig.zonas.coccion_superior.T).toBeLessThan(T0 - 3)
  })
})

describe('ciclones flash y evaporadores', () => {
  it('si evaporadores no recibe, se llenan los flash, se bloquea la extracción y sube la presión del digestor', () => {
    const p = desdeBase()
    p.enviarComando({ tipo: 'servicio', id: 'limiteEvaporadores', valor: 0 })
    p.avanzar(1800)
    const s = p.leerEstado()
    expect(s.equipos.flash.flash2.lleno).toBe(true)
    expect(s.equipos.flash.flash1.lleno).toBe(true)
    expect(s.eventos.map((e) => e.tipo)).toContain('apertura_alivio')
    expect(barg(s.vasos.dig.presion.P)).toBeGreaterThan(7)
    const b = peorBalance(p.balances())
    expect(b.masa).toBeLessThan(1e-3)
    expect(b.energia).toBeLessThan(1e-2)
  })
})

describe('mallas', () => {
  it('sin conmutación las mallas se tapan; el retrolavado baja la ΔP', () => {
    const p = desdeBase()
    const dP0 = p.leerEstado().mallas.mallas_circ_inf.dP
    p.enviarComando({ tipo: 'mallas', id: 'mallas_circ_inf', accion: 'conmutacion_off' })
    p.avanzar(8 * 3600)
    const dP1 = p.leerEstado().mallas.mallas_circ_inf.dP
    expect(dP1).toBeGreaterThan(dP0 * 1.8)
    p.enviarComando({ tipo: 'mallas', id: 'mallas_circ_inf', accion: 'retrolavar' })
    p.avanzar(60)
    expect(p.leerEstado().mallas.mallas_circ_inf.dP).toBeLessThan(dP1 * 0.6)
  })
  it('con la malla muy tapada, la circulación pierde caudal', () => {
    const p = desdeBase()
    p.enviarComando({ tipo: 'mallas', id: 'mallas_circ_sup', accion: 'conmutacion_off' })
    p.enviarComando({ tipo: 'perturbar', id: 'finos', valor: 4 })
    p.avanzar(10 * 3600)
    const s = p.leerEstado()
    expect(s.corrientes.circ_sup.caudal).toBeLessThan(s.corrientes.circ_sup.consigna.caudal * 0.9)
  })
})

describe('columna: compactación, raspador y colgamiento', () => {
  it('la columna se compacta hacia abajo y empuja el raspador', () => {
    const p = desdeBase()
    const ps = p.estadoInterno().vasos.dig.parcelas
    expect(ps[0].sc).toBeGreaterThan(ps[ps.length - 1].sc + 0.02)
    expect(p.leerEstado().vasos.dig.raspador.torque).toBeGreaterThan(p.modelo().vasoPorId.dig.raspador.T0)
  })
  it('una columna colgada deja de bajar: cae la consistencia de soplado y el torque; al soltarse, cae', () => {
    const p = desdeBase()
    const c0 = p.leerEstado().kpi.consistenciaSoplado
    // Cuelga sobre los 4 m inferiores (≈ 310 m³ de columna: se vacían en ≈ 17 min).
    p.enviarComando({ tipo: 'perturbar', id: 'colgamiento', vaso: 'dig', valor: 4 })
    p.avanzar(2400)
    let s = p.leerEstado()
    expect(s.vasos.dig.colgada).toBe(true)
    expect(s.kpi.consistenciaSoplado ?? 0).toBeLessThan(c0 * 0.5)
    expect(s.vasos.dig.raspador.torque).toBeLessThan(p.modelo().vasoPorId.dig.raspador.T0 + 1)
    p.enviarComando({ tipo: 'perturbar', id: 'soltar_columna', vaso: 'dig' })
    p.avanzar(600)
    s = p.leerEstado()
    expect(s.vasos.dig.colgada).toBe(false)
    expect(s.eventos.map((e) => e.tipo)).toContain('caida_columna')
    expect(tieneNoFinitos(p.leerEstado({ perfiles: true, balances: true }))).toBe(false)
  })
})

describe('tubo de astillas y bombas', () => {
  it('si se detienen las bombas de astillas, se acumulan en el tubo y se recuperan al partir', () => {
    const p = desdeBase()
    p.enviarComando({ tipo: 'bomba', id: 'bombas_astillas', accion: 'detener' })
    p.avanzar(120)
    const acum = p.leerEstado().equipos.tuboAstillas.acumulado
    expect(acum).toBeGreaterThan(3000)
    p.enviarComando({ tipo: 'bomba', id: 'bombas_astillas', accion: 'partir' })
    p.avanzar(1800)
    expect(p.leerEstado().equipos.tuboAstillas.acumulado).toBeLessThan(acum * 0.1)
  })
})
