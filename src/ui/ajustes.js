// Ajustes del jugador (Fase 7): dificultad, pistas, vista de perfiles y
// volumen. Se guardan en este navegador y se aplican a la partida en curso.
// La dificultad fija el ruido de los instrumentos, las ayudas visibles y, en
// la operación libre, la frecuencia de los eventos aleatorios.

import { h } from '../hmi/dom.js'

const CLAVE = 'digestor:ajustes'
const BASE = { dificultad: 2, volumen: 0.6, pistas: null, perfiles: null } // null: lo que diga la dificultad

export function leerAjustes() {
  try {
    return { ...BASE, ...JSON.parse(localStorage.getItem(CLAVE) ?? '{}') }
  } catch {
    return { ...BASE }
  }
}

export function guardarAjustes(a) {
  try { localStorage.setItem(CLAVE, JSON.stringify(a)) } catch { /* sin almacenamiento */ }
  for (const f of oyentes) f(a)
}

const oyentes = new Set()
/** Avisa cuando cambian los ajustes (p. ej. el volumen de los sonidos). */
export function alCambiarAjustes(f) {
  oyentes.add(f)
  return () => oyentes.delete(f)
}

/** Valores efectivos según la dificultad y lo que el jugador cambió a mano. */
export function efectivos(a, dificultades) {
  const d = dificultades?.[a.dificultad] ?? {}
  return {
    nombre: d.nombre ?? '',
    ruido: d.ruido ?? 1,
    generador: d.generador ?? a.dificultad,
    pistas: a.pistas ?? d.pistas ?? true,
    perfiles: a.perfiles ?? d.perfiles ?? true,
  }
}

/** Aplica los ajustes a la partida en curso (ruido, pistas, perfiles y, si hay eventos aleatorios, su frecuencia). */
export async function aplicarAjustes(app, dificultades) {
  const e = efectivos(leerAjustes(), dificultades)
  const cliente = app.cliente
  await cliente.comando({ tipo: 'ruido', factor: e.ruido }).catch(() => {})
  await cliente.comando({ tipo: 'pistas', activo: e.pistas }).catch(() => {})
  const g = app.estado()?.escenario?.generador
  if (g?.activo) await cliente.comando({ tipo: 'generador', activo: true, dificultad: e.generador }).catch(() => {})
  app.fijarPerfiles(e.perfiles)
}

/** Panel de ajustes (en el panel lateral del DCS). */
export function abrirAjustes(app, dificultades) {
  const a = leerAjustes()
  const resumen = h('div', { class: 'suave' })
  const cambiar = (campo, valor) => {
    a[campo] = valor
    guardarAjustes(a)
    aplicarAjustes(app, dificultades)
    pintar()
  }
  const dificultad = h('select', { onchange: () => { a.pistas = null; a.perfiles = null; cambiar('dificultad', Number(dificultad.value)) } },
    Object.entries(dificultades ?? {}).map(([k, d]) => h('option', { value: k, selected: Number(k) === a.dificultad }, d.nombre)))
  const pistas = h('input', { type: 'checkbox', onchange: () => cambiar('pistas', pistas.checked) })
  const perfiles = h('input', { type: 'checkbox', onchange: () => cambiar('perfiles', perfiles.checked) })
  const volumen = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: a.volumen, oninput: () => { a.volumen = Number(volumen.value); guardarAjustes(a) } })
  function pintar() {
    const e = efectivos(a, dificultades)
    pistas.checked = e.pistas
    perfiles.checked = e.perfiles
    resumen.textContent = `${dificultades?.[a.dificultad]?.descripcion ?? ''} Ruido de los instrumentos ×${e.ruido}.`
  }
  pintar()
  return {
    elemento: h('div', { class: 'panel ajustes' },
      h('button', { class: 'cerrar', style: 'float:right', onclick: () => app.cerrarLateral() }, '✕'),
      h('h2', {}, 'Ajustes'),
      h('div', { class: 'fila' }, 'Dificultad', dificultad),
      resumen,
      h('label', { class: 'fila' }, pistas, ' Pistas en las misiones'),
      h('label', { class: 'fila' }, perfiles, ' Vista «9 Perfiles» (ayuda didáctica: en la planta no se ve)'),
      h('label', { class: 'fila' }, 'Volumen', volumen),
      h('div', { class: 'suave' }, 'La calidad gráfica de la sala 3D se cambia en el botón del HUD. Los ajustes se guardan en este navegador.')),
    actualizar() {},
  }
}
