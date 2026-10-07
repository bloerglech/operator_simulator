// Intercambio entre el licor libre de una celda y las porciones de astilla que
// hay en ella (difusión de especies o transferencia de calor).
//
// Modelo de fuerza impulsora lineal: d x_p/dt = k_p (x_f − x_p). Se integra
// implícitamente con el licor libre y todas las porciones acopladas ("estrella"),
// lo que da una solución cerrada, estable con cualquier paso y que conserva
// exactamente la cantidad total Σ C·x.

/**
 * @param Cf  capacidad del licor libre (volumen para especies, kJ/K para calor)
 * @param xf  valor en el licor libre
 * @param porciones [{ C, x, a }]  capacidad, valor y a = k·dt de cada porción
 * @returns { xf, x: [valores nuevos de las porciones] }
 */
export function intercambioEstrella(Cf, xf, porciones) {
  let num = Cf * xf
  let den = Cf
  for (const q of porciones) {
    const w = (q.C * q.a) / (1 + q.a)
    num += w * q.x
    den += w
  }
  const xfN = den > 0 ? num / den : xf
  return { xf: xfN, x: porciones.map((q) => (q.x + q.a * xfN) / (1 + q.a)) }
}
