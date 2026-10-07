// Jugador ideal del capítulo 10 (Apagón): asegurar el digestor durante el
// corte y, con la energía de vuelta, partir en orden. El apagón llega a los
// 20 min y dura 30.
const BOMBAS = ['bomba_filtrado', 'bomba_lavado', 'bomba_circ_sup', 'bomba_circ_inf', 'bomba_transferencia',
  'bomba_extraccion_superior', 'bomba_extraccion_final', 'bomba_licor_imp', 'bomba_licor_blanco', 'bombas_astillas']

export function planApagon({ tApagon = 20, tVuelta = 50 } = {}) {
  let base = null
  let tPartida = null
  return (m, e, j) => {
    const c = (x) => { try { j.enviarComando(x) } catch { /* p. ej. un rearme con la condición presente: se reintenta */ } }
    const lz = e.control.lazos
    const tx = e.control.transmisores
    if (m === 0) base = { out: lz['LIC-302'].salida, w: lz['WIC-101'].sp, lav: lz['FIC-601'].pv, transf: lz['LIC-202'].salida }
    if (m === tApagon + 1) {
      for (const id of ['LIC-302', 'LIC-202']) c({ tipo: 'lazo', id, accion: 'modo', valor: 'MAN' })
      c({ tipo: 'lazo', id: 'WIC-101', accion: 'consigna', valor: 0 })
      c({ tipo: 'lazo', id: 'FIC-115', accion: 'modo', valor: 'AUTO' })
      c({ tipo: 'lazo', id: 'FIC-601', accion: 'modo', valor: 'AUTO' })
      c({ tipo: 'lazo', id: 'FIC-503', accion: 'modo', valor: 'AUTO' })
    }
    if (m === tApagon + 2) {
      for (const id of ['LIC-302', 'LIC-202']) c({ tipo: 'lazo', id, accion: 'salida', valor: 0 })
      c({ tipo: 'lazo', id: 'FIC-503', accion: 'consigna', valor: 0 })
    }
    // Energía de vuelta: bombas en orden, una por minuto; primero el filtrado
    // (llena y presuriza: la extracción final queda en 0), luego circulaciones
    // y transferencia, al final licores y extracciones.
    const k = m - (tVuelta + 1)
    if (k >= 0 && k < BOMBAS.length) c({ tipo: 'bomba', id: BOMBAS[k], accion: 'partir' })
    if (k === 0) c({ tipo: 'lazo', id: 'FIC-601', accion: 'consigna', valor: 400 })
    if (k === 4) c({ tipo: 'lazo', id: 'LIC-202', accion: 'salida', valor: base.transf * 0.3 })
    if (k >= BOMBAS.length && k < BOMBAS.length + 15) {
      for (const id of ['I-03', 'I-04', 'I-05']) if (e.control.enclavamientos[id].disparado) c({ tipo: 'enclavamiento', id, accion: 'rearmar' })
      for (const [tic, enc] of [['TIC-402', 'I-03'], ['TIC-404', 'I-04'], ['TIC-212', 'I-05']]) {
        if (lz[tic].modo !== 'AUTO' && !e.control.enclavamientos[enc].disparado) c({ tipo: 'lazo', id: tic, accion: 'modo', valor: 'AUTO' })
      }
    }
    // Presurizado: la extracción final vuelve a seguir al lavado.
    if (k > 0 && tx['PI-301'].valor >= 4 && lz['FIC-503'].modo === 'AUTO') c({ tipo: 'lazo', id: 'FIC-503', accion: 'modo', valor: 'CAS' })
    // Partida en escalones cuando la presión y la temperatura volvieron.
    if (tPartida === null && k > BOMBAS.length + 15 && lz['FIC-503'].modo === 'CAS' && tx['TI-304'].valor > 145) {
      tPartida = m
      c({ tipo: 'lazo', id: 'LIC-202', accion: 'modo', valor: 'AUTO' })
    }
    if (tPartida !== null) {
      const p = m - tPartida
      if (p <= 60 && p % 10 === 0) {
        const w = Math.min(base.w, 60 + p / 10 * 25)
        c({ tipo: 'lazo', id: 'WIC-101', accion: 'consigna', valor: w })
        c({ tipo: 'lazo', id: 'LIC-302', accion: 'salida', valor: base.out * w / base.w })
        c({ tipo: 'lazo', id: 'FIC-601', accion: 'consigna', valor: Math.max(400, base.lav * w / base.w) })
      }
      if (p === 62) c({ tipo: 'lazo', id: 'FIC-115', accion: 'modo', valor: 'CAS' })
      if (p === 78) c({ tipo: 'lazo', id: 'LIC-302', accion: 'consigna', valor: Number(tx['LI-302'].valor.toFixed(1)) })
      if (p === 79) c({ tipo: 'lazo', id: 'LIC-302', accion: 'modo', valor: 'AUTO' })
      if (p === 88) c({ tipo: 'lazo', id: 'FIC-601', accion: 'modo', valor: 'CAS' })
      if (p > 79 && p % 10 === 0 && Math.abs(lz['LIC-302'].sp - 50) > 0.2) c({ tipo: 'lazo', id: 'LIC-302', accion: 'consigna', valor: lz['LIC-302'].sp + Math.sign(50 - lz['LIC-302'].sp) * 0.5 })
    }
  }
}
