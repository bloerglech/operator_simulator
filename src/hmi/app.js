// Aplicación DCS en 2D: barra superior (reloj, velocidad, alarmas, guardar),
// banner de la alarma más importante, navegación entre pantallas, área de la
// pantalla y panel lateral (carátulas de lazo, tags, instructor).
// Solo habla con la simulación a través del cliente del puente.

import { h, reemplazar, avisar } from './dom.js'
import { reloj, num } from './formato.js'
import { abrirCaratula } from './caratula.js'
import { abrirTag } from './tag.js'
import { abrirInstructor } from './instructor.js'
import { abrirAjustes } from '../ui/ajustes.js'
import { abrirManual } from './manual.js'
import { PANTALLAS } from './pantallas/indice.js'
import { guardarLocal, exportarArchivo } from '../ui/partidas.js'

const VELOCIDADES = [[0, '❚❚'], [1, '×1'], [10, '×10'], [60, '×60'], [300, '×300']]

export function crearApp(raiz, cliente, opciones = {}) {
  const ajustes = { perfiles: opciones.perfiles ?? true, instructor: opciones.instructor ?? false }
  let estado = null
  let pantalla = null
  let idPantalla = null
  let lateral = null // { actualizar, cerrar }
  let menuAbierto = null
  let pendienteDibujo = false
  let oculto = false // en la sala 3D el DCS se oculta mientras se camina
  const informados = new Set() // acciones del jugador ya informadas a la misión
  let reinformar = false // tras repetir o reintentar: volver a informar lo que está a la vista
  let resaltado = null
  function marcarResaltado() {
    for (const el of contenedor.querySelectorAll('.resaltado')) el.classList.remove('resaltado')
    if (resaltado) for (const el of contenedor.querySelectorAll(`[data-tag="${resaltado}"]`)) el.classList.add('resaltado')
  }

  // ---- Barra superior ----
  const relojEl = h('span', { class: 'reloj', title: 'Tiempo de planta (día y hora)' }, '—')
  const botonesVel = VELOCIDADES.map(([v, t]) => h('button', {
    'data-vel': v, title: v === 0 ? 'Pausa' : `Velocidad ${t}`,
    onclick: () => { cliente.velocidad(v).catch((e) => avisar(e.message)); app.jugador('velocidad', v) },
  }, t))
  const contadores = [1, 2, 3, 4].map((p) => h('span', { class: `p${p}`, title: `Alarmas de prioridad ${p}` }, '0'))
  const rendimientoEl = h('span', { class: 'suave ocultar-celular' })
  const barra = h('div', { id: 'barra' },
    opciones.alVolver ? h('button', { onclick: () => opciones.alVolver(), title: 'Volver a la sala de control (Esc)' }, '◀ Sala') : null,
    relojEl,
    h('div', { class: 'grupo' }, botonesVel),
    rendimientoEl,
    h('div', { class: 'separador' }),
    h('div', { class: 'contador-alarmas', onclick: () => ir('alarmas') }, contadores),
    h('button', { onclick: () => cliente.comando({ tipo: 'alarma', id: '*', accion: 'reconocer' }).catch((e) => avisar(e.message)), title: 'Reconocer todas las alarmas' }, 'Reconocer'),
    h('button', { onclick: () => app.radio(), title: 'Radio con el operador de terreno' }, 'Radio'),
    h('button', { onclick: () => abrirLateral(abrirManual(app)), title: 'Manual de operación (procedimientos)' }, 'Manual'),
    h('button', { onclick: (ev) => menuPartida(ev) }, 'Partida'),
    h('button', { onclick: () => abrirLateral(abrirAjustes(app, opciones.dificultades)), title: 'Dificultad, pistas, perfiles y volumen' }, 'Ajustes'),
    h('button', { onclick: () => alternarInstructor(), title: 'Panel del instructor' }, 'Instructor'))

  // ---- Banner de la alarma más importante sin reconocer ----
  const banner = h('div', { id: 'banner', onclick: () => ir('alarmas') })

  // ---- Navegación ----
  const nav = h('nav', { id: 'nav' }, PANTALLAS.map((p) => h('button', { 'data-pantalla': p.id, onclick: () => ir(p.id) }, p.nombre)))

  const contenedor = h('div', { id: 'pantalla' })
  const panelLateral = h('aside', { id: 'lateral' })
  reemplazar(raiz, h('div', { id: 'app' }, barra, banner, nav, h('div', { id: 'cuerpo' }, contenedor, panelLateral)))

  const app = {
    cliente,
    ajustes,
    estado: () => estado,
    ir,
    /** Muestra u oculta la vista didáctica de perfiles (dificultad). */
    fijarPerfiles(si) {
      ajustes.perfiles = !!si
      const b = nav.querySelector('button[data-pantalla="perfiles"]')
      if (b) b.hidden = !si
      if (!si && idPantalla === 'perfiles') ir('digestor')
      cliente.perfiles(!!si).catch(() => {})
    },
    comando(cmd) {
      return cliente.comando(cmd).catch((e) => {
        avisar(e.message)
        throw e
      })
    },
    abrirLazo(tag) {
      abrirLateral(abrirCaratula(app, tag))
      app.jugador('caratula', tag)
    },
    /** Acción del jugador para las misiones (solo con una misión en curso; cada una se informa una vez). */
    jugador(evento, valor) {
      const m = estado?.escenario?.mision
      if (!m || m.terminada) return
      const clave = `${m.id}|${m.t0}|${evento}:${valor ?? ''}`
      if (informados.has(clave)) return
      informados.add(clave)
      cliente.comando(valor === undefined ? { tipo: 'jugador', evento } : { tipo: 'jugador', evento, valor }).catch(() => {})
    },
    /** Radio con el operador de terreno. */
    radio() {
      avisar('📻 Luis Paredes, terreno: «Te escucho, sala. Por acá todo normal.»', 5000)
      app.jugador('radio')
    },
    /** Resalta un control en el mímico (pista de una misión). */
    resaltar(tag) {
      resaltado = tag
      marcarResaltado()
      setTimeout(() => { if (resaltado === tag) { resaltado = null; marcarResaltado() } }, 45000)
    },
    abrirTag(tag) {
      const lazo = estado && Object.entries(estado.control.lazos).find(([, l]) => l.transmisor === tag)
      if (lazo) app.abrirLazo(lazo[0])
      else abrirLateral(abrirTag(app, tag))
    },
    cerrarLateral,
    menu,
    /** Muestra u oculta el DCS (en la sala 3D); oculto no se redibuja. */
    /** Al repetir o reintentar una misión: las acciones se vuelven a informar (el estado de la misión retrocedió). */
    olvidarJugador() {
      informados.clear()
      reinformar = true
    },
    mostrar(si) {
      oculto = !si
      if (si && estado) dibujar()
    },
    menuBomba(id, ev) {
      const b = estado?.bombas[id]
      menu(`Bomba ${id}`, [
        { texto: b?.marcha ? 'En marcha' : 'Detenida', deshabilitado: true },
        { texto: 'Partir', accion: () => app.comando({ tipo: 'bomba', id, accion: 'partir' }) },
        { texto: 'Detener', confirmar: `¿Detener ${id}?`, accion: () => app.comando({ tipo: 'bomba', id, accion: 'detener' }) },
      ], ev)
    },
    menuMalla(id, ev) {
      const m = estado?.mallas[id]
      menu(`Mallas ${id}`, [
        { texto: m ? `ΔP ${num(m.dP / 1e5, 2)} bar (máx. ${num(m.dPmax / 1e5, 2)})` : '', deshabilitado: true },
        { texto: 'Retrolavar', accion: () => app.comando({ tipo: 'mallas', id, accion: 'retrolavar' }) },
        { texto: m?.conmutacion ? 'Detener conmutación' : 'Activar conmutación', accion: () => app.comando({ tipo: 'mallas', id, accion: m?.conmutacion ? 'conmutacion_off' : 'conmutacion_on' }) },
        { texto: 'Lavado ácido', confirmar: 'El lavado ácido requiere la zona fuera de servicio. ¿Continuar?', accion: () => app.comando({ tipo: 'mallas', id, accion: 'lavado_acido' }) },
      ], ev)
    },
    menuVenteo(vaso, ev) {
      const abierto = !!estado?.vasos[vaso]?.presion?.venteo
      const nombre = vaso === 'dig' ? 'del digestor' : 'del impregnador'
      menu(`Venteo ${nombre}`, [
        { texto: abierto ? 'Abierto a la atmósfera' : 'Cerrado', deshabilitado: true },
        abierto
          ? { texto: 'Cerrar venteo', accion: () => app.comando({ tipo: 'venteo', id: vaso, accion: 'cerrar' }) }
          : { texto: 'Abrir venteo', confirmar: `Abrir el venteo ${nombre} lo deja a presión atmosférica. Con el licor sobre 100 °C, hierve. ¿Abrir?`, accion: () => app.comando({ tipo: 'venteo', id: vaso, accion: 'abrir' }) },
      ], ev)
    },
    menuCalentador(id, ev) {
      const c = estado?.equipos.calentadores?.[id]
      menu(`Calentador ${id}`, [
        { texto: c ? `Unidad ${c.unidadActiva === 0 ? 'A' : 'B'} · incrustación ${num(c.incrustacion, 2)}${c.saturado ? ' · SATURADO' : ''}` : '', deshabilitado: true },
        { texto: 'Conmutar a la unidad de respaldo', confirmar: '¿Conmutar el calentador?', accion: () => app.comando({ tipo: 'calentador', id, accion: 'conmutar' }) },
        { texto: 'Lavado ácido de la unidad en espera', accion: () => app.comando({ tipo: 'calentador', id, accion: 'lavado_acido' }) },
      ], ev)
    },
  }

  function ir(id) {
    const def = PANTALLAS.find((p) => p.id === id) ?? PANTALLAS[0]
    pantalla?.destruir?.()
    idPantalla = def.id
    pantalla = def.crear(app)
    reemplazar(contenedor, pantalla.elemento)
    for (const b of nav.querySelectorAll('button')) b.classList.toggle('activo', b.dataset.pantalla === def.id)
    if (estado) pantalla.actualizar(estado)
    marcarResaltado()
    app.jugador('pantalla', def.id)
    try { localStorage.setItem('digestor:pantalla', def.id) } catch { /* sin almacenamiento */ }
  }

  function abrirLateral(p) {
    lateral?.cerrar?.()
    lateral = p
    reemplazar(panelLateral, p.elemento)
    panelLateral.classList.add('abierto')
    if (estado) p.actualizar(estado)
  }

  function cerrarLateral() {
    menuAbierto?.remove()
    menuAbierto = null
    lateral?.cerrar?.()
    lateral = null
    panelLateral.classList.remove('abierto')
    panelLateral.replaceChildren()
  }

  function alternarInstructor() {
    ajustes.instructor = true
    abrirLateral(abrirInstructor(app))
  }

  /** Menú contextual junto al punto donde se hizo clic. */
  function menu(titulo, opciones, ev) {
    menuAbierto?.remove()
    const m = h('div', { class: 'menu-contextual' }, h('div', { class: 'titulo' }, titulo),
      opciones.filter((o) => o.texto).map((o) => h('button', {
        disabled: o.deshabilitado,
        onclick: () => {
          m.remove()
          menuAbierto = null
          if (o.confirmar && !confirm(o.confirmar)) return
          Promise.resolve(o.accion?.()).catch((e) => { if (e?.message) avisar(e.message) })
        },
      }, o.texto)))
    document.body.append(m)
    const x = Math.min(ev?.clientX ?? 100, window.innerWidth - m.offsetWidth - 8)
    const y = Math.min(ev?.clientY ?? 100, window.innerHeight - m.offsetHeight - 8)
    m.style.left = `${Math.max(4, x)}px`
    m.style.top = `${Math.max(4, y)}px`
    menuAbierto = m
    setTimeout(() => document.addEventListener('pointerdown', function cerrar(e) {
      if (!m.contains(e.target)) {
        m.remove()
        if (menuAbierto === m) menuAbierto = null
        document.removeEventListener('pointerdown', cerrar)
      }
    }), 0)
  }

  function menuPartida(ev) {
    menu('Partida', [
      { texto: 'Guardar en este navegador', accion: async () => { guardarLocal(await cliente.guardar()); avisar('Partida guardada') } },
      { texto: 'Exportar a archivo (JSON)', accion: async () => exportarArchivo(await cliente.guardar()) },
      { texto: 'Volver al menú inicial', confirmar: 'Se perderá lo no guardado. ¿Continuar?', accion: () => location.reload() },
    ], ev)
  }

  // ---- Actualización con cada instantánea (agrupada por cuadro) ----
  function dibujar() {
    pendienteDibujo = false
    if (!estado || oculto) return
    relojEl.textContent = reloj(estado.t)
    for (const b of botonesVel) b.classList.toggle('activo', Number(b.dataset.vel) === estado.velocidad)
    const r = cliente.rendimiento()
    if (r && estado.velocidad >= 10) {
      // Aviso si el computador no alcanza la velocidad pedida.
      const real = r.simuladoPorSegundo
      rendimientoEl.textContent = real < estado.velocidad * 0.85 ? `simulando ×${num(real, 0)}` : ''
    } else rendimientoEl.textContent = ''
    const lista = estado.control.alarmas.lista
    contadores.forEach((c, i) => {
      const n = lista.filter((a) => a.prioridad === i + 1 && (a.activa || !a.reconocida)).length
      c.textContent = String(n)
      c.classList.toggle('hay', n > 0)
    })
    const sinRec = lista.filter((a) => !a.reconocida)
    const top = sinRec[0] ?? lista[0]
    if (top) {
      reemplazar(banner,
        h('span', { class: `marca${top.reconocida ? '' : ' parpadea'}`, estilo: { background: `var(--p${top.prioridad})` } }),
        h('span', { class: 'num' }, top.id),
        h('span', {}, top.mensaje),
        sinRec.length > 1 ? h('span', { class: 'suave' }, `(+${sinRec.length - 1} sin reconocer)`) : null)
    } else reemplazar(banner, h('span', { class: 'suave' }, 'Sin alarmas activas'))
    pantalla?.actualizar(estado)
    lateral?.actualizar(estado)
  }

  let inicial = 'digestor'
  try { inicial = localStorage.getItem('digestor:pantalla') ?? inicial } catch { /* sin almacenamiento */ }
  cliente.suscribir((e) => {
    estado = e
    // La primera pantalla se arma con el primer estado (algunas lo necesitan para construirse).
    if (!pantalla) ir(inicial)
    // Sin sala 3D, el operador ya está frente al DCS (objetivo «acércate a la consola»).
    if (!opciones.alVolver) app.jugador('dcs')
    if (reinformar && e.escenario?.mision && !e.escenario.mision.terminada) {
      reinformar = false
      if (!oculto) { app.jugador('dcs'); app.jugador('pantalla', idPantalla) }
    }
    if (!pendienteDibujo) {
      pendienteDibujo = true
      requestAnimationFrame(dibujar)
    }
  })

  return app
}
