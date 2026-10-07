# Simulador de operador — Digestor continuo Lo-Solids (eucalipto)

Juego web en primera persona: operador de sala de control de una planta de
celulosa kraft. Prioridad: fidelidad del modelo de proceso y de la operación.

- Especificación: [`docs/ESPECIFICACION.md`](docs/ESPECIFICACION.md)
- Plan por fases y avance: [`docs/PLAN.md`](docs/PLAN.md)
- Modelo (ecuaciones, unidades, supuestos): [`docs/MODELO.md`](docs/MODELO.md)

## Uso

```bash
npm install
npm test               # pruebas (Vitest)
npm run caso-base      # corre el caso base 24 h e imprime KPI, corrientes y perfiles
npm run caso-base -- 48   # otra duración en horas
npm run calibrar       # recalibra la cinética al caso base (escribe config/cinetica.json)
npm run sensibilidades # efecto de cambios típicos de operación
npm run tabla-parametros  # regenera el Anexo A del manual
```

Manual de estudio: [`docs/manual/`](docs/manual/README.md).

## Estructura

```
src/sim/      núcleo de simulación (JS puro, sin DOM ni Three.js; corre en Node)
config/       todos los parámetros de proceso, con unidad y origen
herramientas/ scripts de Node (caso base, calibración, sensibilidades, tabla de parámetros)
tests/        pruebas
docs/         especificación, plan y modelo
```

La simulación expone una única interfaz (`crearPlanta` en
`src/sim/planta.js`): `avanzar`, `enviarComando`, `leerEstado`, `guardar` y
`cargar`. Las capas de presentación (Fases 3 y 4) solo usarán esa interfaz.
