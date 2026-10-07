// Tubería con transporte pistón exacto (cola de paquetes).
//
// Lo que entra por un extremo sale por el otro después de que pasa el volumen
// retenido de la tubería: tiempo de transporte τ = V / Q. Se usa para la
// línea de transferencia, los retornos de las circulaciones y la línea de
// soplado. El contenido de la tubería forma parte del inventario de la planta.

import { paqueteVacio, partirPaquete, sumarPaquete, volumenPaquete } from './materia.js'

/** Crea una tubería llena con `volumen` m³ del licor indicado. */
export function crearTubo(volumen, licor) {
  return {
    paquetes: [{ licor: { v: volumen, T: licor.T, c: licor.c.slice() }, parcelas: [] }],
  }
}

/** Volumen actual contenido en la tubería. */
export function volumenTubo(tubo) {
  return tubo.paquetes.reduce((s, q) => s + volumenPaquete(q), 0)
}

/** Ingresa un paquete por la entrada de la tubería. */
export function empujar(tubo, paq) {
  if (volumenPaquete(paq) <= 0) return
  tubo.paquetes.push(paq)
}

/**
 * Retira `volumen` m³ por la salida (o lo que haya, si es menos).
 * Devuelve un único paquete con todo lo retirado.
 */
export function extraer(tubo, volumen, nEsp) {
  const salida = paqueteVacio(nEsp)
  let resto = volumen
  while (resto > 1e-12 && tubo.paquetes.length > 0) {
    const q = tubo.paquetes[0]
    const vq = volumenPaquete(q)
    if (vq <= resto * (1 + 1e-12)) {
      sumarPaquete(salida, q)
      tubo.paquetes.shift()
      resto -= vq
    } else {
      sumarPaquete(salida, partirPaquete(q, resto / vq))
      resto = 0
    }
  }
  return salida
}
