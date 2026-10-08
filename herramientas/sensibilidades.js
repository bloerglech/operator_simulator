// Tabla de sensibilidades del caso base: aplica cambios típicos de operación
// desde el estado estacionario y muestra el efecto después de 8 h.
//   npm run sensibilidades
// Los casos y el cálculo son los de herramientas/tablas-manual.js, que pone la
// misma tabla en el manual (sección 4.11).
import { cargarConfig } from './cargarConfig.js'
import { casoBase, sensibilidades, tablaSensibilidades } from './tablas-manual.js'

const config = cargarConfig()
console.log(tablaSensibilidades(sensibilidades(config, casoBase(config))))
