// Respuestas cualitativas del modelo calibrado (sección 13 de la especificación).
// Se parte del estado estacionario del caso base, se aplica un cambio y se
// compara después de 6 h (más que el tiempo de residencia total, ≈ 4,4 h).
import { describe, it, expect, beforeAll } from 'vitest'
import { config } from './ayuda.js'
import { crearPlanta } from '../src/sim/planta.js'
import { correrHastaEstacionario, indicadoresCalidad } from '../herramientas/estacionario.js'

let base // estado estacionario guardado
let ref // indicadores del caso base

const LICOR_BLANCO = ['lb_alim', 'lb_transf', 'lb_sup', 'lb_inf']
const ASTILLAS = ['astillas', 'transferencia', 'soplado']

/** Carga el estado base, aplica los cambios y corre `horas`. */
function escenario(cambios, horas = 6) {
  const planta = crearPlanta(config())
  planta.cargar(base)
  const est = planta.estadoInterno()
  for (const c of cambios) {
    const actual = c.tipo === 'ajustar' ? est.ajustes[c.id][c.campo] : est.fuentes[c.id][c.campo]
    planta.enviarComando({ tipo: c.tipo, id: c.id, campo: c.campo, valor: c.factor !== undefined ? actual * c.factor : actual + c.suma })
  }
  planta.avanzar(horas * 3600)
  return { k: indicadoresCalidad(planta), s: planta.leerEstado() }
}
const escalar = (ids, campo, factor) => ids.map((id) => ({ tipo: 'ajustar', id, campo, factor }))

describe('respuestas cualitativas', () => {
  beforeAll(() => {
    const planta = crearPlanta(config())
    correrHastaEstacionario(planta, { minHoras: 12 })
    base = planta.guardar()
    ref = indicadoresCalidad(planta)
  })

  it('más temperatura baja el kappa', () => {
    const { k } = escenario([
      { tipo: 'ajustar', id: 'circ_sup', campo: 'T_salida', suma: 3 },
      { tipo: 'ajustar', id: 'circ_inf', campo: 'T_salida', suma: 3 },
    ])
    expect(k.kappa).toBeLessThan(ref.kappa - 1)
  })

  it('más álcali baja el kappa', () => {
    const { k } = escenario(escalar(LICOR_BLANCO, 'caudal', 1.1))
    expect(k.kappa).toBeLessThan(ref.kappa - 0.5)
  })

  it('más ritmo sin compensar sube el kappa', () => {
    const { k } = escenario(escalar(ASTILLAS, 'caudalMadera', 1.1))
    expect(k.kappa).toBeGreaterThan(ref.kappa + 0.5)
  })

  it('menos álcali baja el álcali residual', () => {
    const { k } = escenario(escalar(LICOR_BLANCO, 'caudal', 0.9))
    expect(k.alcaliExtraccion).toBeLessThan(ref.alcaliExtraccion - 0.5)
    expect(k.alcaliSoplado).toBeLessThan(ref.alcaliSoplado)
  })

  it('más dilución y extracción bajan los sólidos disueltos y suben la viscosidad', () => {
    const { k, s } = escenario(escalar(['fil_sup', 'fil_inf'], 'caudal', 2))
    const ds = (st) => st.vasos.dig.zonas.coccion_inferior
    const dsOrg = (z) => z.LD + z.XD + z.CD + z.OD
    const planta = crearPlanta(config())
    planta.cargar(base)
    expect(dsOrg(ds(s))).toBeLessThan(dsOrg(ds(planta.leerEstado())) - 2)
    expect(k.viscosidad).toBeGreaterThan(ref.viscosidad + 10)
  })

  it('madera más húmeda sin corregir sube el kappa', () => {
    const { k } = escenario([{ tipo: 'fuente', id: 'astillas', campo: 'humedad', suma: 0.05 }])
    expect(k.kappa).toBeGreaterThan(ref.kappa + 0.3)
  })

  it('una madera menos reactiva exige más carga de álcali', () => {
    const menosReactiva = { tipo: 'fuente', id: 'astillas', campo: 'reactividad', factor: 0.85 }
    const sinCorregir = escenario([menosReactiva])
    expect(sinCorregir.k.kappa).toBeGreaterThan(ref.kappa + 1)
    const conMasCarga = escenario([menosReactiva, ...escalar(LICOR_BLANCO, 'caudal', 1.15)])
    expect(conMasCarga.k.kappa).toBeLessThan(sinCorregir.k.kappa - 1)
  })
})
