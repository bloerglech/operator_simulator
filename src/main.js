// Punto de entrada del juego (Fase 3: pantallas DCS en 2D).

import './hmi/estilos.css'
import { crearCliente } from './puente/cliente.js'
import { crearApp } from './hmi/app.js'
import { mostrarMenu, mostrarCarga } from './ui/menu.js'
import { avisar } from './hmi/dom.js'

async function iniciar() {
  const cliente = crearCliente()
  const op = await mostrarMenu()
  const cerrar = mostrarCarga(cliente)
  try {
    await cliente.perfiles(true)
    await cliente.iniciar({ ...op, velocidad: 1 })
  } catch (e) {
    cerrar()
    avisar(`No se pudo iniciar: ${e.message}`, 10000)
    return
  }
  cerrar()
  window.__app = crearApp(document.getElementById('raiz'), cliente)
}

iniciar()
