// Pruebas de la planta completa (Fase 1a: transporte, hidráulica y energía, sin cinética).
import { describe, it, expect } from 'vitest'
import { plantaBase, config, tieneNoFinitos, peorBalance } from './ayuda.js'
import { crearPlanta } from '../src/sim/planta.js'

const HORA = 3600

describe('balances de masa y energía', () => {
  it('cierran en el caso base con cambios de caudal, temperatura y composición', () => {
    const planta = plantaBase()
    planta.avanzar(2 * HORA)
    planta.enviarComando({ tipo: 'ajustar', id: 'circ_sup', campo: 'T_salida', valor: 150 })
    planta.enviarComando({ tipo: 'ajustar', id: 'ext_final', campo: 'caudal', valor: 0.15 })
    planta.enviarComando({ tipo: 'fuente', id: 'filtrado', campo: 'TR', valor: 5 })
    planta.avanzar(3 * HORA)
    planta.enviarComando({ tipo: 'ajustar', id: 'astillas', campo: 'caudalMadera', valor: 50 })
    planta.enviarComando({ tipo: 'ajustar', id: 'soplado', campo: 'caudalMadera', valor: 45 })
    planta.avanzar(3 * HORA)
    const b = peorBalance(planta.balances())
    expect(b.masa).toBeLessThan(1e-3) // < 0,1 %
    expect(b.energia).toBeLessThan(1e-2) // < 1 %
    expect(tieneNoFinitos(planta.leerEstado({ perfiles: true }))).toBe(false)
  })
})

describe('caso base en estado estacionario (sección 7 de la especificación)', () => {
  it('residencias, factor H, temperaturas, relaciones y calidad dentro de los rangos', () => {
    const planta = plantaBase()
    planta.avanzar(16 * HORA)
    const s = planta.leerEstado()
    const k = s.kpi
    expect(k.produccion).toBeGreaterThan(2950)
    expect(k.produccion).toBeLessThan(3050)
    expect(k.residenciaImpregnador / 60).toBeGreaterThan(45)
    expect(k.residenciaImpregnador / 60).toBeLessThan(60)
    expect(k.residenciaTotal / HORA).toBeGreaterThan(4)
    expect(k.residenciaTotal / HORA).toBeLessThan(6)
    expect(k.HSoplado).toBeGreaterThan(350)
    expect(k.HSoplado).toBeLessThan(500)
    expect(k.licorMaderaAlimentacion * 1000).toBeGreaterThan(3.8)
    expect(k.licorMaderaAlimentacion * 1000).toBeLessThan(4.2)
    expect(k.factorDilucion).toBeGreaterThan(2.0)
    expect(k.factorDilucion).toBeLessThan(2.5)
    expect(k.TSoplado).toBeLessThan(90)
    const z = s.vasos.dig.zonas
    expect(z.coccion_superior.T).toBeGreaterThan(145)
    expect(z.coccion_superior.T).toBeLessThan(150)
    expect(z.coccion_inferior.T).toBeGreaterThan(147)
    expect(z.coccion_inferior.T).toBeLessThan(152)
    expect(s.vasos.imp.zonas.impregnacion.T).toBeGreaterThan(110)
    expect(s.vasos.imp.zonas.impregnacion.T).toBeLessThan(120)
    // Calidad (calibrada).
    expect(k.kappa).toBeGreaterThan(16)
    expect(k.kappa).toBeLessThan(18)
    expect(k.kappaHexA).toBeGreaterThan(4)
    expect(k.kappaHexA).toBeLessThan(6)
    expect(k.rendimiento * 100).toBeGreaterThan(53)
    expect(k.rendimiento * 100).toBeLessThan(54)
    expect(k.rechazos * 100).toBeLessThan(0.5)
    expect(k.viscosidad).toBeGreaterThan(1100)
    expect(k.viscosidad).toBeLessThan(1200)
    // Álcali residual: 6-10 g/L en las extracciones de cocción, 4-7 g/L en el soplado.
    // (La extracción superior saca licor de impregnación gastado, con más álcali.)
    for (const id of ['ext_principal', 'ext_final']) {
      expect(k.extracciones[id].alcali * 40).toBeGreaterThan(6)
      expect(k.extracciones[id].alcali * 40).toBeLessThan(10)
    }
    expect(k.alcaliResidualSoplado * 40).toBeGreaterThan(4)
    expect(k.alcaliResidualSoplado * 40).toBeLessThan(7)
  })

  it('el sentido del licor resulta del balance: contracorriente en la zona de lavado', () => {
    const planta = plantaBase()
    planta.avanzar(HORA)
    const p = planta.leerEstado({ perfiles: true }).vasos.dig.perfil
    const lavado = p.z.map((z, j) => [z, p.flujo[j]]).filter(([z]) => z > 48 && z < 55)
    for (const [, f] of lavado) expect(f).toBeLessThan(0) // hacia arriba
    const coccionSup = p.z.map((z, j) => [z, p.flujo[j]]).filter(([z]) => z > 10 && z < 26)
    for (const [, f] of coccionSup) expect(f).toBeGreaterThan(0) // cocorriente
  })
})

/** Tiempo (s) en que la marca de las astillas en el soplado cruza 0,5 después del escalón. */
function tiempoMuerto(planta, horasMax) {
  const t0 = planta.tiempo()
  planta.enviarComando({ tipo: 'fuente', id: 'astillas', campo: 'marca', valor: 1 })
  let anterior = { t: 0, m: 0 }
  for (let t = 60; t <= horasMax * HORA; t += 60) {
    planta.avanzar(60)
    const m = planta.leerEstado().kpi.marcaSoplado ?? 0
    if (m >= 0.5) return anterior.t + ((0.5 - anterior.m) / (m - anterior.m)) * (t - anterior.t)
    anterior = { t, m }
  }
  throw new Error(`la marca no llegó al soplado (t0 = ${t0})`)
}

/** Tiempo de tránsito teórico: inventario de astillas / caudal + tubería de transferencia. */
function transitoTeorico(planta) {
  const est = planta.estadoInterno()
  const mod = planta.modelo()
  const W = est.ajustes.astillas.caudalMadera
  const masa = (id) => est.vasos[id].parcelas.reduce((s, q) => s + q.m0, 0) // base madera alimentada
  const tr = mod.corrientePorId.transferencia
  const qTr = est.ajustes.transferencia.caudal + W / est.fuentes.astillas.densidad
  return masa('imp') / W + masa('dig') / W + tr.volumenTubo / qTr + 2 * mod.dtL
}

describe('tiempos muertos y de residencia', () => {
  it('el tiempo muerto de las astillas coincide con el tránsito pistón y escala con el ritmo', () => {
    const base = plantaBase()
    base.avanzar(HORA)
    const teoBase = transitoTeorico(base)
    const tmBase = tiempoMuerto(base, 8)
    expect(Math.abs(tmBase - teoBase) / teoBase).toBeLessThan(0.02)

    const lenta = plantaBase()
    for (const id of ['astillas', 'transferencia', 'soplado']) {
      const w = lenta.estadoInterno().ajustes[id].caudalMadera
      lenta.enviarComando({ tipo: 'ajustar', id, campo: 'caudalMadera', valor: 0.8 * w })
    }
    lenta.avanzar(HORA)
    const teoLenta = transitoTeorico(lenta)
    const tmLenta = tiempoMuerto(lenta, 10)
    expect(Math.abs(tmLenta - teoLenta) / teoLenta).toBeLessThan(0.02)
    // A 80 % del ritmo, el tiempo muerto es ≈ 1/0,8 veces el nominal.
    expect(tmLenta / tmBase).toBeGreaterThan(1.2)
    expect(tmLenta / tmBase).toBeLessThan(1.3)
  })
})

describe('estabilidad en condiciones extremas', () => {
  it('vasos vacíos, fríos y sin caudales', () => {
    const planta = crearPlanta(config(), { modo: 'vacio' })
    planta.avanzar(2 * HORA)
    const s = planta.leerEstado({ perfiles: true, balances: true })
    expect(tieneNoFinitos(s)).toBe(false)
    expect(s.vasos.dig.perfil.licorLibre.every((v) => v === 0)).toBe(true)
  })

  it('llenado desde vacío con licor y luego astillas (vaso parcialmente lleno)', () => {
    const planta = crearPlanta(config(), { modo: 'vacio' })
    for (const id of ['bomba_lavado', 'bomba_licor_blanco', 'bombas_astillas']) planta.enviarComando({ tipo: 'bomba', id, accion: 'partir' })
    planta.enviarComando({ tipo: 'ajustar', id: 'fil_fondo', campo: 'caudal', valor: 0.3 })
    planta.enviarComando({ tipo: 'ajustar', id: 'lb_alim', campo: 'caudal', valor: 0.05 })
    planta.avanzar(HORA)
    const v1 = planta.leerEstado({ perfiles: true }).vasos.dig.perfil.licorLibre.reduce((a, b) => a + b, 0)
    expect(v1).toBeCloseTo(0.3 * HORA, -1) // la bomba tarda unos segundos en partir
    planta.enviarComando({ tipo: 'ajustar', id: 'astillas', campo: 'caudalMadera', valor: 20 })
    planta.avanzar(2 * HORA)
    const s = planta.leerEstado({ perfiles: true, balances: true })
    expect(tieneNoFinitos(s)).toBe(false)
    expect(s.vasos.imp.nivelAstillas).toBeGreaterThan(0)
    expect(s.vasos.dig.lleno).toBe(false)
    const b = peorBalance(planta.balances())
    expect(b.masa).toBeLessThan(1e-3)
    expect(b.energia).toBeLessThan(1e-2)
    // Todo bajo 100 °C.
    for (const T of s.vasos.dig.perfil.T) expect(T).toBeLessThan(100)
  })

  it('columna detenida: el factor H sigue subiendo en el digestor caliente', () => {
    const planta = plantaBase()
    planta.avanzar(HORA)
    const H = () => planta.estadoInterno().vasos.dig.parcelas.map((q) => q.H)
    for (const c of planta.modelo().corrientes) {
      planta.enviarComando({ tipo: 'ajustar', id: c.id, campo: 'caudal', valor: 0 })
      if (planta.estadoInterno().ajustes[c.id].caudalMadera !== undefined) {
        planta.enviarComando({ tipo: 'ajustar', id: c.id, campo: 'caudalMadera', valor: 0 })
      }
    }
    planta.avanzar(60)
    const antes = H()
    planta.avanzar(HORA)
    const despues = H()
    expect(despues.length).toBe(antes.length) // la columna no se movió
    const sube = despues.map((h, i) => h - antes[i])
    expect(Math.max(...sube)).toBeGreaterThan(50) // zona de cocción: > 50 h·(vel. rel.) en una hora
    expect(tieneNoFinitos(planta.leerEstado({ perfiles: true, balances: true }))).toBe(false)
  })
})

describe('determinismo y guardado', () => {
  const comandos = (planta) => {
    planta.enviarComando({ tipo: 'ajustar', id: 'circ_inf', campo: 'T_salida', valor: 158 })
    planta.enviarComando({ tipo: 'fuente', id: 'licor_blanco', campo: 'OH', valor: 2.5 })
  }

  it('el resultado no depende de cómo se parte el tiempo (x1 vs x300)', () => {
    const a = plantaBase()
    for (let i = 0; i < 1800; i++) a.avanzar(1)
    comandos(a)
    for (let i = 0; i < 1800; i++) a.avanzar(1)
    const b = plantaBase()
    b.avanzar(1800)
    comandos(b)
    b.avanzar(300)
    b.avanzar(1500)
    expect(JSON.stringify(b.estadoInterno())).toBe(JSON.stringify(a.estadoInterno()))
  })

  it('guardar y cargar reproduce exactamente la continuación', () => {
    const a = plantaBase()
    a.avanzar(HORA)
    comandos(a)
    a.avanzar(10)
    const guardado = JSON.stringify(a.guardar())
    a.avanzar(HORA)
    const b = crearPlanta(config())
    b.cargar(guardado)
    b.avanzar(HORA)
    expect(JSON.stringify(b.estadoInterno())).toBe(JSON.stringify(a.estadoInterno()))
  })
})
