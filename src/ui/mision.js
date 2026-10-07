// Capa de misión, común a la sala 3D y a las pantallas: título del capítulo,
// diálogos por radio y teléfono (subtítulos), lista discreta de objetivos,
// pistas (que pueden resaltar un control del DCS) e informe al terminar.

import { h, reemplazar } from '../hmi/dom.js'
import { mostrarInforme } from './informe.js'

const ICONO = { radio: '📻', telefono: '📞', ayuda: '💡', mural: '🖥' }
const DURACION_DIALOGO = 9000 // ms reales por mensaje (más si es largo)

/** Pendientes y fallidos, más los dos últimos cumplidos (la lista no crece sin fin). */
function visibles(objetivos) {
  const cumplidos = objetivos.filter((o) => o.estado === 'cumplido')
  const ultimos = new Set(cumplidos.slice(-2))
  return objetivos.filter((o) => o.estado !== 'cumplido' || ultimos.has(o))
}

export function crearCapaMision(cliente, { resaltar, alTerminar }) {
  const titulo = h('div', { class: 'mision-titulo' })
  const objetivos = h('div', { class: 'mision-objetivos' })
  const dialogo = h('div', { class: 'mision-dialogo' })
  const raiz = h('div', { class: 'capa-mision' }, titulo, objetivos, dialogo)
  document.body.append(raiz)

  let visto = null
  let cola = []
  let mostrando = false
  let informeMostrado = false
  let firmaObjetivos = ''
  let plegado = false

  function siguiente() {
    if (mostrando || cola.length === 0) return
    const m = cola.shift()
    mostrando = true
    reemplazar(dialogo,
      h('div', { class: `globo ${m.tipo}` },
        m.quien ? h('div', { class: 'quien' }, `${ICONO[m.canal] ?? ''} ${m.quien}`) : null,
        h('div', {}, m.texto)))
    dialogo.classList.add('visible')
    setTimeout(() => {
      dialogo.classList.remove('visible')
      mostrando = false
      setTimeout(siguiente, 300)
    }, Math.max(DURACION_DIALOGO, m.texto.length * 55))
  }

  function mostrarTitulo(m) {
    reemplazar(titulo, h('div', { class: 'capitulo' }, m.capitulo ?? ''), h('div', { class: 'nombre' }, m.nombre ?? m.texto))
    titulo.classList.add('visible')
    setTimeout(() => titulo.classList.remove('visible'), 4500)
  }

  cliente.suscribir((estado) => {
    const esc = estado.escenario
    if (!esc) return
    // Mensajes nuevos (la primera vez solo se toman los últimos del inicio de la misión).
    if (visto === null) visto = Math.max(0, (esc.mensajes.at(-1)?.n ?? 0) - 6)
    for (const m of esc.mensajes) {
      if (m.n <= visto) continue
      visto = m.n
      if (m.titulo) mostrarTitulo(m)
      else if (m.texto) cola.push(m)
      if (m.resaltar) resaltar?.(m.resaltar)
    }
    siguiente()
    // Objetivos.
    const mi = esc.mision
    const firma = JSON.stringify(mi?.objetivos ?? null) + plegado
    if (firma !== firmaObjetivos) {
      firmaObjetivos = firma
      if (!mi || mi.terminada) objetivos.replaceChildren()
      else {
        reemplazar(objetivos,
          h('div', { class: 'cabecera', onclick: () => { plegado = !plegado; firmaObjetivos = '' } }, `${mi.capitulo} · ${mi.titulo} ${plegado ? '▸' : '▾'}`),
          plegado ? null : visibles(mi.objetivos).map((o) => h('div', { class: `objetivo ${o.estado} ${o.tipo}` },
            h('span', { class: 'marca' }, o.estado === 'cumplido' ? '✔' : o.estado === 'fallido' ? '✖' : '○'), o.texto)))
      }
    }
    // Informe.
    if (mi?.terminada && mi.resultado && !informeMostrado) {
      informeMostrado = true
      setTimeout(() => mostrarInforme(mi, cliente, alTerminar), 2500)
    }
    if (mi && !mi.terminada) informeMostrado = false
  })

  return {
    /** Al reintentar o cambiar de partida se vuelven a leer los mensajes. */
    reiniciar() { visto = null; cola = []; informeMostrado = false },
  }
}
