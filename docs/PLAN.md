# PLAN DE TRABAJO

Estado: **aprobado** con los valores provisionales de la sección 6.
Fase actual: **5 terminada** (ver sección 8).

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

`origen` ∈ {`literatura`, `calibrado`, `supuesto`, `especificacion`, `planta`}
(`especificacion` para los valores del caso base de la especificación;
`planta` para cuando reemplaces con tus datos). Un validador propio (sin
dependencias) revisa unidades, orígenes y valores al cargar, y cada módulo
informa con su ruta el parámetro que falte. Archivos: `simulacion.json`
(pasos de integración, parcelas), `topologia.json`, `equipos.json`
(dimensiones), `madera.json`, `licores.json`, `hidraulica.json`,
`energia.json`, `caso_base.json` (Fase 1a); `cinetica.json` (1b);
`instrumentos.json`, `lazos.json`, `alarmas.json`, `enclavamientos.json`,
`eventos.json` (Fases 2 y 5); `sala.json`, `campana.json` (Fases 4 y 5).

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

### Fase 6 — Misiones 4–11 y estados completos (terminada)
- Presurización, colgamiento, paradas, arranque en frío, apagón, turno
  récord; `docs/PROCEDIMIENTOS.md` consultable en el juego.
- **Aceptación:** igual que la Fase 5 para todas las misiones.

### Fase 7 — Guardado, rendimiento y pulido (terminada)
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
| P1 | Dimensiones del impregnador (diámetro, altura útil) | Ø 7,5 m × 23 m (≈ 1 000 m³) — corregido en la Fase 1a para dar 45–60 min |
| P2 | Dimensiones del digestor y si es cónico por tramos | Ø 9 m (30 m) + Ø 10 m (27 m) (≈ 4 000 m³) — corregido en la Fase 1a: con 40 % de astillas en la columna, el valor de la Fase 0 daba residencias de más de 6 h |
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

---

## 8. Avance

### Fase 1a — terminada
- Proyecto Vite + Vitest; `npm test`, `npm run caso-base`, `npm run build`.
- Núcleo en `src/sim/` (sin DOM ni Three.js), configuración en `config/`.
- Columna de astillas lagrangiana (parcelas) en vez del esquema TVD
  propuesto: flujo pistón exacto (ver MODELO.md §2).
- Pruebas: balances (masa y energía, ~10⁻¹³), factor H, tiempos muertos vs
  ritmo, sentido de los flujos, vasos vacíos/parciales/fríos, columna
  detenida, determinismo con distinta partición del tiempo, guardar/cargar,
  independencia de capas.
- Ajustes del caso base provisional para quedar en los rangos de la
  sección 7 (ver MODELO.md S-16 a S-23). El exceso de licor del impregnador
  al estanque de nivel (≈ 170 m³/h) es el costo de llevar la impregnación a
  110–120 °C con licor negro caliente; se revisará con la alimentación
  completa en la Fase 1c.

### Fase 1b — terminada
- Cinética en `src/sim/cinetica.js`: lignina en tres fracciones paralelas
  (con condensación y reprecipitación), celulosa, xilano (con redepósito) y
  otros carbohidratos, acetilos, extraíbles, HexA, viscosidad (factor G),
  consumo de álcali, efecto de sólidos disueltos, impregnación por clase de
  tamaño y rechazos.
- Calibración (`npm run calibrar`): Levenberg–Marquardt sobre 6 factores; los
  6 objetivos del caso base dentro de tolerancia (`docs/CALIBRACION.md`).
- Pruebas nuevas: cinética de una parcela, caso base en los rangos de la
  sección 7, respuestas cualitativas de la sección 13
  (`npm run sensibilidades` muestra las magnitudes).
- Manual por capítulos en `docs/manual/` (capítulos 1–4 y anexos A y B).
- Supuestos nuevos S-24 a S-29 en MODELO.md.

### Fase 1c — terminada (Fase 1 completa)
- Presión de los vasos hidráulicos (líquido comprimido, piso de ebullición,
  venteo, rompedor de vacío), válvulas con actuador, bombas con curva,
  alivio y seguridad, registro de incidentes.
- Calentadores con vapor MP e incrustación (con respaldo y lavado ácido),
  ciclones flash y evaporadores (capacidad limitada), silo con vaporización
  por vapor flash y vapor fresco, medidor volumétrico, tubo de astillas,
  estanque de soplado.
- Mallas con taponamiento, conmutación, retrolavado e incrustación;
  compactación de la columna (Janssen), colgamiento y raspadores.
- Licor de impregnación desde la extracción principal; recalibrado.
- Comandos nuevos: válvula, bomba, venteo, calentador, mallas, servicio y
  perturbaciones (colgamiento, fricción, finos, incrustación).
- Pruebas: presión (6) y equipos (10); 70 en total.
- Pendiente para fases siguientes: control de presión y de nivel (Fase 2),
  canalización y demás perturbaciones (Fase 5), secuencias completas de
  partida y parada (Fase 6), estados iniciales guardados para escenarios.

### Fase 2 — terminada
- `src/control/` como extensión de la planta (`crearSistema`): instrumentos
  con ruido, filtro, retardo y fallas; analizadores de álcali y kappa;
  laboratorio con retardo de 20–40 min; PID ISA con MAN/AUTO/CAS,
  transferencia sin golpe e integración condicional; actuadores con
  constante de tiempo, carrera, banda muerta y falla "pegado".
- 29 lazos (todos los de la sección 8 de la especificación salvo el nivel
  del tubo de astillas, que requiere modelar su licor: MODELO.md L-11),
  bloques de carga de álcali, relación licor/madera, seguimiento
  (lavado y dilución), coordinación de ritmo, factor H y kappa.
- 11 enclavamientos con rearme manual y puente de instructor; 43 alarmas
  configuradas más las generadas (enclavamiento disparado, falla de señal),
  con banda muerta, retardo, prioridad, reconocimiento, archivo temporal y
  supresión por planta detenida.
- Aceptación: `npm run sintonia` / `tests/sintonia.test.js` (escalón de los
  29 lazos, sin oscilación sostenida, sobrepaso y asentamiento dentro de lo
  configurado, `docs/SINTONIA.md`); prueba de cada enclavamiento; tres
  eventos simples sin avalancha (máx. 6 alarmas en 10 min); estado
  estacionario 2 h sin alarmas ni enclavamientos; determinismo y
  guardar/cargar con control. 138 pruebas en total.
- Correcciones durante la doble revisión: el control arrancaba antes de que
  existieran los diagnósticos (consignas en 0); la coordinación de lavado
  pisaba la consigna del operador; la consistencia de soplado no respondía a
  la dilución (licor de soplado fijo: S-38); TIC-604 no podía actuar
  (selección de maestro); sintonías de calentadores (ganancia de proceso
  baja) y nivel del digestor; rastreo del actuador de vapor en MAN.
- Costo: el control agrega ≈ 0,8 s por hora simulada (≈ 1,4 s/h en total,
  más de 2 500 veces tiempo real).

### Fase 3 — terminada
- `src/puente/`: la simulación con control corre en un Web Worker
  (`worker.js`) manejado por un motor sin APIs del navegador (`motor.js`,
  probado en Node): aceleración ×1 a ×300 y pausa, presupuesto de cómputo por
  ciclo, historial de tendencias de 8 h (todas las mediciones, consignas y
  salidas cada 5 s), instantáneas a ≈ 5 Hz. `cliente.js` es la única interfaz
  de las pantallas (estado, comandos con rechazo motivado, guardar,
  tendencias).
- `src/hmi/`: 9 pantallas (5 mímicos SVG declarativos, calidad y
  laboratorio, tendencias, alarmas y eventos, perfiles), carátulas de lazo,
  panel de transmisor, menús de bombas, mallas y calentadores, panel básico
  del instructor, banner y contadores de alarmas. Estilo de alto desempeño.
  `src/ui/`: menú inicial, guardar/cargar (localStorage y archivo JSON).
- Partida nueva: 8 h previas sin control (≈ 5 s) y entrega en operación.
- Aceptación (`npm run e2e`): operar con las pantallas, cambio de ritmo,
  respuesta a una alarma con enclavamiento, ×300 a ≈ 297 s/s con 60 cuadros
  por segundo (peor cuadro 17 ms), guardado. Guía en `docs/GUIA-PANTALLAS.md`.
- Doble revisión: revisión independiente del control (9 defectos corregidos,
  con pruebas de regresión); en el navegador se corrigieron superposiciones
  de textos, la leyenda de colores, el tamaño de los mímicos en celular, el
  favicon y que los eventos del calentamiento previo aparecieran en la
  partida.
- Pendiente para fases siguientes: textura del DCS en los monitores 3D
  (Fase 4: los mímicos son SVG, convertibles a imagen), eventos con guion y
  misiones (Fase 5), historial de tendencias dentro del archivo guardado.

### Fase 4 — terminada
- `config/sala.json`: la sala como datos (objetos con forma simple o GLB
  opcional, instancias, anclajes con nombre: pantallas, interacción,
  teléfono, radio, balizas, luces, vapor; colisiones en cajas aparte;
  efectos; tres niveles de calidad).
- `src/mundo3d/`: escena Three.js sin sombras dinámicas (59 llamadas de
  dibujo, ≈ 900 triángulos), jugador en primera persona con colisiones y
  deslizamiento (probado en Node), entradas de teclado/mouse con bloqueo del
  puntero y táctiles (joystick y arrastre), monitores con los mímicos del DCS
  rasterizados como textura (repintado por turnos), pantalla mural, efectos
  conectados al proceso. Three.js se carga solo en modo sala.
- Integración: menú con modo sala o solo pantallas; al operar una consola se
  abre el DCS en 2D a pantalla completa y Esc vuelve a la sala.
- Aceptación (`npm run e2e`, 19 verificaciones): las de la Fase 3 más
  presupuesto de dibujo, caminar y chocar, consola → DCS → sala, y celular
  táctil (botón Operar). Pruebas nuevas en `tests/sala.test.js`.
- Doble revisión: revisión independiente de las pantallas (6 defectos y 5
  menores corregidos: botones que perdían clics por redibujos, valores
  escritos que se sobrescribían, primera pantalla sin estado, errores de
  guardado silenciosos); en la sala se corrigieron la ubicación del exterior,
  el contraste del HUD y la medición de cuadros (el render por software
  distorsionaba la prueba 2D).
- Pendiente: medir 60/30 cuadros por segundo en equipos reales con GPU (en
  esta máquina solo hay render por software); scripts de Blender
  (opcionales); modelos GLB.

### Fase 5 — terminada
- `config/eventos.json`: 27 eventos con causa, síntomas y respuesta
  (`docs/EVENTOS.md`, generado por `npm run documentar`); generador
  aleatorio con semilla por dificultad. Perturbaciones nuevas en el
  simulador: impregnabilidad del lote, límite de licor blanco, canalización y
  taponamiento de mallas.
- La planta admite varias extensiones; el **director** (`src/escenarios/`)
  maneja eventos, indicadores del turno con resumen económico, mensajes,
  libro de novedades y la misión. **Motor de misiones** (`src/misiones/`):
  condiciones como datos, guion, objetivos principales y secundarios,
  pistas graduales, fallas, evaluación con medallas.
- Campaña: tutorial (capítulo 0) y capítulos 1 a 3 (`docs/MISIONES.md`).
  Calibradas jugándolas en Node: la respuesta esperada aprueba y no hacer
  nada falla (`tests/misiones.test.js`).
- Puente: preparación de misiones, puntos de control (reintentar), vuelta a
  ×1 ante diálogos del guion o alarmas críticas. Interfaz: menú de campaña
  con desbloqueo y operación libre con dificultad; títulos de capítulo,
  diálogos de radio y teléfono, objetivos, pistas que resaltan controles,
  informe de misión y de turno; libro de novedades con notas; manual de
  procedimientos (`docs/PROCEDIMIENTOS.md`) dentro del juego; eventos y
  generador en el panel del instructor.
- Hallazgos al calibrar (corregidos): con control el kappa estacionario
  quedaba 0,6 sobre el calibrado (consigna del nivel del impregnador); la
  coordinación de ritmo escalaba las circulaciones (redistribuía el álcali);
  el control de factor H oscilaba (ganancia bajada a 0,0015). Limitaciones
  nuevas L-13 y L-14.
- Aceptación: 26 verificaciones en `npm run e2e` (incluye el tutorial
  completo en el navegador hasta el informe) y las pruebas de Vitest.
- Pendiente: ayuda contextual por variable, sonidos, modo turno completo de
  8–12 h con meta (Fase 6/7), capítulos 4 a 11 (Fase 6).

### Fase 6 — terminada
- Capítulos 4 a 11 en `src/misiones/campana.js`: Mallas, Primera
  presurización, Columna colgada, Parada corta, Parada general, Puesta en
  marcha (desde el estado que deja la parada general, preparado por etapas),
  Apagón y Récord (12 h con perturbaciones encadenadas). Cada uno calibrado
  con un jugador simulado (`tests/planes/`, `tests/campana.test.js`): no
  hacer nada falla y la respuesta ideal aprueba (oro salvo el Récord).
- `docs/PROCEDIMIENTOS.md` reescrito con los procedimientos validados en el
  simulador (presión alta, mallas, colgamiento, paradas, partida, apagón).
- Motor de misiones: objetivos evitables y anticipables; condiciones de
  comando con alcance desde que se muestra el objetivo; condiciones de mallas,
  bombas e incidentes desde un paso del guion; preparación por etapas.
- Simulador y control (hallazgos al calibrar, corregidos): habilitación de
  lazos (FDC-607, TIC-604 y CIC-605 se retienen sin soplado); colgamiento
  soltable (S-46); estanque de soplado que descarga también solo licor
  (S-47); alivio y seguridad desde el licor libre más alto (S-48, la presión
  del impregnador divergía con el tope lleno de astillas); base persistente
  de RC-700 (S-49); energía eléctrica como servicio (S-50); venteos en los
  mímicos; enclavamiento I-11; eventos que no pueden aplicar un comando ya no
  detienen la simulación. Limitaciones nuevas L-15 y L-16.
- Revisión independiente de la Fase 5: 9 hallazgos corregidos (eventos
  superpuestos, parada del lavado, acciones del jugador al reintentar,
  alcance de las condiciones de comando, madera en m³, cola de comandos,
  puntos de control, plazo y «durante», medallas e incidentes del turno).
- Pendiente: sonidos; la pulpa detenida en paradas sale con kappa más bajo
  que en la práctica (L-13).

### Fase 7 — terminada
- Ayuda contextual (`config/ayuda.json`): qué mide cada uno de los 58
  transmisores, por qué importa y qué significa que suba o baje, en las
  carátulas, en los botones del laboratorio y como glosario en el manual.
- Dificultad completa: frecuencia de eventos, ruido de los instrumentos
  (×0,5 / ×1 / ×1,5), pistas y vista de perfiles; elegida en el menú y en el
  panel «Ajustes» (también volumen), guardada en el navegador.
- Sonidos sintetizados con Web Audio (alarmas, teléfono, radio, alivio,
  bombas, golpes, corte de energía, zumbido de la planta) e iluminación de
  emergencia en la sala durante un apagón.
- Turno completo de 8 y 12 horas con eventos aleatorios y meta; autoguardado
  cada 5 minutos y al salir de la pestaña; la preparación de una misión se
  conserva en memoria (repetir no vuelve a simularla).
- Rendimiento: ≈ 2 500 veces el tiempo real en Node con control; ×300 sin
  bloquear la interfaz (60 cuadros/s en la prueba e2e de escritorio).
- Revisión independiente de la Fase 6: 11 hallazgos corregidos (partidas
  antiguas, pila de eventos, transportador en apagón, base de RC-700,
  histéresis de habilitación, errores del motor, entre otros).
- Manual: capítulo 7 «Operación y perturbaciones».
- Corregida la fuga del soplado (L-15): con la válvula cerrada ya no sale
  licor. Recalibradas las paradas: filtrado moderado al partir (capítulo 7) y
  extracción final fuera de cascada al enfriar (capítulo 8). Manual en PDF
  (`docs/manual/manual-digestor-lo-solids.pdf`).
- Pendiente: medir los cuadros por segundo en un celular real (la prueba e2e
  usa render por software).
