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

// Autoguardado: un espacio aparte, que se escribe solo (cada 5 minutos y al
// salir de la pestaña) y no pisa la partida guardada a mano.
const CLAVE_AUTO = 'digestor:autoguardado'

export function guardarAuto(datos) {
  try { localStorage.setItem(CLAVE_AUTO, JSON.stringify({ fecha: new Date().toISOString(), datos })) } catch { /* sin espacio: se omite */ }
}

export function leerAuto() {
  try {
    const x = localStorage.getItem(CLAVE_AUTO)
    return x ? JSON.parse(x) : null
  } catch {
    return null
  }
}

/** Activa el autoguardado de la partida en curso; devuelve la función para detenerlo. */
export function autoguardar(cliente, cadaMs = 5 * 60 * 1000) {
  const guardar = () => cliente.guardar().then(guardarAuto).catch(() => {})
  const reloj = setInterval(guardar, cadaMs)
  const alOcultar = () => { if (document.visibilityState === 'hidden') guardar() }
  document.addEventListener('visibilitychange', alOcultar)
  return () => { clearInterval(reloj); document.removeEventListener('visibilitychange', alOcultar) }
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
