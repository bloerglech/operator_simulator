// Efectos de ambiente manejados por datos (sala.json → "efectos") y conectados
// al estado del proceso: balizas, parpadeo de luces, vapor visible por el
// ventanal y vibración de la cámara. Las condiciones:
//   alarma_prioridad_1          hay una alarma de prioridad 1 activa o sin reconocer
//   alivio:<vaso>               la válvula de alivio (o seguridad) del vaso está abierta
//   evento_reciente:<tipo>      ocurrió ese evento hace menos de `duracion` s reales

export function crearEfectos(definiciones, escena) {
  const eventosVistos = { n: null }
  const recientes = {} // tipo de evento → tiempo real en que se vio

  function evaluar(cond, estado, ahora, duracion) {
    if (cond === 'alarma_prioridad_1') return estado.control.alarmas.lista.some((a) => a.prioridad === 1 && (a.activa || !a.reconocida))
    const [clase, arg] = cond.split(':')
    if (clase === 'alivio') {
      const p = estado.vasos[arg]?.presion
      return !!(p && (p.alivio || p.seguridad))
    }
    if (clase === 'evento_reciente') return recientes[arg] !== undefined && ahora - recientes[arg] < (duracion ?? 5)
    return false
  }

  return {
    /** Llamar en cada cuadro con el último estado y el tiempo real (s). Devuelve el desplazamiento de cámara. */
    actualizar(estado, ahora) {
      if (!estado) return { sacudida: 0 }
      // Eventos nuevos desde la última vez (contador monótono n).
      const ultimo = estado.eventos.at(-1)?.n ?? 0
      if (eventosVistos.n === null) eventosVistos.n = ultimo
      for (const ev of estado.eventos) if ((ev.n ?? 0) > eventosVistos.n) recientes[ev.tipo] = ahora
      eventosVistos.n = Math.max(eventosVistos.n, ultimo)

      let sacudida = 0
      let parpadeo = false
      for (const d of definiciones) {
        const activo = evaluar(d.condicion, estado, ahora, d.duracion)
        if (d.tipo === 'baliza') {
          for (const id of d.anclajes) {
            const b = escena.balizas[id]
            if (!b) continue
            const encendida = activo && Math.floor(ahora * 2.5) % 2 === 0
            b.luz.intensity = encendida ? 6 : 0
            b.mat.color.set(encendida ? '#ff3020' : activo ? '#7a1a12' : '#4a1010')
          }
        } else if (d.tipo === 'vapor') {
          escena.vapores[d.anclaje]?.actualizar(activo, ahora)
        } else if (d.tipo === 'vibracion' && activo) {
          sacudida = Math.max(sacudida, d.amplitud ?? 0.02)
        } else if (d.tipo === 'parpadeo_luces' && activo) {
          parpadeo = true
        }
      }
      for (const l of escena.luces) {
        const f = parpadeo ? (Math.sin(ahora * 37) > 0.3 ? 0.25 : 1) : 1
        l.luz.intensity = l.base * f
      }
      return { sacudida }
    },
  }
}
