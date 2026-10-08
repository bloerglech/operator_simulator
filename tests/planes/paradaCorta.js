// Jugador ideal de la parada corta (el aviso llega a los 10 min; el lavado vuelve a los 160: filtrado
// moderado y, dos minutos después, el primer escalón de madera y soplado).
export function planParadaCorta() {
  let base = null
  return (m, e, j) => {
    const c = (x) => j.enviarComando(x)
    const lz = e.control.lazos
    if (m === 0) base = { out: lz['LIC-302'].salida, t402: lz['TIC-402'].sp, t404: lz['TIC-404'].sp, w: lz['WIC-101'].sp }
    if (m === 13) {
      c({ tipo: 'lazo', id: 'WIC-101', accion: 'consigna', valor: 0 })
      c({ tipo: 'lazo', id: 'LIC-302', accion: 'modo', valor: 'MAN' })
      c({ tipo: 'lazo', id: 'FIC-115', accion: 'modo', valor: 'AUTO' })
      c({ tipo: 'lazo', id: 'TIC-402', accion: 'consigna', valor: base.t402 - 10 })
      c({ tipo: 'lazo', id: 'TIC-404', accion: 'consigna', valor: base.t404 - 10 })
    }
    if (m === 14) c({ tipo: 'lazo', id: 'LIC-302', accion: 'salida', valor: 0 })
    if (m === 160) c({ tipo: 'lazo', id: 'FIC-601', accion: 'modo', valor: 'AUTO' })
    if (m === 160) c({ tipo: 'lazo', id: 'FIC-601', accion: 'consigna', valor: 250 })
    if (m === 162) {
      c({ tipo: 'lazo', id: 'TIC-402', accion: 'consigna', valor: base.t402 })
      c({ tipo: 'lazo', id: 'TIC-404', accion: 'consigna', valor: base.t404 })
    }
    if (m >= 162 && m <= 222 && (m - 162) % 10 === 0) {
      const w = Math.min(base.w, 60 + (m - 162) / 10 * 25)
      c({ tipo: 'lazo', id: 'WIC-101', accion: 'consigna', valor: w })
      c({ tipo: 'lazo', id: 'LIC-302', accion: 'salida', valor: base.out * w / base.w })
      c({ tipo: 'lazo', id: 'FIC-601', accion: 'consigna', valor: Math.max(400, 1164 * w / base.w) })
    }
    if (m === 224) c({ tipo: 'lazo', id: 'FIC-115', accion: 'modo', valor: 'CAS' })
    if (m === 240) c({ tipo: 'lazo', id: 'LIC-302', accion: 'consigna', valor: Number(e.control.transmisores['LI-302'].valor.toFixed(1)) })
    if (m === 241) c({ tipo: 'lazo', id: 'LIC-302', accion: 'modo', valor: 'AUTO' })
    if (m === 250) c({ tipo: 'lazo', id: 'FIC-601', accion: 'modo', valor: 'CAS' })
    if (m > 241 && m % 10 === 0 && Math.abs(lz['LIC-302'].sp - 50) > 0.2) c({ tipo: 'lazo', id: 'LIC-302', accion: 'consigna', valor: lz['LIC-302'].sp + Math.sign(50 - lz['LIC-302'].sp) * 0.5 })
  }
}
