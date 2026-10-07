// Punto de entrada del juego: menú, preparación de la planta y luego la sala
// de control 3D (con el DCS en 2D al operar una consola) o solo las pantallas.

import './hmi/estilos.css'
import sala from '../config/sala.json'
import { crearCliente } from './puente/cliente.js'
import { crearApp } from './hmi/app.js'
import { mostrarMenu, mostrarCarga } from './ui/menu.js'
import { crearHUD } from './ui/hud.js'
import { crearCapaMision } from './ui/mision.js'
import { avisar } from './hmi/dom.js'
import { aplicarAjustes } from './ui/ajustes.js'

/** Prepara la planta (caso base, misión u operación libre) con la pantalla de espera. */
async function arrancar(cliente, op) {
  const cerrar = mostrarCarga(cliente, op.mision ? 'Preparando la situación inicial de la misión…' : undefined)
  try {
    await cliente.perfiles(true)
    await cliente.iniciar({ semilla: op.semilla, guardado: op.guardado, mision: op.mision, generador: op.generador, velocidad: 1 })
  } finally {
    cerrar()
  }
}

async function iniciar() {
  const cliente = crearCliente()
  const catalogo = await cliente.catalogo().catch(() => null)
  let op
  for (;;) {
    op = await mostrarMenu(catalogo)
    try {
      await arrancar(cliente, op)
      break
    } catch (e) {
      avisar(`No se pudo iniciar: ${e.message}`, 10000) // se vuelve al menú
    }
  }
  const raiz = document.getElementById('raiz')
  const dificultades = catalogo?.dificultades
  const app = op.modo !== 'sala' ? crearApp(raiz, cliente, { dificultades }) : await iniciarSala(raiz, cliente, dificultades)
  window.__app = app
  // La dificultad (ruido, pistas, perfiles) se aplica a cada partida que parte.
  const aplicar = () => aplicarAjustes(app, dificultades).catch(() => {})
  aplicar()
  // Misiones: diálogos, objetivos, pistas e informe; acciones al terminar.
  const misiones = catalogo?.misiones ?? []
  const capa = crearCapaMision(cliente, {
    resaltar: (tag) => app.resaltar(tag),
    alTerminar: async (accion, mision) => {
      if (accion === 'menu') return location.reload()
      if (accion === 'seguir') return
      try {
        if (accion === 'reintentar') await cliente.reintentar()
        else {
          const i = misiones.findIndex((m) => m.id === mision.id)
          const id = accion === 'siguiente' ? misiones[i + 1]?.id : mision.id
          if (!id) return avisar('Completaste todas las misiones disponibles.', 6000)
          await arrancar(cliente, { mision: id, semilla: 1000 + misiones.findIndex((m) => m.id === id) })
        }
        capa.reiniciar(accion === 'reintentar')
        app.olvidarJugador()
        aplicar()
      } catch (e) {
        avisar(e.message, 8000)
      }
    },
  })
}

async function iniciarSala(raiz, cliente, dificultades) {
  // Three.js se carga solo si se entra a la sala (el modo de pantallas no lo necesita).
  const { crearMundo } = await import('./mundo3d/mundo.js')
  const capaMundo = document.createElement('div')
  capaMundo.id = 'mundo'
  const capaDCS = document.createElement('div')
  capaDCS.id = 'dcs'
  raiz.append(capaMundo, capaDCS)
  let calidad = 'medio'
  try { calidad = localStorage.getItem('digestor:calidad') ?? (matchMedia('(pointer: coarse)').matches ? 'bajo' : 'medio') } catch { /* sin almacenamiento */ }

  const app = crearApp(capaDCS, cliente, { alVolver: cerrarDCS, dificultades })
  app.mostrar(false)
  window.__app = app
  let mundo = null
  let hud = null

  function abrirDCS(pantalla) {
    mundo.activar(false)
    hud.mostrar(false)
    capaDCS.classList.add('abierto')
    app.mostrar(true)
    if (pantalla) app.ir(pantalla)
    app.jugador('dcs')
  }
  function cerrarDCS() {
    app.cerrarLateral()
    app.mostrar(false)
    capaDCS.classList.remove('abierto')
    hud.mostrar(true)
    mundo.activar(true)
  }
  function crear(jugador = null) {
    mundo = crearMundo(capaMundo, cliente, {
      sala,
      calidad,
      jugador,
      alCuadro: () => hud?.palanca(),
      alInteractuar: (a) => {
        if (a.pantalla) abrirDCS(a.pantalla)
        else if (a.tipo === 'telefono') avisar('Teléfono: sin llamadas pendientes.')
        else if (a.tipo === 'radio') app.radio()
      },
      alCambiarCercana: (a) => {
        hud?.cercana(a)
        if (a) app.jugador('cerca', a.id)
      },
    })
    window.__mundo = mundo
  }
  crear()
  hud = crearHUD(raiz, {
    esTactil: mundo.esTactil,
    calidad,
    palanca: () => mundo.palanca(),
    alOperar: () => mundo.interactuar(),
    alAbrirPantallas: () => abrirDCS(null),
    alCambiarCalidad: (c) => {
      calidad = c
      try { localStorage.setItem('digestor:calidad', c) } catch { /* sin almacenamiento */ }
      const jugador = mundo.info().jugador
      mundo.destruir()
      crear(jugador)
      hud.cercana(null)
    },
  })
  cliente.suscribir((e) => hud.actualizar(e))
  window.addEventListener('keydown', (e) => {
    const editando = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement
    if (e.key === 'Escape' && capaDCS.classList.contains('abierto') && !editando) cerrarDCS()
  })
  return app
}

iniciar()
