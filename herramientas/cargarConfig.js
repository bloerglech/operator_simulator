// Carga la configuración desde config/*.json (solo Node: herramientas y pruebas).
// En el navegador la configuración se importa con los módulos JSON de Vite.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export const ARCHIVOS_CONFIG = [
  'simulacion', 'topologia', 'equipos', 'madera', 'licores', 'hidraulica', 'energia', 'cinetica', 'caso_base',
]

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', 'config')

/** Devuelve un objeto { simulacion, topologia, … } con todos los archivos. */
export function cargarConfig(directorio = raiz) {
  const config = {}
  for (const nombre of ARCHIVOS_CONFIG) {
    config[nombre] = JSON.parse(readFileSync(join(directorio, `${nombre}.json`), 'utf8'))
  }
  return config
}
