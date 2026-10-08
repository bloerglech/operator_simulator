// Jugador ideal de la parada general (capítulo 8), con el orden del procedimiento.
export function planParadaGeneral() {
  let fase = 'ritmo'
  let t = 0
  return (m, e, j) => {
    const c = (x) => j.enviarComando(x)
    const tx = e.control.transmisores
    const objetivo = (id) => e.escenario.mision.objetivos.find((o) => o.id === id)?.estado === 'cumplido'
    if (m === 2) {
      c({ tipo: 'bloque', id: 'RC-700', accion: 'parametro', campo: 'produccion', valor: 1750 })
      c({ tipo: 'bloque', id: 'RC-700', accion: 'parametro', campo: 'rampa', valor: 600 })
      c({ tipo: 'bloque', id: 'RC-700', accion: 'activar' })
    }
    if (fase === 'ritmo' && m >= 92) {
      fase = 'astillas'
      t = m
      c({ tipo: 'bloque', id: 'RC-700', accion: 'desactivar' })
      c({ tipo: 'lazo', id: 'WIC-101', accion: 'consigna', valor: 0 })
      c({ tipo: 'lazo', id: 'FIC-115', accion: 'modo', valor: 'AUTO' })
      for (const id of ['LIC-202', 'LIC-302', 'TIC-402', 'TIC-404', 'TIC-212']) c({ tipo: 'lazo', id, accion: 'modo', valor: 'MAN' })
      c({ tipo: 'lazo', id: 'FIC-601', accion: 'modo', valor: 'AUTO' })
      c({ tipo: 'lazo', id: 'FIC-503', accion: 'modo', valor: 'AUTO' })
    }
    if (fase === 'astillas' && m === t + 1) {
      fase = 'enfriar'
      for (const id of ['LIC-202', 'LIC-302', 'TIC-402', 'TIC-404', 'TIC-212']) c({ tipo: 'lazo', id, accion: 'salida', valor: 0 })
      c({ tipo: 'lazo', id: 'FIC-601', accion: 'consigna', valor: 600 })
      c({ tipo: 'lazo', id: 'FIC-503', accion: 'consigna', valor: 400 })
    }
    if (fase === 'enfriar' && objetivo('vapor') && ['TI-303', 'TI-304', 'TI-305'].every((k) => tx[k].valor < 98)) {
      fase = 'despresurizar'
      t = m
      c({ tipo: 'lazo', id: 'FIC-601', accion: 'consigna', valor: 0 })
      c({ tipo: 'lazo', id: 'FIC-503', accion: 'consigna', valor: 0 })
      c({ tipo: 'lazo', id: 'PIC-301', accion: 'consigna', valor: 1 })
      c({ tipo: 'lazo', id: 'PIC-201', accion: 'consigna', valor: 1.5 })
    }
    if (fase === 'despresurizar' && m === t + 10) {
      c({ tipo: 'venteo', id: 'dig', accion: 'abrir' })
      c({ tipo: 'venteo', id: 'imp', accion: 'abrir' })
    }
  }
}
