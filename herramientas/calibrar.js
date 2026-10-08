// Calibración del modelo cinético al caso base (docs/MODELO.md §13).
//
//   npm run calibrar            ajusta y escribe config/cinetica.json + docs/CALIBRACION.md
//   npm run calibrar -- --seco  solo informa, no escribe
//   Si algún objetivo queda fuera de tolerancia no escribe nada, salvo con --forzar.
//
// Ajusta seis factores multiplicativos (en escala logarítmica) sobre constantes
// de config/cinetica.json para reproducir seis objetivos del caso base en
// estado estacionario, con Levenberg–Marquardt y jacobiano por diferencias
// finitas. Las energías de activación y los órdenes de reacción NO se tocan.

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { cargarConfig } from './cargarConfig.js'
import { crearPlanta } from '../src/sim/planta.js'
import { correrHastaEstacionario } from './estacionario.js'
import { aInterno } from '../src/sim/unidades.js'
import { generarTabla } from './tabla-parametros.js'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const seco = process.argv.includes('--seco')
const forzar = process.argv.includes('--forzar')

/** Parámetros ajustables: cada uno multiplica una o más constantes (rutas en cinetica.json). */
export const PARAMETROS = [
  { id: 'deslignificacion', objetivo: 'kappa', rutas: [
    'reacciones.lignina_rapida.A', 'reacciones.lignina_principal_OH.A',
    'reacciones.lignina_principal_HS.A', 'reacciones.lignina_residual.A'] },
  { id: 'consumo_alcali_lignina', objetivo: 'alcaliExtraccion', rutas: ['consumo_alcali.alfa_lignina'] },
  { id: 'degradacion_carbohidratos', objetivo: 'rendimiento', rutas: [
    'reacciones.celulosa_peeling.A', 'reacciones.celulosa_hidrolisis.A', 'reacciones.xilano_disolucion.A',
    'reacciones.xilano_hidrolisis.A', 'reacciones.otros_peeling.A', 'reacciones.otros_hidrolisis.A'] },
  { id: 'formacion_HexA', objetivo: 'kappaHexA', rutas: ['reacciones.hexa_formacion.A'] },
  { id: 'escision_celulosa', objetivo: 'viscosidad', rutas: ['reacciones.viscosidad.A'] },
  { id: 'impregnacion', objetivo: 'rechazos', rutas: ['impregnacion.A'] },
]

const obtener = (obj, ruta) => ruta.split('.').reduce((o, k) => o[k], obj)

/** Configuración con los factores exp(x) aplicados. */
function configCon(base, x) {
  const cfg = JSON.parse(JSON.stringify(base))
  PARAMETROS.forEach((par, i) => {
    for (const r of par.rutas) obtener(cfg.cinetica, r).valor *= Math.exp(x[i])
  })
  return cfg
}

/** Objetivos y tolerancias del caso base. */
function objetivos(cfg) {
  const o = cfg.caso_base.objetivos_calibracion
  return PARAMETROS.map((par) => ({
    id: par.objetivo,
    valor: aInterno(o[par.objetivo].objetivo.valor, o[par.objetivo].objetivo.unidad),
    tol: aInterno(o[par.objetivo].tolerancia.valor, o[par.objetivo].tolerancia.unidad),
  }))
}

/** Resuelve A·x = b (Gauss con pivoteo parcial). */
function resolver(A, b) {
  const n = b.length
  const M = A.map((f, i) => [...f, b[i]])
  for (let c = 0; c < n; c++) {
    let piv = c
    for (let f = c + 1; f < n; f++) if (Math.abs(M[f][c]) > Math.abs(M[piv][c])) piv = f
    ;[M[c], M[piv]] = [M[piv], M[c]]
    for (let f = c + 1; f < n; f++) {
      const k = M[f][c] / M[c][c]
      for (let j = c; j <= n; j++) M[f][j] -= k * M[c][j]
    }
  }
  const x = new Array(n).fill(0)
  for (let f = n - 1; f >= 0; f--) {
    let s = M[f][n]
    for (let j = f + 1; j < n; j++) s -= M[f][j] * x[j]
    x[f] = s / M[f][f]
  }
  return x
}

export function calibrar({ base = cargarConfig(), maxIter = 25, registro = console.log } = {}) {
  const obj = objetivos(base)
  let evaluaciones = 0

  /** Corre la planta con los factores x, partiendo (si hay) de un estado previo. */
  function evaluar(x, inicio) {
    evaluaciones++
    const cfg = configCon(base, x)
    const planta = crearPlanta(cfg)
    if (inicio) planta.cargar({ ...inicio, config: cfg })
    const k = correrHastaEstacionario(planta, { minHoras: inicio ? 5 : 12, maxHoras: 30 })
    const y = obj.map((o) => k[o.id])
    const r = obj.map((o, i) => (y[i] - o.valor) / o.tol)
    return { x, y, r, costo: r.reduce((s, v) => s + v * v, 0), k, guardado: planta.guardar() }
  }

  const n = PARAMETROS.length
  let actual = evaluar(new Array(n).fill(0), null)
  let lambda = 1e-2
  registro(`Inicio: ${formato(actual, obj)}`)
  for (let it = 1; it <= maxIter; it++) {
    if (actual.r.every((v) => Math.abs(v) <= 1)) break
    // Jacobiano por diferencias finitas (en log del factor).
    const h = 0.1
    const J = obj.map(() => new Array(n).fill(0))
    for (let j = 0; j < n; j++) {
      const x = actual.x.slice()
      x[j] += h
      const e = evaluar(x, actual.guardado)
      for (let i = 0; i < obj.length; i++) J[i][j] = (e.r[i] - actual.r[i]) / h
    }
    // Paso de Levenberg–Marquardt, reintentando con más amortiguación si empeora.
    let mejoro = false
    for (let intento = 0; intento < 6 && !mejoro; intento++) {
      const JtJ = Array.from({ length: n }, (_, a) => Array.from({ length: n }, (_, b) =>
        obj.reduce((s, _o, i) => s + J[i][a] * J[i][b], 0)))
      const Jtr = Array.from({ length: n }, (_, a) => obj.reduce((s, _o, i) => s + J[i][a] * actual.r[i], 0))
      const A = JtJ.map((f, a) => f.map((v, b) => v + (a === b ? lambda * (JtJ[a][a] + 1e-9) : 0)))
      let d = resolver(A, Jtr.map((v) => -v))
      const norma = Math.max(...d.map(Math.abs))
      if (norma > 1.5) d = d.map((v) => (1.5 * v) / norma) // como máximo un factor e^1,5 por paso
      const prueba = evaluar(actual.x.map((v, j) => v + d[j]), actual.guardado)
      if (prueba.costo < actual.costo) {
        actual = prueba
        lambda = Math.max(lambda / 3, 1e-4)
        mejoro = true
      } else {
        lambda *= 10
      }
    }
    registro(`Iteración ${it}: ${formato(actual, obj)}\n   factores: ${actual.x.map((v, j) => `${PARAMETROS[j].id} ${Math.exp(v).toFixed(3)}`).join(' · ')}`)
    if (!mejoro) break
  }
  return { actual, obj, evaluaciones, configFinal: configCon(base, actual.x) }
}

function formato(e, obj) {
  return obj.map((o, i) => `${o.id} ${e.y[i].toFixed(o.id === 'viscosidad' ? 0 : 2)}`).join(' · ') + ` · costo ${e.costo.toFixed(2)}`
}

/** Redondea a 4 cifras significativas. */
const cifras = (v) => Number(v.toPrecision(4))

function escribir(base, res) {
  const fecha = new Date().toISOString().slice(0, 10)
  const cin = JSON.parse(JSON.stringify(base.cinetica))
  const filas = []
  PARAMETROS.forEach((par, i) => {
    for (const r of par.rutas) {
      const p = obtener(cin, r)
      const antes = p.valor
      p.valor = cifras(antes * Math.exp(res.actual.x[i]))
      p.origen = 'calibrado'
      p.nota = `calibrado ${fecha} (objetivo: ${par.objetivo})`
      filas.push(`| ${r} | ${antes.toExponential(3)} | ${p.valor.toExponential(3)} | ${Math.exp(res.actual.x[i]).toFixed(3)} |`)
    }
  })
  writeFileSync(join(raiz, 'config', 'cinetica.json'), JSON.stringify(cin, null, 2) + '\n')
  const k = res.actual.k
  const md = `# Calibración del caso base

Generado por \`npm run calibrar\` el ${fecha}. ${res.evaluaciones} simulaciones hasta estado estacionario.

Método: Levenberg–Marquardt sobre el logaritmo de seis factores multiplicativos;
jacobiano por diferencias finitas; cada evaluación corre la planta hasta que el
kappa cambia menos de 0,05 y el rendimiento menos de 0,02 puntos en una hora.
Las energías de activación y los órdenes de reacción no se ajustan.

## Objetivos

| Variable | Objetivo | Tolerancia | Resultado |
|----------|----------|------------|-----------|
${res.obj.map((o, i) => `| ${o.id} | ${o.valor} | ±${o.tol} | ${res.actual.y[i].toFixed(o.id === 'viscosidad' ? 0 : 2)} |`).join('\n')}

Otros indicadores del estado calibrado: factor H en el soplado ${k.H.toFixed(0)},
álcali residual en el soplado ${k.alcaliSoplado.toFixed(1)} g/L (como NaOH).

## Parámetros ajustados

| Constante (config/cinetica.json) | Antes | Después | Factor |
|----------------------------------|-------|---------|--------|
${filas.join('\n')}
`
  writeFileSync(join(raiz, 'docs', 'CALIBRACION.md'), md)
  writeFileSync(join(raiz, 'docs', 'manual', 'anexo-a-parametros.md'), generarTabla(cargarConfig()))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const base = cargarConfig()
  const t0 = process.hrtime.bigint()
  const res = calibrar({ base })
  const s = Number(process.hrtime.bigint() - t0) / 1e9
  console.log(`\n${res.evaluaciones} evaluaciones en ${s.toFixed(0)} s`)
  const ok = res.actual.r.every((v) => Math.abs(v) <= 1)
  console.log(ok ? 'Todos los objetivos dentro de tolerancia.' : 'ATENCIÓN: hay objetivos fuera de tolerancia.')
  if (!ok && !forzar && !seco) {
    console.log('No se escribe la configuración (use --forzar para escribirla igual).')
  } else if (!seco) {
    escribir(base, res)
    console.log('Escritos config/cinetica.json, docs/CALIBRACION.md y docs/manual/anexo-a-parametros.md')
    console.log('Actualice las cifras del manual con: npm run tablas-manual')
  }
}
