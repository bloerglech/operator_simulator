// Pantallas de proceso con mímico (1 a 5). Coordenadas en el lienzo de cada
// pantalla; el SVG se escala al espacio disponible.

import { h } from '../dom.js'
import { crearMimico } from '../mimico.js'

/** Envuelve una definición de mímico como pantalla. */
function pantallaMimico(def) {
  return (app) => {
    const m = crearMimico(def, app)
    return { elemento: h('div', {}, m.elemento), actualizar: m.actualizar }
  }
}

const T = (x, y, t, clase) => ({ tipo: 'texto', x, y, t, clase })
const tubo = (p, clase) => ({ tipo: 'tubo', p, clase })
const lazo = (tag, x, y) => ({ tipo: 'lazo', tag, x, y })
const valor = (tag, x, y, etiqueta, w) => ({ tipo: 'valor', tag, x, y, etiqueta, w })

// ---------------------------------------------------------------------------
// 1. Alimentación, impregnador y circulación de transferencia

const IMP = { x: 480, y: 70, w: 110, h: 500 } // 23 m
const yImp = (z) => IMP.y + (z / 23) * IMP.h

const DEF_alimentacion = ({
  ancho: 1100,
  alto: 690,
  elementos: [
    T(20, 22, 'Alimentación e impregnación', 'titulo'),
    // Silo y línea de astillas
    tubo([[125, 30], [125, 60]], 'astillas'), T(132, 44, 'del patio', 'suave'),
    { tipo: 'vaso', x: 40, y: 60, w: 110, h: 200, etiqueta: 'Silo' },
    { tipo: 'nivel', tag: 'LI-102', x: 156, y: 60, w: 12, h: 200 },
    lazo('LIC-102', 180, 62),
    valor('TI-103', 180, 122, 'TI-103 astillas'),
    tubo([[95, 260], [95, 292]], 'astillas'),
    { tipo: 'vaso', x: 60, y: 292, w: 70, h: 40, r: 4 }, { tipo: 'texto', x: 95, y: 316, t: 'Medidor', clase: 'suave', ancla: 'middle' },
    lazo('WIC-101', 180, 290),
    valor('SI-101', 180, 350, 'SI-101 velocidad'),
    tubo([[95, 332], [95, 428]], 'astillas'),
    valor('WI-104', 180, 400, 'WI-104 tubo astillas'),
    { tipo: 'bomba', id: 'bombas_astillas', x: 95, y: 442, etiqueta: 'Bombas de astillas' },
    tubo([[106, 442], [300, 442], [300, 40], [535, 40], [535, IMP.y]], 'astillas'),
    // Licores a la alimentación
    lazo('FIC-111', 312, 120), T(312, 114, 'Licor blanco', 'suave'),
    lazo('FIC-115', 312, 200), T(312, 194, 'Licor negro (ext. principal)', 'suave'),
    valor('LW-117', 312, 262, 'LW-117 licor/madera'),
    // Impregnador
    { tipo: 'vaso', ...IMP, etiqueta: 'Impregnador', etiquetaIzq: true },
    { tipo: 'columna', vaso: 'imp', x: IMP.x + 6, y: IMP.y + 6, w: IMP.w - 12, h: IMP.h - 12, altura: 23 },
    { tipo: 'malla', id: 'separador_imp', x: IMP.x + IMP.w, y: yImp(0.5), h: 26 },
    tubo([[IMP.x + IMP.w, yImp(1)], [640, yImp(1)], [640, 52], [560, 52], [560, IMP.y]], 'fino'),
    lazo('FIC-116', 655, 46), T(655, 40, 'Circulación de tope', 'suave'),
    tubo([[IMP.x + IMP.w, yImp(1.6)], [620, yImp(1.6)], [620, 150], [800, 150]], 'fino'),
    lazo('PIC-201', 655, 158), T(806, 146, 'al estanque de licor de nivel', 'suave'),
    valor('FI-204', 655, 218, 'FI-204 exceso'),
    lazo('LIC-202', 312, 330),
    valor('TI-203', 312, 392, 'TI-203 impregnación'),
    valor('II-205', 312, 520, 'II-205 raspador'),
    // Transferencia al digestor y retorno con calentador
    tubo([[535, IMP.y + IMP.h], [535, 625], [990, 625], [990, 40], [1090, 40]], 'astillas'),
    { tipo: 'bomba', id: 'bomba_transferencia', x: 700, y: 625, etiqueta: 'Bomba de transferencia' },
    T(1000, 32, 'al digestor', 'suave'),
    tubo([[1090, 100], [960, 100], [960, yImp(22.3)], [IMP.x + IMP.w, yImp(22.3)]]),
    T(1000, 94, 'retorno del separador del digestor', 'suave'),
    { tipo: 'calentador', id: 'retorno_transf', x: 937, y: 300, etiqueta: 'Calentador' },
    tubo([[1090, 313], [983, 313]], 'vapor'), T(1010, 306, 'vapor MP', 'suave'),
    lazo('TIC-212', 790, 270),
    lazo('FIC-211', 790, 360),
    lazo('FIC-112', 790, 450), T(790, 444, 'Licor blanco a la transferencia', 'suave'),
    tubo([[922, 476], [960, 476]], 'fino'),
  ],
})

// ---------------------------------------------------------------------------
// 2. Digestor: zonas, mallas, circulaciones y perfiles

const DIG = { x: 380, y: 60, esc: 11.2 } // px por m
const yDig = (z) => DIG.y + z * DIG.esc
const xPared = (z) => (z < 30 ? 538 : 546)

const DEF_digestor = ({
  ancho: 1100,
  alto: 770,
  elementos: [
    T(20, 22, 'Digestor', 'titulo'),
    { tipo: 'vaso', x: 388, y: yDig(0), w: 150, h: 30 * DIG.esc, r: 16, etiqueta: '' },
    { tipo: 'vaso', x: 380, y: yDig(30) - 4, w: 166, h: 27 * DIG.esc + 4, r: 10 },
    { tipo: 'columna', vaso: 'dig', x: 394, y: yDig(0) + 4, w: 138, h: 57 * DIG.esc - 8, altura: 57 },
    { tipo: 'zona', x: 380, y: yDig(0), w: 166, h: 8.55 * DIG.esc, etiqueta: 'Tope' },
    { tipo: 'zona', x: 380, y: yDig(8.55), w: 166, h: 18.05 * DIG.esc, etiqueta: 'Cocción superior' },
    { tipo: 'zona', x: 380, y: yDig(26.6), w: 166, h: 19.95 * DIG.esc, etiqueta: 'Cocción inferior' },
    { tipo: 'zona', x: 380, y: yDig(46.55), w: 166, h: 10.45 * DIG.esc, etiqueta: 'Lavado' },
    { tipo: 'nivel', tag: 'LI-302', x: 360, y: yDig(0), w: 12, h: 57 * DIG.esc },
    // Entradas por el tope
    tubo([[300, 40], [460, 40], [460, yDig(0)]], 'astillas'), T(300, 34, 'transferencia', 'suave'),
    // Mallas (pared derecha) y sus corrientes
    { tipo: 'malla', id: 'separador_dig', x: 538, y: yDig(0.4), h: 14 },
    { tipo: 'malla', id: 'mallas_superior', x: 538, y: yDig(2.5), h: 12 },
    { tipo: 'malla', id: 'mallas_circ_sup', x: 538, y: yDig(8.4), h: 14 },
    { tipo: 'malla', id: 'mallas_principal', x: 538, y: yDig(26.4), h: 14 },
    { tipo: 'malla', id: 'mallas_circ_inf', x: 546, y: yDig(30.4), h: 14 },
    { tipo: 'malla', id: 'mallas_final', x: 546, y: yDig(46.4), h: 14 },
    tubo([[xPared(1), yDig(1)], [565, yDig(1)], [565, 30], [760, 30]], 'fino'), T(766, 34, 'retorno a la transferencia', 'suave'),
    tubo([[xPared(3), yDig(3)], [600, yDig(3)], [600, 96]], 'fino'),
    lazo('FIC-501', 610, 80), T(610, 74, 'Extracción superior', 'suave'),
    tubo([[xPared(9), yDig(9)], [600, yDig(9)]]),
    lazo('FIC-401', 610, yDig(9) - 26), lazo('TIC-402', 750, yDig(9) - 26),
    tubo([[xPared(27), yDig(27)], [600, yDig(27)]]),
    lazo('PIC-301', 610, yDig(27) - 60), valor('FI-502', 750, yDig(27) - 52, 'FI-502 a flash'),
    valor('AI-504', 750, yDig(27) - 12, 'AI-504 álcali'),
    tubo([[xPared(31), yDig(31)], [600, yDig(31)]]),
    lazo('FIC-403', 610, yDig(31) + 8), lazo('TIC-404', 750, yDig(31) + 8),
    tubo([[xPared(47), yDig(47)], [600, yDig(47)]], 'fino'),
    lazo('FIC-503', 610, yDig(47) - 26), valor('AI-505', 750, yDig(47) - 18, 'AI-505 álcali'),
    // Fondo
    tubo([[600, yDig(56)], [546, yDig(56)]], 'fino'),
    lazo('FIC-601', 610, yDig(56) - 26), lazo('FIC-602', 750, yDig(56) - 26),
    tubo([[463, yDig(57)], [463, 755], [590, 755]], 'astillas'), T(596, 759, 'soplado', 'suave'),
    // Izquierda: presión, nivel y temperaturas
    lazo('LIC-302', 210, 150),
    valor('TI-303', 230, yDig(4), 'TI-303 tope'),
    valor('TI-304', 230, yDig(17), 'TI-304 cocción sup.'),
    valor('TI-305', 230, yDig(36), 'TI-305 cocción inf.'),
    valor('TI-306', 230, yDig(51), 'TI-306 lavado'),
    valor('II-307', 230, yDig(55.5), 'II-307 raspador'),
    // Perfiles por altura (didácticos)
    { tipo: 'perfil', vaso: 'dig', serie: 'T', x: 900, y: yDig(0), w: 80, h: 57 * DIG.esc, min: 60, max: 170, etiqueta: 'T licor °C' },
    { tipo: 'perfil', vaso: 'dig', especie: 'OH', factor: 40, x: 1000, y: yDig(0), w: 80, h: 57 * DIG.esc, min: 0, max: 40, etiqueta: 'Álcali g/L' },
  ],
})

// ---------------------------------------------------------------------------
// 3. Circulaciones y calentadores

function columnaCirculacion(x, d) {
  return [
    T(x, 40, d.titulo, 'titulo'),
    valor(d.pdi, x, 56, `${d.pdi} ΔP mallas`, 150),
    tubo([[x + 80, 100], [x + 80, 600]]),
    T(x + 86, 112, 'desde las mallas', 'suave'), T(x + 86, 596, 'al tubo central', 'suave'),
    { tipo: 'bomba', id: d.bomba, x: x + 80, y: 150 },
    lazo(d.fic, x + 120, 126),
    { tipo: 'calentador', id: d.calentador, x: x + 57, y: 280 },
    tubo([[x + 103, 293], [x + 300, 293]], 'vapor'), T(x + 210, 286, 'vapor MP', 'suave'),
    lazo(d.tic, x + 150, 212),
    lazo(d.lb, x + 120, 380), T(x + 120, 374, 'Licor blanco', 'suave'), tubo([[x + 80, 406], [x + 118, 406]], 'fino'),
    d.fil ? lazo(d.fil, x + 120, 470) : null, d.fil ? T(x + 120, 464, 'Filtrado', 'suave') : null,
    d.fil ? tubo([[x + 80, 496], [x + 118, 496]], 'fino') : null,
  ].filter(Boolean)
}

const DEF_circulaciones = ({
  ancho: 1100,
  alto: 640,
  elementos: [
    ...columnaCirculacion(30, { titulo: 'Transferencia', pdi: 'PDI-522', bomba: 'bomba_transferencia', fic: 'FIC-211', calentador: 'retorno_transf', tic: 'TIC-212', lb: 'FIC-112' }),
    ...columnaCirculacion(390, { titulo: 'Cocción superior', pdi: 'PDI-524', bomba: 'bomba_circ_sup', fic: 'FIC-401', calentador: 'circ_sup', tic: 'TIC-402', lb: 'FIC-113', fil: 'FIC-405' }),
    ...columnaCirculacion(750, { titulo: 'Cocción inferior', pdi: 'PDI-526', bomba: 'bomba_circ_inf', fic: 'FIC-403', calentador: 'circ_inf', tic: 'TIC-404', lb: 'FIC-114', fil: 'FIC-406' }),
    valor('FI-410', 30, 600, 'FI-410 vapor MP total', 170),
    { tipo: 'bomba', id: 'bomba_licor_blanco', x: 330, y: 616, etiqueta: '' }, T(348, 620, 'Bomba de licor blanco', 'suave'),
    { tipo: 'bomba', id: 'bomba_filtrado', x: 560, y: 616, etiqueta: '' }, T(578, 620, 'Bomba de filtrado', 'suave'),
  ],
})

// ---------------------------------------------------------------------------
// 4. Extracciones, ciclones flash y licor a evaporadores

const DEF_extracciones = ({
  ancho: 1100,
  alto: 620,
  elementos: [
    T(20, 22, 'Extracciones y ciclones flash', 'titulo'),
    { tipo: 'vaso', x: 40, y: 50, w: 110, h: 520, etiqueta: '' }, T(95, 44, 'Digestor', 'suave'),
    { tipo: 'malla', id: 'mallas_superior', x: 150, y: 90, h: 20 },
    { tipo: 'malla', id: 'mallas_principal', x: 150, y: 260, h: 20 },
    { tipo: 'malla', id: 'mallas_final', x: 150, y: 450, h: 20 },
    tubo([[150, 100], [560, 100], [560, 190], [600, 190]]),
    { tipo: 'bomba', id: 'bomba_extraccion_superior', x: 230, y: 100 },
    lazo('FIC-501', 270, 112),
    tubo([[150, 270], [560, 270], [560, 200], [600, 200]]),
    lazo('PIC-301', 270, 282), valor('FI-502', 412, 282, 'FI-502'), valor('AI-504', 412, 322, 'AI-504 álcali'),
    tubo([[350, 270], [350, 360], [210, 360], [210, 380]], 'fino'),
    { tipo: 'bomba', id: 'bomba_licor_imp', x: 210, y: 392 }, lazo('FIC-115', 230, 404), T(230, 398, 'al impregnador', 'suave'),
    tubo([[150, 460], [580, 460], [580, 210], [600, 210]]),
    { tipo: 'bomba', id: 'bomba_extraccion_final', x: 230, y: 460 },
    lazo('FIC-503', 270, 472), valor('AI-505', 412, 472, 'AI-505 álcali'),
    // Ciclones flash
    { tipo: 'vaso', x: 600, y: 150, w: 90, h: 170, etiqueta: 'Flash 1' },
    { tipo: 'nivel', tag: 'LI-510', x: 694, y: 150, w: 10, h: 170 },
    lazo('LIC-510', 712, 240),
    tubo([[645, 150], [645, 70], [1000, 70]], 'vapor'), T(860, 62, 'vapor flash al silo de astillas', 'suave'),
    tubo([[645, 320], [645, 380], [800, 380]]),
    { tipo: 'vaso', x: 800, y: 340, w: 80, h: 150, etiqueta: 'Flash 2' },
    { tipo: 'nivel', tag: 'LI-511', x: 884, y: 340, w: 10, h: 150 },
    lazo('LIC-511', 902, 420),
    tubo([[840, 340], [840, 300], [1000, 300]], 'vapor'), T(900, 292, 'vapor', 'suave'),
    tubo([[840, 490], [840, 560], [1080, 560]]),
    valor('FI-512', 900, 516, 'FI-512 a evaporadores', 160),
  ],
})

// ---------------------------------------------------------------------------
// 5. Fondo, lavado y soplado

const DEF_fondo = ({
  ancho: 1120,
  alto: 640,
  elementos: [
    T(20, 22, 'Fondo, lavado y soplado', 'titulo'),
    { tipo: 'vaso', x: 200, y: 40, w: 220, h: 420, r: 10 }, T(310, 34, 'Digestor: zona de lavado y fondo', 'suave'),
    { tipo: 'zona', x: 200, y: 40, w: 220, h: 220, etiqueta: 'Cocción inferior' },
    { tipo: 'zona', x: 200, y: 260, w: 220, h: 200, etiqueta: 'Lavado (contracorriente)' },
    { tipo: 'malla', id: 'mallas_final', x: 420, y: 250, h: 24 },
    tubo([[420, 262], [560, 262], [560, 200], [640, 200]], 'fino'),
    lazo('FIC-503', 650, 180), T(650, 174, 'Extracción final', 'suave'),
    lazo('LIC-302', 30, 60),
    valor('TI-306', 30, 270, 'TI-306 lavado'),
    valor('II-307', 30, 420, 'II-307 raspador'),
    // Filtrado de lavado y dilución
    { tipo: 'texto', x: 1090, y: 378, t: 'filtrado de lavado (75 °C)', clase: 'suave', ancla: 'end' }, tubo([[1090, 360], [420, 360]]),
    { tipo: 'bomba', id: 'bomba_lavado', x: 960, y: 360 },
    lazo('FIC-601', 460, 300), lazo('FDC-607', 610, 300), lazo('TIC-604', 760, 300),
    tubo([[900, 360], [900, 440], [420, 440]], 'fino'),
    lazo('FIC-602', 460, 450), lazo('CIC-605', 610, 450),
    // Soplado
    tubo([[310, 460], [310, 560], [995, 560], [995, 540]], 'astillas'),
    valor('FI-603', 400, 570, 'FI-603 soplado'),
    valor('TI-604', 560, 570, 'TI-604 soplado'),
    { tipo: 'vaso', x: 940, y: 430, w: 110, h: 110, etiqueta: 'Estanque de soplado' },
    { tipo: 'nivel', tag: 'LI-606', x: 924, y: 430, w: 12, h: 110 },
    valor('LI-606', 940, 580, 'LI-606 nivel'),
    tubo([[1050, 520], [1110, 520]]), T(1054, 512, 'al lavado', 'suave'),
  ],
})

/** Definiciones de los mímicos (también se dibujan como textura en la sala 3D). */
export const DEFINICIONES = { alimentacion: DEF_alimentacion, digestor: DEF_digestor, circulaciones: DEF_circulaciones, extracciones: DEF_extracciones, fondo: DEF_fondo }

export const alimentacion = pantallaMimico(DEF_alimentacion)
export const digestor = pantallaMimico(DEF_digestor)
export const circulaciones = pantallaMimico(DEF_circulaciones)
export const extracciones = pantallaMimico(DEF_extracciones)
export const fondo = pantallaMimico(DEF_fondo)
