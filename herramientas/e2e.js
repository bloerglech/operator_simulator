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
// Las pantallas 2D se prueban con el navegador normal; la sala 3D con WebGL por
// software (sirve sin GPU, p. ej. en integración continua, pero es lento: no
// se miden cuadros por segundo en 3D).
const navegador = await chromium.launch(ejecutable ? { executablePath: ejecutable } : {})
const args3d = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
const navegador3d = await chromium.launch(ejecutable ? { executablePath: ejecutable, args: args3d } : { args: args3d })
try {
  const pag = await navegador.newPage({ viewport: { width: 1366, height: 800 } })
  const errores = []
  pag.on('pageerror', (e) => errores.push(e.message))
  pag.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()) })
  await pag.goto('http://localhost:4174/')
  await pag.getByRole('button', { name: 'Solo pantallas DCS' }).click()
  await pag.locator('.menu-inicial input[type=checkbox]').uncheck() // sin eventos aleatorios en esta prueba
  await pag.getByText('Turno libre').click()
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
  await pag.getByRole('button', { name: 'MAN', exact: true }).click()
  await pag.waitForTimeout(800)
  verificar(await leer(() => window.__app.estado().control.lazos['TIC-402'].modo) === 'MAN', 'cambio de modo a MAN')
  await pag.getByRole('button', { name: 'AUTO', exact: true }).click()
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
  const fallas = pag.locator('#lateral .panel', { hasText: 'Falla de instrumento' })
  await fallas.locator('select').first().selectOption('PDI-524')
  await fallas.locator('select').nth(1).selectOption('alto')
  await fallas.getByRole('button', { name: 'Aplicar' }).click()
  await pag.click('button[data-vel="10"]')
  await pag.waitForFunction(() => window.__app.estado().control.enclavamientos['I-09'].disparado, null, { timeout: 30000 })
  await pag.click('button[data-vel="1"]')
  verificar((await pag.textContent('#banner')).length > 0 && await leer(() => window.__app.estado().control.alarmas.lista.some((a) => a.id === 'ENC-I-09')), 'alarma del enclavamiento I-09 visible')
  await fallas.locator('select').nth(1).selectOption('')
  await fallas.getByRole('button', { name: 'Aplicar' }).click()
  await pag.click('#nav button[data-pantalla="alarmas"]')
  await pag.waitForTimeout(1500)
  await pag.getByRole('button', { name: 'Reconocer todas' }).click()
  await pag.waitForTimeout(1000)
  await pag.locator('tr', { hasText: 'I-09' }).getByRole('button', { name: 'Rearmar' }).click()
  await pag.waitForTimeout(1000)
  verificar(await leer(() => !window.__app.estado().control.enclavamientos['I-09'].disparado), 'enclavamiento I-09 rearmado desde la pantalla de alarmas')
  // Las alarmas que había al reconocer quedan reconocidas (el proceso puede generar otras nuevas).
  verificar(await leer(() => window.__app.estado().control.alarmas.registro.some((r) => r.id === 'ENC-I-09' && r.accion === 'reconocida')), 'alarma del enclavamiento reconocida')
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

  // 7. Sala de control 3D (computador): render dentro del presupuesto, consola → DCS → sala.
  const sala = await navegador3d.newPage({ viewport: { width: 1280, height: 720 } })
  const errores3d = []
  sala.on('pageerror', (e) => errores3d.push(e.message))
  await sala.goto('http://localhost:4174/')
  await sala.getByRole('button', { name: 'Sala de control 3D' }).click()
  await sala.locator('.menu-inicial input[type=checkbox]').uncheck()
  await sala.getByText('Turno libre').click()
  await sala.waitForFunction(() => window.__mundo, null, { timeout: 120000 })
  await sala.waitForTimeout(2500)
  const info = await sala.evaluate(() => window.__mundo.info())
  verificar(info.llamadas > 0 && info.llamadas < 100 && info.triangulos < 150000, `sala 3D dibujada: ${info.llamadas} llamadas de dibujo, ${info.triangulos} triángulos`)
  await sala.evaluate(() => window.__mundo.ubicar(0, 2.5, 0))
  await sala.keyboard.down('KeyW'); await sala.waitForTimeout(2500); await sala.keyboard.up('KeyW')
  const z = await sala.evaluate(() => window.__mundo.info().jugador.z)
  verificar(z >= 0.74 && z < 2.4, `caminar con WASD y chocar con la consola (z = ${z.toFixed(2)})`)
  await sala.waitForFunction(() => document.querySelector('.hud-aviso')?.textContent.includes('Consola 2'), null, { timeout: 5000 })
  await sala.keyboard.press('KeyE')
  await sala.waitForTimeout(1200)
  verificar(await sala.evaluate(() => document.getElementById('dcs').classList.contains('abierto') && document.querySelector('#nav button.activo')?.dataset.pantalla === 'digestor'), 'la consola 2 abre el DCS en la pantalla del digestor')
  await sala.keyboard.press('Escape')
  await sala.waitForTimeout(800)
  verificar(await sala.evaluate(() => !document.getElementById('dcs').classList.contains('abierto')), 'Esc vuelve a la sala')
  verificar(errores3d.length === 0, `sala sin errores (${errores3d.join('; ')})`)
  await sala.close()

  // 7b. Tutorial (capítulo 0) en las pantallas: título, diálogo, objetivos que se cumplen.
  const tut = await navegador.newPage({ viewport: { width: 1366, height: 800 } })
  const erroresTut = []
  tut.on('pageerror', (e) => erroresTut.push(e.message))
  await tut.goto('http://localhost:4174/')
  await tut.getByRole('button', { name: 'Solo pantallas DCS' }).click()
  await tut.locator('button.mision').first().click()
  await tut.waitForSelector('#nav', { timeout: 120000 })
  await tut.waitForSelector('.mision-dialogo.visible', { timeout: 30000 })
  verificar((await tut.textContent('.mision-dialogo')).includes('Carmen Soto'), 'el tutorial habla por teléfono (jefa de turno)')
  await tut.waitForFunction(() => window.__app.estado()?.escenario?.mision?.objetivos.some((o) => o.id === 'pantalla'), null, { timeout: 30000 })
    .catch(async (e) => { console.log('objetivos:', await tut.evaluate(() => JSON.stringify(window.__app.estado()?.escenario?.mision))); throw e })
  await tut.click('#nav button[data-pantalla="alimentacion"]')
  await tut.click('#nav button[data-pantalla="digestor"]')
  await tut.waitForFunction(() => window.__app.estado().escenario.mision.objetivos.find((o) => o.id === 'pantalla')?.estado === 'cumplido', null, { timeout: 30000 })
  await tut.locator('svg text', { hasText: 'TIC-402' }).first().click()
  const spTut = tut.locator('.caratula input[type=number]').first()
  await spTut.fill('157'); await spTut.press('Enter')
  await tut.waitForFunction(() => window.__app.estado().escenario.mision.objetivos.find((o) => o.id === 'consigna')?.estado === 'cumplido', null, { timeout: 30000 })
  verificar(true, 'objetivos del tutorial: abrir pantalla, carátula y cambiar consigna')
  const objetivo = (id) => tut.waitForFunction((x) => window.__app.estado().escenario.mision.objetivos.find((o) => o.id === x)?.estado === 'cumplido', id, { timeout: 30000 })
  await tut.click('#nav button[data-pantalla="circulaciones"]')
  await tut.locator('svg text', { hasText: 'FIC-405' }).first().click()
  await tut.getByRole('button', { name: 'MAN', exact: true }).click()
  await objetivo('manual')
  await tut.getByRole('button', { name: 'AUTO', exact: true }).click()
  await objetivo('auto')
  await tut.waitForFunction(() => window.__app.estado().control.alarmas.lista.some((a) => !a.reconocida), null, { timeout: 30000 })
  await tut.getByRole('button', { name: 'Reconocer', exact: true }).click()
  await objetivo('alarma')
  await tut.click('#nav button[data-pantalla="tendencias"]')
  await tut.locator('.tendencia select').first().selectOption('TI-402')
  await objetivo('tendencia')
  await tut.click('#nav button[data-pantalla="calidad"]')
  await tut.getByRole('button', { name: 'Kappa de la pulpa' }).click()
  await objetivo('laboratorio')
  await tut.getByRole('button', { name: 'Radio', exact: true }).click()
  await objetivo('radio')
  await tut.click('button[data-vel="300"]')
  await tut.waitForSelector('.informe', { timeout: 120000 })
  const informe = await tut.textContent('.informe')
  verificar(informe.includes('Misión cumplida') && informe.includes('Respuesta ideal'), 'tutorial completo: informe con calificación y respuesta ideal')
  if (salidaCapturas) await tut.screenshot({ path: `${salidaCapturas}/informe.png` })
  verificar(erroresTut.length === 0, `tutorial sin errores (${erroresTut.join('; ')})`)
  if (salidaCapturas) await tut.screenshot({ path: `${salidaCapturas}/tutorial.png` })
  await tut.close()

  // 8. Celular (táctil, vertical): joystick y botón Operar.
  const cel = await navegador3d.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await cel.goto('http://localhost:4174/')
  await cel.getByRole('button', { name: 'Sala de control 3D' }).tap()
  await cel.getByText('Turno libre').tap()
  await cel.waitForFunction(() => window.__mundo, null, { timeout: 120000 })
  verificar(await cel.evaluate(() => window.__mundo.esTactil), 'celular detectado como táctil')
  await cel.evaluate(() => window.__mundo.ubicar(3.2, 1.9, 0))
  await cel.waitForSelector('.hud-operar', { state: 'visible', timeout: 5000 })
  await cel.tap('.hud-operar')
  await cel.waitForTimeout(1200)
  verificar(await cel.evaluate(() => document.getElementById('dcs').classList.contains('abierto')), 'botón Operar abre el DCS en el celular')
  if (salidaCapturas) await cel.screenshot({ path: `${salidaCapturas}/celular-dcs.png` })
  await cel.close()
} finally {
  await navegador.close()
  await navegador3d.close()
  await new Promise((r) => servidor.httpServer.close(r))
}
console.log(fallas === 0 ? 'Prueba de pantallas: todo correcto' : `Prueba de pantallas: ${fallas} fallas`)
process.exit(fallas === 0 ? 0 : 1)
