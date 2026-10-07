// Conversión de las unidades de configuración a las unidades internas.
//
// Unidades internas del simulador:
//   tiempo s · longitud m · volumen m³ · caudal m³/s · masa kg · caudal másico kg/s
//   temperatura °C (se convierte a K solo dentro de las expresiones de Arrhenius)
//   presión Pa absolutos (diferencias en Pa)
//   energía kJ · potencia kW · coeficientes kW/K · capacidad calorífica kJ/(kg·K)
//   concentraciones: mol/L para iones (OH⁻, HS⁻) y kg/m³ (= g/L) para sólidos
//   fracciones adimensionales (0–1)
//
// Cada unidad se describe con el factor que lleva el valor a la unidad interna
// (y un desplazamiento para temperaturas).

const UNIDADES = {
  // adimensionales
  '-': { f: 1 },
  '%': { f: 0.01 },
  'kg/kg': { f: 1 },
  // tiempo
  's': { f: 1 },
  'min': { f: 60 },
  'h': { f: 3600 },
  '1/s': { f: 1 },
  '1/h': { f: 1 / 3600 },
  '1/d': { f: 1 / 86400 },
  'rpm': { f: 1 / 60 }, // revoluciones por segundo
  // longitud, área, volumen
  'm': { f: 1 },
  'mm': { f: 1e-3 },
  'm2': { f: 1 },
  'm3': { f: 1 },
  // caudales
  'm3/s': { f: 1 },
  'm3/min': { f: 1 / 60 },
  'm3/h': { f: 1 / 3600 },
  'L/s': { f: 1e-3 },
  'kg': { f: 1 },
  't': { f: 1000 },
  'kg/s': { f: 1 },
  'kg/h': { f: 1 / 3600 },
  't/h': { f: 1000 / 3600 },
  't/d': { f: 1000 / 86400 },
  'ADt/d': { f: 1 }, // la producción se maneja internamente en ADt/d
  // relaciones
  'm3/t': { f: 1e-3 }, // m³ por tonelada seca → m³/kg
  // temperatura (interna en °C)
  '°C': { f: 1 },
  'K': { f: 1, d: -273.15 },
  // densidades y concentraciones
  'kg/m3': { f: 1 },
  'g/L': { f: 1 },
  'mol/L': { f: 1 },
  'g/L NaOH': { f: 1 / 40.0 }, // álcali como NaOH → mol/L
  'g/L Na2O': { f: 1 / 31.0 }, // álcali como Na₂O → mol/L (equivalentes)
  // energía y potencia
  'kJ': { f: 1 },
  'MJ': { f: 1000 },
  'GJ': { f: 1e6 },
  'kW': { f: 1 },
  'MW': { f: 1000 },
  'kW/K': { f: 1 },
  'W/K': { f: 1e-3 },
  'kJ/(kg·K)': { f: 1 },
  'kJ/mol': { f: 1 },
  // transporte
  'm2/s': { f: 1 },
  // presión (interna en Pa absolutos; las diferencias en Pa)
  'Pa': { f: 1 },
  'kPa': { f: 1e3 },
  'MPa': { f: 1e6 },
  'bar(a)': { f: 1e5 },
  'bar(g)': { f: 1e5, d: 101325 },
  'bar': { f: 1e5 }, // diferencia de presión
  '1/Pa': { f: 1 },
  'm3/h/bar^0.5': { f: 1 / 3600 }, // Kv: m³/h con 1 bar de caída → m³/s por bar^0,5
  // cinética y calidad
  'mol/kg': { f: 1 }, // mol por kg (de madera, lignina o carbohidrato)
  'mmol/kg': { f: 1e-3 },
  'L/g': { f: 1 }, // inverso de g/L (= m³/kg)
  'mL/g': { f: 1 }, // viscosidad intrínseca
  'A': { f: 1 }, // corriente eléctrica
}

/** Lista de unidades reconocidas (para el validador y la documentación). */
export const UNIDADES_CONOCIDAS = Object.keys(UNIDADES)

/** true si la unidad es conocida. */
export function unidadValida(unidad) {
  return Object.prototype.hasOwnProperty.call(UNIDADES, unidad)
}

/** Convierte un valor expresado en `unidad` a la unidad interna. */
export function aInterno(valor, unidad) {
  const u = UNIDADES[unidad]
  if (!u) throw new Error(`Unidad desconocida: "${unidad}"`)
  return valor * u.f + (u.d ?? 0)
}

/** Convierte un valor interno a la unidad indicada (para mostrar). */
export function desdeInterno(valor, unidad) {
  const u = UNIDADES[unidad]
  if (!u) throw new Error(`Unidad desconocida: "${unidad}"`)
  return (valor - (u.d ?? 0)) / u.f
}

/** Temperatura en kelvin a partir de °C. */
export function kelvin(tC) {
  return tC + 273.15
}

/** Constante de los gases, kJ/(mol·K). */
export const R_GAS = 8.314462618e-3
