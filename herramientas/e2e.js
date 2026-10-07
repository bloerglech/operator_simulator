// Prueba de extremo a extremo de las pantallas DCS en un navegador real
// (Chromium con playwright-core). Compila, levanta `vite preview` y recorre
// el criterio de aceptación de la Fase 3: operar con las pantallas, cambiar
// el ritmo, responder a una alarma, guardar, y que la interfaz no se bloquee
// a ×300. Uso: npm run e2e   (CHROMIUM=/ruta/al/ejecutable opcional)

import { build, preview } from 'vite'
import { existsSync, mkdirSync } from 'node:fs'
import { chromium } from 'playwright-core'

const salidaCapturas = process.argv[2] ?? null
const ejecutable = process.env.CHROMIUM ?? ['/opt/pw-browsers/chromium'].find(existsSync)
let fallas = 0
const verificar = (ok, texto) => {
  console.log(`${ok ? 'OK ' : 'MAL'} ${texto}`)
  if (!ok) fallas++
}

await build({ logLevel: 'warn' })
const servidor = await preview({ preview: { port: 4174, strictPort: true }, logLevel: 'warn' })
const navegador = await chromium.launch(ejecutable ? { executablePath: ejecutable } : {})
try {
  const pag = await navegador.newPage({ viewport: { width: 1366, height: 800 } })
  const errores = []
  pag.on('pageerror', (e) => errores.push(e.message))
  pag.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()) })
  await pag.goto('http://localhost:4174/')
  await pag.getByText('Nueva partida').click()
  await pag.waitForSelector('#nav', { timeout: 120000 })
  const lazoSVG = (tag) => pag.locator('svg text', { hasText: tag }).first()
  const leer = (expr) => pag.evaluate(expr)

  // 1. Todas las pantallas se dibujan sin errores.
  const pantallas = await pag.$$eval('#nav button', (bs) => bs.map((b) => b.dataset.pantalla))
  for (const p of pantallas) {
    await pag.click(`#nav button[data-pantalla="${p}"]`)
    await pag.waitForTimeout(700)
    if (salidaCapturas) {
      mkdirSync(salidaCapturas, { recursive: true })
      await pag.screenshot({ path: `${salidaCapturas}/${p}.png` })
    }
  }
  verificar(pantallas.length === 9 && errores.length === 0, `9 pantallas sin errores (${errores.join('; ')})`)

  // 2. Operar un lazo desde su carátula.
  await pag.click('#nav button[data-pantalla="digestor"]')
  await lazoSVG('TIC-402').click()
  const sp = pag.locator('.caratula input[type=number]').first()
  await sp.fill('157'); await sp.press('Enter')
  await pag.waitForTimeout(1200)
  verificar(await leer(() => window.__app.estado().control.lazos['TIC-402'].sp) === 157, 'cambio de consigna de TIC-402 desde la carátula')
  await pag.getByRole('button', { name: 'MAN' }).click()
  await pag.waitForTimeout(800)
  verificar(await leer(() => window.__app.estado().control.lazos['TIC-402'].modo) === 'MAN', 'cambio de modo a MAN')
  await pag.getByRole('button', { name: 'AUTO' }).click()
  await pag.waitForTimeout(800)

  // 3. Cambio de ritmo con la coordinación de ritmo (pantalla de calidad).
  await pag.click('#nav button[data-pantalla="calidad"]')
  await pag.waitForTimeout(800)
  const W0 = await leer(() => window.__app.estado().control.lazos['WIC-101'].sp)
  const bloque = pag.locator('.panel .panel', { hasText: 'RC-700' })
  await bloque.locator('.fila', { hasText: 'Producción objetivo' }).locator('input').fill('2700')
  await bloque.locator('.fila', { hasText: 'Producción objetivo' }).getByRole('button', { name: 'Aplicar' }).click()
  await pag.waitForTimeout(500)
  await bloque.getByRole('button', { name: 'Inactivo' }).click()
  await pag.waitForTimeout(500)

  // 4. ×300 sin bloquear la interfaz.
  await pag.click('button[data-vel="300"]')
  const t0 = await leer(() => window.__app.estado().t)
  const cuadros = await leer(() => new Promise((r) => {
    let n = 0; let peor = 0; let prev = performance.now(); const ini = prev
    const f = (now) => { peor = Math.max(peor, now - prev); prev = now; n++; if (now - ini < 5000) requestAnimationFrame(f); else r({ fps: n / 5, peor }) }
    requestAnimationFrame(f)
  }))
  const t1 = await leer(() => window.__app.estado().t)
  verificar((t1 - t0) / 5 > 250, `×300: ${((t1 - t0) / 5).toFixed(0)} s simulados por segundo real`)
  verificar(cuadros.fps > 40 && cuadros.peor < 100, `interfaz fluida a ×300: ${cuadros.fps.toFixed(0)} cuadros/s, peor cuadro ${cuadros.peor.toFixed(0)} ms`)
  const W1 = await leer(() => window.__app.estado().control.lazos['WIC-101'].sp)
  verificar(W1 < W0 - 2, `cambio de ritmo en rampa: WIC-101 SP ${W0.toFixed(1)} → ${W1.toFixed(1)} t/h`)
  await pag.click('button[data-vel="1"]')

  // 5. Responder a una alarma: el instructor tapa las mallas superiores (falla de ΔP),
  //    salta la alarma, el operador la ve, la reconoce y rearma el enclavamiento.
  await pag.getByRole('button', { name: 'Instructor' }).click()
  await pag.locator('#lateral select').first().selectOption('PDI-524')
  await pag.locator('#lateral select').nth(1).selectOption('alto')
  await pag.locator('#lateral button', { hasText: 'Aplicar' }).first().click()
  await pag.click('button[data-vel="10"]')
  await pag.waitForFunction(() => window.__app.estado().control.enclavamientos['I-09'].disparado, null, { timeout: 30000 })
  await pag.click('button[data-vel="1"]')
  verificar((await pag.textContent('#banner')).length > 0 && await leer(() => window.__app.estado().control.alarmas.lista.some((a) => a.id === 'ENC-I-09')), 'alarma del enclavamiento I-09 visible')
  await pag.locator('#lateral select').nth(1).selectOption('')
  await pag.locator('#lateral button', { hasText: 'Aplicar' }).first().click()
  await pag.click('#nav button[data-pantalla="alarmas"]')
  await pag.waitForTimeout(1500)
  await pag.getByRole('button', { name: 'Reconocer todas' }).click()
  await pag.waitForTimeout(1000)
  await pag.locator('tr', { hasText: 'I-09' }).getByRole('button', { name: 'Rearmar' }).click()
  await pag.waitForTimeout(1000)
  verificar(await leer(() => !window.__app.estado().control.enclavamientos['I-09'].disparado), 'enclavamiento I-09 rearmado desde la pantalla de alarmas')
  verificar(await leer(() => window.__app.estado().control.alarmas.lista.every((a) => a.reconocida)), 'todas las alarmas reconocidas')
  // Volver a operar: partir la bomba y poner TIC-402 en automático.
  await pag.click('#nav button[data-pantalla="circulaciones"]')
  await pag.waitForTimeout(600)
  await pag.locator('svg g.clic').filter({ has: pag.locator('circle') }).nth(1).click()
  await pag.getByRole('button', { name: 'Partir' }).click()
  await pag.waitForTimeout(1000)
  verificar(await leer(() => window.__app.estado().bombas.bomba_circ_sup.marcha), 'bomba de circulación superior partida desde el mímico')

  // 6. Guardar en el navegador.
  await pag.getByRole('button', { name: 'Partida' }).click()
  await pag.getByText('Guardar en este navegador').click()
  await pag.waitForTimeout(800)
  verificar(await leer(() => (localStorage.getItem('digestor:partida') ?? '').length > 100000), 'partida guardada en el navegador')
  verificar(errores.length === 0, `sin errores de la página (${errores.join('; ')})`)
} finally {
  await navegador.close()
  await new Promise((r) => servidor.httpServer.close(r))
}
console.log(fallas === 0 ? 'Prueba de pantallas: todo correcto' : `Prueba de pantallas: ${fallas} fallas`)
process.exit(fallas === 0 ? 0 : 1)
