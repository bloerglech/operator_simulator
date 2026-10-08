// Prueba contra la deriva de la documentación (revisión D-01): las cifras del
// manual que dependen de config/ o del caso base calibrado deben coincidir con
// lo que genera `npm run tablas-manual`. Si falla después de calibrar o de
// cambiar la configuración, corra ese comando.
import { describe, it, expect } from 'vitest'
import { ARCHIVOS_MANUAL, generarBloques, leerBloques, leerManual, num } from '../herramientas/tablas-manual.js'
import { config } from './ayuda.js'

const enManual = () => Object.assign({}, ...ARCHIVOS_MANUAL.map((a) => leerBloques(leerManual(a))))

describe('cifras generadas del manual', () => {
  it('formato numérico del manual', () => {
    expect(num(1149)).toBe('1 149')
    expect(num(17.06, 1)).toBe('17,1')
    expect(num(-77.6)).toBe('−78')
    expect(num(-0.04, 1)).toBe('0,0')
  })

  it('las marcas en línea no empiezan una línea (romperían el párrafo al compilar)', () => {
    for (const a of ARCHIVOS_MANUAL) {
      const malas = leerManual(a).split('\n').filter((l) => /^<!-- generado:[\w-]+ -->\S/.test(l))
      expect(malas, a).toEqual([])
    }
  })

  it('las que salen de config/ (constantes calibradas, umbrales, caudales) coinciden', () => {
    const manual = enManual()
    for (const [nombre, valor] of Object.entries(generarBloques(config(), { rapido: true }))) {
      expect(manual[nombre], `bloque «${nombre}»: corra npm run tablas-manual`).toBe(valor)
    }
  })

  it('las del caso base y las sensibilidades coinciden', () => {
    const manual = enManual()
    const bloques = generarBloques(config())
    for (const [nombre, valor] of Object.entries(bloques)) {
      expect(manual[nombre], `bloque «${nombre}»: corra npm run tablas-manual`).toBe(valor)
    }
    // Ninguna marca del manual queda huérfana.
    expect(Object.keys(manual).filter((n) => !(n in bloques))).toEqual([])
  }, 300_000)
})
