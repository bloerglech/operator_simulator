// Pruebas unitarias de la cinética en una parcela aislada (sin planta).
import { describe, it, expect } from 'vitest'
import { config } from './ayuda.js'
import { construirModelo } from '../src/sim/modelo.js'
import { reaccionarParcela, calidadPulpa } from '../src/sim/cinetica.js'
import { parcelaFresca, fuentesIniciales } from '../src/sim/estadoInicial.js'

const modelo = construirModelo(config())
const { idx, cin } = modelo
const nEsp = modelo.especies.length

/** Parcela de 1 t ya impregnada con licor de concentración dada. */
function parcela({ T = 150, OH = 1.0, HS = 0.3 } = {}) {
  const astillas = { ...fuentesIniciales(modelo).astillas, T }
  const par = parcelaFresca(modelo, astillas, 1000)
  par.vr = par.vp
  par.cr = new Array(nEsp).fill(0)
  par.cr[idx.OH] = OH
  par.cr[idx.HS] = HS
  par.phi = par.phi.map(() => 0) // impregnada
  return par
}

/** Cocina la parcela a temperatura y concentración constantes (repone el licor). */
function cocinar(par, horas, { reponer = true } = {}) {
  const dt = 5
  const OH0 = par.cr[idx.OH]
  const total = { madera: 0, org: 0, OH: 0 }
  for (let t = 0; t < horas * 3600; t += dt) {
    const d = reaccionarParcela(par, cin, dt, idx, nEsp, modelo.densidadPared, modelo.fis.cpMadera)
    total.madera += d.madera
    total.org += d.esp[idx.LD] + d.esp[idx.XD] + d.esp[idx.CD] + d.esp[idx.OD]
    total.OH += d.esp[idx.OH]
    if (reponer) par.cr[idx.OH] = OH0
  }
  return total
}

describe('cinética de cocción en una parcela', () => {
  it('la madera fresca tiene el kappa y la viscosidad de su composición', () => {
    const q = calidadPulpa([parcela()], cin)
    expect(q.rendimiento).toBeCloseTo(1, 12)
    expect(q.kappa).toBeCloseTo(0.245 / cin.ligPorKappa, 6)
    expect(q.viscosidad).toBeGreaterThan(2000)
  })

  it('lo que pierde la madera aparece disuelto en el licor (conservación)', () => {
    const par = parcela()
    const t = cocinar(par, 3)
    expect(t.madera).toBeLessThan(-300) // se disolvió más del 30 %
    expect(Math.abs(t.madera + t.org)).toBeLessThan(1e-9 * 1000)
  })

  it('sin álcali no hay deslignificación', () => {
    const par = parcela({ OH: 0 })
    const k0 = calidadPulpa([par], cin).kappaLignina
    cocinar(par, 2)
    expect(calidadPulpa([par], cin).kappaLignina).toBeGreaterThan(k0 * 0.95) // solo la fracción ψ residual
  })

  it('el álcali nunca queda negativo aunque falte', () => {
    const par = parcela({ OH: 0.01 })
    cocinar(par, 3, { reponer: false })
    expect(par.cr[idx.OH]).toBeGreaterThanOrEqual(0)
  })

  it('más temperatura o más álcali bajan el kappa', () => {
    const kappa = (opc) => { const p = parcela(opc); cocinar(p, 2); return calidadPulpa([p], cin).kappa }
    expect(kappa({ T: 155 })).toBeLessThan(kappa({ T: 148 }))
    expect(kappa({ OH: 1.2 })).toBeLessThan(kappa({ OH: 0.8 }))
  })

  it('el álcali bajo reprecipita lignina y sube el kappa', () => {
    const par = parcela({ OH: 0.05 })
    par.cr[idx.LD] = 80
    cocinar(par, 1)
    expect(par.Rp).toBeGreaterThan(0)
  })

  it('los HexA se forman y la viscosidad baja durante la cocción', () => {
    const par = parcela()
    const v0 = calidadPulpa([par], cin).viscosidad
    cocinar(par, 2)
    const q = calidadPulpa([par], cin)
    expect(q.kappaHexA).toBeGreaterThan(0.5)
    expect(q.viscosidad).toBeLessThan(v0)
  })

  it('las astillas gruesas se impregnan más lento', () => {
    const par = parcela({ T: 115 })
    par.phi = par.phi.map(() => 1)
    cocinar(par, 0.5)
    const i = Object.fromEntries(cin.clases.map((k, j) => [k.id, j]))
    expect(par.phi[i.sobre_espesor]).toBeGreaterThan(par.phi[i.aceptadas])
    expect(par.phi[i.aceptadas]).toBeGreaterThan(par.phi[i.finos])
  })
})
