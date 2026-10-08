# Simulador de operador — Digestor continuo Lo-Solids (eucalipto)

Juego web en primera persona: operador de sala de control de una planta de
celulosa kraft. Prioridad: fidelidad del modelo de proceso y de la operación.

- Especificación: [`docs/ESPECIFICACION.md`](docs/ESPECIFICACION.md)
- Plan por fases y avance: [`docs/PLAN.md`](docs/PLAN.md)
- Modelo (ecuaciones, unidades, supuestos): [`docs/MODELO.md`](docs/MODELO.md)

## Uso

```bash
npm install
npm run dev            # el juego en el navegador (pantallas DCS en 2D)
npm test               # pruebas (Vitest)
npm run e2e            # prueba de las pantallas en Chromium (playwright-core)
npm run caso-base      # corre el caso base 24 h e imprime KPI, corrientes y perfiles
npm run caso-base -- 48   # otra duración en horas
npm run calibrar       # recalibra la cinética al caso base (escribe config/cinetica.json)
npm run sensibilidades # efecto de cambios típicos de operación
npm run tabla-parametros  # regenera el Anexo A del manual
npm run tablas-manual     # actualiza las cifras del manual que salen del caso base (tests/manual.test.js lo vigila)
npm run sintonia       # pruebas de escalón de los 29 lazos (escribe docs/SINTONIA.md)
npm run documentar     # regenera docs/EVENTOS.md y docs/MISIONES.md
```

## El juego

- **Campaña** de 12 capítulos (tutorial, turno de noche, más toneladas, licor
  débil, mallas, presurización, columna colgada, parada corta, parada general,
  puesta en marcha, apagón y récord), con diálogos, objetivos, pistas, puntos
  de control e informe con medalla. Detalle en [`docs/MISIONES.md`](docs/MISIONES.md).
- **Turno completo** de 8 o 12 horas con eventos aleatorios y meta, y
  **operación libre** con el panel del instructor.
- **Sala de control 3D** (computador y celular) o solo las pantallas DCS.
- **Ajustes**: dificultad (frecuencia de eventos, ruido de instrumentos,
  pistas y vista de perfiles), volumen; calidad gráfica en el HUD.
- **Ayuda contextual** en cada carátula y manual de operación con glosario
  dentro del juego; sonidos sintetizados; autoguardado y exportar/importar
  partidas.

Manual de estudio: [`docs/manual/`](docs/manual/README.md).
Guía de las pantallas: [`docs/GUIA-PANTALLAS.md`](docs/GUIA-PANTALLAS.md).

## Estructura

```
src/sim/        núcleo de simulación (JS puro, sin DOM ni Three.js; corre en Node)
src/control/    instrumentos, lazos, bloques, enclavamientos y alarmas
src/escenarios/ eventos, generador aleatorio, director e indicadores del turno
src/misiones/   motor de misiones y campaña (datos)
src/puente/     web worker: motor, historial, puntos de control
src/hmi/        pantallas DCS (SVG), carátulas, tendencias, ayuda
src/ui/         menú, misiones, informes, ajustes, sonidos, partidas
src/mundo3d/    sala de control 3D (Three.js)
config/         todos los parámetros de proceso, con unidad y origen
herramientas/ scripts de Node (caso base, calibración, sensibilidades, tabla de parámetros)
tests/        pruebas
docs/         especificación, plan y modelo
```

La simulación expone una única interfaz (`crearPlanta` en
`src/sim/planta.js`): `avanzar`, `enviarComando`, `leerEstado`, `guardar` y
`cargar`. Las pantallas y la sala 3D la usan solo a través del worker
(`src/puente/`); una prueba verifica la independencia de las capas.
