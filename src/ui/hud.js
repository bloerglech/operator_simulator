// HUD de la sala 3D: mira, aviso de interacción, botón de operar (táctil),
// reloj y alarmas, calidad gráfica, ayuda y joystick virtual.

import { h, reemplazar } from '../hmi/dom.js'
import { reloj } from '../hmi/formato.js'

export function crearHUD(contenedor, { esTactil, calidad, alOperar, alAbrirPantallas, alCambiarCalidad, palanca }) {
  const aviso = h('div', { class: 'hud-aviso' })
  const operar = h('button', { class: 'hud-operar', onclick: alOperar }, 'Operar')
  const relojEl = h('span', { class: 'num' })
  const alarmas = h('span', { class: 'hud-alarmas' })
  const selCalidad = h('select', { onchange: () => alCambiarCalidad(selCalidad.value), title: 'Calidad gráfica' },
    ['bajo', 'medio', 'alto'].map((c) => h('option', { value: c }, `Calidad ${c}`)))
  selCalidad.value = calidad
  const ayuda = h('div', { class: 'hud-ayuda' }, esTactil
    ? 'Izquierda: caminar · derecha: mirar · acérquese a una consola y toque Operar'
    : 'Clic para mirar con el mouse · WASD caminar (Shift correr) · E operar · Esc soltar el mouse')
  const base = h('div', { class: 'hud-palanca-base' })
  const pomo = h('div', { class: 'hud-palanca-pomo' })
  const raiz = h('div', { id: 'hud' },
    h('div', { class: 'hud-sup' }, relojEl, alarmas, h('button', { onclick: alAbrirPantallas }, 'Pantallas DCS'), selCalidad),
    esTactil ? null : h('div', { class: 'hud-mira' }),
    aviso, operar, ayuda, base, pomo)
  contenedor.append(raiz)
  operar.style.display = 'none'

  let visible = true
  return {
    cercana(a) {
      if (!a) {
        aviso.textContent = ''
        operar.style.display = 'none'
        return
      }
      aviso.textContent = esTactil ? a.etiqueta : `E · ${a.etiqueta}`
      operar.style.display = esTactil ? 'block' : 'none'
      operar.textContent = a.pantalla ? 'Operar' : 'Usar'
    },
    actualizar(estado) {
      if (!visible || !estado) return
      relojEl.textContent = reloj(estado.t)
      const lista = estado.control.alarmas.lista
      const sin = lista.filter((a) => !a.reconocida)
      const p1 = lista.some((a) => a.prioridad === 1 && (a.activa || !a.reconocida))
      reemplazar(alarmas, sin.length ? `${sin.length} alarma${sin.length > 1 ? 's' : ''} sin reconocer` : '')
      alarmas.classList.toggle('critica', p1)
      const p = palanca()
      base.style.display = p ? 'block' : 'none'
      pomo.style.display = p ? 'block' : 'none'
      if (p) {
        base.style.left = `${p.x0 - 50}px`
        base.style.top = `${p.y0 - 50}px`
        pomo.style.left = `${p.x0 + p.dx * 50 - 22}px`
        pomo.style.top = `${p.y0 + p.dy * 50 - 22}px`
      }
    },
    mostrar(si) {
      visible = si
      raiz.style.display = si ? 'block' : 'none'
    },
  }
}
