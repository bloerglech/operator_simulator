// Jugador ideal de la puesta en marcha (capítulo 9) desde el digestor lleno,
// frío y venteado: presurizar, calentar en rampa y partir en escalones.
const NOMINAL = { 'TIC-402': 156, 'TIC-404': 155, 'TIC-212': 140, salidaSoplado: 53, W: 210, lavado: 1164 }

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
      c({ tipo: 'lazo', id: 'FIC-115', accion: 'consigna', valor: 400 }) // llenar el impregnador
    }
    if (m > 1 && tx['PI-201'].valor >= 5 && lz['FIC-115'].modo === 'AUTO' && lz['FIC-115'].sp > 300) c({ tipo: 'lazo', id: 'FIC-115', accion: 'consigna', valor: 260 })
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
      c({ tipo: 'lazo', id: 'LIC-202', accion: 'consigna', valor: 21 })
    }
    if (fase === 'partir' && m === t + 1) c({ tipo: 'lazo', id: 'LIC-202', accion: 'modo', valor: 'AUTO' })
    // Madera, soplado y lavado juntos, en escalones de 25 t/h cada 15 min.
    if (fase === 'partir' && (m - t) % 15 === 0 && m - t <= 90) {
      const w = Math.min(NOMINAL.W, 60 + (m - t) / 15 * 25)
      c({ tipo: 'lazo', id: 'WIC-101', accion: 'consigna', valor: w })
      c({ tipo: 'lazo', id: 'LIC-302', accion: 'salida', valor: NOMINAL.salidaSoplado * w / NOMINAL.W })
      c({ tipo: 'lazo', id: 'FIC-601', accion: 'consigna', valor: Math.max(300, NOMINAL.lavado * w / NOMINAL.W) })
    }
    if (fase === 'partir' && m === t + 100) c({ tipo: 'lazo', id: 'LIC-302', accion: 'consigna', valor: Number(tx['LI-302'].valor.toFixed(1)) })
    if (fase === 'partir' && m === t + 101) for (const k of ['LIC-302', 'TIC-604']) c({ tipo: 'lazo', id: k, accion: 'modo', valor: 'AUTO' })
    if (fase === 'partir' && m === t + 110) c({ tipo: 'lazo', id: 'FIC-601', accion: 'modo', valor: 'CAS' })
    if (fase === 'partir' && m === t + 120) c({ tipo: 'lazo', id: 'FIC-115', accion: 'modo', valor: 'CAS' })
    if (fase === 'partir' && m > t + 101 && m % 10 === 0 && Math.abs(lz['LIC-302'].sp - 50) > 0.2) c({ tipo: 'lazo', id: 'LIC-302', accion: 'consigna', valor: lz['LIC-302'].sp + Math.sign(50 - lz['LIC-302'].sp) * 0.5 })
    if (fase === 'partir' && m > t + 101 && m % 10 === 5 && Math.abs(lz['LIC-202'].sp - 22.1) > 0.05) c({ tipo: 'lazo', id: 'LIC-202', accion: 'consigna', valor: lz['LIC-202'].sp + Math.sign(22.1 - lz['LIC-202'].sp) * 0.2 })
  }
}
