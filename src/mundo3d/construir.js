// Construye la sala 3D a partir de config/sala.json: formas simples (o un
// modelo GLB si el objeto lo indica), pantallas con textura del DCS, luces,
// balizas y emisores de vapor. Las colisiones vienen aparte (jugador.js).

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const GRADOS = Math.PI / 180

function rotar(objeto, rot) {
  if (!rot) return
  objeto.rotation.set((rot[0] ?? 0) * GRADOS, (rot[1] ?? 0) * GRADOS, (rot[2] ?? 0) * GRADOS, 'YXZ')
}

export function construirSala(sala, { calidad }) {
  const grupo = new THREE.Group()
  const materiales = new Map()
  const material = (color) => {
    if (!materiales.has(color)) materiales.set(color, new THREE.MeshLambertMaterial({ color }))
    return materiales.get(color)
  }
  const geometria = (o) => {
    switch (o.tipo) {
      case 'caja': return new THREE.BoxGeometry(...o.tam)
      case 'cilindro': return new THREE.CylinderGeometry(o.radio, o.radio, o.alto, 24)
      case 'esfera': return new THREE.SphereGeometry(o.radio, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2)
      case 'plano': return new THREE.PlaneGeometry(o.tam[0], o.tam[1])
      case 'vidrio': return new THREE.BoxGeometry(...o.tam)
      default: throw new Error(`sala.json: tipo de objeto desconocido "${o.tipo}" (${o.id})`)
    }
  }

  // ---- Objetos ----
  const cargador = new GLTFLoader()
  for (const o of sala.objetos) {
    const geo = geometria(o)
    const mat = o.tipo === 'vidrio'
      ? new THREE.MeshBasicMaterial({ color: o.color, transparent: true, opacity: o.opacidad ?? 0.2, depthWrite: false })
      : material(o.color)
    let malla
    if (o.repetir) {
      // Objetos repetidos: una sola llamada de dibujo (instancias).
      malla = new THREE.InstancedMesh(geo, mat, o.repetir.n)
      const m = new THREE.Matrix4()
      for (let i = 0; i < o.repetir.n; i++) {
        m.makeTranslation(o.pos[0] + o.repetir.paso[0] * i, o.pos[1] + o.repetir.paso[1] * i, o.pos[2] + o.repetir.paso[2] * i)
        malla.setMatrixAt(i, m)
      }
    } else {
      malla = new THREE.Mesh(geo, mat)
      malla.position.set(...o.pos)
      if (o.tipo === 'cilindro') malla.position.y += o.alto / 2 // pos = base del cilindro
      if (o.tipo === 'plano') malla.rotation.x = -Math.PI / 2
      rotar(malla, o.rot)
    }
    malla.name = o.id
    grupo.add(malla)
    if (o.glb) {
      // El modelo reemplaza a la forma simple cuando termina de cargar.
      cargador.load(o.glb, (gltf) => {
        const modelo = gltf.scene
        modelo.position.copy(malla.position)
        modelo.rotation.copy(malla.rotation)
        if (o.escala) modelo.scale.setScalar(o.escala)
        grupo.remove(malla)
        grupo.add(modelo)
      }, undefined, () => { /* sin modelo: queda la forma simple */ })
    }
  }

  // ---- Anclajes ----
  const pantallas = []
  const balizas = {}
  const luces = []
  const vapores = {}
  const interacciones = []
  for (const a of sala.anclajes) {
    if (a.tipo === 'pantalla') {
      const mural = a.contenido === 'mural'
      const anchoTex = mural ? calidad.textura_mural : calidad.textura
      const canvas = document.createElement('canvas')
      canvas.width = anchoTex
      canvas.height = Math.round((anchoTex * a.tam[1]) / a.tam[0])
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#1a1c1e'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const textura = new THREE.CanvasTexture(canvas)
      textura.colorSpace = THREE.SRGBColorSpace
      textura.anisotropy = 4
      const plano = new THREE.Mesh(new THREE.PlaneGeometry(a.tam[0], a.tam[1]), new THREE.MeshBasicMaterial({ map: textura, toneMapped: false }))
      const soporte = new THREE.Group()
      soporte.position.set(...a.pos)
      rotar(soporte, a.rot)
      soporte.add(plano)
      if (a.marco) {
        const marco = new THREE.Mesh(new THREE.BoxGeometry(a.tam[0] + 0.05, a.tam[1] + 0.05, 0.04), material('#141517'))
        marco.position.z = -0.025
        soporte.add(marco)
        if (!mural) {
          const pie = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.25, 0.06), material('#141517'))
          pie.position.set(0, -a.tam[1] / 2 - 0.1, -0.06)
          soporte.add(pie)
        }
      }
      grupo.add(soporte)
      pantallas.push({ id: a.id, contenido: a.contenido, canvas, textura, malla: plano })
    } else if (a.tipo === 'baliza') {
      const mat = new THREE.MeshBasicMaterial({ color: '#4a1010' })
      const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.18, 12), mat)
      cuerpo.position.set(...a.pos)
      const luz = new THREE.PointLight('#ff2a1a', 0, 9, 2)
      luz.position.set(a.pos[0], a.pos[1] - 0.15, a.pos[2] + 0.2)
      grupo.add(cuerpo, luz)
      balizas[a.id] = { cuerpo, luz, mat }
    } else if (a.tipo === 'luz') {
      const luz = new THREE.PointLight(a.color ?? '#ffffff', a.intensidad ?? 4, 14, 1.6)
      luz.position.set(...a.pos)
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.03, 0.4), new THREE.MeshBasicMaterial({ color: '#e9e6dc' }))
      panel.position.set(a.pos[0], 3.59, a.pos[2])
      grupo.add(luz, panel)
      luces.push({ luz, panel, base: luz.intensity })
    } else if (a.tipo === 'vapor') {
      vapores[a.id] = crearVapor(a.pos)
      grupo.add(vapores[a.id].grupo)
    } else if (a.radio) {
      interacciones.push(a)
    }
  }
  return { grupo, pantallas, balizas, luces, vapores, interacciones }
}

/** Columna de vapor: esferas translúcidas que suben y se desvanecen. */
function crearVapor(pos) {
  const grupo = new THREE.Group()
  grupo.position.set(...pos)
  grupo.visible = false
  const mat = new THREE.MeshLambertMaterial({ color: '#f2f2f2', transparent: true, opacity: 0.35, depthWrite: false })
  const bolas = []
  for (let i = 0; i < 14; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mat.clone())
    b.userData.fase = i / 14
    grupo.add(b)
    bolas.push(b)
  }
  return {
    grupo,
    actualizar(activo, t) {
      grupo.visible = activo
      if (!activo) return
      for (const b of bolas) {
        const f = (t * 0.12 + b.userData.fase) % 1
        b.position.set(Math.sin(b.userData.fase * 17) * 2 * f, f * 22, Math.cos(b.userData.fase * 11) * 2 * f)
        b.scale.setScalar(1.5 + f * 6)
        b.material.opacity = 0.4 * (1 - f)
      }
    },
  }
}
