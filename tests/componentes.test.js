// Pruebas de los componentes numéricos: geometría, tuberías, transporte,
// balance hidráulico, intercambio y columna. Todos deben conservar exactamente.
import { describe, it, expect } from 'vitest'
import { crearGeometria, alturaDesdeFondo, celdaDeAltura } from '../src/sim/geometria.js'
import { crearTubo, empujar, extraer, volumenTubo } from '../src/sim/tubo.js'
import { transportarLicor } from '../src/sim/transporte.js'
import { balanceHidraulico } from '../src/sim/hidraulica.js'
import { intercambioEstrella } from '../src/sim/intercambio.js'
import { retirarFondo, agregarTope, ubicarColumna } from '../src/sim/columna.js'
import { estadoInicial, uniforme } from '../src/sim/aleatorio.js'

const fis = { cpMadera: 1.4, rcpLicor: 3990 }

describe('geometría', () => {
  const g = crearGeometria([{ altura: 30, diametro: 9 }, { altura: 27, diametro: 10 }], 57)
  it('el volumen total es el de los tramos', () => {
    const esperado = (Math.PI / 4) * (81 * 30 + 100 * 27)
    expect(g.volumenTotal).toBeCloseTo(esperado, 6)
  })
  it('la altura desde el fondo invierte el volumen acumulado', () => {
    expect(alturaDesdeFondo(g, (Math.PI / 4) * 100 * 27)).toBeCloseTo(27, 9)
    expect(alturaDesdeFondo(g, g.volumenTotal)).toBeCloseTo(57, 9)
    expect(celdaDeAltura(g, 0)).toBe(0)
    expect(celdaDeAltura(g, 57)).toBe(56)
  })
})

describe('tubería (flujo pistón)', () => {
  it('lo que entra sale en orden después de pasar el volumen retenido', () => {
    const tubo = crearTubo(10, { T: 20, c: [0] })
    const salidas = []
    for (let i = 0; i < 8; i++) {
      salidas.push(extraer(tubo, 2, 1).licor.c[0])
      empujar(tubo, { licor: { v: 2, T: 20, c: [i + 1] }, parcelas: [] })
    }
    // 10 m³ retenidos, 2 m³ por paso: lo que entra en el paso i sale en el i+5.
    expect(salidas).toEqual([0, 0, 0, 0, 0, 1, 2, 3])
    expect(volumenTubo(tubo)).toBeCloseTo(10, 12)
  })
  it('extraer más de lo que hay devuelve solo lo disponible', () => {
    const tubo = crearTubo(1, { T: 20, c: [1] })
    expect(extraer(tubo, 5, 1).licor.v).toBeCloseTo(1, 12)
    expect(volumenTubo(tubo)).toBe(0)
  })
})

describe('transporte implícito del licor libre', () => {
  it('conserva, no genera negativos y mantiene un campo uniforme', () => {
    const s = estadoInicial(3, 'transporte')
    const n = 15
    for (let caso = 0; caso < 50; caso++) {
      const vAnt = Array.from({ length: n }, () => 5 + 10 * uniforme(s))
      const adicV = Array.from({ length: n }, () => (uniforme(s) < 0.3 ? 3 * uniforme(s) : 0))
      const sumid = Array.from({ length: n }, () => (uniforme(s) < 0.3 ? 2 * uniforme(s) : 0))
      const dt = 5
      // Volúmenes nuevos arbitrarios y caudales por cara coherentes con ellos.
      const vNueva = vAnt.map((v) => v * (0.8 + 0.4 * uniforme(s)))
      const flujo = new Array(n + 1).fill(0)
      for (let j = 0; j < n; j++) flujo[j + 1] = flujo[j] + (adicV[j] - sumid[j] - (vNueva[j] - vAnt[j])) / dt
      if (flujo[n] < 0) {
        // Sin entrada por el fondo: la última celda absorbe la diferencia.
        vNueva[n - 1] += flujo[n] * dt
        flujo[n] = 0
        if (vNueva[n - 1] < 0) continue
      }
      const cAdic = 1 + uniforme(s)
      const x0 = vAnt.map(() => uniforme(s))
      const adicX = adicV.map((v) => [v * cAdic, v * 7])
      const [x, unif] = transportarLicor({
        vAnt, vNueva, flujo, sumid, adicX, x: [x0, new Array(n).fill(7)], dt,
      })
      // Conservación: inventario nuevo = inicial + entradas − sumideros − fondo.
      let inv0 = 0, inv1 = 0, ent = 0, sal = 0
      for (let j = 0; j < n; j++) {
        inv0 += vAnt[j] * x0[j]
        inv1 += vNueva[j] * x[j]
        ent += adicV[j] * cAdic
        sal += sumid[j] * x[j]
      }
      sal += flujo[n] * dt * x[n - 1]
      expect(Math.abs(inv1 - (inv0 + ent - sal))).toBeLessThan(1e-9 * (inv0 + ent))
      expect(Math.min(...x)).toBeGreaterThanOrEqual(0)
      for (const u of unif) expect(u).toBeCloseTo(7, 10)
    }
  })
})

describe('balance hidráulico', () => {
  const n = 10
  const cap = new Array(n).fill(10)
  it('vaso lleno: el exceso sale por la corriente de cierre y los caudales cierran', () => {
    const r = balanceHidraulico({
      cap, vAnt: cap.slice(), adic: [2, 0, 0, 0, 0, 0, 0, 0, 0, 6], extr: [{ j: 4, v: 2 }],
      pen: new Array(n).fill(0), salidaFondo: 4, celdaCierre: 4, dt: 1,
    })
    expect(r.lleno).toBe(true)
    expect(r.cierre).toBeCloseTo(2, 12)
    expect(Math.abs(r.residuo)).toBeLessThan(1e-12)
    // Bajo el punto de extracción el licor sube (contracorriente desde el fondo).
    expect(r.flujo[5]).toBeLessThan(0)
    expect(r.flujo[1]).toBeGreaterThan(0)
  })
  it('vaso parcialmente lleno: se llena desde el fondo y lo que entra arriba cae', () => {
    const vAnt = [0, 0, 0, 0, 0, 0, 10, 10, 10, 10]
    const r = balanceHidraulico({
      cap, vAnt, adic: [6, 0, 0, 0, 0, 0, 0, 0, 0, 0], extr: [],
      pen: new Array(n).fill(0), salidaFondo: 0, celdaCierre: null, dt: 1,
    })
    expect(r.lleno).toBe(false)
    expect(r.vNueva[5]).toBeCloseTo(6, 12)
    expect(r.vNueva[4]).toBe(0)
    expect(Math.abs(r.residuo)).toBeLessThan(1e-12)
  })
  it('vaso vacío y sin caudales no hace nada', () => {
    const r = balanceHidraulico({
      cap, vAnt: new Array(n).fill(0), adic: new Array(n).fill(0), extr: [{ j: 2, v: 5 }],
      pen: new Array(n).fill(1), salidaFondo: 3, celdaCierre: 2, dt: 1,
    })
    expect(r.vNueva.every((v) => v === 0)).toBe(true)
    expect(r.flujo.every((f) => f === 0)).toBe(true)
  })
})

describe('intercambio libre ↔ retenido', () => {
  it('conserva la cantidad total y se acerca al equilibrio', () => {
    const r = intercambioEstrella(10, 1, [{ C: 2, x: 0, a: 0.5 }, { C: 3, x: 2, a: 5 }])
    const antes = 10 * 1 + 2 * 0 + 3 * 2
    const despues = 10 * r.xf + 2 * r.x[0] + 3 * r.x[1]
    expect(despues).toBeCloseTo(antes, 12)
    expect(r.x[0]).toBeGreaterThan(0)
    expect(r.x[1]).toBeLessThan(2)
  })
})

describe('columna de astillas', () => {
  const g = crearGeometria([{ altura: 10, diametro: 4 }], 10)
  const parcela = (m) => ({ m, vol: m / 480, vp: m / 480 - m / 1500, vr: 0, T: 20, cr: [0], H: 0, edad: 0, marca: 0 })
  it('retirar y agregar conservan la masa', () => {
    const col = []
    agregarTope(col, [parcela(1000), parcela(1000), parcela(1000)], 1500, fis)
    expect(col.reduce((s, q) => s + q.m, 0)).toBeCloseTo(3000, 9)
    const sale = retirarFondo(col, 1200)
    expect(sale.reduce((s, q) => s + q.m, 0)).toBeCloseTo(1200, 9)
    expect(col.reduce((s, q) => s + q.m, 0)).toBeCloseTo(1800, 9)
  })
  it('las fracciones de cada parcela en las celdas suman 1 y el nivel es correcto', () => {
    const col = []
    const sCol = 0.4
    const vVaso = g.volumenTotal * 0.55
    agregarTope(col, Array.from({ length: 13 }, () => parcela((vVaso * sCol * 480) / 13)), 1e9 * 0, fis)
    const u = ubicarColumna(col, g, sCol)
    const suma = new Array(col.length).fill(0)
    for (const s of u.solapes) suma[s.i] += s.f
    for (const x of suma) expect(x).toBeCloseTo(1, 9)
    expect(u.nivel).toBeCloseTo(5.5, 6)
    expect(u.rebalse).toBe(0)
  })
})
