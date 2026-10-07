// Entradas: teclado y mouse (bloqueo del puntero) en computador; joystick
// virtual (mitad izquierda) y arrastre para mirar (mitad derecha) en pantallas
// táctiles. Entrega intenciones al bucle del mundo.

export function crearEntrada(lienzo, { alInteractuar, alSalir }) {
  const teclas = new Set()
  const intencion = { adelante: 0, derecha: 0, correr: false, mirarX: 0, mirarY: 0 }
  let palanca = null // { id, x0, y0, dx, dy }
  let vista = null // { id, x, y }
  let habilitada = true

  const onKeyDown = (e) => {
    if (!habilitada) return
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
    teclas.add(e.code)
    if (e.code === 'KeyE' || e.code === 'Enter') alInteractuar()
  }
  const onKeyUp = (e) => teclas.delete(e.code)
  const onMouseMove = (e) => {
    if (!habilitada || document.pointerLockElement !== lienzo) return
    intencion.mirarX += e.movementX * 0.0022
    intencion.mirarY += e.movementY * 0.0022
  }
  const onClick = () => {
    if (habilitada && !esTactil && document.pointerLockElement !== lienzo) lienzo.requestPointerLock?.()
  }
  const esTactil = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window

  const onTouchStart = (e) => {
    if (!habilitada) return
    for (const t of e.changedTouches) {
      if (t.clientX < window.innerWidth / 2 && !palanca) palanca = { id: t.identifier, x0: t.clientX, y0: t.clientY, dx: 0, dy: 0 }
      else if (!vista) vista = { id: t.identifier, x: t.clientX, y: t.clientY }
    }
    e.preventDefault()
  }
  const onTouchMove = (e) => {
    for (const t of e.changedTouches) {
      if (palanca && t.identifier === palanca.id) {
        palanca.dx = Math.max(-1, Math.min(1, (t.clientX - palanca.x0) / 50))
        palanca.dy = Math.max(-1, Math.min(1, (t.clientY - palanca.y0) / 50))
      } else if (vista && t.identifier === vista.id) {
        intencion.mirarX += (t.clientX - vista.x) * 0.006
        intencion.mirarY += (t.clientY - vista.y) * 0.006
        vista.x = t.clientX
        vista.y = t.clientY
      }
    }
    e.preventDefault()
  }
  const onTouchEnd = (e) => {
    for (const t of e.changedTouches) {
      if (palanca && t.identifier === palanca.id) palanca = null
      if (vista && t.identifier === vista.id) vista = null
    }
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  document.addEventListener('mousemove', onMouseMove)
  lienzo.addEventListener('click', onClick)
  lienzo.addEventListener('touchstart', onTouchStart, { passive: false })
  lienzo.addEventListener('touchmove', onTouchMove, { passive: false })
  lienzo.addEventListener('touchend', onTouchEnd)
  lienzo.addEventListener('touchcancel', onTouchEnd)
  const onPointerLockChange = () => { if (document.pointerLockElement !== lienzo) teclas.clear() }
  document.addEventListener('pointerlockchange', onPointerLockChange)

  return {
    esTactil,
    palanca: () => palanca,
    /** Lee y consume la intención acumulada desde el último cuadro. */
    leer() {
      const t = (a, b) => (teclas.has(a) || teclas.has(b) ? 1 : 0)
      intencion.adelante = t('KeyW', 'ArrowUp') - t('KeyS', 'ArrowDown') - (palanca?.dy ?? 0)
      intencion.derecha = t('KeyD', 'ArrowRight') - t('KeyA', 'ArrowLeft') + (palanca?.dx ?? 0)
      intencion.correr = teclas.has('ShiftLeft') || teclas.has('ShiftRight')
      const r = { ...intencion }
      intencion.mirarX = 0
      intencion.mirarY = 0
      return r
    },
    habilitar(si) {
      habilitada = si
      teclas.clear()
      palanca = null
      vista = null
      if (!si && document.pointerLockElement === lienzo) document.exitPointerLock()
    },
    destruir() {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('pointerlockchange', onPointerLockChange)
      alSalir?.()
    },
  }
}
