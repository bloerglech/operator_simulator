// Lectura y validación de parámetros de configuración.
//
// Todo parámetro de proceso se escribe en config/*.json como
//   { "valor": 18, "unidad": "%", "origen": "especificacion", "nota": "…" }
// Los datos estructurales (identificadores, nombres, número de celdas) pueden
// ser valores simples.

import { aInterno, unidadValida } from './unidades.js'

/**
 * Orígenes válidos de un parámetro:
 *  - literatura:     tomado de una fuente publicada (indicar `fuente`)
 *  - calibrado:      ajustado por la rutina de calibración
 *  - supuesto:       valor provisional a confirmar
 *  - especificacion: dado en docs/ESPECIFICACION.md (caso base)
 *  - planta:         dato real de la planta
 */
export const ORIGENES = ['literatura', 'calibrado', 'supuesto', 'especificacion', 'planta']

/** true si el objeto tiene forma de parámetro. */
export function esParametro(o) {
  return o !== null && typeof o === 'object' && !Array.isArray(o) && 'valor' in o
}

/**
 * Lee un parámetro y lo devuelve en unidades internas.
 * `ruta` es solo para el mensaje de error.
 */
export function p(objeto, clave, ruta = clave) {
  const par = objeto?.[clave]
  if (par === undefined) throw new Error(`Falta el parámetro de configuración "${ruta}"`)
  if (!esParametro(par)) throw new Error(`"${ruta}" debe tener la forma {valor, unidad, origen}`)
  return aInterno(par.valor, par.unidad)
}

/** Igual que p() pero devuelve `defecto` si el parámetro no existe. */
export function pOpcional(objeto, clave, defecto) {
  if (objeto?.[clave] === undefined) return defecto
  return p(objeto, clave)
}

// Archivos de configuración del sistema de control: usan un formato compacto
// (sin "valor/unidad/origen" por número; todos supuestos, declarado en su
// "_descripcion") y los valida src/control al construir el control.
export const ARCHIVOS_FORMATO_COMPACTO = ['instrumentos', 'lazos', 'enclavamientos', 'alarmas']

/**
 * Recorre toda la configuración y devuelve la lista de errores encontrados en
 * los parámetros (unidad desconocida, origen inválido, valor no numérico).
 */
export function validarParametros(config, ruta = 'config') {
  const errores = []
  const visitar = (nodo, r) => {
    if (Array.isArray(nodo)) {
      nodo.forEach((x, i) => visitar(x, `${r}[${i}]`))
      return
    }
    if (nodo === null || typeof nodo !== 'object') return
    if (esParametro(nodo)) {
      if (typeof nodo.valor !== 'number' || !Number.isFinite(nodo.valor)) {
        errores.push(`${r}: el valor debe ser un número finito`)
      }
      if (!unidadValida(nodo.unidad)) errores.push(`${r}: unidad desconocida "${nodo.unidad}"`)
      if (!ORIGENES.includes(nodo.origen)) {
        errores.push(`${r}: origen "${nodo.origen}" no es uno de ${ORIGENES.join(', ')}`)
      }
      return
    }
    for (const [k, v] of Object.entries(nodo)) visitar(v, `${r}.${k}`)
  }
  if (ruta === 'config') {
    for (const [k, v] of Object.entries(config)) if (!ARCHIVOS_FORMATO_COMPACTO.includes(k)) visitar(v, `${ruta}.${k}`)
  } else visitar(config, ruta)
  return errores
}
