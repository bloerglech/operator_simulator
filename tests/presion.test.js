// Presión de los vasos hidráulicos: presurizaciones, alivio, seguridad,
// vaporización súbita, bombas y venteo.
import { describe, it, expect } from 'vitest'
import { plantaBase, config, tieneNoFinitos, peorBalance } from './ayuda.js'
import { crearPlanta } from '../src/sim/planta.js'

const barg = (P) => (P - 101325) / 1e5
const presion = (planta, vaso) => barg(planta.estadoInterno().vasos[vaso].presion.P)

describe('presión del digestor', () => {
  it('en operación normal queda estable cerca de la presión de diseño', () => {
    const planta = plantaBase()
    planta.avanzar(6 * 3600)
    const p1 = presion(planta, 'dig')
    planta.avanzar(3600)
    expect(Math.abs(presion(planta, 'dig') - p1)).toBeLessThan(0.05)
    expect(p1).toBeGreaterThan(4.5)
    expect(p1).toBeLessThan(6.5)
  })

  it('si se restringe la extracción, la presión sube en segundos y el alivio la contiene', () => {
    const planta = plantaBase()
    planta.avanzar(3 * 3600) // después del transitorio del arranque sintético
    const p0 = presion(planta, 'dig')
    planta.enviarComando({ tipo: 'valvula', id: 'ext_principal', valor: 0 })
    planta.avanzar(20)
    // La válvula tarda en cerrar (carrera de 20 s), pero la presión ya subió.
    expect(presion(planta, 'dig') - p0).toBeGreaterThan(0.5)
    planta.avanzar(120)
    const ev = planta.estadoInterno().eventos.map((e) => e.tipo)
    expect(ev).toContain('apertura_alivio')
    expect(ev).not.toContain('apertura_seguridad')
    // Queda entre el ajuste del alivio (7,5) y el de la seguridad (9).
    expect(presion(planta, 'dig')).toBeGreaterThan(7.5)
    expect(presion(planta, 'dig')).toBeLessThan(9)
    const b = peorBalance(planta.balances())
    expect(b.masa).toBeLessThan(1e-3)
    expect(b.energia).toBeLessThan(1e-2)
  })

  it('con el alivio insuficiente, abre la válvula de seguridad y la presión cicla bajo el ajuste', () => {
    const cfg = config()
    cfg.equipos.presion.dig.alivio.Kv.valor = 10 // alivio subdimensionado
    // Bombas más fuertes: si no, su curva limita la presión antes de 9 bar(g).
    for (const b of Object.values(cfg.equipos.bombas)) if (b.P_cierre) b.P_cierre.valor = 20
    const planta = crearPlanta(cfg)
    planta.avanzar(3 * 3600) // después del transitorio del arranque sintético
    planta.enviarComando({ tipo: 'valvula', id: 'ext_principal', valor: 0 })
    planta.avanzar(300)
    const ev = planta.estadoInterno().eventos.map((e) => e.tipo)
    expect(ev).toContain('apertura_seguridad')
    expect(presion(planta, 'dig')).toBeLessThan(9.5)
  })

  it('si se abre de más la extracción, la presión cae hasta la de saturación y hay vaporización súbita', () => {
    const planta = plantaBase()
    planta.avanzar(3 * 3600) // después del transitorio del arranque sintético
    planta.enviarComando({ tipo: 'valvula', id: 'ext_principal', valor: 1 })
    planta.avanzar(300)
    const ev = planta.estadoInterno().eventos.map((e) => e.tipo)
    expect(ev).toContain('vaporizacion_subita')
    const pr = planta.estadoInterno().vasos.dig.presion
    expect(pr.P).toBeCloseTo(pr.Ppiso, -3) // sostenida por el vapor (±1 kPa)
    expect(tieneNoFinitos(planta.leerEstado({ perfiles: true }))).toBe(false)
  })

  it('al detenerse la bomba de lavado, el digestor pierde presión', () => {
    const planta = plantaBase()
    planta.avanzar(3 * 3600) // después del transitorio del arranque sintético
    const p0 = presion(planta, 'dig')
    planta.enviarComando({ tipo: 'bomba', id: 'bomba_lavado', accion: 'detener' })
    planta.avanzar(60)
    expect(presion(planta, 'dig')).toBeLessThan(p0 - 0.5)
  })
})

describe('venteo y llenado', () => {
  it('lleno con el venteo abierto queda a presión atmosférica; al cerrarlo y bombear, presuriza', () => {
    const planta = crearPlanta(config(), { modo: 'vacio' })
    planta.enviarComando({ tipo: 'bomba', id: 'bomba_lavado', accion: 'partir' })
    planta.enviarComando({ tipo: 'ajustar', id: 'fil_fondo', campo: 'caudal', valor: 1.2 })
    // Llenar el digestor (≈ 4 500 m³) con el venteo abierto.
    planta.avanzar(4500)
    const est = planta.estadoInterno().vasos.dig
    expect(planta.leerEstado().vasos.dig.lleno).toBe(true)
    expect(presion(planta, 'dig')).toBeCloseTo(0, 6)
    expect(planta.estadoInterno().contabilidad.sumideros.rebalse_dig).toBeGreaterThan(0)
    // Cerrar el venteo: con la bomba entregando, la presión sube rápido.
    planta.enviarComando({ tipo: 'venteo', id: 'dig', accion: 'cerrar' })
    planta.enviarComando({ tipo: 'ajustar', id: 'fil_fondo', campo: 'caudal', valor: 0.01 })
    planta.avanzar(30)
    expect(presion(planta, 'dig')).toBeGreaterThan(0.5)
    expect(est.presion.venteo).toBe(false)
    expect(tieneNoFinitos(planta.leerEstado({ perfiles: true, balances: true }))).toBe(false)
  })
})
