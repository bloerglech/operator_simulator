// Corre el caso base hasta estado estacionario e imprime KPI, corrientes,
// perfiles por celda y cierre de balances.
//
//   npm run caso-base              (24 h simuladas)
//   npm run caso-base -- 48        (otra duración, en horas)
//
// Incluye la cinética de cocción calibrada (Fase 1b).

import { cargarConfig } from './cargarConfig.js'
import { crearPlanta } from '../src/sim/planta.js'

const horas = Number(process.argv[2] ?? 24)
const planta = crearPlanta(cargarConfig())
const inicio = process.hrtime.bigint()
planta.avanzar(horas * 3600)
const ms = Number(process.hrtime.bigint() - inicio) / 1e6
const s = planta.leerEstado({ perfiles: true, balances: true })

const f = (x, d = 1) => (x === null || x === undefined ? '—' : x.toFixed(d))
const col = (txt, n) => String(txt).padStart(n)
const linea = () => console.log('─'.repeat(100))

console.log(`\nCASO BASE — ${horas} h simuladas en ${(ms / 1000).toFixed(1)} s (x${Math.round((horas * 3600 * 1000) / ms)} sobre tiempo real)`)
linea()
const k = s.kpi
console.log('INDICADORES')
console.log(`  Producción                        ${f(k.produccion, 0)} ADt/d     Madera alimentada ${f(k.maderaAlimentada * 3.6, 1)} t/h seca`)
console.log(`  Residencia impregnador            ${f(k.residenciaImpregnador / 60, 1)} min`)
console.log(`  Residencia total (medidor→soplado) ${f(k.residenciaTotal / 3600, 2)} h`)
console.log(`  Factor H en el soplado            ${f(k.HSoplado, 0)}`)
console.log(`  Licor/madera en la alimentación   ${f(k.licorMaderaAlimentacion * 1000, 2)} m³/t seca`)
console.log(`  Factor de dilución                ${f(k.factorDilucion, 2)} m³/ADt`)
console.log(`  Temperatura de soplado            ${f(k.TSoplado, 1)} °C`)
console.log('CALIDAD EN EL SOPLADO')
console.log(`  Kappa                             ${f(k.kappa, 1)}  (lignina ${f(k.kappaLignina, 1)} + HexA ${f(k.kappaHexA, 1)})`)
console.log(`  Rendimiento total / depurado      ${f(k.rendimiento * 100, 1)} % / ${f(k.rendimientoDepurado * 100, 1)} %`)
console.log(`  Rechazos                          ${f(k.rechazos * 100, 2)} % sobre pulpa`)
console.log(`  Viscosidad intrínseca             ${f(k.viscosidad, 0)} mL/g`)
console.log(`  Xilano en la pulpa                ${f(k.xilano * 100, 1)} %`)
console.log(`  Álcali residual en el soplado     ${f(k.alcaliResidualSoplado * 40, 1)} g/L como NaOH`)
for (const [id, e] of Object.entries(k.extracciones)) {
  console.log(`  Extracción ${id.padEnd(22)} ${f(e.caudal * 3600, 0)} m³/h  EA ${f(e.alcali * 40, 1)} g/L  sólidos ${f(e.solidos, 0)} g/L (orgánicos ${f(e.solidosOrganicos, 0)})`)
}
for (const [id, v] of Object.entries(s.vasos)) {
  console.log(`  ${v.nombre.padEnd(16)} nivel de astillas ${f(v.nivelAstillas, 2)} m   ${v.lleno ? 'lleno' : 'NO lleno'}   presión ${f((v.presion.P - 101325) / 1e5, 2)} bar(g)   (saturación ${f((v.presion.Psaturacion - 101325) / 1e5, 2)} bar(g))`)
}
for (const [id, v] of Object.entries(s.valvulas)) console.log(`  Válvula ${id.padEnd(18)} apertura ${f(v.apertura * 100, 1)} %   ${f(v.caudal * 3600, 0)} m³/h`)
console.log(`  Incidentes: ${Object.keys(s.incidentes).length ? JSON.stringify(s.incidentes) : 'ninguno'}`)
linea()
const e = s.equipos
console.log('EQUIPOS')
console.log(`  Silo: nivel ${f(e.silo.nivel * 100, 0)} %, astillas a ${f(e.silo.Tsalida, 1)} °C, vaporización ${f(e.silo.vaporizacion * 100, 0)} %, vapor flash ${f(e.silo.vaporFlash * 3.6, 1)} t/h, vapor BP ${f(e.silo.vaporBP * 3.6, 1)} t/h, venteado ${f(e.silo.vaporVenteado * 3.6, 1)} t/h`)
console.log(`  Medidor: ${f(e.medidor.velocidad, 2)} rpm, ${f(e.medidor.caudal * 3.6, 1)} t/h secas`)
for (const [id, fl] of Object.entries(e.flash)) console.log(`  ${id}: nivel ${f(fl.nivel * 100, 0)} %, ${f(fl.T, 1)} °C, vapor ${f(fl.vapor * 3.6, 1)} t/h, salida ${f(fl.salida * 3600, 0)} m³/h`)
console.log(`  Estanque de soplado: nivel ${f(e.estanqueSoplado.nivel * 100, 0)} %`)
for (const [id, c] of Object.entries(e.calentadores)) console.log(`  Calentador ${id.padEnd(15)} ${f(c.calor / 1000, 1)} MW, vapor ${f(c.vapor * 3.6, 1)} t/h, T máx ${f(c.Tmax, 1)} °C${c.saturado ? '  SATURADO' : ''}`)
console.log(`  Vapor específico (calentadores): ${f(k.vaporEspecifico, 2)} GJ/ADt`)

linea()
console.log('ZONAS (licor libre)')
console.log(`  ${'vaso/zona'.padEnd(34)}${col('T °C', 8)}${col('EA g/L', 9)}${col('HS mol/L', 10)}${col('LD g/L', 9)}${col('SI g/L', 9)}`)
for (const v of Object.values(s.vasos)) {
  for (const z of Object.values(v.zonas)) {
    console.log(`  ${(v.nombre + ' / ' + z.nombre).padEnd(34)}${col(f(z.T), 8)}${col(f(z.OH * 40), 9)}${col(f(z.HS, 3), 10)}${col(f(z.LD), 9)}${col(f(z.SI), 9)}`)
  }
}

linea()
console.log('CORRIENTES')
console.log(`  ${'corriente'.padEnd(46)}${col('m³/h', 8)}${col('T °C', 8)}${col('calor MW', 10)}`)
for (const c of Object.values(s.corrientes)) {
  console.log(`  ${c.nombre.padEnd(46)}${col(f(c.caudal * 3600, 0), 8)}${col(f(c.T), 8)}${col(c.calor ? f(c.calor / 1000, 1) : '', 10)}`)
}
console.log('  (astillas, transferencia y soplado: volumen de lechada, astillas + licor)')

for (const v of Object.values(s.vasos)) {
  linea()
  const p = v.perfil
  console.log(`PERFIL — ${v.nombre} (z desde el tope; caudal + hacia abajo)`)
  console.log(`  ${col('z m', 6)}${col('T °C', 8)}${col('EA libre', 10)}${col('EA ret.', 9)}${col('DSorg', 7)}${col('Q m³/h', 9)}${col('ast. t', 8)}${col('H', 7)}${col('edad min', 10)}${col('kappa', 8)}${col('rend %', 8)}`)
  const paso = p.z.length > 30 ? 2 : 1
  for (let j = 0; j < p.z.length; j += paso) {
    console.log(
      `  ${col(f(p.z[j]), 6)}${col(f(p.T[j]), 8)}${col(f(p.especies.OH[j] * 40), 10)}` +
        `${col(p.OHRetenido[j] === null ? '—' : f(p.OHRetenido[j] * 40), 9)}${col(f(p.solidosOrganicos[j], 0), 7)}` +
        `${col(f(p.flujo[j] * 3600, 0), 9)}${col(f(p.astillas[j] / 1000, 1), 8)}${col(f(p.H[j], 0), 7)}${col(f(p.edad[j] === null ? null : p.edad[j] / 60, 0), 10)}` +
        `${col(f(p.kappa[j], 1), 8)}${col(p.rendimiento[j] === null ? '—' : f(p.rendimiento[j] * 100, 1), 8)}`,
    )
  }
}

linea()
const b = s.balances
console.log('CIERRE DE BALANCES (error relativo)')
console.log(`  licor ${b.licor.relativo.toExponential(1)}   madera ${b.madera.relativo.toExponential(1)}   energía ${b.energia.relativo.toExponential(1)}   materia orgánica ${b.organica.relativo.toExponential(1)}`)
console.log(`  especies: ${Object.entries(b.especies).map(([id, e]) => `${id} ${e.relativo.toExponential(1)}`).join('  ')}`)
console.log('')
