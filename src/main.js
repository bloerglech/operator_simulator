// Punto de entrada del juego: menú, preparación de la planta y luego la sala
// de control 3D (con el DCS en 2D al operar una consola) o solo las pantallas.

import './hmi/estilos.css'
import sala from '../config/sala.json'
import { crearCliente } from './puente/cliente.js'
import { crearApp } from './hmi/app.js'
import { mostrarMenu, mostrarCarga } from './ui/menu.js'
import { crearHUD } from './ui/hud.js'
import { avisar } from './hmi/dom.js'

async function iniciar() {
  const cliente = crearCliente()
  let op
  for (;;) {
    op = await mostrarMenu()
    const cerrar = mostrarCarga(cliente)
    try {
      await cliente.perfiles(true)
      await cliente.iniciar({ semilla: op.semilla, guardado: op.guardado, velocidad: 1 })
      cerrar()
      break
    } catch (e) {
      cerrar()
      avisar(`No se pudo iniciar: ${e.message}`, 10000) // se vuelve al menú
    }
  }
  const raiz = document.getElementById('raiz')
  if (op.modo !== 'sala') {
    window.__app = crearApp(raiz, cliente)
    return
  }
  await iniciarSala(raiz, cliente)
}

async function iniciarSala(raiz, cliente) {
  // Three.js se carga solo si se entra a la sala (el modo de pantallas no lo necesita).
  const { crearMundo } = await import('./mundo3d/mundo.js')
  const capaMundo = document.createElement('div')
  capaMundo.id = 'mundo'
  const capaDCS = document.createElement('div')
  capaDCS.id = 'dcs'
  raiz.append(capaMundo, capaDCS)
  let calidad = 'medio'
  try { calidad = localStorage.getItem('digestor:calidad') ?? (matchMedia('(pointer: coarse)').matches ? 'bajo' : 'medio') } catch { /* sin almacenamiento */ }

  const app = crearApp(capaDCS, cliente, { alVolver: cerrarDCS })
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
        else if (a.tipo === 'radio') avisar('Radio: el operador de terreno no informa novedades.')
      },
      alCambiarCercana: (a) => hud?.cercana(a),
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
}

iniciar()
