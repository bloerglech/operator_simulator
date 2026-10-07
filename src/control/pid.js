// Controlador PID en forma ISA (estándar), en porcentaje del rango.
//
//   u = Kc · [ e + (1/Ti)·∫e dt − Td · dPV/dt ] + polarización
//
// - e en % del rango del PV; acción directa (u sube si el PV sube) o inversa.
// - La derivada actúa sobre el PV filtrado (sin "golpe" al cambiar la consigna).
// - Anti-windup por integración condicional: si la salida está saturada y el
//   error empuja hacia afuera, no se integra.
// - Transferencia sin golpe: al pasar de MAN a AUTO/CAS el término integral se
//   inicializa para que la salida no salte.
// - Modos: MAN (salida del operador), AUTO (consigna del operador), CAS
//   (consigna desde el maestro).

/** Estado inicial de un PID. */
export function crearPID({ sp, salida = 0, modo = 'MAN' }) {
  return { modo, sp, salida, integral: salida, pvAnt: null, derivada: 0, inicializar: true }
}

/**
 * Un paso del PID. cfg: { Kc, Ti (s), Td (s), directa, lim: [min, max] %, pvMin, pvMax }.
 * pv y sp en unidades de ingeniería. Devuelve la salida (%).
 */
export function pasoPID(st, cfg, pv, dt) {
  const span = cfg.pvMax - cfg.pvMin || 1
  const pvp = ((pv - cfg.pvMin) / span) * 100
  if (st.modo === 'MAN') {
    // Seguimiento: el integral sigue a la salida para transferir sin golpe.
    st.integral = st.salida
    st.pvAnt = pvp
    st.derivada = 0
    return st.salida
  }
  const spp = ((st.sp - cfg.pvMin) / span) * 100
  const e = cfg.directa ? pvp - spp : spp - pvp
  // Derivada sobre el PV, filtrada (α = 0,1·Td).
  if (cfg.Td > 0 && st.pvAnt !== null) {
    const dpv = (pvp - st.pvAnt) / dt
    const tf = Math.max(0.1 * cfg.Td, dt)
    st.derivada += ((cfg.directa ? dpv : -dpv) - st.derivada) * (dt / (tf + dt))
  }
  st.pvAnt = pvp
  const p = cfg.Kc * e
  const d = cfg.Kc * cfg.Td * st.derivada
  if (st.inicializar) {
    // Primer paso en automático: la salida continúa donde estaba.
    st.integral = st.salida - p - d
    st.inicializar = false
  }
  const di = cfg.Ti > 0 ? ((cfg.Kc * e) / cfg.Ti) * dt : 0
  const [lo, hi] = cfg.lim
  // Integración condicional: si el paso integral empuja la salida más allá
  // de un límite, solo se integra lo justo para llegar a él.
  const uPrevio = p + st.integral + di + d
  if (uPrevio > hi && di > 0) st.integral = Math.max(st.integral, hi - p - d)
  else if (uPrevio < lo && di < 0) st.integral = Math.min(st.integral, lo - p - d)
  else st.integral += di
  const u = p + st.integral + d
  // El integral no se aleja más allá de los límites (evita acumulación lenta).
  st.integral = Math.min(hi - p - d + 1, Math.max(lo - p - d - 1, st.integral))
  st.salida = Math.min(hi, Math.max(lo, u))
  return st.salida
}

/** Cambia el modo con transferencia sin golpe. */
export function cambiarModo(st, modo) {
  if (st.modo === modo) return
  st.modo = modo
  st.inicializar = true
  st.pvAnt = null
  st.derivada = 0
}
