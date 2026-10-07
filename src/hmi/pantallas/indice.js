// Lista de pantallas DCS (orden de la navegación).

import { alimentacion, digestor, circulaciones, extracciones, fondo } from './mimicos.js'
import { crearCalidad } from './calidad.js'
import { crearTendencias } from './tendencias.js'
import { crearAlarmas } from './alarmas.js'
import { crearPerfiles } from './perfiles.js'

export const PANTALLAS = [
  { id: 'alimentacion', nombre: '1 Alimentación', crear: alimentacion },
  { id: 'digestor', nombre: '2 Digestor', crear: digestor },
  { id: 'circulaciones', nombre: '3 Circulaciones', crear: circulaciones },
  { id: 'extracciones', nombre: '4 Extracciones y flash', crear: extracciones },
  { id: 'fondo', nombre: '5 Fondo y soplado', crear: fondo },
  { id: 'calidad', nombre: '6 Calidad y laboratorio', crear: crearCalidad },
  { id: 'tendencias', nombre: '7 Tendencias', crear: crearTendencias },
  { id: 'alarmas', nombre: '8 Alarmas y eventos', crear: crearAlarmas },
  { id: 'perfiles', nombre: '9 Perfiles', crear: crearPerfiles },
]
