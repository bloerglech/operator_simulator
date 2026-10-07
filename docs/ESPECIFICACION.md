# SIMULADOR DE OPERADOR — DIGESTOR CONTINUO LO-SOLIDS (ANDRITZ), EUCALIPTO

## 1. CONTEXTO

Quiero crear un juego web en primera persona donde soy operador de sala de
control de una planta de celulosa kraft de eucalipto. Ya probé dos prototipos:
uno por turnos del digestor y una sala de control 3D simple con tres paneles y
una pantalla mural. Si están en el repositorio, revísalos y reutiliza lo que
sirva. Ahora quiero la versión completa, con un digestor lo más realista
posible y con comportamiento dinámico creíble para alguien que opera uno real.

Prioridad absoluta: la fidelidad del modelo de proceso y de la operación
(lazos, alarmas, tiempos muertos, perturbaciones). El arte 3D es secundario.

## 2. FORMA DE TRABAJO (LEER ANTES DE PROGRAMAR)

- Antes de escribir código, entrégame un plan por fases y la lista de supuestos
  del modelo. Espera mi aprobación.
- Trabaja por fases (sección 14). No avances de fase sin que pasen los
  criterios de aceptación de la anterior.
- Todos los parámetros de proceso van en archivos de configuración
  (`config/*.json`), nunca escritos dentro del código. Yo los voy a ajustar con
  datos de planta.
- No inventes constantes cinéticas "de literatura". Implementa la estructura de
  las ecuaciones, deja los parámetros en configuración y crea una rutina de
  calibración que ajuste los factores preexponenciales hasta reproducir el caso
  base (sección 7). Marca cada parámetro como "literatura", "calibrado" o
  "supuesto".
- Mantén `docs/MODELO.md` con todas las ecuaciones, unidades, supuestos y
  limitaciones, actualizado en cada cambio.
- Si un dato de diseño no está definido, pregúntame en vez de asumir.
- Todo el texto del juego en español neutro. Terminología de planta: licor
  blanco, licor negro, mallas, extracción, soplado, astillas, kappa, factor H.

## 3. TECNOLOGÍA

- Three.js + Vite + JavaScript (módulos ES). Sin backend.
- Computador (WASD + mouse, pointer lock) y celular (joystick virtual, toque
  para interactuar, interfaz adaptada a pantalla vertical y horizontal).
- Simulación totalmente separada de la capa 3D: núcleo en `src/sim/` sin
  ninguna dependencia de Three.js ni del DOM, ejecutable en Node para pruebas y
  corriendo en un Web Worker en el navegador.
- Independencia estricta entre capas. La simulación y el control exponen una
  única interfaz: leer el estado (instantánea de variables, alarmas y eventos)
  y enviar comandos (cambiar consigna, modo, abrir, cerrar, pedir muestra).
  Las pantallas DCS, el mundo 3D y las misiones solo usan esa interfaz. Nada
  de `src/sim/` ni de `src/control/` puede importar código de `src/hmi/`,
  `src/mundo3d/` o `src/ui/`. Cambiar el arte, la sala o los modelos nunca
  debe cambiar un resultado del simulador.
- Paso de integración fijo e independiente de los cuadros por segundo.
  Aceleración x1, x10, x60, x300 y pausa. El resultado debe ser el mismo a
  cualquier aceleración (determinista, generador aleatorio con semilla).
- Pruebas con Vitest (sección 13).
- Guardado y carga del estado completo (localStorage + exportar/importar JSON).
- Estructura sugerida:
  `src/sim/` (modelo), `src/control/` (lazos, enclavamientos, alarmas),
  `src/escenarios/`, `src/hmi/` (pantallas DCS en 2D), `src/mundo3d/`,
  `src/ui/`, `config/`, `docs/`, `tests/`.
- Formas simples por ahora; el arte se reemplaza después sin tocar la
  simulación (sección 4.1).

## 4. SALA DE CONTROL Y HMI

- Sala caminable con colisiones.
- Estaciones de operación a las que me acerco para interactuar. Al interactuar
  se abre la pantalla DCS en 2D a pantalla completa (HTML/canvas), que es donde
  realmente se opera. La misma pantalla se muestra como textura en el monitor
  3D.
- Pantalla mural: resumen de proceso, KPI del turno, lista de alarmas activas y
  tendencias principales.
- Pantallas DCS mínimas:
  1. Alimentación (silo, medidor de astillas, bombas de astillas),
     impregnador y circulación de transferencia.
  2. Digestor: mímico vertical con todas las zonas, mallas, circulaciones,
     perfil de temperatura y de álcali por altura.
  3. Circulaciones y calentadores.
  4. Extracciones, ciclones flash y licor a evaporadores.
  5. Fondo, lavado y soplado.
  6. Calidad y laboratorio.
  7. Tendencias configurables (elegir variables, escalas, ventana de tiempo).
  8. Alarmas y eventos (historial con hora, prioridad, reconocimiento).
  9. Vista de perfiles: lignina/kappa, álcali, sólidos disueltos, temperatura
     y factor H a lo largo del digestor (ayuda didáctica; se puede desactivar
     en modo realista, porque en planta no se ve).
- Carátulas de lazo (faceplates) con PV, SP, salida, modo manual / automático /
  cascada, límites y sintonía. Convención de colores tipo DCS de alto
  desempeño (fondo gris, color solo para lo anormal).
- Más adelante (dejar la arquitectura preparada, no implementar aún): salir a
  terreno, válvulas manuales, toma de muestras en terreno, sonidos, otras áreas
  (lavado y deslignificación con oxígeno, blanqueo, caustificación, caldera
  recuperadora, evaporadores).

### 4.1 Arte 3D (capa reemplazable)

- La sala se describe como datos en `config/sala.json`: cada objeto tiene
  identificador, tipo, posición, rotación, tamaño y, de forma opcional, la
  ruta de un modelo GLB. Si no hay modelo, se dibuja la forma simple; si lo
  hay, se carga en su lugar. Reemplazar un objeto por un modelo mejor es
  cambiar una línea de ese archivo, sin tocar código.
- Puntos de anclaje con nombre para todo lo que el juego necesita ubicar:
  superficie de cada pantalla (donde va la textura del DCS), puntos de
  interacción, teléfono, radio, luces y balizas de alarma. El modelo puede
  traerlos como nodos vacíos con ese nombre o se definen en `sala.json`.
- Colisiones separadas del modelo visual: cajas simples definidas en
  `sala.json`, para que un modelo nuevo no altere por dónde camino.
- Convenciones: 1 unidad = 1 metro, eje Y hacia arriba, origen en el piso.
- Dirección visual inicial: sala de control moderna tipo DCS. Consolas con
  varios monitores por puesto, pantalla mural al frente, iluminación tenue,
  colores sobrios, ventanal hacia la planta con las siluetas del impregnador
  y del digestor, tuberías y vapor a lo lejos. El tema visual es
  configurable para poder agregar más adelante una sala antigua con paneles.
- Efectos de ambiente manejados por datos y conectados al estado del
  proceso: balizas de alarma, parpadeo de luces, vapor visible por el
  ventanal cuando abre el alivio, vibración de cámara en eventos fuertes.
- Presupuesto para celular de gama media: menos de 150 000 triángulos
  visibles, menos de 100 llamadas de dibujo, texturas de 1024 píxeles como
  máximo (2048 solo para pantallas), modelos comprimidos, instancias para
  objetos repetidos y sin sombras dinámicas (sombras simples u horneadas).
  Tres niveles de calidad: bajo, medio y alto.
- Modelos en `public/modelos/` y un archivo `CREDITOS.md` con origen y
  licencia de cada modelo de terceros.
- Opcional: scripts de Blender en `herramientas/blender/` que generen el
  impregnador, el digestor y las tuberías principales a partir de dimensiones
  en un archivo de configuración y los exporten a GLB.

## 5. EL PROCESO: DIGESTOR LO-SOLIDS

Sistema de cocción continua kraft Andritz de dos vasos: impregnador separado
más digestor hidráulico (con interruptor en configuración para digestor de
fase vapor, con vapor directo y nivel de licor en el tope), con cocción
Lo-Solids en versión de flujo descendente (Downflow Lo-Solids, la habitual en maderas
duras), madera de eucalipto. La topología se define en `config/topologia.json`
para poder cambiarla (un vaso o dos vasos con impregnador, fase vapor o
hidráulico, zonas en cocorriente o contracorriente, número de extracciones).

Principio Lo-Solids que el modelo debe reproducir: mantener baja la
concentración de sólidos disueltos de la madera en las fases principal y
residual de la deslignificación. Se logra con varias extracciones a lo largo
del digestor y reponiendo, después de cada una, licor blanco más filtrado de
lavado. Esto da un perfil de álcali parejo, temperaturas de cocción más bajas,
y mejora viscosidad, rendimiento, blanqueabilidad y movimiento de la columna.

Topología base, de arriba hacia abajo:

1. Línea de alimentación: silo de astillas con vaporización atmosférica (tipo
   Diamondback), medidor de astillas (define el ritmo de producción), tubo de
   astillas con control de nivel de licor, bombas de astillas en serie (tipo
   TurboFeed), línea de alimentación al tope del impregnador y circulación de
   tope con retorno de licor. Aquí entra la primera fracción de licor blanco.
2. Impregnador (vaso separado, hidráulico): separador superior, zona de
   impregnación en cocorriente a baja temperatura, raspador de fondo y
   descarga. Mallas de extracción propias como opción en configuración.
3. Circulación de transferencia: el licor arrastra las astillas desde el
   fondo del impregnador hasta el tope del digestor y vuelve desde el
   separador superior del digestor al fondo del impregnador. En esta
   circulación están los calentadores que acercan las astillas a la
   temperatura de cocción y un punto de adición de licor blanco.
4. Tope del digestor: separador superior y mallas de extracción superior, que
   sacan el licor de impregnación gastado.
5. Circulación de cocción superior: mallas, bomba, calentador indirecto con
   vapor de media presión, adición de licor blanco y de filtrado de lavado,
   retorno por tubo central.
6. Zona de cocción superior, cocorriente.
7. Mallas de extracción inferior (extracción principal).
8. Circulación de cocción inferior: igual que la superior, con su propia
   adición de licor blanco y filtrado y su calentador.
9. Zona de cocción inferior, cocorriente.
10. Mallas de extracción final / circulación de lavado.
11. Fondo: zona corta de lavado y enfriamiento en contracorriente con filtrado
    frío por boquillas verticales y horizontales, dilución, raspador de fondo,
    válvula y línea de soplado hacia el estanque de soplado.
12. Licores extraídos: ciclones flash 1 y 2 (el vapor flash vuelve al silo de
    astillas), filtro de fibras y licor negro débil a evaporadores.

Cada juego de mallas tiene filas alternadas con conmutación periódica y
retrolavado, y una presión diferencial que indica taponamiento.

## 6. MODELO DE SIMULACIÓN

### 6.1 Estructura
- Impregnador y digestor divididos en celdas a lo alto (mínimo 20 y 60,
  configurable), unidos por la línea de transferencia con su tiempo de
  transporte. Las astillas
  avanzan en flujo pistón. El licor libre se mueve respecto de las astillas con
  el caudal y sentido que resulta del balance hidráulico de cada zona
  (adiciones, extracciones, circulaciones).
- Dos fases líquidas por celda: licor libre y licor retenido dentro de la
  astilla, con transferencia por difusión entre ambas (dependiente de
  temperatura, álcali y espesor de astilla).
- Estado por celda: lignina (rápida, principal, residual), celulosa, xilano,
  otros carbohidratos, ácidos hexenurónicos, OH⁻ y HS⁻ en ambos licores,
  sólidos disueltos orgánicos e inorgánicos, temperatura, factor H acumulado,
  viscosidad (grado de polimerización), fracción no impregnada, tiempo de
  residencia.
- Balances de masa por componente y de energía por celda; deben cerrar
  (sección 13).
- Residencia total de 4 a 6 horas a producción nominal; cambia con el ritmo.

### 6.2 Cinética
- Factor H (Vroom): velocidad relativa = exp(43,2 − 16115/T), T en kelvin.
  Se muestra como variable de operación y de control.
- Deslignificación en tres fases (inicial, principal, residual) con
  dependencia de temperatura (Arrhenius), OH⁻ y HS⁻ dentro de la astilla.
  Estructura tipo Gustafson o modelo Purdue, pero con parámetros para
  eucalipto: la fase principal es más rápida y con menor requerimiento de
  factor H que en pino. Lignina residual dependiente del álcali.
- Carbohidratos: celulosa y xilano por separado. Disolución de xilano
  (peeling y disolución alcalina), con redepósito parcial sobre la fibra
  cuando baja el álcali al final de la cocción (opcional, con interruptor).
- Ácidos hexenurónicos: formación desde los grupos metilglucurónicos del
  xilano y degradación según temperatura y álcali. Kappa medido = kappa de
  lignina + aporte de HexA (aprox. 11,6 mmol/kg de HexA equivalen a 1 punto
  de kappa). En eucalipto este aporte es de varios puntos y debe verse.
- Viscosidad: ruptura de cadenas de celulosa dependiente de OH⁻ y temperatura
  (enfoque de factor G de Kubes, energía de activación cercana a 179 kJ/mol;
  verifica y documenta las constantes).
- Consumo de álcali: consumo rápido inicial (desacetilación y neutralización
  de ácidos, importante en eucalipto) más consumo proporcional a la lignina y a
  los carbohidratos disueltos. Consumo menor de HS⁻.
- Efecto Lo-Solids: la concentración de sólidos disueltos en las fases
  principal y residual penaliza viscosidad, blanqueabilidad y consumo de
  álcali, y frena levemente la deslignificación. Debe notarse la diferencia
  entre operar con buena dilución y extracción o sin ellas.
- Impregnación: la fracción no impregnada depende de la calidad de la
  vaporización, tiempo y temperatura de impregnación, álcali disponible y
  espesor de astilla. Lo no impregnado termina como rechazos.
- Álcali residual muy bajo en cualquier zona: reprecipitación de lignina,
  kappa más alto, pulpa más oscura, más rechazos y peor blanqueabilidad.

### 6.3 Materia prima
- Mezcla configurable de Eucalyptus globulus y Eucalyptus nitens, cada una con
  su densidad básica, contenido de lignina, xilano, extraíbles y reactividad
  (globulus cuece más fácil y rinde más).
- Humedad de astillas, densidad aparente, distribución de tamaño (sobre
  espesor, aceptadas, palillos, finos) y contenido de corteza. Todo variable
  en el tiempo.

### 6.4 Licores
- Licor blanco: álcali efectivo, álcali activo, sulfidez, eficiencia de
  caustificación, temperatura. Unidad por defecto g/L como NaOH, con opción de
  g/L como Na₂O.
- Filtrado de lavado: temperatura, sólidos disueltos y álcali residual.
- Reparto del licor blanco entre alimentación, circulación de transferencia,
  circulación superior y circulación inferior.

### 6.5 Hidráulica y columna de astillas
- Nivel de astillas en el impregnador y en el digestor, velocidad de cada
  columna, acople entre ambos vasos a través de la transferencia, grado de
  compactación por zona (función de kappa, carga, flujos de licor y presión
  diferencial).
- Presión del digestor hidráulico como resultado del balance entre lo que
  entra y lo que se extrae; siempre debe quedar margen sobre la presión de
  saturación, y si se pierde, hay vaporización súbita. En un vaso lleno de
  líquido la presión sube en segundos si entra más de lo que sale: modelar
  las presurizaciones, la válvula de alivio y la válvula de seguridad, y
  registrar cada apertura como incidente.
- Presión diferencial de mallas, taponamiento progresivo por finos y por
  incrustación, efecto de la conmutación y del retrolavado.
- Fenómenos: taponamiento de la línea de transferencia, colgamiento en el
  impregnador o en el digestor, canalización de licor, descenso
  irregular, sobrecarga del raspador de fondo (corriente y torque), soplado
  inestable, consistencia de soplado.
- Incrustación de carbonato de calcio en calentadores y mallas (típica en
  eucalipto): ensuciamiento lento, pérdida de capacidad de calentamiento,
  calentador de respaldo y lavado ácido.

### 6.6 Energía
- Calentadores indirectos con vapor de media presión (coeficiente global que
  se degrada con el ensuciamiento), recuperación en ciclones flash,
  vaporización de astillas con vapor flash y vapor fresco de baja presión.

### 6.7 Estados de operación
- El modelo debe cubrir todo el ciclo, no solo la operación normal: vasos
  vacíos, llenado con astillas y licor, lleno y frío, presurizado,
  calentamiento, operación normal, detenido en caliente, enfriamiento y
  despresurización.
- Debe ser estable con caudales en cero, vasos parcialmente llenos,
  temperaturas bajo 100 °C y bombas detenidas.
- Con la columna detenida la cocción sigue: la pulpa se sobrecuece si el
  digestor queda caliente, y eso debe verse al volver a partir.

## 7. CASO BASE (valores iniciales, todos en configuración)

Son rangos típicos de partida; los reemplazaré por datos de mi planta.

- Producción: 3000 ADt/d (operable entre 60 % y 110 %).
- Mezcla: 70 % globulus, 30 % nitens. Humedad de astillas 45–50 %.
- Kappa objetivo: 17 (banda ±1). Aporte de HexA: 4–6 puntos.
- Rendimiento de cocción: 53–54 %. Rechazos: menos de 0,5 %.
- Viscosidad intrínseca: 1100–1200 mL/g.
- Álcali efectivo total: 17–19 % como NaOH sobre madera seca.
  Reparto: 50 % alimentación, 10 % transferencia, 20 % circulación superior,
  20 % inferior.
- Licor blanco: álcali efectivo 115–120 g/L como NaOH, sulfidez 30–34 %.
- Relación licor/madera en impregnación: 3,8–4,2 m³/t seca.
- Temperaturas: impregnación 110–120 °C, salida de los calentadores de
  transferencia 130–140 °C, cocción superior 145–150 °C,
  cocción inferior 147–152 °C, soplado bajo 90 °C.
- Factor H: 350–500.
- Álcali residual: 6–10 g/L en las extracciones, 4–7 g/L en el soplado.
  Alarma bajo 4 g/L.
- Factor de dilución en el fondo: 2,0–2,5 m³/ADt. Consistencia de soplado
  10 %.
- Tiempos: impregnación 45–60 min, cocción total 180–240 min.

La calibración debe reproducir este caso base en estado estacionario.

## 8. CONTROL, ENCLAVAMIENTOS Y ALARMAS

- Lazos PID con modos manual, automático y cascada, anti-windup, límites de
  salida y dinámica de actuadores. Lista mínima:
  ritmo de producción (velocidad del medidor de astillas); nivel del silo;
  nivel del tubo de astillas; carga de álcali como razón sobre madera seca;
  reparto de licor blanco; relación licor/madera; temperatura de cada
  circulación (válvula de vapor); caudal de cada circulación; caudal de cada
  extracción; caudal de filtrado de lavado y factor de dilución; nivel de
  astillas del digestor (actuando sobre el caudal de soplado y el raspador);
  nivel de astillas del impregnador (actuando sobre su raspador y la
  transferencia); caudal y temperatura de la circulación de transferencia;
  presión del impregnador y del
  digestor; consistencia y temperatura de soplado; nivel de los ciclones
  flash.
- Control avanzado opcional que el operador puede activar o desactivar:
  control de factor H con corrección por ritmo, control de kappa con
  realimentación del analizador y prealimentación por cambios de madera y de
  licor, y coordinación automática de todos los caudales en los cambios de
  ritmo.
- Enclavamientos: parada de alimentación por nivel o presión, protección de
  bombas, alta temperatura de soplado, alta corriente del raspador, estanque
  de soplado lleno, pérdida de circulación con vapor abierto.
- Alarmas con prioridades (crítica, alta, media, baja), banda muerta,
  retardo, reconocimiento, supresión y registro de eventos. Evitar avalanchas
  de alarmas sin sentido.

## 9. INSTRUMENTACIÓN Y LABORATORIO

- Transmisores con ruido, retardo y deriva. Posibilidad de falla (congelado,
  fuera de rango, deriva lenta).
- Analizador de kappa en línea en el soplado: muestra cada 20–30 min, con
  error de medición. Recordar que el tiempo muerto entre una acción en las
  zonas de cocción y su efecto en el kappa es de horas; el juego debe hacer
  sentir ese retardo.
- Analizadores de álcali residual en circulaciones y extracciones.
- Laboratorio: solicitar muestras de kappa, viscosidad, álcali residual,
  humedad y granulometría de astillas, y concentración del licor blanco. El
  resultado llega con 20–40 min de retraso y con error propio.

## 10. PERTURBACIONES Y FALLAS

Generador de eventos aleatorio con semilla, más un panel de instructor para
activarlos a mano:

- Madera: cambio de mezcla de especies, de densidad, de humedad (lluvia),
  astillas con sobre espesor, exceso de finos, astillas envejecidas.
- Licor blanco: baja de concentración, cambio de sulfidez, falta de licor.
- Servicios: caída de presión de vapor, filtrado más caliente o más sucio,
  límite de recepción de licor en evaporadores.
- Equipos: caída de una bomba de circulación, de transferencia o de astillas,
  falla del raspador del impregnador, taponamiento de
  mallas, calentador incrustado, falla del raspador, válvula pegada.
- Columna: colgamiento, canalización, pérdida de nivel de astillas.
- Aguas abajo: estanque de soplado alto, parada de lavado, orden de bajar o
  subir producción.
- Instrumentos: falla del analizador de kappa, transmisor congelado.
- Maniobras: arranque desde digestor lleno y frío, parada corta, parada
  larga, cambio de ritmo, cambio de campaña de madera.

Cada evento debe tener causa, síntomas coherentes en las variables y una
respuesta correcta conocida, documentada en `docs/EVENTOS.md`.

## 11. JUEGO: CAMPAÑA DE MISIONES

### 11.1 Estilo

- Campaña lineal por capítulos con narrativa continua en primera persona, al
  estilo de Half-Life: sin cinemáticas ni menús que saquen del juego. Nunca
  pierdo el control del personaje.
- La historia y las instrucciones llegan dentro del mundo: radio con el
  operador de terreno, teléfono del jefe de turno, llamadas del laboratorio,
  de evaporadores y de lavado, libro de novedades, pantalla mural, luces,
  vibraciones y sonidos de la planta.
- Eventos guionados que ocurren a mi alrededor mientras sigo operando (suena
  el teléfono en plena alarma, parpadean las luces antes de un corte de
  energía, se oye la válvula de alivio).
- El título del capítulo aparece sobre la imagen al comenzar. Personajes y
  diálogos originales, en español neutro y con lenguaje de planta.
- La dificultad sube de forma gradual: cada misión introduce un concepto nuevo
  y reutiliza los anteriores.

### 11.2 Motor de misiones

- Misiones definidas como datos en `src/misiones/`, no programadas una a una:
  estado inicial (instantánea del simulador), guion de eventos, disparadores
  (por tiempo, por condición de proceso, por acción del jugador o por posición
  en la sala), objetivos principales y secundarios, condiciones de falla,
  diálogos, pistas y criterios de evaluación.
- Lista de objetivos discreta en pantalla; se marcan al cumplirse.
- Pistas graduales si me demoro: primero un comentario por radio, luego una
  indicación directa, al final se resalta el control. Se pueden desactivar.
- Puntos de control automáticos en cada hito; al fallar vuelvo al último.
- Aceleración de tiempo disponible en las esperas largas; vuelve sola a x1
  cuando se dispara un evento o una alarma crítica.
- Al terminar cada misión: informe con calificación (bronce, plata, oro),
  tendencias de lo ocurrido, errores cometidos y la respuesta ideal.
- Cada misión superada se puede repetir y desbloquea su escenario en
  operación libre.
- Procedimientos de partida, parada y emergencia escritos en
  `docs/PROCEDIMIENTOS.md` y consultables dentro del juego como manual de
  operación. Son genéricos en la primera versión; yo los corregiré con los
  procedimientos reales.

### 11.3 Campaña (orden y dificultad ajustables en configuración)

0. Primer día (tutorial). Planta estable y sin posibilidad de fallar. Enseña a
   caminar, mirar e interactuar; abrir y navegar las pantallas; leer una
   carátula; cambiar un valor de consigna; pasar un lazo de manual a
   automático; reconocer una alarma; armar una tendencia; pedir una muestra
   al laboratorio; usar la radio y la aceleración de tiempo.
1. Turno de noche. Llega madera más húmeda. Mantener el kappa en banda
   durante cuatro horas. Enseña el tiempo muerto y la carga de álcali.
2. Piden más toneladas. Subir del 85 % al 100 % del ritmo en un plazo dado,
   coordinando álcali, temperaturas, extracciones y dilución sin sacar el
   kappa de banda. Meta de producción al final del turno.
3. Licor débil. Baja la concentración del licor blanco y después escasea.
   Decidir entre compensar o bajar el ritmo.
4. Mallas. Taponamiento de mallas de extracción: conmutar, retrolavar y
   redistribuir las extracciones antes de perder el balance del digestor.
5. Primera presurización. Evaporadores restringe la recepción de licor, cae la
   extracción y la presión del digestor sube en segundos. Controlarla sin que
   abra la válvula de seguridad y sin perder la columna.
6. Columna colgada. Colgamiento en el digestor: reconocer los síntomas y
   recuperar el movimiento de la columna.
7. Parada corta. Lavado se detiene y el estanque de soplado se llena. Detener
   alimentación y soplado, mantener el sistema caliente y seguro, volver a
   partir en caliente y recuperar el kappa con el mínimo de pulpa fuera de
   especificación.
8. Parada general. Detención larga programada: bajar ritmo, cortar astillas,
   desplazar, enfriar y despresurizar en orden, dejando los equipos en
   condición segura.
9. Puesta en marcha. Arranque desde frío: verificaciones previas, llenado con
   astillas y licor, presurización, establecer circulaciones, rampa de
   calentamiento, inicio del soplado, y llegar a kappa en banda y a ritmo
   nominal.
10. Apagón. Corte total de energía a plena carga: bombas detenidas,
    presurización y vapor atrapado. Llevar la planta a condición segura y
    volver a partir.
11. Récord. Turno completo de 12 horas con eventos encadenados y meta de
    toneladas dentro de especificación y de costo.

Para cada misión documenta en `docs/MISIONES.md`: situación inicial, guion,
objetivos, condiciones de falla, respuesta ideal y qué enseña.

### 11.4 Otros modos y puntaje

- Modos adicionales: operación libre; turno completo (8 o 12 horas simuladas)
  con eventos aleatorios; modo instructor.
- Puntaje y reporte de turno: toneladas producidas dentro de especificación,
  desviación estándar de kappa, rendimiento, viscosidad, rechazos, consumo
  específico de madera (m³ sólidos sin corteza por ADt), consumo de álcali
  (kg/ADt), consumo de vapor (GJ/ADt), sólidos y carga enviados a
  evaporadores, arrastre al lavado, tiempo fuera de especificación, alarmas
  por hora, tiempo de respuesta a alarmas y paradas. Resumen económico del
  turno.
- Libro de novedades automático con las maniobras y eventos, y opción de
  agregar notas propias.
- Niveles de dificultad: cambian la frecuencia de eventos, el ruido de los
  instrumentos y las ayudas visibles.
- Ayuda contextual que explica cada variable y qué pasa si sube o baja.

## 12. RENDIMIENTO Y CALIDAD DE CÓDIGO

- 60 cuadros por segundo en computador y 30 en un celular de gama media.
- La simulación no debe bloquear la interfaz, tampoco a x300.
- Código comentado en español, funciones cortas, sin dependencias
  innecesarias.

## 13. PRUEBAS (obligatorias)

- Cierre de balance de masa total y por componente (error menor a 0,1 %) y de
  energía (menor a 1 %).
- Factor H: una hora a 100 °C da 1; verificar contra valores de tabla a
  150 y 160 °C.
- Estado estacionario del caso base dentro de los rangos de la sección 7.
- Respuestas cualitativas correctas: más temperatura o más álcali bajan el
  kappa; más ritmo sin compensar lo sube; menos álcali baja el residual; más
  dilución y extracción bajan los sólidos disueltos y suben la viscosidad;
  madera más húmeda sin corregir sube el kappa; más nitens exige más carga.
- Tiempos muertos y de residencia coherentes con el ritmo.
- Determinismo: misma semilla y mismas acciones dan el mismo resultado a
  cualquier aceleración.
- Guardar y cargar reproduce exactamente el estado.
- Cada misión tiene una prueba automática con un guion de acciones que la
  supera y otra sin acciones que la falla, para asegurar que siempre se puede
  completar.
- Independencia de capas: una prueba verifica que `src/sim/` y `src/control/`
  no importan nada de la interfaz ni del mundo 3D, y que el simulador
  completo corre en Node sin navegador.
- La sala carga igual con formas simples o con modelos GLB, y si falta un
  modelo se muestra la forma simple en vez de fallar.

## 14. FASES Y CRITERIOS DE ACEPTACIÓN

- Fase 0: plan, supuestos y `docs/MODELO.md`. Espera mi aprobación.
- Fase 1: núcleo de simulación sin interfaz, calibración y pruebas. Entrega
  un script que corra el caso base e imprima los perfiles y los KPI.
- Fase 2: lazos de control, enclavamientos y alarmas, con pruebas de
  respuesta a escalones.
- Fase 3: pantallas DCS en 2D completamente operables en el navegador (sin
  3D). En este punto el simulador ya debe ser jugable.
- Fase 4: sala de control 3D con las pantallas integradas, computador y
  celular.
- Fase 5: perturbaciones, fallas, motor de misiones, tutorial y misiones 1 a
  3, puntaje e informe de misión.
- Fase 6: resto de la campaña (misiones 4 a 11), incluidos los estados de
  partida, parada y emergencia.
- Fase 7: guardado, rendimiento, ajustes y pulido.

Al terminar cada fase: resumen de lo hecho, cómo probarlo, supuestos nuevos y
lo que queda pendiente.
