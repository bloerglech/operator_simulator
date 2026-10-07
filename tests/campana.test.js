// Misiones de la Fase 6 (capítulos 4 en adelante), con jugadores simulados:
// la respuesta esperada aprueba y no hacer nada falla.
import { describe, it, expect } from 'vitest'
import { jugar } from './planes/jugar.js'
import { planParadaCorta } from './planes/paradaCorta.js'
import { planParadaGeneral } from './planes/paradaGeneral.js'

describe('capítulo 4: mallas', () => {
  const MALLAS = ['mallas_circ_sup', 'mallas_circ_inf']
  it('sin hacer nada la ΔP llega al enclavamiento y la misión falla', () => {
    const r = jugar('mallas', {}, 6)
    expect(r.resultado.exito).toBe(false)
    expect(r.fallida).toMatch(/ΔP/)
  })
  it('activar la conmutación al recibir la planta aprueba con oro (el retrolavado no hizo falta)', () => {
    const r = jugar('mallas', { 20: [...MALLAS.map((id) => ({ tipo: 'mallas', id, accion: 'conmutacion_on' })), { tipo: 'laboratorio', analisis: 'finos_astillas' }] }, 6)
    expect(r.resultado.exito).toBe(true)
    expect(r.resultado.medalla).toBe('oro')
  })
  it('retrolavar y activar la conmutación cuando sube la ΔP también aprueba', () => {
    let actuo = false
    const r = jugar('mallas', (m, e, j) => {
      const t = e.control.transmisores
      if (!actuo && (t['PDI-524'].valor > 0.75 || t['PDI-526'].valor > 0.75)) {
        actuo = true
        for (const id of MALLAS) { j.enviarComando({ tipo: 'mallas', id, accion: 'retrolavar' }); j.enviarComando({ tipo: 'mallas', id, accion: 'conmutacion_on' }) }
      }
    }, 6)
    expect(actuo).toBe(true)
    expect(r.resultado.exito).toBe(true)
  })
})

describe('capítulo 5: primera presurización', () => {
  it('sin reaccionar abre la válvula de alivio y la misión falla', () => {
    const r = jugar('presurizacion', {}, 3)
    expect(r.resultado.exito).toBe(false)
    expect(r.fallida).toMatch(/alivio/)
  })
  it('bajar el filtrado de lavado al fondo a tiempo y volverlo a cascada aprueba con oro', () => {
    const r = jugar('presurizacion', {
      13: [{ tipo: 'lazo', id: 'FIC-601', accion: 'modo', valor: 'AUTO' }],
      14: [{ tipo: 'lazo', id: 'FIC-601', accion: 'consigna', valor: 850 }],
      80: [{ tipo: 'lazo', id: 'FIC-601', accion: 'modo', valor: 'CAS' }],
    }, 3)
    expect(r.resultado.exito).toBe(true)
    expect(r.resultado.medalla).toBe('oro')
  })
})

describe('capítulo 6: columna colgada', () => {
  it('sin reaccionar el nivel llega al enclavamiento y la misión falla', () => {
    const r = jugar('columna_colgada', {}, 2)
    expect(r.resultado.exito).toBe(false)
  })
  it('bajar madera, soplado y lavado suelta la columna; volver de a poco aprueba con oro', () => {
    let salida0 = null
    let suelta = null
    const r = jugar('columna_colgada', (m, e, j) => {
      const c = (x) => j.enviarComando(x)
      const lz = e.control.lazos
      if (m === 0) salida0 = lz['LIC-302'].salida
      if (m === 12) {
        c({ tipo: 'lazo', id: 'WIC-101', accion: 'consigna', valor: 100 })
        c({ tipo: 'lazo', id: 'LIC-302', accion: 'modo', valor: 'MAN' })
        c({ tipo: 'lazo', id: 'FIC-601', accion: 'modo', valor: 'AUTO' })
      }
      if (m === 13) {
        c({ tipo: 'lazo', id: 'LIC-302', accion: 'salida', valor: lz['LIC-302'].salida * 0.6 })
        c({ tipo: 'lazo', id: 'FIC-601', accion: 'consigna', valor: 750 })
      }
      if (suelta === null && e.escenario.mision.objetivos.find((o) => o.id === 'soltar')?.estado === 'cumplido') suelta = m
      if (suelta === null) return
      const k = m - suelta
      if (k === 2) c({ tipo: 'lazo', id: 'LIC-302', accion: 'salida', valor: salida0 * 100 / 210 })
      if (k >= 35 && k <= 95 && k % 10 === 5) {
        const w = Math.min(210, 100 + (k - 25) / 10 * 20)
        c({ tipo: 'lazo', id: 'WIC-101', accion: 'consigna', valor: w })
        c({ tipo: 'lazo', id: 'FIC-601', accion: 'consigna', valor: Math.max(750, 1160 * w / 210) })
        c({ tipo: 'lazo', id: 'LIC-302', accion: 'salida', valor: salida0 * w / 210 })
      }
      if (k === 104) c({ tipo: 'lazo', id: 'LIC-302', accion: 'consigna', valor: Number(e.control.transmisores['LI-302'].valor.toFixed(1)) })
      if (k === 105) c({ tipo: 'lazo', id: 'LIC-302', accion: 'modo', valor: 'AUTO' })
      if (k > 105 && k % 10 === 0 && Math.abs(lz['LIC-302'].sp - 50) > 0.2) c({ tipo: 'lazo', id: 'LIC-302', accion: 'consigna', valor: lz['LIC-302'].sp + Math.sign(50 - lz['LIC-302'].sp) * 0.5 })
      if (k === 110) c({ tipo: 'lazo', id: 'FIC-601', accion: 'modo', valor: 'CAS' })
    }, 6)
    expect(suelta).not.toBe(null)
    expect(r.resultado.exito).toBe(true)
    expect(r.resultado.medalla).toBe('oro')
  })
})

describe('capítulo 7: parada corta', () => {
  it('sin parar, el estanque de soplado se llena y la misión falla', () => {
    const r = jugar('parada_corta', {}, 3)
    expect(r.resultado.exito).toBe(false)
    expect(r.fallida).toMatch(/estanque/)
  })
  it('parada ordenada en caliente y partida en escalones aprueba sin enclavamientos', () => {
    const r = jugar('parada_corta', planParadaCorta(), 8)
    expect(r.resultado.exito).toBe(true)
    expect(r.resultado.resumen.incidentes.enclavamiento).toBe(0)
    expect(r.resultado.resumen.incidentes.apertura_alivio).toBe(0)
  })
})

describe('capítulo 8: parada general', () => {
  it('en orden, enfriando antes de despresurizar, aprueba con oro', () => {
    const r = jugar('parada_general', planParadaGeneral(), 23)
    expect(r.resultado.exito).toBe(true)
    expect(r.resultado.medalla).toBe('oro')
  })
  it('despresurizar con el digestor caliente falla', () => {
    const r = jugar('parada_general', {
      5: [{ tipo: 'lazo', id: 'WIC-101', accion: 'consigna', valor: 0 }, { tipo: 'lazo', id: 'FIC-601', accion: 'modo', valor: 'AUTO' }],
      6: [{ tipo: 'lazo', id: 'FIC-601', accion: 'consigna', valor: 0 }, { tipo: 'lazo', id: 'PIC-301', accion: 'consigna', valor: 1 }],
      16: [{ tipo: 'venteo', id: 'dig', accion: 'abrir' }],
    }, 2)
    expect(r.resultado.exito).toBe(false)
    expect(r.fallida).toMatch(/110 °C/)
  })
})
