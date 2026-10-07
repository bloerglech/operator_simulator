// Carátula de un lazo (faceplate): PV, SP, salida, modo, sintonía, maestro,
// actuador y una tendencia de los últimos 30 minutos.

import { h, reemplazar } from './dom.js'
import { num } from './formato.js'
import { dibujarTendencia, autoescala } from './grafico.js'

const VENTANA = 1800 // s

export function abrirCaratula(app, tag) {
  const estado0 = app.estado()
  const l0 = estado0?.control.lazos[tag]
  if (!l0) return { elemento: h('div', { class: 'panel' }, `Lazo desconocido: ${tag}`), actualizar() {} }
  const tx0 = estado0.control.transmisores[l0.transmisor]
  const d = tx0?.decimales ?? 1
  const error = h('div', { class: 'error' })
  const ejecutar = (cmd) => {
    error.textContent = ''
    app.cliente.comando(cmd).catch((e) => { error.textContent = e.message })
  }

  const pv = h('div', { class: 'grande' })
  const barraPV = h('div', { class: 'relleno' })
  const marcaSP = h('div', { class: 'marca-sp' })
  const barraOut = h('div', { class: 'relleno' })
  const spEl = h('span', { class: 'num' })
  const outEl = h('span', { class: 'num' })
  const posEl = h('span', { class: 'suave' })
  const aviso = h('div')
  const botonesModo = ['MAN', 'AUTO', 'CAS'].map((m) => h('button', {
    onclick: () => ejecutar({ tipo: 'lazo', id: tag, accion: 'modo', valor: m }),
  }, m))

  const spInput = h('input', { type: 'number', step: 'any', class: 'num', style: 'width: 110px' })
  const outInput = h('input', { type: 'number', step: 'any', min: 0, max: 100, class: 'num', style: 'width: 90px' })
  const span = l0.rango[1] - l0.rango[0]
  const pasoSP = span / 100
  // Una entrada que el operador está editando no se sobrescribe con el estado.
  const sucias = new Set()
  const marcar = (input) => {
    input.addEventListener('input', () => sucias.add(input))
    input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { sucias.delete(input); input.blur() } })
  }
  const leerEntrada = (input) => {
    if (input.value.trim() === '') return null
    const v = Number(input.value)
    return Number.isFinite(v) ? v : null
  }
  const enviarSP = (v) => { if (v === null) return; sucias.delete(spInput); ejecutar({ tipo: 'lazo', id: tag, accion: 'consigna', valor: v }) }
  const enviarOut = (v) => { if (v === null) return; sucias.delete(outInput); ejecutar({ tipo: 'lazo', id: tag, accion: 'salida', valor: Math.min(100, Math.max(0, v)) }) }

  const kc = h('input', { type: 'number', step: 'any', class: 'num', style: 'width: 70px', value: l0.Kc })
  const ti = h('input', { type: 'number', step: 'any', class: 'num', style: 'width: 70px', value: l0.Ti })
  const td = h('input', { type: 'number', step: 'any', class: 'num', style: 'width: 70px', value: l0.Td })
  const maestros = l0.maestros?.length > 1
    ? h('div', { class: 'fila' }, 'Maestro:', l0.maestros.map((m) => h('button', { 'data-m': m, onclick: () => ejecutar({ tipo: 'lazo', id: tag, accion: 'maestro', valor: m }) }, m)))
    : null

  const canvas = h('canvas')
  let tendencia = null
  let pidiendo = false
  async function pedirTendencia(t) {
    if (pidiendo) return
    pidiendo = true
    try {
      tendencia = await app.cliente.tendencia([l0.transmisor, `${tag}.sp`, `${tag}.out`], t - VENTANA, t, 300)
    } catch { /* se reintenta en la próxima actualización */ }
    pidiendo = false
  }
  let ultimaTendencia = -Infinity

  const elemento = h('div', { class: 'caratula panel' },
    h('button', { class: 'cerrar', onclick: () => app.cerrarLateral(), title: 'Cerrar' }, '✕'),
    h('h2', {}, tag),
    h('div', { class: 'desc' }, `${l0.descripcion} · acción ${l0.accion}${l0.maestro ? ` · maestro ${l0.maestro}` : ''}`),
    aviso,
    h('div', { class: 'suave' }, `PV (${l0.transmisor})`),
    pv,
    h('div', { class: 'barra-pv' }, barraPV, marcaSP),
    h('div', { class: 'fila' }, 'SP', spEl, h('span', { class: 'suave' }, l0.unidad)),
    h('div', { class: 'fila' },
      h('button', { onclick: () => enviarSP((app.estado().control.lazos[tag].sp) - pasoSP) }, '−'),
      spInput,
      h('button', { onclick: () => enviarSP((app.estado().control.lazos[tag].sp) + pasoSP) }, '+'),
      h('button', { onclick: () => enviarSP(leerEntrada(spInput)) }, 'Fijar SP')),
    h('div', { class: 'fila' }, 'Salida', outEl, '%', posEl),
    h('div', { class: 'barra-pv salida' }, barraOut),
    h('div', { class: 'fila' },
      h('button', { onclick: () => enviarOut(app.estado().control.lazos[tag].salida - 1) }, '−1 %'),
      outInput,
      h('button', { onclick: () => enviarOut(app.estado().control.lazos[tag].salida + 1) }, '+1 %'),
      h('button', { onclick: () => enviarOut(leerEntrada(outInput)) }, 'Fijar')),
    h('div', { class: 'fila' }, botonesModo),
    maestros,
    error,
    canvas,
    h('div', { class: 'leyenda' },
      h('span', { estilo: { '--color': '#1d1d1d' } }, 'PV'),
      h('span', { estilo: { '--color': '#1f5fbf' } }, 'SP'),
      h('span', { estilo: { '--color': '#b03a2e' } }, 'Salida %')),
    h('details', {},
      h('summary', {}, 'Sintonía'),
      h('div', { class: 'fila' }, 'Kc', kc, 'Ti (s)', ti, 'Td (s)', td),
      h('button', { onclick: () => {
        const [Kc, Ti, Td] = [kc, ti, td].map(leerEntrada)
        if ([Kc, Ti, Td].includes(null)) { error.textContent = 'Complete Kc, Ti y Td'; return }
        for (const x of [kc, ti, td]) sucias.delete(x)
        ejecutar({ tipo: 'lazo', id: tag, accion: 'sintonia', Kc, Ti, Td })
      } }, 'Aplicar sintonía'),
      h('div', { class: 'suave' }, `Rango del PV ${num(l0.rango[0], d)}–${num(l0.rango[1], d)} ${l0.unidad}`)))

  spInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') enviarSP(leerEntrada(spInput)) })
  outInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') enviarOut(leerEntrada(outInput)) })
  for (const x of [spInput, outInput, kc, ti, td]) marcar(x)

  function actualizar(estado) {
    const l = estado.control.lazos[tag]
    const tx = estado.control.transmisores[l.transmisor]
    pv.textContent = `${num(l.pv, d)} ${l.unidad}${tx?.calidad === 'mala' ? '  (señal mala)' : ''}`
    const f = (v) => `${Math.min(100, Math.max(0, ((v - l.rango[0]) / span) * 100))}%`
    barraPV.style.width = f(l.pv)
    marcaSP.style.left = f(l.sp)
    barraOut.style.width = `${Math.min(100, Math.max(0, l.salida))}%`
    spEl.textContent = num(l.sp, d)
    outEl.textContent = num(l.salida, 1)
    posEl.textContent = l.posicion !== null && l.posicion !== undefined ? `actuador ${num(l.posicion, 1)} %${l.pegado ? ' (PEGADO)' : ''}` : ''
    const refrescar = (input, v) => { if (!sucias.has(input) && document.activeElement !== input) input.value = v }
    refrescar(spInput, Number(l.sp.toFixed(Math.max(d, 1))))
    refrescar(outInput, Number(l.salida.toFixed(1)))
    refrescar(kc, l.Kc)
    refrescar(ti, l.Ti)
    refrescar(td, l.Td)
    outInput.disabled = l.modo !== 'MAN' || !!l.forzado
    for (const b of botonesModo) {
      b.classList.toggle('activo', b.textContent === l.modo)
      b.disabled = (b.textContent === 'CAS' && !l.maestro) || (!!l.forzado && b.textContent !== 'MAN')
    }
    if (maestros) for (const b of maestros.querySelectorAll('button')) b.classList.toggle('activo', b.dataset.m === l.maestro)
    const avisos = []
    if (l.forzado) avisos.push(`Forzado por el enclavamiento ${l.forzado}: rearme el enclavamiento para recuperar el lazo.`)
    if (l.siguiendo) avisos.push('El esclavo no está en cascada: este lazo sigue su consigna sin controlar.')
    reemplazar(aviso, avisos.map((a) => h('div', { class: 'aviso' }, a)))
    if (estado.t - ultimaTendencia > 5) {
      ultimaTendencia = estado.t
      pedirTendencia(estado.t)
    }
    if (tendencia && tendencia.t.length > 1) {
      const vPV = tendencia.datos[l.transmisor]
      const [lo, hi] = autoescala([...vPV, ...tendencia.datos[`${tag}.sp`]], l.rango)
      dibujarTendencia(canvas, tendencia.t, [
        { valores: vPV, color: '#1d1d1d', min: lo, max: hi },
        { valores: tendencia.datos[`${tag}.sp`], color: '#1f5fbf', min: lo, max: hi, discontinua: true },
        { valores: tendencia.datos[`${tag}.out`], color: '#b03a2e', min: 0, max: 100, trazo: 1.2 },
      ], [estado.t - VENTANA, estado.t])
    }
  }

  return { elemento, actualizar }
}
