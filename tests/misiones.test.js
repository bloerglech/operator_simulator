// Misiones (Fase 5): cada misión se juega con un jugador simulado. La
// respuesta esperada debe aprobar y no hacer nada debe fallar (la misión
// enseña algo). También el tutorial completo con acciones de la interfaz.
import { describe, it, expect } from 'vitest'
import { config } from './ayuda.js'
import { prepararJuego } from '../src/escenarios/preparar.js'
import { MISIONES } from '../src/misiones/campana.js'
import { revisar } from '../src/misiones/condiciones.js'

const MIN = 60

/** Juega una misión: plan = { minuto: [comandos] } o función (min, estado, juego). */
function jugar(id, plan = {}, maxHoras = 9) {
  const j = prepararJuego(config(), { semilla: 5, mision: id })
  for (let m = 0; m < maxHoras * 60; m++) {
    const e = j.leerEstado()
    if (e.escenario.mision?.terminada) return e.escenario.mision
    if (typeof plan === 'function') plan(m, e, j)
    else for (const c of plan[m] ?? []) j.enviarComando(c)
    j.avanzar(MIN)
  }
  return j.leerEstado().escenario.mision
}

describe('definiciones de las misiones', () => {
  it('condiciones bien formadas, objetivos y pasos con identificador único, eventos existentes', () => {
    const eventos = new Set(config().eventos.eventos.map((e) => e.id))
    for (const def of Object.values(MISIONES)) {
      const ids = def.objetivos.map((o) => o.id)
      expect(new Set(ids).size, def.id).toBe(ids.length)
      for (const o of def.objetivos) {
        revisar(o.condicion, `${def.id}.${o.id}`)
        if (o.desde) revisar(o.desde, `${def.id}.${o.id}.desde`)
      }
      for (const p of def.guion) {
        revisar(p.cuando, `${def.id}.guion.${p.id}`)
        for (const a of p.acciones) if (a.evento) expect(eventos.has(a.evento), `${def.id}: evento ${a.evento}`).toBe(true)
      }
      for (const f of def.fallas ?? []) revisar(f.condicion, `${def.id}.falla`)
      for (const c of def.evaluacion ?? []) revisar(c.condicion, `${def.id}.evaluacion`)
      if (def.fin) revisar(def.fin, `${def.id}.fin`)
      // Los pasos y objetivos nombrados en las condiciones existen.
      const pasos = new Set(def.guion.map((p) => p.id))
      const nombres = (c) => (c && typeof c === 'object' ? [
        ...(c.paso ? [['paso', c.paso]] : []), ...(c.desde && c.incidente ? [['paso', c.desde]] : []), ...(c.objetivo ? [['objetivo', c.objetivo]] : []),
        ...[...(c.y ?? []), ...(c.o ?? []), ...(c.no ? [c.no] : [])].flatMap(nombres)] : [])
      const todas = [...def.objetivos.flatMap((o) => [o.condicion, o.desde]), ...def.guion.map((p) => p.cuando), ...(def.fallas ?? []).map((f) => f.condicion), ...(def.evaluacion ?? []).map((c) => c.condicion), def.fin]
      for (const [tipo, id] of todas.flatMap(nombres)) {
        if (tipo === 'paso') expect(pasos.has(id), `${def.id}: paso desconocido ${id}`).toBe(true)
        else expect(ids.includes(id), `${def.id}: objetivo desconocido ${id}`).toBe(true)
      }
      expect(config().campana.orden).toContain(def.id)
    }
  })
})

describe('tutorial', () => {
  it('se completa siguiendo los pasos con la interfaz', () => {
    const acciones = [
      { tipo: 'jugador', evento: 'dcs' },
      { tipo: 'jugador', evento: 'pantalla', valor: 'digestor' },
      { tipo: 'jugador', evento: 'caratula', valor: 'TIC-402' },
      { tipo: 'lazo', id: 'TIC-402', accion: 'consigna', valor: 157 },
      { tipo: 'lazo', id: 'FIC-405', accion: 'modo', valor: 'MAN' },
      { tipo: 'lazo', id: 'FIC-405', accion: 'modo', valor: 'AUTO' },
    ]
    const r = jugar('tutorial', (m, e, j) => {
      if (m < acciones.length) j.enviarComando(acciones[m])
      if (m === 8) j.enviarComando({ tipo: 'alarma', id: '*', accion: 'reconocer' })
      if (m === 10) j.enviarComando({ tipo: 'jugador', evento: 'tendencia', valor: 'TI-402' })
      if (m === 11) j.enviarComando({ tipo: 'laboratorio', analisis: 'kappa' })
      if (m === 12) j.enviarComando({ tipo: 'jugador', evento: 'radio' })
    }, 2)
    expect(r.terminada).toBe(true)
    expect(r.resultado.exito).toBe(true)
    expect(Object.values(r.objetivos).every((o) => o.estado === 'cumplido')).toBe(true)
  })
})

describe('objetivos con comandos', () => {
  it('un comando enviado antes de que aparezca el objetivo no lo cumple (tutorial: reconocer)', () => {
    const j = prepararJuego(config(), { semilla: 5, mision: 'tutorial' })
    j.enviarComando({ tipo: 'alarma', id: '*', accion: 'reconocer' })
    const acciones = [
      { tipo: 'jugador', evento: 'dcs' },
      { tipo: 'jugador', evento: 'pantalla', valor: 'digestor' },
      { tipo: 'jugador', evento: 'caratula', valor: 'TIC-402' },
      { tipo: 'lazo', id: 'TIC-402', accion: 'consigna', valor: 157 },
      { tipo: 'lazo', id: 'FIC-405', accion: 'modo', valor: 'MAN' },
      { tipo: 'lazo', id: 'FIC-405', accion: 'modo', valor: 'AUTO' },
    ]
    for (let m = 0; m < 15; m++) {
      if (m < acciones.length) j.enviarComando(acciones[m])
      j.avanzar(MIN)
    }
    const mi = j.leerEstado().escenario.mision
    expect(mi.objetivos.find((o) => o.id === 'auto').estado).toBe('cumplido')
    expect(mi.objetivos.find((o) => o.id === 'alarma').estado).toBe('pendiente')
  })
})

describe('capítulo 1: turno de noche', () => {
  it('sin hacer nada el kappa sale de banda y la misión falla', () => {
    const r = jugar('turno_noche')
    expect(r.resultado.exito).toBe(false)
  })
  it('humedad al laboratorio, FFC-117 y carga de álcali a tiempo aprueban', () => {
    let pedidos = 0
    const r = jugar('turno_noche', (m, e, j) => {
      if (m === 50 || m === 140) j.enviarComando({ tipo: 'laboratorio', analisis: 'humedad_astillas' })
      const rs = e.control.laboratorio.resultados.filter((x) => x.analisis === 'humedad_astillas')
      if (rs.length > pedidos) {
        pedidos = rs.length
        j.enviarComando({ tipo: 'bloque', id: 'FFC-117', accion: 'parametro', campo: 'humedad', valor: Number(rs.at(-1).valor.toFixed(1)) })
      }
      if (m === 70) j.enviarComando({ tipo: 'bloque', id: 'FFC-110', accion: 'parametro', campo: 'carga', valor: 19.5 })
    })
    expect(r.resultado.exito).toBe(true)
    expect(r.resultado.medalla).not.toBe(null)
  })
})

describe('capítulo 2: piden más toneladas', () => {
  it('sin subir el ritmo la misión falla', () => {
    expect(jugar('mas_toneladas').resultado.exito).toBe(false)
  })
  it('subir con RC-700 compensando el factor H aprueba', () => {
    const r = jugar('mas_toneladas', {
      5: [
        { tipo: 'bloque', id: 'RC-700', accion: 'parametro', campo: 'produccion', valor: 3000 },
        { tipo: 'bloque', id: 'HIC-703', accion: 'parametro', campo: 'objetivo', valor: 461 },
        { tipo: 'bloque', id: 'HIC-703', accion: 'activar' },
      ],
    })
    expect(r.resultado.exito).toBe(true)
  })
})

describe('capítulo 3: licor débil', () => {
  it('sin reaccionar el kappa se dispara y la misión falla', () => {
    expect(jugar('licor_debil').resultado.exito).toBe(false)
  })
  it('EA al laboratorio y bajar el ritmo durante la falta aprueban', () => {
    const r = jugar('licor_debil', {
      130: [{ tipo: 'laboratorio', analisis: 'licor_blanco_EA' }],
      185: [
        { tipo: 'bloque', id: 'RC-700', accion: 'parametro', campo: 'produccion', valor: 2550 },
        { tipo: 'bloque', id: 'RC-700', accion: 'parametro', campo: 'rampa', valor: 600 },
        { tipo: 'bloque', id: 'RC-700', accion: 'activar' },
      ],
      320: [{ tipo: 'bloque', id: 'RC-700', accion: 'parametro', campo: 'produccion', valor: 3000 }],
    })
    expect(r.resultado.exito).toBe(true)
  })
})

describe('búsqueda de misiones', () => {
  it('solo encuentra misiones propias, no nombres heredados de Object', async () => {
    const { buscarMision } = await import('../src/misiones/campana.js')
    expect(buscarMision('tutorial')?.id).toBe('tutorial')
    expect(buscarMision('constructor')).toBe(null)
    expect(buscarMision('toString')).toBe(null)
  })
})
