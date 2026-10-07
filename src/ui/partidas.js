// Guardado de partidas: en este navegador (localStorage) y como archivo JSON.

const CLAVE = 'digestor:partida'

export function guardarLocal(datos) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ fecha: new Date().toISOString(), datos }))
  } catch (e) {
    throw new Error(`No se pudo guardar en el navegador: ${e.message}`)
  }
}

/** Partida guardada en el navegador, o null. */
export function leerLocal() {
  try {
    const x = localStorage.getItem(CLAVE)
    return x ? JSON.parse(x) : null
  } catch {
    return null
  }
}

export function exportarArchivo(datos) {
  const blob = new Blob([JSON.stringify(datos)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  const t = Math.floor((datos.estado?.paso ?? 0) * 0.2 / 60)
  a.download = `digestor-partida-${t}min.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

/** Abre el selector de archivos y devuelve el JSON leído. */
export function importarArchivo() {
  return new Promise((resolver, rechazar) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = async () => {
      try {
        const texto = await input.files[0].text()
        resolver(JSON.parse(texto))
      } catch (e) {
        rechazar(new Error(`Archivo no válido: ${e.message}`))
      }
    }
    input.click()
  })
}
