// Configuración del simulador para el navegador: los mismos config/*.json que
// usa Node (herramientas/cargarConfig.js), importados como módulos por Vite.

import simulacion from '../../config/simulacion.json'
import topologia from '../../config/topologia.json'
import equipos from '../../config/equipos.json'
import madera from '../../config/madera.json'
import licores from '../../config/licores.json'
import hidraulica from '../../config/hidraulica.json'
import energia from '../../config/energia.json'
import cinetica from '../../config/cinetica.json'
import casoBase from '../../config/caso_base.json'
import instrumentos from '../../config/instrumentos.json'
import lazos from '../../config/lazos.json'
import enclavamientos from '../../config/enclavamientos.json'
import alarmas from '../../config/alarmas.json'

/** Copia independiente de la configuración completa. */
export function configuracion() {
  return JSON.parse(JSON.stringify({
    simulacion, topologia, equipos, madera, licores, hidraulica, energia, cinetica,
    caso_base: casoBase, instrumentos, lazos, enclavamientos, alarmas,
  }))
}
