# 6. Control, enclavamientos y alarmas

Este capítulo explica cómo se mide, se controla y se protege el sistema de
cocción del simulador, y cómo se verificó. Corresponde a la Fase 2. Código:
`src/control/` (`instrumentos.js`, `mediciones.js`, `pid.js`, `lazos.js`,
`enclavamientos.js`, `alarmas.js`, `control.js`, `sistema.js`).
Configuración: `config/instrumentos.json`, `lazos.json`,
`enclavamientos.json`, `alarmas.json` (todo **supuesto**: valores típicos
de un sistema de control distribuido, no de una planta en particular).
Las tablas completas están en el anexo A.

## 6.1 Las cuatro capas

Un sistema de cocción se opera con cuatro capas, de la más rápida a la
más lenta y de la más automática a la más humana:

| Capa | Qué hace | En el simulador |
|------|----------|-----------------|
| Protección (enclavamientos) | Lleva la planta a un estado seguro cuando una variable sale de un límite, sin preguntar | 11 enclavamientos, rearme manual |
| Control regulatorio | Mantiene cada variable en su consigna (caudales, presiones, temperaturas, niveles) | 29 lazos PID |
| Control avanzado | Coordina varios lazos para un objetivo de proceso (factor H, kappa, ritmo) | 3 bloques que el operador activa |
| Operador y alarmas | Decide, cambia consignas, responde a lo anormal | 43 alarmas configuradas + generadas |

En una planta real la protección crítica vive en un sistema instrumentado
de seguridad separado del DCS (norma IEC 61511). En el simulador está en el
mismo módulo, pero se comporta como una capa aparte: manda sobre los lazos y
no se puede saltar sin un puente explícito del instructor.

## 6.2 Lo que el operador ve no es el proceso

Un transmisor entrega una **medición**, no el valor verdadero. El
simulador la construye así:

$$y = \text{filtro}_\tau\big(\text{retardo}_{\tau_d}(x)\big) + \text{ruido} + \text{deriva}$$

saturada al rango del instrumento. El ruido es blanco, con desviación
estándar en % del rango (0,1 % en temperaturas, 0,5 % en caudales y
niveles, 1 % en consistencia).

**Ejemplo 6.1 — filtro de primer orden.** FI-401 (circulación superior,
rango 0–1 500 m³/h) tiene τ = 3 s y ruido 0,5 % (σ = 7,5 m³/h). Si el
caudal real sube en escalón de 1 000 a 1 100 m³/h, la medición filtrada
sigue $y(t) = 1\,000 + 100\,(1 - e^{-t/3})$: a los 3 s marca 1 063, a los
9 s 1 095. Encima viene el ruido: lecturas individuales de ±15 m³/h son
normales. Por eso un operador no reacciona a un número aislado sino a la
tendencia.

**Analizadores.** El kappa en línea no es continuo: toma una muestra cada
25 min, la analiza durante 6 min y publica el resultado, que se mantiene
hasta la próxima muestra. Lo que muestra la pantalla describe la pulpa que
pasaba por el soplado **hasta 31 min antes**. Sumado al tiempo de residencia
de la columna (4–6 h), un cambio en la carga de álcali tarda horas en verse
en el kappa: es el problema de control más difícil del digestor.

**Laboratorio.** El operador puede pedir análisis (kappa, viscosidad,
rendimiento, rechazos, álcali, astillas, licor blanco). El valor se toma en
el instante del pedido y llega entre 20 y 40 min después con su error.

**Fallas de instrumentos.** Un transmisor puede congelarse (el valor deja
de moverse: la falla más peligrosa porque no se nota), irse a un extremo del
rango (señal fuera de rango: el DCS lo detecta, marca la calidad como mala,
el lazo pasa a manual y salta una alarma) o derivar lentamente (1 % del
rango por hora). Los enclavamientos actúan sobre la medición: una falla
puede disparar uno en falso, igual que en planta.

## 6.3 El controlador PID

### Forma y signo

El simulador usa la forma estándar (ISA), con todo expresado en % del rango
del PV y de la salida:

$$u(t) = K_c\left[e(t) + \frac{1}{T_i}\int_0^t e\,dt - T_d\,\frac{dy_f}{dt}\right]$$

- **Acción.** Con acción **inversa** la salida sube si el PV está bajo la
  consigna (e = SP − PV): es el caso de un caudal (si falta caudal, abrir).
  Con acción **directa** sube si el PV está sobre la consigna (e = PV − SP):
  presión del digestor con la válvula de extracción (si sube la presión,
  abrir la salida), nivel de astillas con la descarga.
- **Derivada sobre el PV filtrado**, no sobre el error: un cambio de
  consigna no produce un "golpe" de la salida. En los lazos del simulador
  Td = 0: con mediciones ruidosas la derivada amplifica el ruido más de lo
  que ayuda.

### Discretización

El control corre cada 0,2 s (paso rápido). El integral se acumula como
$I_{k+1} = I_k + K_c\,e_k\,\Delta t / T_i$.

### Anti-windup por integración condicional

Si la salida está saturada (por ejemplo, la válvula de vapor al 100 %) y el
error sigue empujando hacia afuera, un PID ingenuo sigue acumulando
integral. Cuando el error cambia de signo, la salida tarda en despegarse
del límite todo el tiempo que demora en "deshacer" ese integral (*windup*).
El simulador integra solo lo justo para llegar al límite:

$$I_{k+1} = \begin{cases} \max(I_k,\; u_{máx} - P - D) & \text{si } P + I_k + \Delta I > u_{máx} \text{ y } \Delta I > 0 \\ \min(I_k,\; u_{mín} - P - D) & \text{si } P + I_k + \Delta I < u_{mín} \text{ y } \Delta I < 0 \\ I_k + \Delta I & \text{en otro caso} \end{cases}$$

La prueba `tests/pid.test.js` verifica que tras 1 000 s saturado, la salida
se despega en menos de 5 pasos al invertirse el error.

### Modos y transferencia sin golpe

- **MAN:** el operador fija la salida. El integral sigue a la salida.
- **AUTO:** el operador fija la consigna.
- **CAS:** la consigna viene de otro lazo (maestro) o de un bloque de
  cálculo. Si el operador escribe una consigna en un lazo en CAS, el lazo
  pasa a AUTO.

Al pasar de MAN a AUTO el integral se inicializa como
$I = u_{actual} - P - D$, así la salida no salta. Un maestro cuyo esclavo
no está en CAS **sigue** al esclavo (su salida es la consigna actual del
esclavo y no acumula integral): cuando el esclavo vuelve a CAS, tampoco hay
golpe.

### El actuador también tiene dinámica

La salida del PID es una orden. El elemento final (válvula, variador)
responde con una constante de tiempo, una velocidad máxima (tiempo de
carrera) y una **banda muerta**: cambios de la orden menores que ella no lo
mueven (fricción del vástago). Valores supuestos: caudales τ = 4 s, carrera
30 s, banda 0,2 %; vapor τ = 3 s, carrera 25 s; descargadores de astillas
τ = 5 s, carrera 60 s. El instructor puede "pegar" un actuador: el lazo
sigue calculando pero nada se mueve, y el PV se aleja sin que el lazo lo
pueda corregir. Reconocer esta falla en las tendencias (salida que cambia,
PV que no responde) es una habilidad clave de un operador.

## 6.4 Dinámica de los lazos del digestor y su sintonía

Cada tipo de lazo tiene una dinámica distinta, y eso define su sintonía.

### Caudales: rápidos y casi estáticos

Un caudal responde a su válvula en segundos. El proceso visto por el PID es
el actuador (τ ≈ 4 s) más el filtro del transmisor (τ ≈ 3 s). Con mediciones
ruidosas se usa ganancia baja y acción integral rápida: Kc = 0,3, Ti = 4 s.
El caudal llega a la nueva consigna en ≈ 40 s (tabla 6.1).

### Calentadores: ganancia de proceso pequeña

**Ejemplo 6.2 — ganancia del lazo TIC-212.** La circulación de
transferencia lleva 900 m³/h de licor (ρ = 1 050 kg/m³, cp = 3,8 kJ/kg·K):

$$\dot m\,c_p = \frac{900 \times 1\,050}{3\,600} \times 3{,}8 \approx 998 \text{ kW/K}$$

La válvula de vapor entrega hasta 16 MW, así que 1 % de apertura son
160 kW, que suben la salida del calentador en 160/998 = 0,16 °C. El
transmisor tiene un rango de 150 °C (50–200 °C): 0,16 °C es 0,107 % del
rango. La **ganancia del proceso** es $K_p$ ≈ 0,107 %/%.

Como el calentador responde en segundos, el lazo se comporta casi como un
integrador puro de constante $T_i/(K_cK_p)$. Con un PI sobre un proceso
estático de ganancia $K_p$, la respuesta en lazo cerrado es de primer orden
con

$$\tau_{lc} = T_i\,\frac{1 + K_cK_p}{K_cK_p}$$

- Con la sintonía inicial (Kc = 1,5, Ti = 90 s): $K_cK_p$ = 0,16 y
  $\tau_{lc}$ ≈ 650 s; llegar al 10 % del escalón toma ≈ 2,3 τ ≈ 1 500 s.
  La prueba midió 2 290 s: demasiado lento.
- Con Kc = 6, Ti = 60 s: $K_cK_p$ = 0,64 y $\tau_{lc}$ ≈ 150 s, ≈ 350 s
  para el 10 %. La prueba midió 295 s.

La lección: **la sintonía depende de la ganancia del proceso**, y esta
depende del tamaño de la válvula. Un Kc "típico de temperatura" copiado de
otro lazo puede quedar 4 veces corto.

### Presión del digestor: muy rápida

Como se vio en el capítulo 5, la presión del vaso lleno de líquido cambia
1 bar en ≈ <!-- generado:t1bar -->31<!-- /generado --> s si se desbalancea la extracción. El lazo PIC-301 (válvula de
la extracción principal, acción directa, Kc = 6, Ti = 30 s) corrige en
segundos. Su Kc se duplicó (de 3 a 6) al incluir el gas arrastrado en la
capacidad del vaso: la ganancia del proceso bajó a menos de la mitad y, con
el Kc anterior, el lazo no alcanzaba a abrir la extracción cuando se cierra
el soplado de golpe (la presión llegaba al alivio). Es el mismo principio de
la sección anterior: si cambia la ganancia del proceso, hay que volver a
sintonizar. En operación normal la presión se mantiene en ±0,05 bar; sin
el lazo, cualquier desbalance de caudales termina en la válvula de alivio.

### Niveles de astillas: integradores lentos y ruidosos

El nivel de astillas es un **integrador**: si la astilla que sale es
distinta de la que entra, el nivel sube o baja sin detenerse. Además la
medición fluctúa (la columna se mueve en parcelas y el transmisor tiene
ruido). Con un integrador, un PI siempre produce algún sobrepaso; para
limitarlo se usa un Ti largo. LIC-302 (nivel del digestor, descarga del
soplado): Kc = 6, Ti = 1 500 s; ante un escalón de 1 m, sobrepaso cercano al
30 % y asentamiento de más de 20 minutos (tabla 6.1). Un Kc mayor asienta
antes pero mueve más el caudal de soplado (en la prueba, la salida recorre
≈ 30 puntos): cada movimiento del
soplado es un cambio de producción. Es el compromiso clásico de un lazo de
nivel.

### Lazos de calidad lentos

- **CIC-605** (consistencia de soplado) actúa sobre el licor de la lechada
  de soplado; la dilución lo sigue (bloque FFC-602), de modo que el lavado
  no cambia. Asienta en más de 10 minutos (tabla 6.1).
- **FDC-607** (factor de dilución) mueve la consigna de FIC-601 (filtrado de
  lavado).
- **TIC-604** (temperatura de soplado) es un maestro alternativo de
  FIC-601. En el caso base el soplado está a ≈ 75 °C, la temperatura del
  filtrado: no se puede enfriar más con filtrado. El lazo sirve cuando el
  lavado es escaso y el soplado se calienta. Es lento (asienta en más de una hora, tabla 6.1):
  menos filtrado no se nota hasta que la zona de lavado se calienta.

### Tabla 6.1 — Resultado de las pruebas de escalón

Generada por `npm run sintonia` (ver `docs/SINTONIA.md` para la tabla
completa). Se mide sobre la medición filtrada (sin ruido blanco),
promediada.

<!-- generado:sintonia -->
| Lazo | Kc | Ti (s) | Escalón | Sobrepaso | Asentamiento |
|------|----|--------|---------|-----------|--------------|
| FIC-401 | 0,3 | 4 | +50 m³/h | 3 % | 40 s |
| PIC-301 | 6 | 30 | +0,3 bar | 7 % | 20 s |
| TIC-402 | 4 | 60 | +2 °C | 6 % | 200 s |
| TIC-212 | 6 | 60 | −2 °C | 7 % | 295 s |
| LIC-202 | 4 | 1 800 | −0,5 m | 15 % | 11 min |
| LIC-302 | 6 | 1 500 | −1 m | 28 % | 23 min |
| CIC-605 | 1 | 300 | −0,5 % | 0 % | 13 min |
| TIC-604 | 4 | 1 200 | +2 °C | 29 % | 72 min |
<!-- /generado -->

Criterios (supuestos de diseño, en `config/lazos.json`): sin oscilación
sostenida, sobrepaso y asentamiento bajo un máximo por lazo. Asentado
significa dentro de ±10 % del escalón (o de una banda absoluta para
variables que fluctúan solas, como el nivel de astillas: ±0,3 m).

### Método de sintonía para estudiar

Las sintonías del simulador partieron de reglas de modelo interno (IMC /
SIMC de Skogestad) y se ajustaron con las pruebas de escalón. Para un
proceso de primer orden con tiempo muerto
($K_p$, $\tau$, $\theta$) las reglas SIMC dan

$$K_c = \frac{1}{K_p}\,\frac{\tau}{\tau_c + \theta}, \qquad T_i = \min\big(\tau,\; 4(\tau_c + \theta)\big)$$

donde $\tau_c$ es la constante de tiempo deseada en lazo cerrado (con
$\tau_c = \theta$ como punto de partida "rápido pero robusto"). Para un
integrador de pendiente $k'$ (%/s por % de salida):
$K_c = 1/[k'(\tau_c+\theta)]$, $T_i = 4(\tau_c+\theta)$.

## 6.5 Cascadas y relaciones

### Carga de álcali (FFC-110)

La carga de álcali se define sobre madera seca. El bloque calcula el licor
blanco total y lo reparte entre cuatro FIC en cascada:

$$Q_{LB} = \frac{\text{carga} \cdot W}{EA_{LB}}$$

**Ejemplo 6.3.** Con W = 210 t/h de madera seca, carga 18 % (como NaOH) y
EA del licor blanco 117,5 g/L:

$$Q_{LB} = \frac{0{,}18 \times 210\,000 \text{ kg/h}}{117{,}5 \text{ kg/m}^3} = 321{,}7 \text{ m³/h}$$

repartido 50/10/20/20 %: alimentación 160,9; transferencia 32,2;
circulación superior 64,3; circulación inferior 64,3 m³/h (las mediciones
del caso base son 160, 32, 63 y 65 m³/h). El EA del licor blanco se
actualiza solo cuando llega un análisis de laboratorio: si la
caustificación entrega un licor más débil y nadie lo analiza, la carga real
baja sin que el DCS lo sepa. W se filtra (τ = 60 s) para que el ruido del
medidor no mueva los esclavos.

Ojo: W viene del medidor de astillas, que calcula la masa con la
**densidad nominal**. Si llega madera más liviana, el medidor sobreestima
W, la carga real cae y el kappa sube horas después. Es una de las
perturbaciones de la Fase 5.

### Relación licor/madera (FFC-117)

$$Q_{LN} = (L/W)\cdot W - \underbrace{\frac{W\,h}{1-h}}_{\text{agua de la astilla}} - Q_{LB,alim} - Q_{circ,tope}$$

**Ejemplo 6.4.** L/W = 4,0 m³/t, W = 210 t/h, humedad h = 47,5 %:
licor total 840 m³/h; agua de la astilla 210·0,475/0,525 = 190 m³/h;
menos 161 (licor blanco) y 230 (circulación de tope): licor negro
259 m³/h (medido: 259 m³/h).

### Seguimiento (FFC-503, FFC-602)

Si el operador sube el filtrado de lavado y nada más, el filtrado extra
sube por el digestor hasta las mallas de extracción principal: baja el
caudal que desciende por la cocción inferior y, con él, el álcali que
acompaña a las astillas, y el kappa sube (secciones 2.4 y 4.10). Por eso la extracción final **sigue** los cambios del
filtrado: $SP_{503} = SP^{0}_{503} + (SP_{601} - SP^{0}_{601})$. Lo mismo
con la dilución, que sigue al licor de soplado.

## 6.6 Control avanzado

**Ritmo (RC-700).** Un cambio de producción no puede ser un escalón: el
licor ya está en la columna con la relación del ritmo anterior. El bloque
lleva la consigna de madera en rampa (150 ADt/d por hora ≈ 10,5 t/h de
madera por hora) y escala en proporción todos los caudales marcados.

**Factor H (HIC-703).** El H medido en el soplado describe astilla que
entró horas atrás. El bloque **predice** el H con las temperaturas actuales
de las zonas y corrige por ritmo (a más ritmo, menos tiempo):

$$H_{prev} = \big[k_{rel}(T_{sup})\,t_{sup} + k_{rel}(T_{inf})\,t_{inf} + H_{resto}\big]\frac{W_0}{W} + \Delta$$

**Ejemplo 6.5.** Con TI-304 = 148,4 °C y TI-305 = 151,7 °C:
$k_{rel}$ = exp(43,2 − 16 115/421,55) = 144/h y exp(43,2 − 16 115/424,85) =
194/h. Con $t_{sup}$ = 1,0 h, $t_{inf}$ = 1,2 h y $H_{resto}$ = 60:
$H_{prev}$ = 144 + 233 + 60 = 437. El H medido es 463, así que al
activarse el bloque toma Δ = +26 (corrige lo que el modelo simple no ve).
Para subir el H en 40 (≈ 9 %), como $d\ln k/dT = 16\,115/T^2$ ≈ 0,09 /°C,
las zonas deben subir ≈ 1 °C; las consignas de los calentadores suben más
(≈ 3 °C en la prueba), porque la zona mezcla el licor caliente con astilla
y licor más fríos.

**Kappa (AIC-701).** Un PI muestreado: con cada valor nuevo del analizador
corrige el objetivo de H (o la carga de álcali si el control de H está
apagado). Debe ser lento: el efecto de una corrección se ve recién después
de una residencia completa. Corregir con cada muestra como si fuera
inmediato lleva a oscilaciones de varias horas.

## 6.7 Enclavamientos

| Id | Condición | Acción | Por qué |
|----|-----------|--------|---------|
| I-01 | Presión del digestor > 8,5 bar(g), 2 s | Detener alimentación | No meter más material a un vaso que se está sobrepresionando |
| I-02 | Nivel de astillas del digestor > 56 m, 30 s | Detener alimentación | Evitar llenar el separador superior |
| I-03/04/05 | Circulación < 300 m³/h, 10 s | Cerrar el vapor de ese calentador | Vapor sin flujo sobrecalienta y ensucia el calentador |
| I-06 | Temperatura de soplado > 98 °C, 60 s | Cerrar la descarga del soplado | Soplado caliente vaporiza en el estanque y daña la fibra |
| I-07 | Corriente del raspador > 350 A, 5 s | Cerrar soplado y alimentación | Columna compactada o colgada: no forzar el raspador |
| I-08 | Estanque de soplado > 95 % | Cerrar soplado | No rebalsar el estanque |
| I-09/10 | ΔP de mallas de circulación > 0,95 bar, 60 s | Detener la bomba y cerrar el vapor | Mallas tapadas: proteger la bomba y el calentador |

Características: retardo (evita disparos por un pico de ruido), **rearme
manual** (el operador debe entender qué pasó antes de volver a operar; el
sistema rechaza el rearme si la condición sigue presente) y, después del
rearme, el lazo queda en MAN: volver a automático es una decisión del
operador. Cada enclavamiento se prueba en `tests/control.test.js`.

## 6.8 Alarmas

Una alarma es un pedido de acción al operador. Las normas ANSI/ISA-18.2 y
EEMUA 191 dan los criterios que sigue el simulador:

- **Prioridad** según consecuencia y tiempo para actuar: 1 crítica
  (seguridad, enclavamientos), 2 alta, 3 media, 4 baja.
- **Banda muerta y retardo** para que una variable que ronda el límite no
  active y desactive la alarma cada segundo.
- **Estados:** activa sin reconocer → reconocida → normal, o "retornada
  sin reconocer" si la condición desapareció antes de que el operador la
  viera (igual hay que reconocerla: algo pasó).
- **Supresión por estado:** con la alimentación detenida, las alarmas del
  grupo "proceso" (temperaturas de cocción, álcali, kappa) no tienen sentido
  y se suprimen.
- **Archivo temporal** (*shelving*): el operador puede sacar de la lista
  una alarma molesta por un plazo máximo (8 h), nunca una crítica.
- **Inundación:** más de 10 alarmas en 10 minutos supera la capacidad de un
  operador de entender lo que pasa. El simulador mide la tasa y una prueba
  verifica que tres eventos simples (detener la bomba de circulación
  superior, detener la alimentación, bajar la presión del vapor) no la
  superan: el peor caso dio 6.

**Ejemplo 6.6 — qué ve el operador si se detiene la bomba de circulación
superior.** En orden: bomba detenida (evento, prioridad 3); apertura de la
válvula de alivio y presión alta del digestor (el balance de líquido cambia
de golpe); caudal de circulación superior bajo; antes de un minuto, el
enclavamiento I-03 cierra el vapor (prioridad 1); a los 16 min, temperatura baja de la
zona de cocción superior. Seis alarmas, cada una con una acción posible: es
un diseño de alarmas razonable.

## 6.9 Cómo se verificó

| Prueba | Archivo |
|--------|---------|
| PID: error permanente cero, perturbación, signo, anti-windup, transferencia sin golpe, derivada sobre el PV | `tests/pid.test.js` |
| Escalón de los 29 lazos dentro de los criterios | `tests/sintonia.test.js` |
| 2 h de caso base con control: error medio < 2 % del rango, sin alarmas ni enclavamientos | `tests/control.test.js` |
| Cada enclavamiento dispara después de su retardo y fuerza sus acciones | `tests/control.test.js` |
| Ciclo de vida de una alarma, alarmas de evento, archivo | `tests/control.test.js` |
| Analizador discreto, laboratorio con retardo de 20–40 min | `tests/control.test.js` |
| Carga de álcali, ritmo y factor H mueven lo que deben | `tests/control.test.js` |
| Determinismo y guardar/cargar con el control | `tests/control.test.js` |

## 6.10 Ejercicios

1. Calcule la ganancia de proceso de TIC-402 (circulación superior,
   1 000 m³/h, válvula de 36 MW, rango 50–200 °C) y estime $\tau_{lc}$ con
   Kc = 4 y Ti = 60 s. Compare con el asentamiento de la tabla 6.1.
2. Si el EA del licor blanco baja de 117,5 a 110 g/L y el laboratorio no lo
   detecta, ¿cuánto cae la carga real de álcali? (Resp.: 18 × 110/117,5 =
   16,9 %.) ¿Qué alarma esperaría ver primero, y cuántas horas después?
3. ¿Por qué el enclavamiento de pérdida de circulación cierra el vapor y no
   detiene la alimentación?
4. Con el simulador: pase LIC-302 a Kc = 2 y repita el escalón de −1 m
   (`npm run sintonia LIC-302` después de editar `config/lazos.json`).
   Compare sobrepaso, asentamiento y recorrido de la salida.
5. Explique por qué un actuador pegado no genera ninguna alarma por sí
   mismo y qué tendencias revisaría para descubrirlo.

## Referencias del capítulo

Ver anexo B, sección "Control de procesos y alarmas": Seborg et al.;
Åström y Hägglund; Skogestad (2003); ANSI/ISA-18.2; EEMUA 191; IEC 61511.
