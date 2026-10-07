// Tabla de sensibilidades del caso base: aplica cambios típicos de operación
// desde el estado estacionario y muestra el efecto después de 8 h.
//   npm run sensibilidades
import { cargarConfig } from './cargarConfig.js'
import { crearPlanta } from '../src/sim/planta.js'
import { correrHastaEstacionario, indicadoresCalidad } from './estacionario.js'

const LB = ['lb_alim', 'lb_transf', 'lb_sup', 'lb_inf']
const AST = ['astillas', 'transferencia', 'soplado']
const esc = (ids, campo, f) => ids.map((id) => ({ tipo: 'ajustar', id, campo, f }))

const CASOS = [
  ['+3 °C en ambas circulaciones de cocción', [{ tipo: 'ajustar', id: 'circ_sup', campo: 'T_salida', s: 3 }, { tipo: 'ajustar', id: 'circ_inf', campo: 'T_salida', s: 3 }]],
  ['+10 % de licor blanco (carga 18 → 19,8 %)', esc(LB, 'caudal', 1.1)],
  ['−10 % de licor blanco (carga 18 → 16,2 %)', esc(LB, 'caudal', 0.9)],
  ['+10 % de ritmo sin compensar', esc(AST, 'caudalMadera', 1.1)],
  ['Doble filtrado a las circulaciones', esc(['fil_sup', 'fil_inf'], 'caudal', 2)],
  ['Humedad de astillas 47,5 → 52,5 %', [{ tipo: 'fuente', id: 'astillas', campo: 'humedad', s: 0.05 }]],
  ['Madera 15 % menos reactiva', [{ tipo: 'fuente', id: 'astillas', campo: 'reactividad', f: 0.85 }]],
  ['Sulfidez 32 → 28 %', [{ tipo: 'fuente', id: 'licor_blanco', campo: 'HS', f: (0.28 / 1.72) / (0.32 / 1.68) }]],
  ['Vaporización 95 → 70 %', [{ tipo: 'fuente', id: 'astillas', campo: 'vaporizacion', s: -0.25 }]],
]

const base = crearPlanta(cargarConfig())
correrHastaEstacionario(base, { minHoras: 12 })
const guardado = base.guardar()
const ref = indicadoresCalidad(base)
const fila = (n, k) => `| ${n} | ${k.kappa.toFixed(1)} | ${k.kappaHexA.toFixed(1)} | ${k.rendimiento.toFixed(1)} | ${k.viscosidad.toFixed(0)} | ${k.alcaliExtraccion.toFixed(1)} | ${k.alcaliSoplado.toFixed(1)} | ${k.rechazos.toFixed(2)} | ${k.H.toFixed(0)} |`
console.log('| Caso (efecto a las 8 h) | Kappa | κ HexA | Rend. % | Visc. mL/g | EA extr. g/L | EA sopl. g/L | Rech. % | H |')
console.log('|---|---|---|---|---|---|---|---|---|')
console.log(fila('Caso base', ref))
for (const [nombre, cambios] of CASOS) {
  const p = crearPlanta(cargarConfig())
  p.cargar(guardado)
  const e = p.estadoInterno()
  for (const c of cambios) {
    const act = c.tipo === 'ajustar' ? e.ajustes[c.id][c.campo] : c.campo === 'HS' ? e.fuentes[c.id].c[p.modelo().idx.HS] : e.fuentes[c.id][c.campo]
    p.enviarComando({ tipo: c.tipo, id: c.id, campo: c.campo, valor: c.f !== undefined ? act * c.f : act + c.s })
  }
  p.avanzar(8 * 3600)
  console.log(fila(nombre, indicadoresCalidad(p)))
}
