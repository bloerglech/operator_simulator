import { describe, it, expect } from 'vitest'
import { aInterno, desdeInterno } from '../src/sim/unidades.js'
import { p, validarParametros } from '../src/sim/parametros.js'

describe('unidades', () => {
  it('convierte caudales, temperaturas y concentraciones', () => {
    expect(aInterno(3600, 'm3/h')).toBeCloseTo(1, 12)
    expect(aInterno(373.15, 'K')).toBeCloseTo(100, 12)
    expect(aInterno(40, 'g/L NaOH')).toBeCloseTo(1, 12)
    expect(aInterno(31, 'g/L Na2O')).toBeCloseTo(1, 12)
    expect(aInterno(18, '%')).toBeCloseTo(0.18, 12)
    expect(desdeInterno(aInterno(117.5, 'g/L NaOH'), 'g/L NaOH')).toBeCloseTo(117.5, 10)
  })
  it('rechaza unidades desconocidas', () => {
    expect(() => aInterno(1, 'furlong')).toThrow(/Unidad desconocida/)
  })
})

describe('parámetros', () => {
  it('lee un parámetro en unidades internas', () => {
    expect(p({ q: { valor: 720, unidad: 'm3/h', origen: 'supuesto' } }, 'q')).toBeCloseTo(0.2, 12)
  })
  it('informa el parámetro faltante con su ruta', () => {
    expect(() => p({}, 'x', 'madera.x')).toThrow(/madera\.x/)
  })
  it('el validador detecta unidad, origen y valor inválidos', () => {
    const errores = validarParametros({
      a: { valor: 1, unidad: 'xx', origen: 'supuesto' },
      b: { valor: 1, unidad: 'm', origen: 'inventado' },
      c: { valor: 'uno', unidad: 'm', origen: 'supuesto' },
      d: { valor: 1, unidad: 'm', origen: 'planta' },
    })
    expect(errores).toHaveLength(3)
  })
})
