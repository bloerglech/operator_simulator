// Aceptación de la Fase 2: prueba de escalón de cada lazo (sin oscilación
// sostenida; sobrepaso y asentamiento dentro de lo configurado en
// config/lazos.json → "prueba"). Mismo procedimiento que `npm run sintonia`.
import { describe, it, expect, beforeAll } from 'vitest'
import { config } from './ayuda.js'
import { estadoCaliente, pruebaEscalon } from '../herramientas/sintonia.js'

const cfg = config()
let caliente = null
beforeAll(() => { caliente = estadoCaliente(cfg) })

describe('pruebas de escalón de todos los lazos', () => {
  const lazos = cfg.lazos.lazos.filter((l) => l.prueba)
  it('todos los lazos tienen su prueba configurada', () => {
    expect(lazos.length).toBe(cfg.lazos.lazos.length)
  })
  for (const l of lazos) {
    it(l.tag, () => {
      const r = pruebaEscalon(cfg, caliente, l.tag)
      expect(r.oscila, 'oscilación sostenida').toBe(false)
      expect(r.asentamiento, 'asentamiento').not.toBe(null)
      expect(r.asentamiento).toBeLessThanOrEqual(l.prueba.asentamiento_max)
      expect(r.sobrepaso).toBeLessThanOrEqual(l.prueba.sobrepaso_max)
      expect(r.enclavamientos).toEqual([])
    })
  }
})
