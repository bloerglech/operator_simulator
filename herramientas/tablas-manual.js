// Genera las cifras del manual que dependen de la configuración o del caso
// base calibrado, para que el texto no se desactualice (revisión A-01..A-03,
// D-01). Cada cifra vive en el manual entre marcas
//
//   <!-- generado:nombre -->…<!-- /generado -->
//
// y este script reemplaza lo que hay entre ellas. Uso: npm run tablas-manual
// (después de calibrar o de cambiar config/). La prueba tests/manual.test.js
// falla si el manual difiere de lo que genera este script.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { cargarConfig } from './cargarConfig.js'
import { crearPlanta } from '../src/sim/planta.js'
import { correrHastaEstacionario, indicadoresCalidad } from './estacionario.js'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
export const ARCHIVOS_MANUAL = ['02-proceso-y-diseno.md', '03-transporte-hidraulica-energia.md', '04-cinetica-y-calibracion.md',
  '05-presion-equipos-estados.md', '06-control-enclavamientos-alarmas.md', '07-operacion-y-perturbaciones.md']

// ---------------------------------------------------------------------------
// Formato (coma decimal y espacio de miles, como el resto del manual)

/** Número con `d` decimales, coma decimal y espacio de miles desde 1 000. */
export function num(x, d = 0) {
  const [ent, dec] = Math.abs(x).toFixed(d).split('.')
  const miles = ent.length > 3 ? ent.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ent
  return `${x < 0 && Number(x.toFixed(d)) !== 0 ? '−' : ''}${miles}${dec ? `,${dec}` : ''}`
}
const signo = (x, d = 0) => (Math.round(x * 10 ** d) > 0 ? '+' : '') + num(x, d)
const SUP = { '-': '⁻', '.': '·', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }
const sup = (s) => String(s).replace(/[-.\d]/g, (c) => SUP[c])
/** 8.832e-3 → «8,832·10⁻³» (4 cifras significativas, como config/). */
function cientifico(x) {
  const [m, e] = x.toExponential(3).split('e')
  return `${m.replace('.', ',')}·10${sup(Number(e))}`
}

// ---------------------------------------------------------------------------
// Bloques que salen solo de config/

const CONSTANTES = [
  ['reacciones.lignina_rapida', '$A$ lignina rápida'],
  ['reacciones.lignina_principal_OH', '$A$ lignina principal, término OH⁻'],
  ['reacciones.lignina_principal_HS', '$A$ lignina principal, término OH⁻·HS⁻'],
  ['reacciones.lignina_residual', '$A$ lignina residual'],
  ['consumo_alcali.alfa_lignina', '$\\alpha_L$', 'mol OH⁻/kg lignina'],
  ['reacciones.celulosa_peeling', '$A$ peeling de celulosa', null, 1], // orden 1 en OH⁻ fijo en cinetica.js
  ['reacciones.celulosa_hidrolisis', '$A$ hidrólisis de celulosa', null, 1],
  ['reacciones.xilano_disolucion', '$A$ disolución de xilano'],
  ['reacciones.hexa_formacion', '$A$ formación de HexA'],
  ['reacciones.viscosidad', '$A$ escisión de celulosa'],
  ['impregnacion', '$A$ impregnación'],
]
const ruta = (o, r) => r.split('.').reduce((x, k) => x[k], o)

function constantes(config) {
  const filas = CONSTANTES.map(([r, nombre, unidad, ordenFijo]) => {
    const nodo = ruta(config.cinetica, r)
    if (unidad) return `| ${nombre} | ${num(nodo.valor, 2)} | ${unidad} |`
    // Unidad de A según el orden total en concentraciones (a_OH + b_HS).
    const orden = ordenFijo ?? Math.round(((nodo.a_OH?.valor ?? 0) + (nodo.b_HS?.valor ?? 0)) * 10) / 10
    return `| ${nombre} | ${cientifico(nodo.A.valor)} | 1/s${orden ? `·(mol/L)${sup(-orden)}` : ''} |`
  })
  return `| Constante | Valor | Unidad |\n|-----------|-------|--------|\n${filas.join('\n')}`
}

/** Frase de los umbrales de condensación y reprecipitación (sección 4.3). */
function umbrales(config) {
  const c = config.cinetica.reacciones
  const OHc = c.condensacion.OH_c.valor
  const n = c.condensacion.n.valor
  const g = (oh) => 1 / (1 + (oh / OHc) ** n)
  return `$OH_c$ = ${num(OHc)} g/L y n = ${num(n)} (supuestos): g vale ≈ ${num(g(2 * OHc), 2)} con ${num(2 * OHc)} g/L, ` +
    `${num(g(OHc), 1)} con ${num(OHc)} g/L y ≈ ${num(g(OHc / 2), 2)} con ${num(OHc / 2, 1)} g/L. Además, la lignina ya disuelta ` +
    `**reprecipita** sobre la fibra cuando el álcali cae bajo ${num(c.reprecipitacion.OH_umbral.valor)} g/L:`
}

const extFinal = (config) => num(config.caso_base.caudales.ext_final.valor)
const filFondo = (config) => num(config.caso_base.caudales.fil_fondo.valor)
const ligPorKappa = (config) => num(config.cinetica.kappa.lignina_por_kappa.valor, 2)

/** 8.79e-4 → «8{,}79\times10^{-4}» (3 cifras, para fórmulas). */
function tex(x) {
  const [m, e] = x.toExponential(2).split('e')
  return `${m.replace('.', '{,}')}\\times10^{${Number(e)}}`
}

/**
 * Verificación de orden de magnitud de la lignina principal (sección 4.10),
 * con el álcali dentro de la astilla que muestra el perfil (≈ 11 g/L).
 */
function ordenMagnitud(config) {
  const c = config.cinetica
  const OH = 0.28 // mol/L dentro de la astilla en las zonas de cocción (≈ 11 g/L)
  const HS = 0.2 // mol/L
  const DS = 120 // g/L de sólidos orgánicos en las zonas de cocción
  const p1 = c.reacciones.lignina_principal_OH.A.valor
  const p2 = c.reacciones.lignina_principal_HS
  const a = p2.a_OH.valor
  const b = p2.b_HS.valor
  const k = p1 * OH + p2.A.valor * OH ** a * HS ** b
  const fDS = 1 / (1 + c.solidos_disueltos.kappa_DS.valor * DS)
  const tau = 1 / (k * fDS) / 60 // min
  const n = (2.5 * 60) / tau
  return `**Verificación de orden de magnitud.** Con [OH⁻] ≈ ${num(OH, 2)} mol/L (≈ ${num(OH * 40)} g/L, el álcali dentro de la astilla en las zonas de cocción del perfil de abajo) y\n` +
    `[HS⁻] ≈ ${num(HS, 1)} mol/L, la lignina principal decae a 150 °C con\n\n` +
    `$$k ≈ ${tex(p1)}\\times${num(OH, 2).replace(',', '{,}')} + ${tex(p2.A.valor)}\\times${num(OH, 2).replace(',', '{,}')}^{${num(a, 1).replace(',', '{,}')}}\\times${num(HS, 1).replace(',', '{,}')}^{${num(b, 1).replace(',', '{,}')}} ≈ ${tex(k)}\\ \\mathrm{s^{-1}}$$\n\n` +
    `y, con el freno por sólidos disueltos ($f_{DS}$ ≈ ${num(fDS, 2)} con ${num(DS)} g/L), τ ≈ ${num(tau)} min. En\n` +
    `≈ 2,5 h de cocción efectiva son ≈ ${num(n)} constantes de tiempo: la lignina principal baja a ≈ ${num(100 * Math.exp(-n))} % de la inicial\n` +
    `y el kappa final queda dominado por la lignina residual y los HexA, que es lo que se observa en eucalipto.`
}

// ---------------------------------------------------------------------------
// Capacidad hidráulica del digestor (sección 5.1, revisión B-04 y A-05)

const V_LIQ = 3500 // m³ de licor en el digestor lleno (orden de magnitud del caso base)
const P_ATM = 101325

function capacidadDigestor(config) {
  const h = config.hidraulica
  const bl = h.compresibilidad_licor.valor
  const bv = h.compresibilidad_vaso.valor
  const fg = h.fraccion_gas.valor / 100
  const P = config.equipos.presion.dig.P_diseno.valor * 1e5 + P_ATM // Pa abs
  const Cl = V_LIQ * (bl + bv)
  const Cg = (V_LIQ * fg) / P
  return { Cl, Cg, C: Cl + Cg, P, fg, bl, bv }
}
/** 8.74e-6 → «8,7·10⁻⁶» (2 cifras significativas). */
function cort(x) {
  const [m, e] = x.toExponential(1).split('e')
  return `${m.replace('.', ',')}·10${sup(Number(e))}`
}

function capacidad(config) {
  const { Cl, Cg, C, P, fg, bl, bv } = capacidadDigestor(config)
  const q = 100 / 3600 // ejemplo: se cierra la extracción principal (≈ 100 m³/h)
  const dPdt = q / C
  const t1bar = 1e5 / dPdt
  const Ccolchon = 100 / (6e5 + P_ATM) // 100 m³ de gas a 6 bar(g)
  return `$$C = V_{líquido}\\,(\\beta_{licor} + \\beta_{vaso}) + \\frac{V_{gas}}{P_{abs}}$$

con $\\beta_{licor}$ ≈ ${cort(bl)} Pa⁻¹ (compresibilidad del agua), $\\beta_{vaso}$ ≈ ${cort(bv)} Pa⁻¹
(elasticidad del manto, supuesto) y un poco de **gas arrastrado**: aire e
incondensables que entran con las astillas, ${num(fg * 100, 1)} % del volumen de licor
(supuesto). Para ≈ ${num(V_LIQ)} m³ de licor a ${num(P / 1e5, 1)} bar(a), el término líquido es
${cort(Cl)} m³/Pa y el del gas ${cort(Cg)} m³/Pa: **una fracción mínima de gas
domina la capacidad**, que suma C ≈ ${cort(C)} m³/Pa. El término del gas usa la
presión absoluta (compresión isotérmica): cerca de la atmósfera el vaso es
mucho más "blando" que a presión de operación. Entonces

$$\\frac{dP}{dt} = \\frac{Q_{entra} - Q_{sale}}{C}$$

**Ejemplo 5.1.** Si se cierra la extracción principal (≈ 100 m³/h =
${num(q, 3)} m³/s) sin cambiar nada más: dP/dt = ${num(q, 3)} / ${cort(C)} ≈ ${num(Math.round(dPdt / 100) * 100)} Pa/s,
es decir **${num(dPdt / 1e5, 3)} bar/s: 1 bar en ≈ ${num(t1bar)} s**. Por eso la presión del digestor se
controla con un lazo rápido y existen la válvula de alivio y la de
seguridad. Compare con un vaso que tiene un colchón de gas de 100 m³ a
6 bar(g) = ${num((6e5 + P_ATM) / 1e5, 1)} bar(a): C = V/P ≈ ${cort(Ccolchon)} m³/Pa, ${num(Ccolchon / C)} veces más lento.`
}

/** Segundos para 1 bar si se cierra la extracción principal (≈ 100 m³/h). */
function t1bar(config) {
  return num(1e5 / ((100 / 3600) / capacidadDigestor(config).C))
}

// ---------------------------------------------------------------------------
// Tabla 6.1: resultado de las pruebas de escalón (desde docs/SINTONIA.md)

const LAZOS_TABLA_61 = ['FIC-401', 'PIC-301', 'TIC-402', 'TIC-212', 'LIC-202', 'LIC-302', 'CIC-605', 'TIC-604']

export function tablaSintonia(textoSintonia) {
  const filas = Object.fromEntries(textoSintonia.split('\n').filter((l) => /^\| [A-Z]{2,4}-\d+ \|/.test(l))
    .map((l) => l.split('|').slice(1, -1).map((c) => c.trim())).map((c) => [c[0], c]))
  const unidad = (u) => ({ 'm3/h': 'm³/h', 'bar(g)': 'bar' })[u] ?? u
  return '| Lazo | Kc | Ti (s) | Escalón | Sobrepaso | Asentamiento |\n|------|----|--------|---------|-----------|--------------|\n' +
    LAZOS_TABLA_61.map((id) => {
      const c = filas[id]
      if (!c) throw new Error(`docs/SINTONIA.md no tiene el lazo ${id}`)
      const [v, u] = c[3].split(' ')
      const esc = Number(v)
      const t = Number(c[5].split(' ')[0])
      return `| ${id} | ${num(Number(c[1]), c[1].includes('.') ? 1 : 0)} | ${num(Number(c[2]))} | ${esc > 0 ? '+' : ''}${num(esc, v.includes('.') ? 1 : 0)} ${unidad(u)} | ` +
        `${num(Number(c[4].split(' ')[0]))} % | ${t < 600 ? `${num(t)} s` : `${num(t / 60)} min`} |`
    }).join('\n')
}

/** Frase de la sección 7.1: cuánto mueve la presión un desbalance de 300 m³/h. */
function presion300(config) {
  const { C } = capacidadDigestor(config)
  return num((2e5 * C) / (300 / 3600))
}

// ---------------------------------------------------------------------------
// Bloques del caso base calibrado (estado estacionario)

/** Corre el caso base hasta estado estacionario (igual que la calibración). */
export function casoBase(config = cargarConfig()) {
  const planta = crearPlanta(config)
  correrHastaEstacionario(planta, { minHoras: 12 })
  return planta
}

function resultado(s, k) {
  const ki = s.kpi
  const filas = [
    ['Kappa', '17 ± 1', num(k.kappa, 1)],
    ['Aporte de HexA', '4–6', num(k.kappaHexA, 1)],
    ['Rendimiento', '53–54 %', `${num(k.rendimiento, 1)} %`],
    ['Viscosidad', '1 100–1 200 mL/g', `${num(k.viscosidad)} mL/g`],
    ['Álcali residual, extracción principal', '6–10 g/L', `${num(k.alcaliExtraccion, 1)} g/L`],
    ['Rechazos', '< 0,5 %', `${num(k.rechazos, 2)} %`],
  ]
  return `| Objetivo | Caso base (especificación) | Modelo calibrado |\n|----------|----------------------------|------------------|\n` +
    filas.map((f) => `| ${f.join(' | ')} |`).join('\n') +
    `\n\nSin calibrar directamente, el modelo también queda dentro de los rangos en:\n` +
    `factor H ${num(k.H)} (350–500), álcali residual en la extracción final ${num(ki.extracciones.ext_final.alcali * 40, 1)} g/L\n` +
    `(6–10), en el soplado ${num(k.alcaliSoplado, 1)} g/L (4–7), y xilano en la pulpa ${num(ki.xilano * 100)} %.`
}

/** Celda del perfil más cercana a la altura z (m desde el tope). */
const celda = (p, z) => p.z.reduce((mejor, zj, j) => (Math.abs(zj - z) < Math.abs(p.z[mejor] - z) ? j : mejor), 0)

const ALTURAS_PERFIL = [[2.4, 'Tope'], [8.1, 'Calentamiento'], [10, 'Circ. superior'], [17.6, 'Cocción sup.'], [25.2, 'Cocción sup.'],
  [30.9, 'Circ. inferior'], [38.5, 'Cocción inf.'], [46.1, 'Fin cocción'], [55.6, 'Lavado / fondo']]

function perfil(s) {
  const p = s.vasos.dig.perfil
  const filas = ALTURAS_PERFIL.map(([z, zona]) => {
    const j = celda(p, z)
    return `| ${num(p.z[j], 1)} | ${zona} | ${num(p.T[j])} | ${num(p.especies.OH[j] * 40, 1)} | ${num(p.OHRetenido[j] * 40, 1)} | ` +
      `${num(p.solidosOrganicos[j])} | ${num(p.H[j])} | ${num(p.kappa[j], p.kappa[j] < 20 ? 1 : 0)} | ${num(p.rendimiento[j] * 100, 1)} |`
  })
  return '| z (m) | Zona | T (°C) | EA libre (g/L) | EA dentro de la astilla (g/L) | Sólidos org. (g/L) | H | Kappa | Rend. % |\n' +
    '|-------|------|--------|----------------|-------------------------------|--------------------|---|-------|---------|\n' + filas.join('\n')
}

/** Tabla del paso 7 (capítulo 2): caudal de licor libre por tramo del digestor. */
function hidraulica(s) {
  const p = s.vasos.dig.perfil
  const Q = (z) => p.flujo[celda(p, z)] * 3600
  const c = (id) => s.corrientes[id].caudal * 3600
  const tramo = (z1, z2) => `${signo(Q(z1))} → ${signo(Q(z2))}`
  const entraSup = Q(4.3) + c('lb_sup') + c('fil_sup')
  const entraInf = Q(29) + c('lb_inf') + c('fil_inf')
  const filas = [
    ['Entrada por el tope (transferencia)', `${signo(Q(0.5))} m³/h`, '↓'],
    [`Bajo el separador (sale el retorno, ${num(c('retorno_transf'))} m³/h)`, signo(Q(2.4)), '↓'],
    [`Bajo la extracción superior (sale ${num(c('ext_superior'))})`, signo(Q(4.3)), '↓'],
    [`Cocción superior (entran ${num(c('lb_sup'))} de licor blanco y ${num(c('fil_sup'))} de filtrado por la circulación: ${signo(entraSup)})`, tramo(10, 25.2), '↓ cocorriente'],
    ['Entre las mallas de extracción principal y la circulación inferior (sube licor hacia las mallas)', signo(Q(28)), '↑'],
    [`Cocción inferior (entran ${num(c('lb_inf'))} de licor blanco y ${num(c('fil_inf'))} de filtrado: ${signo(entraInf)})`, tramo(30.9, 46.1), '↓ cocorriente'],
    ['Zona de lavado (sube el filtrado del fondo)', signo(Q(51)), '↑ contracorriente'],
  ]
  return '| Tramo (m desde el tope) | Caudal de licor libre (m³/h) | Sentido |\n|------------------------|-----------------------|---------|\n' +
    filas.map((f) => `| ${f.join(' | ')} |`).join('\n')
}

// ---------------------------------------------------------------------------
// Sensibilidades (sección 4.11; también npm run sensibilidades)

const LB = ['lb_alim', 'lb_transf', 'lb_sup', 'lb_inf']
const AST = ['astillas', 'transferencia', 'soplado']
const esc = (ids, campo, f) => ids.map((id) => ({ tipo: 'ajustar', id, campo, f }))
export const CASOS_SENSIBILIDAD = [
  ['+3 °C en ambas circulaciones de cocción', [{ tipo: 'ajustar', id: 'circ_sup', campo: 'T_salida', s: 3 }, { tipo: 'ajustar', id: 'circ_inf', campo: 'T_salida', s: 3 }]],
  ['+10 % de licor blanco (carga 18 → 19,8 %)', esc(LB, 'caudal', 1.1)],
  ['−10 % de licor blanco (carga 18 → 16,2 %)', esc(LB, 'caudal', 0.9)],
  ['+10 % de ritmo sin compensar', esc(AST, 'caudalMadera', 1.1)],
  ['Doble filtrado a las circulaciones (y más extracción)', [...esc(['fil_sup', 'fil_inf'], 'caudal', 2), { tipo: 'valvula', id: 'ext_principal', valor: 0.96 }]],
  ['Humedad de astillas 47,5 → 52,5 %', [{ tipo: 'fuente', id: 'astillas', campo: 'humedad', s: 0.05 }]],
  ['Madera 15 % menos reactiva', [{ tipo: 'fuente', id: 'astillas', campo: 'reactividad', f: 0.85 }]],
  ['Sulfidez 32 → 28 %', [{ tipo: 'fuente', id: 'licor_blanco', campo: 'HS', f: (0.28 / 1.72) / (0.32 / 1.68) }]],
  ['Silo con poco vapor (30 % del flash, sin vapor fresco)', [{ tipo: 'servicio', id: 'vaporFlashSilo', valor: 0.3 }, { tipo: 'servicio', id: 'vaporBPMax', valor: 0 }]],
]

/** Indicadores 8 h después de cada caso, partiendo del estado estacionario `base`. */
export function sensibilidades(config, base) {
  const guardado = base.guardar()
  const res = [['Caso base', indicadoresCalidad(base)]]
  for (const [nombre, cambios] of CASOS_SENSIBILIDAD) {
    const p = crearPlanta(config)
    p.cargar(guardado)
    const e = p.estadoInterno()
    for (const c of cambios) {
      if (c.tipo === 'valvula' || c.tipo === 'servicio') { p.enviarComando(c); continue }
      const act = c.tipo === 'ajustar' ? e.ajustes[c.id][c.campo] : c.campo === 'HS' ? e.fuentes[c.id].c[p.modelo().idx.HS] : e.fuentes[c.id][c.campo]
      p.enviarComando({ tipo: c.tipo, id: c.id, campo: c.campo, valor: c.f !== undefined ? act * c.f : act + c.s })
    }
    p.avanzar(8 * 3600)
    res.push([nombre, indicadoresCalidad(p)])
  }
  return res
}

export function tablaSensibilidades(res) {
  const fila = (n, k) => `| ${n} | ${num(k.kappa, 1)} | ${num(k.kappaHexA, 1)} | ${num(k.rendimiento, 1)} | ${num(k.viscosidad)} | ` +
    `${num(k.alcaliExtraccion, 1)} | ${num(k.alcaliSoplado, 1)} | ${num(k.rechazos, 2)} | ${num(k.H)} |`
  return '| Caso (efecto a las 8 h) | Kappa | κ HexA | Rend. % | Visc. mL/g | EA extr. g/L | EA sopl. g/L | Rech. % | H |\n' +
    '|------|-------|--------|---------|------------|--------------|--------------|---------|---|\n' + res.map(([n, k]) => fila(n, k)).join('\n')
}

/** «Cómo leerla»: las cifras salen de la misma tabla. */
export function lecturaSensibilidades(res) {
  // Diferencias con los valores redondeados como en la tabla, para que el lector las pueda rehacer.
  const DEC = { kappa: 1, kappaHexA: 1, rendimiento: 1, viscosidad: 0, alcaliExtraccion: 1, alcaliSoplado: 1, rechazos: 2, H: 0 }
  const r = Object.fromEntries(res.map(([n, k]) => [n, Object.fromEntries(Object.entries(k).map(([c, v]) => [c, Number(v.toFixed(DEC[c] ?? 3))]))]))
  const b = r['Caso base']
  const d = (n, campo) => r[n][campo] - b[campo]
  const T = '+3 °C en ambas circulaciones de cocción'
  const mas = '+10 % de licor blanco (carga 18 → 19,8 %)'
  const menos = '−10 % de licor blanco (carga 18 → 16,2 %)'
  const ritmo = '+10 % de ritmo sin compensar'
  const fil = 'Doble filtrado a las circulaciones (y más extracción)'
  const hum = 'Humedad de astillas 47,5 → 52,5 %'
  const silo = 'Silo con poco vapor (30 % del flash, sin vapor fresco)'
  const pendiente = (r[menos].rendimiento - r[mas].rendimiento) / (r[menos].kappa - r[mas].kappa)
  return [
    `- **Temperatura:** ${signo(d(T, 'kappa'), 1)} puntos de kappa por +3 °C (H de ${num(b.H)} a ${num(r[T].H)}), pero ${signo(d(T, 'viscosidad'))} mL/g de`,
    `  viscosidad y ${signo(d(T, 'rendimiento'), 1)} puntos de rendimiento. La celulosa sufre más que la`,
    '  lignina (mayor energía de activación).',
    `- **Álcali:** +10 % de carga baja el kappa ${num(-d(mas, 'kappa'), 1)} puntos y −10 % lo sube ${num(d(menos, 'kappa'), 1)}. En el modelo,`,
    `  cada punto de kappa vale ≈ ${num(pendiente, 1)} puntos de rendimiento: bajar kappa cuesta rendimiento. La`,
    '  magnitud es un resultado del modelo, por validar con datos de planta.',
    `- **Ritmo:** +10 % de producción sin compensar sube el kappa ${num(d(ritmo, 'kappa'), 1)} puntos:`,
    `  menos tiempo (H baja de ${num(b.H)} a ${num(r[ritmo].H)}) y menos álcali por tonelada.`,
    '- **Dilución con filtrado:** baja los sólidos disueltos y sube la',
    `  viscosidad (efecto Lo-Solids), pero el filtrado entra a 75 °C: enfría las zonas de cocción (H de ${num(b.H)} a ${num(r[fil].H)}),`,
    `  diluye el álcali y sube el kappa ${num(d(fil, 'kappa'), 1)} puntos. Hay que compensar.`,
    `- **Humedad:** 5 puntos más de humedad suben el kappa ${num(d(hum, 'kappa'), 1)} puntos, casi lo mismo que 10 % menos de carga (${signo(d(menos, 'kappa'), 1)}).`,
    `- **Silo con poco vapor:** las astillas llegan con aire y menos calientes: la impregnación empeora, los rechazos pasan de ${num(b.rechazos, 2)} a ${num(r[silo].rechazos, 2)} %`,
    `  y el kappa sube ${num(d(silo, 'kappa'), 1)} puntos.`,
    '- Todos estos efectos aparecen en el soplado **4 a 5 horas después** del',
    '  cambio: ese es el tiempo muerto que el operador tiene que anticipar.',
  ].join('\n')
}

// ---------------------------------------------------------------------------
// Filtrado al fondo sin compensar (revisión B-03; secciones 2.4 y 4.10)

const ALTO_COCCION_INF = [30, 47] // m desde el tope: cocción inferior

/** Base, +70 m³/h de filtrado al fondo, y lo mismo con +70 de extracción final; 8 h. */
export function filtradoFondo(config, base) {
  const guardado = base.guardar()
  const casos = [['Caso base', base]]
  for (const [nombre, compensar] of [['+70 m³/h de filtrado al fondo', false], ['+70 de filtrado y +70 de extracción final', true]]) {
    const p = crearPlanta(config)
    p.cargar(guardado)
    const a = p.estadoInterno().ajustes
    p.enviarComando({ tipo: 'ajustar', id: 'fil_fondo', campo: 'caudal', valor: a.fil_fondo.caudal + 70 / 3600 })
    if (compensar) p.enviarComando({ tipo: 'ajustar', id: 'ext_final', campo: 'caudal', valor: a.ext_final.caudal + 70 / 3600 })
    p.avanzar(8 * 3600)
    casos.push([nombre, p])
  }
  const filas = casos.map(([nombre, pl]) => {
    const k = indicadoresCalidad(pl)
    const pr = pl.leerEstado({ perfiles: true }).vasos.dig.perfil
    const Q = (z) => pr.flujo[celda(pr, z)] * 3600
    const enZona = pr.z.map((z, j) => j).filter((j) => pr.z[j] >= ALTO_COCCION_INF[0] && pr.z[j] <= ALTO_COCCION_INF[1])
    const minRet = Math.min(...enZona.map((j) => pr.OHRetenido[j] * 40))
    const j = celda(pr, 38.5)
    return `| ${nombre} | ${num(k.kappa, 1)} | ${num(k.H)} | ${signo(Q(38.5))} | ${signo(Q(28))} | ${num(pr.especies.OH[j] * 40, 1)} | ${num(pr.OHRetenido[j] * 40, 1)} | ${num(minRet, 1)} | ${num(pr.T[celda(pr, 46.1)])} |`
  })
  return '| Caso (a las 8 h) | Kappa | H | Caudal en la cocción inferior (m³/h) | Caudal hacia las mallas de extracción (m³/h) | EA libre a 38,5 m (g/L) | EA dentro de la astilla a 38,5 m (g/L) | EA mínimo dentro de la astilla, cocción inferior (g/L) | T a 46 m (°C) |\n' +
    '|---|---|---|---|---|---|---|---|---|\n' + filas.join('\n')
}

// ---------------------------------------------------------------------------

/**
 * Todos los bloques generados, por nombre. Con `rapido` solo los que salen de
 * config/ (sin simular).
 */
export function generarBloques(config = cargarConfig(), { rapido = false } = {}) {
  const b = { constantes: constantes(config), umbrales: umbrales(config), ext_final: extFinal(config), fil_fondo: filFondo(config), lignina_por_kappa: ligPorKappa(config), capacidad: capacidad(config), presion_300: presion300(config), t1bar: t1bar(config), sintonia: tablaSintonia(readFileSync(join(raiz, 'docs', 'SINTONIA.md'), 'utf8')), orden_magnitud: ordenMagnitud(config) }
  if (rapido) return b
  const planta = casoBase(config)
  const s = planta.leerEstado({ perfiles: true })
  const k = indicadoresCalidad(planta)
  Object.assign(b, {
    resultado: resultado(s, k),
    perfil: perfil(s),
    hidraulica: hidraulica(s),
    factor_h: num(k.H),
  })
  b.filtrado_fondo = filtradoFondo(config, planta)
  const sens = sensibilidades(config, planta)
  b.sensibilidades = tablaSensibilidades(sens)
  b.lectura_sensibilidades = lecturaSensibilidades(sens)
  return b
}

const MARCA = /<!-- generado:([\w-]+) -->([\s\S]*?)<!-- \/generado -->/g

/** Contenido actual de cada bloque marcado en un texto: { nombre: contenido }. */
export function leerBloques(texto) {
  const r = {}
  for (const m of texto.matchAll(MARCA)) r[m[1]] = desenvolver(m[2])
  return r
}
// Los bloques de varias líneas van en líneas propias entre las marcas.
const envolver = (v) => (v.includes('\n') ? `\n${v}\n` : v)
const desenvolver = (v) => (v.startsWith('\n') && v.endsWith('\n') ? v.slice(1, -1) : v)

/** Reemplaza el contenido de los bloques marcados que estén en `bloques`. */
export function reemplazarBloques(texto, bloques) {
  return texto.replace(MARCA, (todo, nombre) => (nombre in bloques ? `<!-- generado:${nombre} -->${envolver(bloques[nombre])}<!-- /generado -->` : todo))
}

export const leerManual = (archivo) => readFileSync(join(raiz, 'docs', 'manual', archivo), 'utf8')

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const bloques = generarBloques()
  const usados = new Set()
  for (const archivo of ARCHIVOS_MANUAL) {
    const texto = leerManual(archivo)
    for (const n of Object.keys(leerBloques(texto))) usados.add(n)
    writeFileSync(join(raiz, 'docs', 'manual', archivo), reemplazarBloques(texto, bloques))
  }
  const sinUsar = Object.keys(bloques).filter((n) => !usados.has(n))
  console.log(`Actualizados: ${[...usados].join(', ')}`)
  if (sinUsar.length) console.log(`ATENCIÓN: bloques sin marca en el manual: ${sinUsar.join(', ')}`)
}
