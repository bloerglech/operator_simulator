// Genera docs/EVENTOS.md (desde config/eventos.json) y docs/MISIONES.md
// (desde src/misiones/campana.js), para que la documentación no se
// desactualice. Uso: npm run documentar

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { cargarConfig } from './cargarConfig.js'
import { MISIONES } from '../src/misiones/campana.js'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const CATEGORIAS = { madera: 'Madera', licor: 'Licor blanco', servicios: 'Servicios', equipos: 'Equipos', columna: 'Columna', aguas_abajo: 'Aguas abajo', instrumentos: 'Instrumentos' }
const horas = (s) => (s === null || s === undefined ? 'hasta que el operador lo resuelva' : s >= 3600 ? `${(s / 3600).toLocaleString('es-CL')} h` : `${Math.round(s / 60)} min`)

function describirAccion(a) {
  if (a.comando) return `\`${JSON.stringify(a.comando)}\``
  const o = a.objetivo
  const que = `${o.tipo} ${o.id}${o.campo ? `.${o.campo}` : ''}${o.vaso ? ` (${o.vaso})` : ''}${o.malla ? ` (${o.malla})` : ''}`
  const destino = a.hasta !== undefined ? `hasta ${a.hasta}${a.unidad ? ` ${a.unidad}` : ''}` : `× ${a.factor}`
  return `${que} ${destino} en ${horas(a.rampa)}`
}

export function eventosMd(config) {
  const cfg = config.eventos
  const porCat = {}
  for (const e of cfg.eventos) (porCat[e.categoria] ??= []).push(e)
  const partes = [`# Eventos: perturbaciones y fallas

Generado por \`npm run documentar\` desde \`config/eventos.json\` (no editar a mano).
Cada evento tiene una causa, síntomas coherentes en las variables y una
respuesta correcta conocida. Se activan desde el panel del instructor, desde
el guion de una misión o con el generador aleatorio (operación libre).

Generador: tiempo medio entre eventos ${Object.entries(cfg.generador.intervalo_medio).map(([d, s]) => `${horas(s)} (dificultad ${d})`).join(', ')}.
En dificultad 3 no hay aviso previo por radio o teléfono.
`]
  for (const [cat, lista] of Object.entries(porCat)) {
    partes.push(`## ${CATEGORIAS[cat] ?? cat}\n`)
    for (const e of lista) {
      partes.push(`### ${e.nombre} (\`${e.id}\`)

- **Causa:** ${e.causa}
- **Síntomas:** ${e.sintomas}
- **Respuesta correcta:** ${e.respuesta}
- **Mecanismo en el simulador:** ${e.acciones.map(describirAccion).join('; ')}. Duración: ${horas(e.duracion)}${e.revertir ? ', luego vuelve a la normalidad' : ''}.${e.opciones ? ` Parámetros posibles: ${Object.entries(e.opciones).map(([k, v]) => `${k} ∈ {${v.join(', ')}}`).join('; ')}.` : ''}
- Dificultad mínima ${e.dificultad}, peso ${e.peso} en el generador.
`)
    }
  }
  return partes.join('\n')
}

function condicionTexto(c) {
  if (!c) return '—'
  if (c.y) return c.y.map(condicionTexto).join(' y ')
  if (c.o) return `(${c.o.map(condicionTexto).join(' o ')})`
  if (c.no) return `no ${condicionTexto(c.no)}`
  if (c.tiempo !== undefined) return `a los ${horas(c.tiempo)}`
  return `\`${JSON.stringify(c)}\``
}

export /** Preparación de una misión: comandos y horas, o etapas sucesivas. */
function preparacionMd(prep) {
  if (!prep) return ''
  const etapas = prep.etapas ?? [{ comandos: prep.comandos ?? [], horas: prep.horas ?? 0 }, ...(prep.despues ? [{ comandos: prep.despues, horas: 0 }] : [])]
  const cmd = (c) => `\`${JSON.stringify(c)}\``
  return ', y luego ' + etapas.map((e) => `${(e.comandos ?? []).map(cmd).join(', ')} (${e.horas} h)`).join('; ')
}

function misionesMd(config) {
  const partes = [`# Misiones

Generado por \`npm run documentar\` desde \`src/misiones/campana.js\` (no editar a mano).
Orden de la campaña: ${config.campana.orden.map((id) => `\`${id}\``).join(' → ')}.
Cada misión superada desbloquea la siguiente. Medallas según la fracción de
puntos: oro ≥ ${config.campana.medallas.oro * 100} %, plata ≥ ${config.campana.medallas.plata * 100} %, bronce con todos los objetivos principales.
La prueba \`tests/misiones.test.js\` juega cada misión con la respuesta
esperada (debe aprobar) y sin hacer nada (debe fallar).
`]
  for (const id of config.campana.orden) {
    const d = MISIONES[id]
    partes.push(`## ${d.capitulo}. ${d.titulo}

**Qué enseña:** ${d.ensena}

**Situación inicial:** caso base tras ${d.inicio?.horasPrevias ?? 8} h de operación${preparacionMd(d.inicio?.preparacion)}. ${d.resumen}

**Guion:**

${d.guion.map((p) => `- ${condicionTexto(p.cuando)}: ${p.acciones.map((a) => (a.mensaje ? `${a.mensaje.quien} (${a.mensaje.canal}): «${a.mensaje.texto}»` : a.evento ? `evento \`${a.evento}\`` : a.terminar ? 'fin de la misión' : a.mostrar ? `objetivo \`${a.mostrar}\`` : a.comando ? `\`${JSON.stringify(a.comando)}\`` : JSON.stringify(a))).join(' · ')}`).join('\n')}

**Objetivos:**

${d.objetivos.map((o) => `- (${o.tipo}${o.final ? ', al final' : ''}${o.durante ? `, durante ${horas(o.durante)}` : ''}${o.plazo ? `, plazo ${horas(o.plazo)}` : ''}) ${o.texto}`).join('\n')}

**Condiciones de falla:** ${d.fallas?.length ? d.fallas.map((f) => f.mensaje).join(' · ') : 'ninguna'}

**Criterios de evaluación:** ${(d.evaluacion ?? []).map((c) => `${c.texto} (${c.puntos} pt)`).join(' · ')}; cada objetivo secundario suma 1 pt.

**Respuesta ideal:** ${d.respuestaIdeal}
`)
  }
  return partes.join('\n')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const config = cargarConfig()
  writeFileSync(join(raiz, 'docs', 'EVENTOS.md'), eventosMd(config))
  writeFileSync(join(raiz, 'docs', 'MISIONES.md'), misionesMd(config))
  console.log('Escritos docs/EVENTOS.md y docs/MISIONES.md')
}
