// Pruebas de escalón de todos los lazos: aplica un escalón de consigna a cada
// lazo (los esclavos en cascada se prueban en AUTO) y mide sobrepaso, tiempo
// de asentamiento y oscilación. Los escalones y límites están en
// config/lazos.json ("prueba") y los verifica también tests/sintonia.test.js.
//   npm run sintonia        → escribe docs/SINTONIA.md

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { cargarConfig } from './cargarConfig.js'
import { crearPlanta } from '../src/sim/planta.js'
import { crearSistema } from '../src/control/sistema.js'
import { desdeInterno } from '../src/sim/unidades.js'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const PASO = 5 // s entre muestras
const VENTANA = 6 // muestras del promedio móvil (30 s)

/** Estado caliente (sin control) del que parten todas las pruebas. */
export function estadoCaliente(config, horas = 8, semilla = 7) {
  const p = crearPlanta(config, { semilla })
  p.avanzar(horas * 3600)
  return p.guardar()
}

/** Escalón de consigna en un lazo. Devuelve las métricas. */
export function pruebaEscalon(config, guardado, tag) {
  const sis = crearSistema(config, { semilla: 7 })
  sis.cargar(guardado)
  sis.avanzar(10)
  const pr = config.lazos.lazos.find((l) => l.tag === tag).prueba
  const cfgLazo = config.lazos.lazos.find((x) => x.tag === tag)
  const unidad = config.instrumentos.transmisores.find((t) => t.tag === cfgLazo.pv).unidad
  // Se evalúa la medición filtrada sin el ruido blanco del transmisor.
  const medida = () => desdeInterno(sis.estadoInterno().control.tx[cfgLazo.pv].filtro, unidad)
  for (const c of pr.preparar ?? []) sis.enviarComando(c)
  sis.avanzar(PASO)
  let l = sis.leerEstado().control.lazos[tag]
  if (l.modo === 'CAS') {
    sis.enviarComando({ tipo: 'lazo', id: tag, accion: 'modo', valor: 'AUTO' })
    sis.avanzar(PASO)
  }
  // Base: promedio de 2 min antes del escalón.
  let base = 0
  for (let i = 0; i < 24; i++) { sis.avanzar(PASO); base += medida() / 24 }
  l = sis.leerEstado().control.lazos[tag]
  const sp = l.sp + pr.escalon
  sis.enviarComando({ tipo: 'lazo', id: tag, accion: 'consigna', valor: sp })
  const d = sp - base
  const pvs = []
  const n = Math.round(pr.duracion / PASO)
  let salidaMin = Infinity
  let salidaMax = -Infinity
  for (let i = 0; i < n; i++) {
    sis.avanzar(PASO)
    const x = sis.leerEstado().control.lazos[tag]
    pvs.push(medida())
    salidaMin = Math.min(salidaMin, x.salida)
    salidaMax = Math.max(salidaMax, x.salida)
  }
  const ventana = Math.max(1, Math.round((pr.promedio ?? VENTANA * PASO) / PASO))
  const prom = pvs.map((_, i) => {
    const a = pvs.slice(Math.max(0, i - ventana + 1), i + 1)
    return a.reduce((s, x) => s + x, 0) / a.length
  })
  // Sobrepaso: máxima excursión más allá de la consigna, en % del escalón.
  const sobrepaso = Math.max(0, ...prom.slice(ventana).map((x) => ((x - sp) * Math.sign(d)) / Math.abs(d) * 100))
  // Asentamiento: último instante fuera de la banda de ±10 % del escalón
  // (o de la banda absoluta configurada, para variables que fluctúan por sí
  // mismas, como el nivel de astillas o la presión).
  const banda = Math.max(0.1 * Math.abs(d), pr.banda ?? 0)
  let ultimoFuera = -1
  prom.forEach((x, i) => { if (Math.abs(x - sp) > banda) ultimoFuera = i })
  const asentamiento = ultimoFuera === prom.length - 1 ? null : (ultimoFuera + 1) * PASO
  // Oscilación sostenida: cruces de la consigna en el último tercio con amplitud > banda.
  const cola = prom.slice(Math.floor((2 * prom.length) / 3))
  const amplitud = (Math.max(...cola) - Math.min(...cola)) / 2
  const oscila = amplitud > banda
  const ok = asentamiento !== null && asentamiento <= pr.asentamiento_max && sobrepaso <= pr.sobrepaso_max && !oscila
  const enc = Object.entries(sis.leerEstado().control.enclavamientos).filter(([, e]) => e.disparado).map(([k]) => k)
  return { tag, escalon: pr.escalon, sobrepaso, asentamiento, amplitud, oscila, salidaMin, salidaMax, enclavamientos: enc, ok: ok && enc.length === 0 }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const config = cargarConfig()
  const g = estadoCaliente(config)
  const filtro = process.argv.slice(2)
  const filas = []
  for (const l of config.lazos.lazos) {
    if (!l.prueba || (filtro.length && !filtro.includes(l.tag))) continue
    const r = pruebaEscalon(config, g, l.tag)
    const unidad = (config.instrumentos.transmisores.find((t) => t.tag === l.pv) ?? {}).unidad ?? ''
    console.log(r.ok ? 'OK ' : 'MAL', r.tag, `escalón ${r.escalon} ${unidad}`, `sobrepaso ${r.sobrepaso.toFixed(1)} %`,
      `asentamiento ${r.asentamiento ?? '—'} s (máx ${l.prueba.asentamiento_max})`, `amplitud final ${r.amplitud.toPrecision(3)}`,
      `salida ${r.salidaMin.toFixed(0)}–${r.salidaMax.toFixed(0)} %`, r.enclavamientos.join(','))
    filas.push(`| ${l.tag} | ${l.Kc} | ${l.Ti} | ${r.escalon} ${unidad} | ${r.sobrepaso.toFixed(1)} (≤ ${l.prueba.sobrepaso_max}) | ${r.asentamiento ?? '—'} (≤ ${l.prueba.asentamiento_max}) | ${r.salidaMin.toFixed(0)}–${r.salidaMax.toFixed(0)} | ${r.ok ? 'sí' : '**no**'} |`)
  }
  if (!filtro.length) {
    writeFileSync(join(raiz, 'docs', 'SINTONIA.md'), `# Sintonía de los lazos: pruebas de escalón

Generado por \`npm run sintonia\` (herramientas/sintonia.js). Cada lazo parte
del caso base cerca del estado estacionario (8 h sin control y luego control
en automático; los esclavos en cascada se prueban en AUTO). Se aplica un
escalón de consigna y se mide sobre el promedio móvil (30 s, o el configurado)
de la medición filtrada del transmisor, sin su ruido blanco:
sobrepaso (% del escalón), tiempo de asentamiento (último instante fuera de
±10 % del escalón, o de la banda absoluta configurada para variables que
fluctúan por sí mismas) y oscilación sostenida (amplitud en el último tercio
de la prueba mayor que esa banda). Los límites están en \`config/lazos.json\`
("prueba") y son supuestos de diseño, no datos de planta.

| Lazo | Kc | Ti (s) | Escalón | Sobrepaso % | Asentamiento s | Salida % | Cumple |
|------|----|--------|---------|-------------|----------------|----------|--------|
${filas.join('\n')}
`)
    console.log('Escrito docs/SINTONIA.md')
  }
}
