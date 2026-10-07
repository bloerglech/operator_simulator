// Sonidos de la sala (Fase 7), sintetizados con Web Audio (sin archivos):
// alarmas según prioridad, teléfono y radio de los diálogos, alivio y
// seguridad, bombas que paran o parten, golpes de vaporización y de la
// columna, y el zumbido de la planta, que se apaga en un apagón.
// El volumen sale de los ajustes. El audio se habilita con la primera
// interacción del jugador (regla de los navegadores).

import { leerAjustes, alCambiarAjustes } from './ajustes.js'

const ESPERA_MISMO = 0.6 // s reales mínimos entre dos sonidos del mismo tipo

export function crearSonidos(cliente) {
  let ac = null
  let maestro = null
  let zumbido = null
  let volumen = leerAjustes().volumen
  const ultimo = {} // tipo → tiempo del último sonido
  const vistos = { mensaje: null, evento: null, alarma: null }

  function habilitar() {
    if (ac) return
    const Ctx = window.AudioContext ?? window.webkitAudioContext
    if (!Ctx) return
    ac = new Ctx()
    maestro = ac.createGain()
    maestro.gain.value = volumen
    maestro.connect(ac.destination)
    zumbido = crearZumbido()
  }
  for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, habilitar, { once: true, capture: true })
  alCambiarAjustes((a) => {
    volumen = a.volumen
    if (maestro) maestro.gain.setTargetAtTime(volumen, ac.currentTime, 0.05)
  })

  // ---- Generadores ----
  function tono(f, dur, { tipo = 'sine', vol = 0.3, inicio = 0, f2 = null } = {}) {
    const t = ac.currentTime + inicio
    const o = ac.createOscillator()
    const g = ac.createGain()
    o.type = tipo
    o.frequency.setValueAtTime(f, t)
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.01)
    g.gain.setValueAtTime(vol, t + Math.max(0.01, dur - 0.05))
    g.gain.linearRampToValueAtTime(0, t + dur)
    o.connect(g).connect(maestro)
    o.start(t)
    o.stop(t + dur + 0.02)
  }
  function ruido(dur, { frec = 1500, q = 0.7, vol = 0.2, inicio = 0, filtro = 'bandpass' } = {}) {
    const t = ac.currentTime + inicio
    const n = Math.floor(ac.sampleRate * dur)
    const buf = ac.createBuffer(1, n, ac.sampleRate)
    const d = buf.getChannelData(0)
    let x = 12345 // ruido determinista (no hace falta azar real)
    for (let i = 0; i < n; i++) { x = (x * 1103515245 + 12345) % 2147483648; d[i] = x / 1073741824 - 1 }
    const src = ac.createBufferSource()
    src.buffer = buf
    const f = ac.createBiquadFilter()
    f.type = filtro
    f.frequency.value = frec
    f.Q.value = q
    const g = ac.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.05)
    g.gain.setValueAtTime(vol, t + dur * 0.7)
    g.gain.linearRampToValueAtTime(0, t + dur)
    src.connect(f).connect(g).connect(maestro)
    src.start(t)
  }
  function crearZumbido() {
    const g = ac.createGain()
    g.gain.value = 0.025
    for (const [f, v] of [[50, 1], [100, 0.5], [150, 0.2]]) {
      const o = ac.createOscillator()
      const og = ac.createGain()
      o.frequency.value = f
      og.gain.value = v
      o.connect(og).connect(g)
      o.start()
    }
    g.connect(maestro)
    return g
  }

  const SONIDOS = {
    alarma1: () => { for (let i = 0; i < 3; i++) tono(880, 0.15, { tipo: 'square', vol: 0.12, inicio: i * 0.22 }) },
    alarma2: () => { for (let i = 0; i < 2; i++) tono(660, 0.18, { tipo: 'square', vol: 0.1, inicio: i * 0.26 }) },
    alarma3: () => tono(520, 0.22, { tipo: 'triangle', vol: 0.12 }),
    telefono: () => { for (let i = 0; i < 2; i++) { tono(440, 0.4, { vol: 0.1, inicio: i * 0.6 }); tono(480, 0.4, { vol: 0.1, inicio: i * 0.6 }) } },
    radio: () => { ruido(0.25, { frec: 2500, q: 0.5, vol: 0.12 }); tono(1200, 0.08, { tipo: 'square', vol: 0.05, inicio: 0.25 }) },
    mural: () => tono(330, 0.3, { vol: 0.08, f2: 220 }),
    alivio: () => ruido(2.5, { frec: 3000, q: 0.4, vol: 0.18 }),
    seguridad: () => { ruido(4, { frec: 900, q: 0.3, vol: 0.35, filtro: 'lowpass' }); tono(70, 0.6, { vol: 0.4, f2: 40 }) },
    paraBomba: () => tono(140, 1.6, { tipo: 'sawtooth', vol: 0.06, f2: 35 }),
    parteBomba: () => tono(35, 1.6, { tipo: 'sawtooth', vol: 0.06, f2: 140 }),
    golpe: () => { tono(60, 0.5, { vol: 0.5, f2: 30 }); ruido(0.4, { frec: 200, vol: 0.2, filtro: 'lowpass' }) },
    corte: () => tono(90, 1.2, { tipo: 'sawtooth', vol: 0.12, f2: 25 }),
  }
  const EVENTO = {
    apertura_alivio: 'alivio', apertura_seguridad: 'seguridad', detencion_bomba: 'paraBomba', partida_bomba: 'parteBomba',
    vaporizacion_subita: 'golpe', caida_columna: 'golpe', liberacion_columna: 'golpe',
  }

  function sonar(tipo) {
    if (!ac || volumen <= 0 || !SONIDOS[tipo]) return
    const ahora = ac.currentTime
    if (ahora - (ultimo[tipo] ?? -Infinity) < ESPERA_MISMO) return
    ultimo[tipo] = ahora
    if (ac.state === 'suspended') ac.resume()
    SONIDOS[tipo]()
  }

  let energiaAntes = 1
  cliente.suscribir((e) => {
    // Primera vez: solo se toma nota de lo ya ocurrido.
    const ultMsg = e.escenario?.mensajes.at(-1)?.n ?? 0
    const ultEv = e.eventos?.at(-1)?.n ?? 0
    const ultAl = e.control?.alarmas.registro.at(-1)?.t ?? -1
    if (vistos.mensaje === null) { vistos.mensaje = ultMsg; vistos.evento = ultEv; vistos.alarma = ultAl; return }
    for (const m of e.escenario?.mensajes ?? []) if (m.n > vistos.mensaje && ['telefono', 'radio', 'mural'].includes(m.canal)) sonar(m.canal)
    for (const ev of e.eventos ?? []) if ((ev.n ?? 0) > vistos.evento && EVENTO[ev.tipo]) sonar(EVENTO[ev.tipo])
    const nuevas = (e.control?.alarmas.registro ?? []).filter((r) => r.t > vistos.alarma && r.accion === 'activa')
    if (nuevas.length) sonar(`alarma${Math.min(3, Math.min(...nuevas.map((r) => r.prioridad)))}`)
    vistos.mensaje = Math.max(vistos.mensaje, ultMsg)
    vistos.evento = Math.max(vistos.evento, ultEv)
    vistos.alarma = Math.max(vistos.alarma, ultAl)
    // Apagón: golpe de corte y silencio de la planta; vuelve el zumbido con la energía.
    const energia = e.servicios?.energia ?? 1
    if (energia <= 0 && energiaAntes > 0) sonar('corte')
    energiaAntes = energia
    if (zumbido) zumbido.gain.setTargetAtTime(energia > 0 ? 0.025 : 0, ac.currentTime, 0.3)
  })

  return {
    /** Al repetir o reintentar una misión no se repiten los sonidos ya oídos. */
    reiniciar() { vistos.mensaje = null },
    sonar,
  }
}
