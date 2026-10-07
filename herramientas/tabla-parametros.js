// Genera docs/manual/anexo-a-parametros.md con todos los parámetros de config/:
// valor, unidad, origen, fuente y nota. Se regenera con `npm run tabla-parametros`
// (lo corre también la calibración), así el anexo nunca queda desactualizado.

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { cargarConfig, ARCHIVOS_CONFIG } from './cargarConfig.js'
import { esParametro, ARCHIVOS_FORMATO_COMPACTO } from '../src/sim/parametros.js'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')

export function generarTabla(config = cargarConfig()) {
  const conteo = {}
  const secciones = ARCHIVOS_CONFIG.filter((a) => !ARCHIVOS_FORMATO_COMPACTO.includes(a)).map((archivo) => {
    const filas = []
    const visitar = (nodo, ruta) => {
      if (Array.isArray(nodo)) {
        nodo.forEach((x, i) => visitar(x, `${ruta}[${x?.id ?? i}]`))
        return
      }
      if (nodo === null || typeof nodo !== 'object') return
      if (esParametro(nodo)) {
        conteo[nodo.origen] = (conteo[nodo.origen] ?? 0) + 1
        const nota = [nodo.fuente ? `Fuente: ${nodo.fuente}.` : '', nodo.nota ?? ''].filter(Boolean).join(' ')
        filas.push(`| \`${ruta}\` | ${nodo.valor} | ${nodo.unidad} | ${nodo.origen} | ${nota.replace(/\|/g, '/')} |`)
        return
      }
      for (const [k, v] of Object.entries(nodo)) visitar(v, ruta ? `${ruta}.${k}` : k)
    }
    visitar(config[archivo], '')
    return `## config/${archivo}.json\n\n| Parámetro | Valor | Unidad | Origen | Fuente / nota |\n|-----------|-------|--------|--------|---------------|\n${filas.join('\n')}\n`
  })
  const resumen = Object.entries(conteo).map(([o, n]) => `| ${o} | ${n} |`).join('\n')
  return `# Anexo A. Tabla de parámetros

Generado automáticamente desde \`config/*.json\` por \`npm run tabla-parametros\`.
No editar a mano: cambie la configuración y vuelva a generar.

Orígenes (ver capítulo 1.5): \`literatura\` (publicación citada), \`especificacion\`
(caso base definido por el usuario), \`calibrado\` (ajustado por \`npm run calibrar\`),
\`supuesto\` (provisional, a reemplazar con datos reales), \`planta\` (dato real).

| Origen | Cantidad de parámetros |
|--------|------------------------|
${resumen}

${secciones.join('\n')}
${tablasControl(config)}`
}

/** Tablas del sistema de control (formato compacto: todos los valores son supuestos). */
function tablasControl(config) {
  const esc = (x) => String(x ?? '').replace(/\|/g, '/')
  const tx = config.instrumentos.transmisores.map((t) =>
    `| ${t.tag} | ${esc(t.descripcion)} | \`${t.variable}\` | ${t.rango[0]}–${t.rango[1]} ${t.etiqueta ?? t.unidad} | ${t.ruido ?? 0} | ${t.tau ?? 0} | ${t.periodo ? `${t.periodo} / ${t.analisis} / ±${t.error}` : ''} |`)
  const lab = Object.entries(config.instrumentos.laboratorio.analisis).map(([id, a]) => `| ${id} | ${esc(a.nombre)} | ±${a.error} ${a.etiqueta ?? a.unidad} |`)
  const lz = config.lazos.lazos.map((l) => {
    const sal = l.salida.tipo === 'lazo' ? `consigna de ${l.salida.id}` : `${l.salida.tipo} ${l.salida.id ?? l.salida.corriente ?? l.salida.calentador ?? ''}`
    return `| ${l.tag} | ${esc(l.descripcion)} | ${l.pv} | ${esc(sal)} | ${l.Kc} | ${l.Ti} | ${l.accion} | ${l.modo}${l.maestro ? ` (${(l.maestros ?? [l.maestro]).join(' o ')})` : ''} |`
  })
  const bl = config.lazos.bloques.map((b) => `| ${b.tag} | ${esc(b.descripcion)} | ${b.tipo} | ${b.activo ? 'sí' : 'no'} | \`${esc(JSON.stringify(b.parametros))}\` |`)
  const en = config.enclavamientos.enclavamientos.map((e) => {
    const acc = e.acciones.map((a) => (a.lazo ? `${a.lazo} → ${a.salida} %` : `${a.comando.tipo} ${a.comando.id} ${a.comando.accion}`)).join('; ')
    return `| ${e.id} | ${esc(e.descripcion)} | ${e.condicion.tag} ${e.condicion.op} ${e.condicion.limite} (${e.condicion.retardo} s) | ${esc(acc)} |`
  })
  const al = config.alarmas.alarmas.map((a) => `| ${a.id} | ${esc(a.mensaje)} | ${a.fuente} | ${a.tipo} ${a.tipo === 'evento' ? '' : a.limite} | ${a.banda} | ${a.retardo} | ${a.prioridad} | ${a.grupo} |`)
  return `## Sistema de control (config/instrumentos, lazos, enclavamientos, alarmas)

Formato compacto: **todos estos valores son supuestos** de diseño de un DCS
típico, no datos de una planta. Sintonías verificadas con pruebas de escalón
(\`npm run sintonia\`, ver \`docs/SINTONIA.md\`).

### Transmisores y analizadores

Ruido: desviación estándar en % del rango. τ: filtro de primer orden (s).
Analizadores: periodo de muestreo / tiempo de análisis (s) / error (desv. est.).

| Tag | Descripción | Variable | Rango | Ruido % | τ s | Analizador |
|-----|-------------|----------|-------|---------|-----|------------|
${tx.join('\n')}

### Laboratorio (retardo ${config.instrumentos.laboratorio.retardo_min}–${config.instrumentos.laboratorio.retardo_max} min)

| Análisis | Nombre | Error (desv. est.) |
|----------|--------|--------------------|
${lab.join('\n')}

### Lazos

| Lazo | Descripción | PV | Salida | Kc | Ti s | Acción | Modo inicial (maestros) |
|------|-------------|----|--------|----|------|--------|-------------------------|
${lz.join('\n')}

### Bloques de cálculo y control avanzado

| Bloque | Descripción | Tipo | Activo | Parámetros |
|--------|-------------|------|--------|------------|
${bl.join('\n')}

### Enclavamientos (rearme manual)

| Id | Descripción | Condición (retardo) | Acciones |
|----|-------------|---------------------|----------|
${en.join('\n')}

### Alarmas configuradas

Además se generan solas una alarma de prioridad 1 por cada enclavamiento
disparado y una de prioridad 3 por cada transmisor con señal fuera de rango.
Supresión del grupo "proceso" con ${config.alarmas.supresion.tag} < ${config.alarmas.supresion.bajo} durante ${config.alarmas.supresion.retardo} s.

| Id | Mensaje | Fuente | Tipo y límite | Banda | Retardo s | Prioridad | Grupo |
|----|---------|--------|---------------|-------|-----------|-----------|-------|
${al.join('\n')}
`
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(join(raiz, 'docs', 'manual', 'anexo-a-parametros.md'), generarTabla())
  console.log('Escrito docs/manual/anexo-a-parametros.md')
}
