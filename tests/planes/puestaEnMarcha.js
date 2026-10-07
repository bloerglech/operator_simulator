// Jugador ideal de la puesta en marcha (capítulo 9) desde el digestor lleno,
// frío y venteado: presurizar, calentar en rampa, partir con RC-700.
const NOMINAL = { 'TIC-402': 156, 'TIC-404': 155, 'TIC-212': 140, salidaSoplado: 53, W: 210 }

export function planPuestaEnMarcha({ rampaC = 15 } = {}) {
  let fase = 'presurizar'
  let t = 0
  return (m, e, j) => {
    const c = (x) => j.enviarComando(x)
    const tx = e.control.transmisores
    const lz = e.control.lazos
    if (m === 1) {
      c({ tipo: 'venteo', id: 'dig', accion: 'cerrar' })
      c({ tipo: 'venteo', id: 'imp', accion: 'cerrar' })
      c({ tipo: 'lazo', id: 'PIC-301', accion: 'consigna', valor: 5.5 })
      c({ tipo: 'lazo', id: 'PIC-201', accion: 'consigna', valor: 6.1 })
      c({ tipo: 'lazo', id: 'FIC-601', accion: 'consigna', valor: 300 })
    }
    if (fase === 'presurizar' && m > 1 && tx['PI-301'].valor >= 5) {
      fase = 'calentar'
      t = m
      for (const k of ['TIC-402', 'TIC-404', 'TIC-212']) c({ tipo: 'lazo', id: k, accion: 'consigna', valor: Math.round(tx['TI-' + k.slice(4)].valor) })
    }
    if (fase === 'calentar' && m === t + 1) for (const k of ['TIC-402', 'TIC-404', 'TIC-212']) c({ tipo: 'lazo', id: k, accion: 'modo', valor: 'AUTO' })
    if (fase === 'calentar' && m > t + 1 && (m - t) % 30 === 0) {
      for (const k of ['TIC-402', 'TIC-404', 'TIC-212']) c({ tipo: 'lazo', id: k, accion: 'consigna', valor: Math.min(NOMINAL[k], lz[k].sp + rampaC) })
    }
    if (fase === 'calentar' && ['TIC-402', 'TIC-404', 'TIC-212'].every((k) => lz[k].sp >= NOMINAL[k] - 0.1) && tx['TI-304'].valor > NOMINAL['TIC-402'] - 8) {
      fase = 'partir'
      t = m
      c({ tipo: 'lazo', id: 'LIC-202', accion: 'modo', valor: 'AUTO' })
      c({ tipo: 'lazo', id: 'FIC-115', accion: 'modo', valor: 'CAS' })
      c({ tipo: 'lazo', id: 'WIC-101', accion: 'consigna', valor: 40 })
      c({ tipo: 'lazo', id: 'LIC-302', accion: 'salida', valor: NOMINAL.salidaSoplado * 40 / NOMINAL.W })
    }
    if (fase === 'partir' && m === t + 1) {
      c({ tipo: 'bloque', id: 'RC-700', accion: 'parametro', campo: 'produccion', valor: 2900 })
      c({ tipo: 'bloque', id: 'RC-700', accion: 'parametro', campo: 'rampa', valor: 600 })
      c({ tipo: 'bloque', id: 'RC-700', accion: 'activar' })
    }
    // Soplado manual en proporción a la madera hasta el ritmo completo.
    if (fase === 'partir' && m > t && (m - t) % 5 === 0) {
      const w = lz['WIC-101'].sp
      if (w < NOMINAL.W - 5) c({ tipo: 'lazo', id: 'LIC-302', accion: 'salida', valor: NOMINAL.salidaSoplado * w / NOMINAL.W })
      else {
        fase = 'normal'
        t = m
        c({ tipo: 'lazo', id: 'LIC-302', accion: 'consigna', valor: Number(tx['LI-302'].valor.toFixed(1)) })
      }
    }
    if (fase === 'normal' && m === t + 1) {
      for (const k of ['LIC-302', 'TIC-604']) c({ tipo: 'lazo', id: k, accion: 'modo', valor: 'AUTO' })
      c({ tipo: 'lazo', id: 'FIC-601', accion: 'modo', valor: 'CAS' })
    }
    if (fase === 'normal' && m > t + 1 && m % 10 === 0 && Math.abs(lz['LIC-302'].sp - 50) > 0.2) c({ tipo: 'lazo', id: 'LIC-302', accion: 'consigna', valor: lz['LIC-302'].sp + Math.sign(50 - lz['LIC-302'].sp) * 0.5 })
  }
}
