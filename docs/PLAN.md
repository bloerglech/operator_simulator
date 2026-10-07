# PLAN DE TRABAJO — Fase 0

Estado: **propuesta, pendiente de aprobación**. No se escribe código del
simulador hasta que apruebes este plan, los supuestos de `docs/MODELO.md` y
respondas (o aceptes los valores provisionales de) las preguntas de la
sección 6.

Documento rector: `docs/ESPECIFICACION.md`. Si algo de aquí lo contradice,
manda la especificación y este plan se corrige.

---

## 1. Observaciones previas

1. **Prototipos anteriores.** El repositorio solo contiene la
   especificación; los dos prototipos (por turnos y sala 3D simple) no están.
   Si quieres que reutilice algo de ellos, súbelos a una carpeta
   `prototipos/` y los reviso antes de la Fase 3/4 (que es donde serían
   útiles).
2. **Alcance de la madera (decisión tuya, modifica las secciones 6.3, 7,
   10, 11 y 13 de la especificación).** Solo eucalipto, una sola especie:
   *E. nitens*, con todas sus propiedades configurables. No hay mezcla de
   especies ni parámetros de pino. En consecuencia:
   - "Cambio de mezcla de especies" pasa a ser **cambio de lote/campaña de
     nitens** (densidad, composición, reactividad).
   - La prueba "más nitens exige más carga" pasa a ser **"madera menos
     reactiva o con más lignina exige más carga"**.
   - El caso base es 100 % nitens.
   La topología de un vaso sigue disponible por configuración, siempre con
   eucalipto.
3. **Consistencia del caso base (sección 7).** Con las temperaturas dadas,
   la velocidad relativa de Vroom es ≈ 139 a 148 °C y ≈ 167 a 150 °C. Si
   toda la "cocción total" de 180–240 min estuviera a 147–152 °C, el factor
   H resultaría 420–800, por encima de 350–500. Ambos rangos son
   compatibles si los 180–240 min incluyen el calentamiento en la
   transferencia y la zona de lavado (más fría), dejando ≈ 2,5–3 h
   efectivas a temperatura de cocción. Así lo asumo (supuesto S-07); la
   calibración lo verificará y lo informará.

---

## 2. Arquitectura

### 2.1 Capas y dependencias

```
src/
  sim/          núcleo del proceso (JS puro, sin DOM ni Three.js)
  control/      PID, lógica de modos, enclavamientos, alarmas, control avanzado
  instrumentos/ (dentro de sim/) transmisores, analizadores, laboratorio
  escenarios/   estados iniciales y generador de perturbaciones (datos + motor)
  misiones/     definiciones de misiones (datos) y motor de misiones
  puente/       Web Worker + cliente que expone la interfaz única
  hmi/          pantallas DCS 2D (canvas/HTML)
  mundo3d/      sala de control Three.js
  ui/           menús, HUD, entradas (teclado, mouse, táctil)
config/         todos los parámetros (*.json)
docs/           ESPECIFICACION, PLAN, MODELO, EVENTOS, MISIONES, PROCEDIMIENTOS
tests/          Vitest
herramientas/   calibración, script de caso base, (opcional) Blender
```

Reglas de dependencia (verificadas por una prueba que recorre los `import`):

| Capa             | Puede importar                                  |
|------------------|-------------------------------------------------|
| `sim/`           | solo `sim/` y `config/`                          |
| `control/`       | `sim/` (tipos y utilidades), `config/`           |
| `escenarios/`, `misiones/` (motor) | `sim/`, `control/`, `config/` |
| `puente/`        | todo lo anterior                                 |
| `hmi/`, `mundo3d/`, `ui/` | solo `puente/` (la interfaz única) y `config/` de presentación |

`sim/` y `control/` no usan `window`, `document`, `performance`, `Date.now`
ni `Math.random`: el tiempo es el contador de pasos y el azar viene del
generador con semilla.

### 2.2 Interfaz única simulación ↔ presentación

```js
// Dentro del worker (o en Node, sin worker):
const planta = crearPlanta(config, { semilla });
planta.avanzar(segundosSimulados);          // pasos fijos internos
planta.leerEstado();     // instantánea inmutable (ver abajo)
planta.enviarComando(cmd);                   // se aplica al inicio del próximo paso
planta.guardar();  planta.cargar(json);      // estado completo, exacto
```

Instantánea: `{ t, paso, variables: {TAG: {pv, unidad, calidad}}, lazos:
{TAG: {pv, sp, salida, modo, limites, sintonia}}, equipos, alarmas: [...],
eventos: [...nuevos desde la última lectura], perfiles (si están
habilitados), kpi }`.

Comandos (todos serializables, registrados con el número de paso en que se
aplican, lo que permite repetir una partida exactamente):

```
{tipo:'consigna', tag, valor}        {tipo:'modo', tag, modo:'MAN'|'AUTO'|'CAS'}
{tipo:'salida', tag, valor}          {tipo:'equipo', id, accion:'partir'|'detener'|...}
{tipo:'valvula', id, apertura}       {tipo:'muestra', analisis, punto}
{tipo:'alarma', accion:'reconocer'|'suprimir', id}
{tipo:'mallas', id, accion:'conmutar'|'retrolavar'}
{tipo:'instructor', evento, parametros}   {tipo:'avanzado', id, activo}
```

La aceleración y la pausa las maneja el puente (cuántos segundos simulados
pide por segundo real); el simulador no la conoce, por lo que el resultado
no puede depender de ella.

### 2.3 Integración en el tiempo

- **Paso rápido** `dt_r = 0,2 s` (configurable): presiones de los vasos,
  caudales, válvulas y bombas, PID, enclavamientos, temporizadores de
  alarmas, transmisores.
- **Paso lento** `dt_l = 5 s` (múltiplo entero de `dt_r`): celdas
  (transporte, difusión, cinética, energía), mallas, ensuciamiento, nivel de
  columnas. Usa los caudales promediados durante los pasos rápidos, para que
  el balance cierre.
- A x300 son 1 500 pasos rápidos y 60 lentos por segundo real: holgado para
  un worker. Se medirá en la Fase 1 y, si hace falta, se ajusta `dt_l`.
- Generador aleatorio: xoshiro128** con semilla, con **flujos separados**
  por subsistema (ruido de instrumentos, eventos, laboratorio) para que
  agregar un transmisor no cambie la secuencia de eventos.

### 2.4 Configuración

Cada parámetro de proceso es un objeto:

```json
"Ea_principal_OH": { "valor": 130, "unidad": "kJ/mol", "origen": "supuesto",
                      "nota": "eucalipto; reemplazar con datos de nitens" }
```

`origen` ∈ {`literatura`, `calibrado`, `supuesto`, `planta`} (`planta` para
cuando reemplaces con tus datos). Un validador propio (sin dependencias)
revisa unidades, rangos y que no falte nada al cargar. Archivos previstos:
`topologia.json`, `equipos.json` (dimensiones), `madera.json`,
`licores.json`, `cinetica.json`, `hidraulica.json`, `energia.json`,
`caso_base.json`, `instrumentos.json`, `lazos.json`, `alarmas.json`,
`enclavamientos.json`, `eventos.json`, `simulacion.json` (pasos de
integración, número de celdas), y más adelante `sala.json`, `campana.json`.

---

## 3. Fases y criterios de aceptación

Cada fase termina con: resumen, cómo probarlo, supuestos nuevos y
pendientes (actualizando `docs/MODELO.md`).

### Fase 0 — Plan, supuestos y modelo *(esta entrega)*
- `docs/PLAN.md`, `docs/MODELO.md`, preguntas abiertas.
- **Aceptación:** tu aprobación.

### Fase 1 — Núcleo de simulación, calibración y pruebas
Subdividida para poder revisar avances:

- **1a. Esqueleto y transporte.** Proyecto Vite + Vitest, cargador y
  validador de configuración, generador con semilla, mallado de celdas,
  transporte pistón de astillas, balance hidráulico de licor libre,
  difusión libre ↔ retenido, balance de energía, línea de transferencia
  con tiempo de transporte. Sin cinética todavía (trazadores).
  *Aceptación:* cierre de masa < 0,1 % y energía < 1 %; tiempos de
  residencia y tiempo muerto de un trazador coherentes con el ritmo;
  estable con caudales en cero, vasos parciales y T < 100 °C.
- **1b. Cinética y calibración.** Factor H, lignina en tres fracciones,
  carbohidratos, HexA, viscosidad, consumo de álcali, efecto de sólidos
  disueltos, impregnación y rechazos. Rutina de calibración
  (`herramientas/calibrar.js`) que ajusta preexponenciales y
  estequiometrías al caso base y escribe `config/cinetica.json` marcando
  esos parámetros como `calibrado`.
  *Aceptación:* pruebas de factor H; estado estacionario del caso base
  dentro de los rangos de la sección 7; todas las respuestas cualitativas
  de la sección 13.
- **1c. Equipos e hidráulica.** Silo y vaporización, medidor de astillas,
  tubo y bombas de astillas, presión de los vasos (compresibilidad),
  alivio y seguridad, vaporización súbita, mallas (ΔP, taponamiento,
  conmutación, retrolavado), calentadores con ensuciamiento, ciclones
  flash, fondo y soplado, columna (nivel, compactación, raspadores),
  estados de operación (vacío, llenado, frío, presurizado, caliente).
- **Entregable:** `npm run caso-base` imprime perfiles por celda y KPI;
  `npm test` pasa. Determinismo y guardado/carga exactos ya probados aquí.

### Fase 2 — Control, enclavamientos y alarmas
- PID (forma ISA, MAN/AUTO/CAS, transferencia sin golpe, anti-windup por
  recálculo, límites), actuadores (constante de tiempo, límite de
  velocidad, banda muerta, pegado), todos los lazos de la sección 8,
  enclavamientos, sistema de alarmas (prioridad, banda muerta, retardos,
  reconocimiento, supresión por estado de operación), registro de eventos,
  instrumentación con falla, analizador de kappa y laboratorio. Control
  avanzado (factor H, kappa, coordinación de ritmo) activable.
- **Aceptación:** pruebas de escalón por lazo (sin oscilación sostenida,
  sobrepaso y tiempo de asentamiento dentro de lo configurado), prueba de
  cada enclavamiento, prueba de que un evento simple no genera avalancha
  (> 10 alarmas en 10 min).

### Fase 3 — Pantallas DCS 2D (jugable sin 3D)
- Las 9 pantallas, carátulas, tendencias, alarmas, navegación, panel de
  instructor básico, aceleración y pausa, guardar/cargar. Diseño de alto
  desempeño (fondo gris, color solo para lo anormal). Funciona en
  computador y celular.
- **Aceptación:** puedo operar el caso base, hacer un cambio de ritmo y
  responder a una alarma solo con las pantallas; la simulación no bloquea
  la interfaz a x300.

### Fase 4 — Sala de control 3D
- `config/sala.json` (formas simples o GLB, anclajes, colisiones),
  caminar con colisiones, interacción por cercanía, DCS como textura en
  monitores, pantalla mural, ventanal, efectos de ambiente, controles
  táctiles, tres niveles de calidad.
- **Aceptación:** 60 fps en computador y 30 en celular medio dentro del
  presupuesto; la sala carga igual con o sin modelos; un GLB faltante cae
  a forma simple.

### Fase 5 — Perturbaciones, misiones 0–3, puntaje
- Generador de eventos y panel de instructor completo, `docs/EVENTOS.md`,
  motor de misiones (datos), radio/teléfono/libro de novedades, pistas,
  puntos de control, informe con calificación, tutorial y misiones 1–3,
  puntaje y reporte de turno, `docs/MISIONES.md`.
- **Aceptación:** cada misión con prueba que la supera y prueba sin
  acciones que la falla.

### Fase 6 — Misiones 4–11 y estados completos
- Presurización, colgamiento, paradas, arranque en frío, apagón, turno
  récord; `docs/PROCEDIMIENTOS.md` consultable en el juego.
- **Aceptación:** igual que la Fase 5 para todas las misiones.

### Fase 7 — Guardado, rendimiento y pulido
- Guardado en localStorage y exportar/importar JSON en la interfaz,
  perfilado, ajustes de dificultad, ayuda contextual.

---

## 4. Estrategia de pruebas (sección 13)

| Prueba | Fase |
|--------|------|
| Cierre de masa total y por componente (< 0,1 %), energía (< 1 %) | 1a/1b |
| Factor H: 1 h a 100 °C ≈ 1 (la fórmula da 1,014); 150 °C ≈ 167; 160 °C ≈ 402 por hora | 1b |
| Estado estacionario del caso base en rangos | 1b |
| Respuestas cualitativas (T, álcali, ritmo, dilución, humedad, madera menos reactiva) | 1b |
| Tiempos muertos y residencia vs ritmo | 1a |
| Determinismo: misma semilla + mismo registro de comandos ⇒ estado idéntico bit a bit, con distintos tamaños de "avanzar" (simula x1, x60, x300) | 1a |
| Guardar → cargar → continuar = continuar sin guardar (bit a bit) | 1a |
| Independencia de capas (análisis de imports) y simulador completo en Node | 1a |
| Escalones de lazos y enclavamientos | 2 |
| Misiones: guion ganador y guion vacío | 5/6 |
| Sala con formas simples / GLB / GLB faltante | 4 |

Nota sobre el factor H a 100 °C: con las constantes de la especificación,
exp(43,2 − 16115/373,15) = 1,014. La prueba usará tolerancia del 2 %. Si
tienes la tabla de Vroom que quieres usar como referencia a 150 y 160 °C,
pásamela; si no, uso los valores de la fórmula.

---

## 5. Riesgos técnicos y cómo los abordo

| Riesgo | Mitigación |
|--------|-----------|
| Rigidez numérica de la presión (segundos) frente a la cinética (horas) | Dos pasos de integración; presión con Euler implícito |
| Dispersión numérica que "suaviza" el tiempo muerto del kappa | Transporte de astillas con esquema de segundo orden con limitador (TVD); prueba de tiempo muerto con trazador |
| Demasiados parámetros para calibrar con pocos objetivos | Calibrar solo preexponenciales y estequiometrías (≈ 10), energías de activación y órdenes fijos desde configuración; calibración por etapas y Levenberg–Marquardt |
| Modelo de compactación/colgamiento poco identificable | Estructura simple tipo Janssen con parámetros "supuesto", calibración cualitativa (que los síntomas se vean bien) |
| Determinismo en punto flotante entre navegadores | Solo operaciones IEEE deterministas (`Math.exp`/`Math.log` pueden variar entre motores en el último bit): la prueba de determinismo es dentro de un mismo motor; las partidas guardadas guardan estado, no se re-simulan |

---

## 6. Preguntas abiertas (datos de diseño)

Para cada una propongo un valor provisional (marcado `supuesto` en
configuración). Si me dices "usa los provisionales", avanzo con ellos y los
reemplazas después.

| # | Pregunta | Provisional |
|---|----------|-------------|
| P1 | Dimensiones del impregnador (diámetro, altura útil) | Ø 9 m × 24 m (≈ 1 500 m³) |
| P2 | Dimensiones del digestor y si es cónico por tramos | Ø 11,5 m arriba / 12,5 m abajo, 62 m útiles (≈ 7 000 m³) |
| P3 | Altura de cada juego de mallas y separadores | Proporcional a los tiempos del caso base (calculado) |
| P4 | Presión de operación del impregnador y del tope del digestor | Impregnador 6 bar(g), digestor 5,5 bar(g) |
| P5 | ¿Con qué corriente se controla la presión del digestor en tu planta? | Válvula en la línea de extracción principal a flash 1, con licor de reposición a presión como respaldo |
| P6 | Ajustes de la válvula de alivio y de seguridad | Alivio a 7,5 bar(g), seguridad a 9 bar(g) |
| P7 | Caudales de diseño de cada circulación (transferencia, superior, inferior, lavado) | 0,25 / 0,20 / 0,20 / 0,10 m³/s |
| P8 | Calentadores: área, coeficiente limpio, presión de vapor MP | U·A limpio para dar +12 °C con 30 % de margen; vapor MP 12 bar(g) |
| P9 | Presión de los ciclones flash 1 y 2 | 2,5 bar(a) y 1,1 bar(a) |
| P10 | Densidad básica y composición de tu *E. nitens* (lignina, glucano, xilano, extraíbles, acetilos, MeGlcA) | Ver tabla en MODELO.md §3; requiere tu confirmación |
| P11 | Medidor de astillas: volumen por revolución y rango de velocidad | Dimensionado para 110 % con la madera base a 80 % de velocidad |
| P12 | Temperatura y composición del filtrado de lavado | 75 °C, 2 g/L álcali efectivo, 40 g/L sólidos disueltos |
| P13 | Temperatura del licor blanco y eficiencia de caustificación | 90 °C, 82 % |
| P14 | ¿Interesa modelar la vaporización del silo con vapor flash + vapor fresco BP, o basta con un índice de calidad de vaporización? | Modelo simple de energía + índice de remoción de aire |
| P15 | Tiempos de transporte de la línea de transferencia y de soplado | 30 s y 20 s |
| P16 | Analizador de kappa: período y error | 25 min, σ = 0,5 kappa |
| P17 | Confirmar que los 180–240 min de "cocción total" incluyen calentamiento y zona de lavado (ver §1.3) | Sí |
| P18 | Precios para el resumen económico (madera, álcali, vapor, pulpa) | Valores genéricos en USD, marcados supuesto |
| P19 | ¿Tienes datos cinéticos de nitens (cocciones de laboratorio o de planta a distintas temperaturas o cargas) para fijar energías de activación? | E como supuesto; solo se calibran preexponenciales |

---

## 7. Lo que NO entra en la Fase 1

Pantallas, 3D, misiones, sonidos, terreno y otras áreas. La Fase 1 deja la
arquitectura lista para ellas (interfaz única, estados de operación,
eventos instructor) pero no las implementa.
