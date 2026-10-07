// Utilidades comunes de las pruebas.
import { cargarConfig } from '../herramientas/cargarConfig.js'
import { crearPlanta } from '../src/sim/planta.js'

/** Configuración nueva (copia independiente) desde config/. */
export function config() {
  return cargarConfig()
}

/** Planta del caso base. */
export function plantaBase(opciones = {}) {
  return crearPlanta(config(), opciones)
}

/** Recorre recursivamente un objeto y devuelve true si encuentra NaN o ±Infinity. */
export function tieneNoFinitos(x) {
  if (typeof x === 'number') return !Number.isFinite(x)
  if (Array.isArray(x)) return x.some(tieneNoFinitos)
  if (x && typeof x === 'object') return Object.values(x).some(tieneNoFinitos)
  return false
}

/** Máximo error relativo de todos los balances. */
export function peorBalance(b) {
  const errores = [b.licor.relativo, b.madera.relativo, ...Object.values(b.especies).map((e) => e.relativo)]
  return { masa: Math.max(...errores), energia: b.energia.relativo }
}
