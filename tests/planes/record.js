// Jugador ideal del capítulo 11 (Récord): las respuestas de los capítulos
// anteriores a cada perturbación del guion.
export function planRecord({ carga = 19.5, corte = 350 } = {}) {
  let resultados = 0
  return (m, e, j) => {
    const c = (x) => j.enviarComando(x)
    if (m === 35 || m === 120) c({ tipo: 'laboratorio', analisis: 'humedad_astillas' })
    const rs = e.control.laboratorio.resultados.filter((x) => x.analisis === 'humedad_astillas')
    if (rs.length > resultados) {
      resultados = rs.length
      c({ tipo: 'bloque', id: 'FFC-117', accion: 'parametro', campo: 'humedad', valor: Number(rs.at(-1).valor.toFixed(1)) })
    }
    if (m === 75) c({ tipo: 'bloque', id: 'FFC-110', accion: 'parametro', campo: 'carga', valor: carga })
    if (m === 185 || m === 270) c({ tipo: 'laboratorio', analisis: 'licor_blanco_EA' })
    if (m === 362) c({ tipo: 'lazo', id: 'FIC-601', accion: 'modo', valor: 'AUTO' })
    if (m === 363) c({ tipo: 'lazo', id: 'FIC-601', accion: 'consigna', valor: e.control.lazos['FIC-601'].sp - corte })
    if (m === 490) c({ tipo: 'lazo', id: 'FIC-601', accion: 'modo', valor: 'CAS' })
    if (m === 580) c({ tipo: 'laboratorio', analisis: 'kappa' })
  }
}
