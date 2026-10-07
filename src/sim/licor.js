// Química de licores: especies disueltas, licor blanco y conversiones.
//
// En solución, Na₂S + H₂O → NaOH + NaHS, por lo que (en mol/L):
//   [OH⁻] = NaOH + Na₂S      [HS⁻] = Na₂S
//   Álcali efectivo EA (como NaOH, mol/L)  = [OH⁻]
//   Álcali activo  AA (como NaOH, mol/L)  = [OH⁻] + [HS⁻]
//   Sulfidez S = Na₂S/AA (como NaOH) = 2[HS⁻] / ([OH⁻] + [HS⁻])

import { p, pOpcional } from './parametros.js'

const PM_NA2CO3 = 105.99 // g/mol

/** Especies que el código necesita encontrar por nombre. */
export const ESPECIES_REQUERIDAS = ['OH', 'HS', 'LD', 'XD', 'CD', 'OD', 'SI', 'TR']

/** Índices de las especies por identificador, a partir de la lista de configuración. */
export function indicesEspecies(especies) {
  const idx = {}
  especies.forEach((e, i) => { idx[e.id] = i })
  for (const id of ESPECIES_REQUERIDAS) {
    if (idx[id] === undefined) throw new Error(`Falta la especie de licor "${id}" en config/licores.json`)
  }
  return idx
}

/** [HS⁻] a partir de [OH⁻] (= EA) y la sulfidez (fracción). */
export function hsDesdeSulfidez(oh, sulfidez) {
  return (oh * sulfidez) / (2 - sulfidez)
}

/** Sulfidez (fracción) a partir de [OH⁻] y [HS⁻]. */
export function sulfidez(oh, hs) {
  const aa = oh + hs
  return aa > 0 ? (2 * hs) / aa : 0
}

/**
 * Composición del licor blanco: [OH⁻], [HS⁻] y sólidos inorgánicos inertes
 * (Na₂CO₃ según la eficiencia de caustificación, más otros inertes).
 * CE = NaOH / (NaOH + Na₂CO₃), ambos en equivalentes de sodio.
 */
export function licorBlanco({ ea, sulfidez: s, caustificacion, otrosInertes = 0 }) {
  const oh = ea
  const hs = hsDesdeSulfidez(oh, s)
  const naoh = oh - hs
  const na2co3 = (naoh * (1 / caustificacion - 1)) / 2 // mol/L
  return { OH: oh, HS: hs, SI: na2co3 * PM_NA2CO3 + otrosInertes }
}

/**
 * Vector de concentraciones de una fuente de licor según config/licores.json.
 * Tipo "licor_blanco": se calcula desde EA, sulfidez y caustificación.
 * Otros tipos: cada especie se lee de `composicion` (0 si no está).
 */
export function composicionFuente(cfg, especies, ruta = 'fuente') {
  const c = new Array(especies.length).fill(0)
  if (cfg.tipo === 'licor_blanco') {
    const lb = licorBlanco({
      ea: p(cfg, 'EA', `${ruta}.EA`),
      sulfidez: p(cfg, 'sulfidez', `${ruta}.sulfidez`),
      caustificacion: p(cfg, 'caustificacion', `${ruta}.caustificacion`),
      otrosInertes: pOpcional(cfg, 'otros_inertes', 0),
    })
    especies.forEach((e, i) => { if (lb[e.id] !== undefined) c[i] = lb[e.id] })
  }
  const comp = cfg.composicion ?? {}
  especies.forEach((e, i) => {
    if (comp[e.id] !== undefined) c[i] = p(comp, e.id, `${ruta}.composicion.${e.id}`)
  })
  return c
}
