// Jugador en primera persona: posición, orientación y movimiento con
// colisiones contra las cajas de sala.json (círculo contra cajas en el plano
// XZ, con deslizamiento por las paredes). Sin Three.js: se prueba en Node.

export function crearJugador(cfg, colisiones) {
  const j = {
    x: cfg.inicio[0],
    z: cfg.inicio[2],
    yaw: ((cfg.mirada ?? 0) * Math.PI) / 180, // 0 = mirando hacia −Z
    pitch: 0,
    ojos: cfg.altura_ojos,
  }
  const r = cfg.radio
  // Solo bloquean las cajas que llegan a la altura de las piernas.
  const cajas = colisiones.filter((c) => c.min[1] < 1.0)

  function choca(x, z) {
    for (const c of cajas) {
      const cx = Math.max(c.min[0], Math.min(x, c.max[0]))
      const cz = Math.max(c.min[2], Math.min(z, c.max[2]))
      if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return true
    }
    return false
  }

  return {
    estado: j,
    /** Gira la vista (radianes). */
    mirar(dYaw, dPitch) {
      j.yaw -= dYaw
      j.pitch = Math.max(-1.3, Math.min(1.3, j.pitch - dPitch))
    },
    /**
     * Mueve según la intención (adelante, derecha en −1..1) durante dt
     * segundos. Primero en X y luego en Z, para deslizar por las paredes.
     */
    mover(adelante, derecha, dt, correr = false) {
      const largo = Math.hypot(adelante, derecha)
      if (largo < 1e-3) return
      const v = (correr ? cfg.velocidad_correr : cfg.velocidad) * Math.min(1, largo)
      const fx = -Math.sin(j.yaw)
      const fz = -Math.cos(j.yaw)
      const dx = ((fx * adelante + -fz * derecha) / Math.max(1, largo)) * v * dt
      const dz = ((fz * adelante + fx * derecha) / Math.max(1, largo)) * v * dt
      if (!choca(j.x + dx, j.z)) j.x += dx
      if (!choca(j.x, j.z + dz)) j.z += dz
    },
    choca,
    /** Anclaje de interacción más cercano en alcance y frente al jugador. */
    interaccionCercana(anclajes) {
      let mejor = null
      let dMejor = Infinity
      for (const a of anclajes) {
        const dx = a.pos[0] - j.x
        const dz = a.pos[2] - j.z
        const d = Math.hypot(dx, dz)
        if (d > a.radio) continue
        // Debe estar adelante (o muy cerca).
        const frente = (-Math.sin(j.yaw) * dx + -Math.cos(j.yaw) * dz) / Math.max(d, 1e-6)
        if (d > 0.5 && frente < 0.2) continue
        if (d < dMejor) { dMejor = d; mejor = a }
      }
      return mejor
    },
  }
}
