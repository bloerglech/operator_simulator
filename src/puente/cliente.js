// Cliente del puente (hilo principal): la única interfaz que usan las
// pantallas DCS, el mundo 3D y las misiones para hablar con la simulación.
//
//   const c = crearCliente()
//   await c.iniciar({ semilla })            // caso base (o { guardado })
//   c.suscribir((estado) => …)              // ≈ 5 instantáneas por segundo
//   await c.comando(cmd)                     // rechaza con el motivo si no es válido
//   await c.velocidad(60) · await c.guardar() · await c.tendencia(nombres, t0, t1)

export function crearCliente() {
  const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })
  const pendientes = new Map()
  const suscriptores = new Set()
  const progreso = new Set()
  let siguienteId = 1
  let ultimo = null
  let rendimiento = null

  worker.onmessage = (ev) => {
    const m = ev.data
    if (m.tipo === 'estado') {
      ultimo = m.estado
      rendimiento = m.rendimiento
      for (const f of suscriptores) f(ultimo, rendimiento)
    } else if (m.tipo === 'progreso') {
      for (const f of progreso) f(m.fraccion)
    } else if (m.tipo === 'respuesta') {
      const p = pendientes.get(m.id)
      if (!p) return
      pendientes.delete(m.id)
      if (m.ok) p.resolver(m.datos)
      else p.rechazar(new Error(m.error))
    }
  }

  function pedir(tipo, datos = {}) {
    const id = siguienteId++
    return new Promise((resolver, rechazar) => {
      pendientes.set(id, { resolver, rechazar })
      worker.postMessage({ id, tipo, ...datos })
    })
  }

  return {
    iniciar: (op = {}) => pedir('iniciar', op),
    velocidad: (valor) => pedir('velocidad', { valor }),
    comando: (cmd) => pedir('comando', { cmd }),
    guardar: () => pedir('guardar'),
    reintentar: () => pedir('reintentar'),
    catalogo: () => pedir('catalogo'),
    tendencia: (nombres, t0, t1, max) => pedir('tendencia', { nombres, t0, t1, max }),
    perfiles: (activo) => pedir('perfiles', { activo }),
    suscribir(f) {
      suscriptores.add(f)
      if (ultimo) f(ultimo, rendimiento)
      return () => suscriptores.delete(f)
    },
    alProgresar(f) {
      progreso.add(f)
      return () => progreso.delete(f)
    },
    estado: () => ultimo,
    rendimiento: () => rendimiento,
  }
}
