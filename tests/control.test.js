// Pruebas del sistema de control (Fase 2): lazos, cascadas, bloques,
// enclavamientos, alarmas, analizadores, laboratorio y determinismo.
import { describe, it, expect, beforeAll } from 'vitest'
import { config, tieneNoFinitos } from './ayuda.js'
import { crearPlanta } from '../src/sim/planta.js'
import { crearSistema } from '../src/control/sistema.js'

const MIN = 60
const HORA = 3600
let caliente = null // planta sin control cerca del estado estacionario (guardado)

beforeAll(() => {
  const p = crearPlanta(config(), { semilla: 7 })
  p.avanzar(8 * HORA)
  caliente = p.guardar()
})

function sistema() {
  const s = crearSistema(config(), { semilla: 7 })
  s.cargar(caliente)
  s.avanzar(10) // el control arranca en el primer paso lento
  return s
}
const ctl = (s) => s.leerEstado().control
const lazo = (s, tag) => ctl(s).lazos[tag]

describe('estado estacionario con control', () => {
  it('los lazos siguen sus consignas, sin enclavamientos ni inundación de alarmas', () => {
    const s = sistema()
    const lazos = Object.keys(ctl(s).lazos)
    const err = Object.fromEntries(lazos.map((t) => [t, 0]))
    let n = 0
    let maxActivaciones = 0
    const alivios0 = s.estadoInterno().incidentes.apertura_alivio ?? 0
    for (let i = 0; i < 120; i++) {
      s.avanzar(MIN)
      const c = ctl(s)
      maxActivaciones = Math.max(maxActivaciones, c.alarmas.activacionesUltimos10min)
      for (const t of lazos) {
        const l = c.lazos[t]
        if (l.modo !== 'MAN') err[t] += Math.abs(l.pv - l.sp) / (l.rango[1] - l.rango[0])
      }
      n++
    }
    const c = ctl(s)
    for (const t of lazos) expect(err[t] / n, `${t}: error medio`).toBeLessThan(0.02)
    expect(Object.values(c.enclavamientos).filter((e) => e.disparado)).toEqual([])
    expect(c.alarmas.lista.map((a) => a.id)).toEqual([])
    expect(maxActivaciones).toBeLessThan(10)
    expect(s.estadoInterno().incidentes.apertura_alivio ?? 0).toBe(alivios0)
    expect(tieneNoFinitos(c)).toBe(false)
  })
})

describe('respuestas a escalones de consigna', () => {
  const casos = [
    // tag, nueva consigna (relativa), tiempo, tolerancia (unidad del PV)
    { tag: 'FIC-401', d: 100, t: 2 * MIN, tol: 15 },
    { tag: 'PIC-301', d: 0.3, t: 10 * MIN, tol: 0.08 },
    { tag: 'PIC-201', d: -0.3, t: 10 * MIN, tol: 0.08 },
    { tag: 'TIC-402', d: 2, t: 15 * MIN, tol: 0.5 },
    { tag: 'TIC-212', d: -2, t: 15 * MIN, tol: 0.5 },
    { tag: 'LIC-510', d: -10, t: 20 * MIN, tol: 2 },
    { tag: 'LIC-202', d: -0.5, t: 60 * MIN, tol: 0.25 },
  ]
  for (const c of casos) {
    it(`${c.tag}: llega a la nueva consigna`, () => {
      const s = sistema()
      const sp = lazo(s, c.tag).sp + c.d
      s.enviarComando({ tipo: 'lazo', id: c.tag, accion: 'consigna', valor: sp })
      s.avanzar(c.t)
      // Promedio de 2 minutos (el PV tiene ruido de medición).
      let suma = 0
      for (let i = 0; i < 24; i++) { s.avanzar(5); suma += lazo(s, c.tag).pv }
      expect(Math.abs(suma / 24 - sp), `${c.tag}`).toBeLessThan(c.tol)
      expect(Object.values(ctl(s).enclavamientos).some((e) => e.disparado)).toBe(false)
    })
  }

  it('cascada: el bloque de carga de álcali mueve las consignas de los esclavos', () => {
    const s = sistema()
    const antes = lazo(s, 'FIC-111').sp
    s.enviarComando({ tipo: 'bloque', id: 'FFC-110', accion: 'parametro', campo: 'carga', valor: 19 })
    s.avanzar(10 * MIN)
    const despues = lazo(s, 'FIC-111')
    expect(despues.modo).toBe('CAS')
    expect(despues.sp / antes).toBeGreaterThan(1.04)
    expect(despues.sp / antes).toBeLessThan(1.08)
    expect(Math.abs(despues.pv - despues.sp)).toBeLessThan(8)
  })
})

describe('modos y transferencia sin golpe', () => {
  it('MAN → AUTO no mueve la salida; en MAN la salida la fija el operador', () => {
    const s = sistema()
    s.enviarComando({ tipo: 'lazo', id: 'TIC-402', accion: 'modo', valor: 'MAN' })
    s.avanzar(1)
    const u0 = lazo(s, 'TIC-402').salida
    s.enviarComando({ tipo: 'lazo', id: 'TIC-402', accion: 'salida', valor: u0 + 5 })
    s.avanzar(5)
    expect(lazo(s, 'TIC-402').salida).toBeCloseTo(u0 + 5, 6)
    s.enviarComando({ tipo: 'lazo', id: 'TIC-402', accion: 'modo', valor: 'AUTO' })
    s.avanzar(0.2)
    expect(Math.abs(lazo(s, 'TIC-402').salida - (u0 + 5))).toBeLessThan(1)
    expect(() => s.enviarComando({ tipo: 'lazo', id: 'TIC-402', accion: 'salida', valor: 50 })).toThrow()
    expect(() => s.enviarComando({ tipo: 'lazo', id: 'TIC-402', accion: 'modo', valor: 'CAS' })).toThrow()
  })
})

describe('enclavamientos', () => {
  it('I-01: presión muy alta (falla del transmisor) detiene la alimentación; rearme manual', () => {
    const s = sistema()
    s.enviarComando({ tipo: 'instrumento', id: 'PI-301', falla: 'alto' })
    s.avanzar(5)
    let c = ctl(s)
    expect(c.enclavamientos['I-01'].disparado).toBe(true)
    expect(c.lazos['WIC-101'].modo).toBe('MAN')
    expect(c.lazos['WIC-101'].salida).toBe(0)
    expect(c.lazos['WIC-101'].forzado).toBe('I-01')
    expect(c.lazos['PIC-301'].modo).toBe('MAN') // PV en falla: el lazo pasa a manual
    const ids = c.alarmas.lista.map((a) => a.id)
    expect(ids).toContain('ENC-I-01')
    expect(ids).toContain('PI-301-FS')
    expect(c.alarmas.lista[0].prioridad).toBe(1)
    // No se puede rearmar ni tomar el lazo mientras la condición persiste.
    expect(() => s.enviarComando({ tipo: 'enclavamiento', id: 'I-01', accion: 'rearmar' })).toThrow()
    expect(() => s.enviarComando({ tipo: 'lazo', id: 'WIC-101', accion: 'modo', valor: 'AUTO' })).toThrow()
    s.enviarComando({ tipo: 'instrumento', id: 'PI-301', falla: null })
    s.avanzar(5)
    s.enviarComando({ tipo: 'enclavamiento', id: 'I-01', accion: 'rearmar' })
    s.avanzar(1)
    c = ctl(s)
    expect(c.enclavamientos['I-01'].disparado).toBe(false)
    expect(c.lazos['WIC-101'].forzado).toBe(null)
    expect(c.lazos['WIC-101'].modo).toBe('MAN') // el operador decide cuándo volver a automático
    s.enviarComando({ tipo: 'lazo', id: 'WIC-101', accion: 'modo', valor: 'AUTO' })
    s.enviarComando({ tipo: 'lazo', id: 'PIC-301', accion: 'modo', valor: 'AUTO' })
    s.avanzar(2 * MIN)
    expect(lazo(s, 'WIC-101').pv).toBeGreaterThan(150)
  })

  it('I-09: ΔP alta en las mallas de circulación superior detiene la bomba y cierra el vapor', () => {
    const s = sistema()
    s.enviarComando({ tipo: 'instrumento', id: 'PDI-524', falla: 'alto' })
    s.avanzar(65)
    const e = s.leerEstado()
    expect(e.control.enclavamientos['I-09'].disparado).toBe(true)
    expect(s.estadoInterno().bombas.bomba_circ_sup.marcha).toBe(false)
    expect(e.control.lazos['TIC-402'].salida).toBe(0)
  })
})

describe('cada enclavamiento dispara con su condición', () => {
  for (const e of config().enclavamientos.enclavamientos) {
    it(`${e.id}: ${e.descripcion}`, () => {
      const s = sistema()
      // Se simula la condición con una falla del transmisor al extremo del rango.
      s.enviarComando({ tipo: 'instrumento', id: e.condicion.tag, falla: e.condicion.op === '>' ? 'alto' : 'bajo' })
      s.avanzar(Math.max(0, e.condicion.retardo - 1))
      expect(ctl(s).enclavamientos[e.id].disparado, 'antes del retardo').toBe(false)
      s.avanzar(3)
      const c = ctl(s)
      expect(c.enclavamientos[e.id].disparado).toBe(true)
      for (const a of e.acciones) {
        if (a.lazo) {
          expect(c.lazos[a.lazo].modo).toBe('MAN')
          expect(c.lazos[a.lazo].salida).toBe(a.salida)
        } else if (a.comando.tipo === 'bomba') {
          expect(s.estadoInterno().bombas[a.comando.id].marcha).toBe(a.comando.accion === 'partir')
        }
      }
      expect(c.alarmas.lista.map((x) => x.id)).toContain(`ENC-${e.id}`)
    })
  }
})

describe('un evento simple no genera una avalancha de alarmas', () => {
  const eventos = [
    { nombre: 'detención de la bomba de circulación superior', cmd: { tipo: 'bomba', id: 'bomba_circ_sup', accion: 'detener' } },
    { nombre: 'detención de la alimentación de astillas', cmd: { tipo: 'lazo', id: 'WIC-101', accion: 'modo', valor: 'MAN' }, cmd2: { tipo: 'lazo', id: 'WIC-101', accion: 'salida', valor: 0 } },
    { nombre: 'caída de la presión de vapor de media', cmd: { tipo: 'servicio', id: 'presionVaporMP', valor: 6e5 + 101325 } },
  ]
  for (const ev of eventos) {
    it(ev.nombre, () => {
      const s = sistema()
      s.enviarComando(ev.cmd)
      s.avanzar(1)
      if (ev.cmd2) s.enviarComando(ev.cmd2)
      let max = 0
      for (let i = 0; i < 40; i++) {
        s.avanzar(MIN)
        max = Math.max(max, ctl(s).alarmas.activacionesUltimos10min)
      }
      expect(max).toBeLessThan(10)
    })
  }
})

describe('alarmas', () => {
  it('ciclo de vida: activa, reconocida, retorna; archivo temporal', () => {
    const s = sistema()
    s.enviarComando({ tipo: 'instrumento', id: 'TI-604', falla: 'alto' })
    s.avanzar(55)
    expect(ctl(s).alarmas.lista.find((x) => x.id === 'TI-604-A')).toBeUndefined() // retardo de 60 s
    s.avanzar(10)
    let a = ctl(s).alarmas.lista.find((x) => x.id === 'TI-604-A')
    expect(a.activa).toBe(true)
    expect(a.reconocida).toBe(false)
    s.enviarComando({ tipo: 'alarma', id: 'TI-604-A', accion: 'reconocer' })
    s.avanzar(1)
    a = ctl(s).alarmas.lista.find((x) => x.id === 'TI-604-A')
    expect(a.reconocida).toBe(true)
    s.enviarComando({ tipo: 'instrumento', id: 'TI-604', falla: null })
    s.avanzar(10)
    expect(ctl(s).alarmas.lista.find((x) => x.id === 'TI-604-A')).toBeUndefined()
    // Archivar: la alarma no se anuncia durante el plazo y vuelve después.
    s.enviarComando({ tipo: 'alarma', id: 'TI-604-A', accion: 'archivar', duracion: 600 })
    s.enviarComando({ tipo: 'instrumento', id: 'TI-604', falla: 'alto' })
    s.avanzar(5 * MIN)
    expect(ctl(s).alarmas.lista.find((x) => x.id === 'TI-604-A')).toBeUndefined()
    s.avanzar(7 * MIN)
    expect(ctl(s).alarmas.lista.find((x) => x.id === 'TI-604-A')?.activa).toBe(true)
    expect(() => s.enviarComando({ tipo: 'alarma', id: 'PI-301-AA', accion: 'archivar' })).toThrow()
    const reg = ctl(s).alarmas.registro.filter((r) => r.id === 'TI-604-A').map((r) => r.accion)
    expect(reg).toEqual(['activa', 'reconocida', 'retorna', 'archivada', 'desarchivada', 'activa'])
  })

  it('las alarmas de eventos del proceso se anuncian (detención de una bomba)', () => {
    const s = sistema()
    s.enviarComando({ tipo: 'bomba', id: 'bomba_circ_inf', accion: 'detener' })
    s.avanzar(30)
    const ids = ctl(s).alarmas.lista.map((a) => a.id)
    expect(ids).toContain('EV-detencion_bomba')
    s.enviarComando({ tipo: 'alarma', id: '*', accion: 'reconocer' })
    s.avanzar(1)
    expect(ctl(s).alarmas.lista.find((a) => a.id === 'EV-detencion_bomba')).toBeUndefined()
  })
})

describe('analizadores y laboratorio', () => {
  it('el analizador de kappa entrega valores discretos cada periodo', () => {
    const s = sistema()
    const valores = new Set()
    for (let i = 0; i < 60; i++) { s.avanzar(MIN); valores.add(ctl(s).transmisores['AI-701'].valor) }
    // 1 h con un periodo de 25 min: a lo más 3–4 valores distintos.
    expect(valores.size).toBeGreaterThanOrEqual(2)
    expect(valores.size).toBeLessThanOrEqual(4)
  })

  it('el laboratorio entrega el kappa entre 20 y 40 min después de la muestra', () => {
    const s = sistema()
    const kappa = s.leerEstado().kpi.kappa
    s.enviarComando({ tipo: 'laboratorio', analisis: 'kappa' })
    s.avanzar(MIN)
    expect(ctl(s).laboratorio.pendientes.length).toBe(1)
    s.avanzar(19 * MIN)
    expect(ctl(s).laboratorio.resultados.length).toBe(0)
    s.avanzar(21 * MIN)
    const r = ctl(s).laboratorio.resultados
    expect(r.length).toBe(1)
    expect(r[0].t - r[0].tMuestra).toBeGreaterThanOrEqual(20 * MIN)
    expect(r[0].t - r[0].tMuestra).toBeLessThanOrEqual(40 * MIN)
    expect(Math.abs(r[0].valor - kappa)).toBeLessThan(3)
  })
})

describe('control avanzado', () => {
  it('coordinación de ritmo: rampa de la madera y escalado de los caudales', () => {
    const s = sistema()
    const W0 = lazo(s, 'WIC-101').sp
    const F0 = lazo(s, 'FIC-116').sp
    s.enviarComando({ tipo: 'bloque', id: 'RC-700', accion: 'parametro', campo: 'produccion', valor: 2700 })
    s.enviarComando({ tipo: 'bloque', id: 'RC-700', accion: 'activar' })
    s.avanzar(HORA)
    const W1 = lazo(s, 'WIC-101').sp
    // Rampa de 150 ADt/d por hora ≈ 10,5 t/h de madera por hora.
    expect(W0 - W1).toBeGreaterThan(9)
    expect(W0 - W1).toBeLessThan(12)
    expect(lazo(s, 'FIC-116').sp / F0).toBeCloseTo(W1 / W0, 3)
    s.avanzar(2 * HORA)
    expect(lazo(s, 'WIC-101').sp).toBeCloseTo((2700 * 0.9) / 0.535 / 24, 1)
  })

  it('control de factor H: sube las temperaturas para alcanzar un H mayor', () => {
    const s = sistema()
    const T0 = lazo(s, 'TIC-402').sp
    const H0 = ctl(s).transmisores['HI-703'].valor
    s.enviarComando({ tipo: 'bloque', id: 'HIC-703', accion: 'parametro', campo: 'objetivo', valor: H0 + 40 })
    s.enviarComando({ tipo: 'bloque', id: 'HIC-703', accion: 'activar' })
    s.avanzar(3 * HORA) // ganancia baja a propósito: la zona responde en 1–2 h
    const b = ctl(s).bloques['HIC-703']
    expect(Math.abs(b.Hprevisto - (H0 + 40))).toBeLessThan(15)
    expect(lazo(s, 'TIC-402').sp - T0).toBeGreaterThan(0.2)
    expect(lazo(s, 'TIC-402').sp - T0).toBeLessThan(6) // la zona sube menos que la salida del calentador
  })
})

describe('determinismo con control', () => {
  it('misma semilla y comandos → mismo estado; guardar/cargar continúa igual', () => {
    const a = sistema()
    const b = sistema()
    const cmds = [
      { tipo: 'lazo', id: 'TIC-404', accion: 'consigna', valor: 156 },
      { tipo: 'laboratorio', analisis: 'viscosidad' },
      { tipo: 'bloque', id: 'HIC-703', accion: 'activar' },
    ]
    for (const c of cmds) { a.enviarComando(c); b.enviarComando(c) }
    a.avanzar(5 * MIN)
    b.avanzar(5 * MIN)
    const g = a.guardar()
    const c = crearSistema(config(), { semilla: 99 })
    c.cargar(g)
    a.avanzar(10 * MIN)
    b.avanzar(10 * MIN)
    c.avanzar(10 * MIN)
    const ea = JSON.stringify(a.estadoInterno())
    expect(JSON.stringify(b.estadoInterno())).toBe(ea)
    expect(JSON.stringify(c.estadoInterno())).toBe(ea)
  })
})

describe('regresiones de la revisión del control', () => {
  it('un comando enviado justo al crear el sistema desde un guardado no se pierde', () => {
    const s = crearSistema(config(), { semilla: 7 })
    s.cargar(caliente)
    s.enviarComando({ tipo: 'lazo', id: 'PIC-301', accion: 'consigna', valor: 6.2 })
    s.avanzar(10)
    expect(lazo(s, 'PIC-301').sp).toBe(6.2)
  })

  it('RC-700 no se activa con la alimentación detenida y los parámetros tienen rango', () => {
    const s = sistema()
    expect(() => s.enviarComando({ tipo: 'bloque', id: 'RC-700', accion: 'parametro', campo: 'rendimiento', valor: 0 })).toThrow()
    expect(() => s.enviarComando({ tipo: 'bloque', id: 'FFC-110', accion: 'parametro', campo: 'EA_licor_blanco', valor: 0 })).toThrow()
    s.enviarComando({ tipo: 'lazo', id: 'WIC-101', accion: 'consigna', valor: 0 })
    s.avanzar(1)
    expect(() => s.enviarComando({ tipo: 'bloque', id: 'RC-700', accion: 'activar' })).toThrow()
  })

  it('un lazo de nivel de flash en MAN mantiene la salida del operador', () => {
    const s = sistema()
    s.enviarComando({ tipo: 'lazo', id: 'LIC-511', accion: 'modo', valor: 'MAN' })
    s.avanzar(1)
    s.enviarComando({ tipo: 'lazo', id: 'LIC-511', accion: 'salida', valor: 95 })
    s.avanzar(30)
    expect(lazo(s, 'LIC-511').salida).toBe(95)
  })

  it('el control de factor H no pisa la consigna de un calentador en MAN', () => {
    const s = sistema()
    s.enviarComando({ tipo: 'lazo', id: 'TIC-402', accion: 'modo', valor: 'MAN' })
    s.avanzar(1)
    const sp = lazo(s, 'TIC-402').sp
    s.enviarComando({ tipo: 'bloque', id: 'HIC-703', accion: 'parametro', campo: 'objetivo', valor: 520 })
    s.enviarComando({ tipo: 'bloque', id: 'HIC-703', accion: 'activar' })
    s.avanzar(10 * MIN)
    expect(lazo(s, 'TIC-402').sp).toBe(sp)
  })

  it('archivo: duración no numérica rechazada; una alarma de evento sale del archivo al vencer', () => {
    const s = sistema()
    expect(() => s.enviarComando({ tipo: 'alarma', id: 'EV-detencion_bomba', accion: 'archivar', duracion: '100' })).toThrow()
    s.enviarComando({ tipo: 'alarma', id: 'EV-detencion_bomba', accion: 'archivar', duracion: 60 })
    s.avanzar(2 * MIN)
    expect(ctl(s).alarmas.archivadas).toEqual([])
  })

  it('la deriva de un analizador lo desplaza en vez de congelarlo', () => {
    const s = sistema()
    s.enviarComando({ tipo: 'instrumento', id: 'AI-504', falla: 'deriva' })
    s.avanzar(3 * HORA)
    const conDeriva = ctl(s).transmisores['AI-504'].valor
    const b = sistema()
    b.avanzar(3 * HORA)
    // 1 % del rango (40 g/L) por hora durante ≈ 3 h ≈ 1,2 g/L.
    expect(conDeriva - ctl(b).transmisores['AI-504'].valor).toBeGreaterThan(0.8)
  })
})

describe('dificultad: ruido de los instrumentos', () => {
  it('el factor de ruido escala la dispersión de las lecturas (0 = sin ruido)', () => {
    const dispersion = (factor) => {
      const s = sistema()
      s.enviarComando({ tipo: 'ruido', factor })
      const v = []
      for (let i = 0; i < 60; i++) { s.avanzar(5); v.push(ctl(s).transmisores['PI-301'].valor) }
      const m = v.reduce((a, x) => a + x, 0) / v.length
      return Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / v.length)
    }
    const d0 = dispersion(0)
    const d1 = dispersion(1)
    const d2 = dispersion(2)
    expect(d1).toBeGreaterThan(d0)
    expect(d2).toBeGreaterThan(d1)
    expect(() => sistema().enviarComando({ tipo: 'ruido', factor: 9 })).toThrow()
  })
})
