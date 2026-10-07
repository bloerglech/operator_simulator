# 5. Presión, equipos y estados de operación

Este capítulo cubre lo que rodea a la cocción: la presión del digestor
hidráulico y sus elementos de seguridad, los calentadores, los ciclones
flash, el silo y la línea de astillas, las mallas, la compactación de la
columna y los estados de operación. Corresponde a la Fase 1c. Código:
`src/sim/presion.js`, `valvulas.js`, `pasoRapido.js`, `equipos.js`,
`mallas.js`, `columna.js`, `agua.js`.

## 5.1 Por qué la presión de un digestor hidráulico es tan rápida

Un digestor hidráulico está **completamente lleno de líquido**. El líquido
es casi incompresible: si entra más de lo que sale, no hay un espacio de gas
que amortigüe, y lo único que cede es la compresión del licor y la
elasticidad del manto del vaso. La "capacidad" del vaso para acumular
líquido es

$$C = V_{líquido}\,(\beta_{licor} + \beta_{vaso})$$

con $\beta_{licor}$ ≈ 4,6·10⁻¹⁰ Pa⁻¹ (compresibilidad del agua) y
$\beta_{vaso}$ ≈ 5·10⁻¹⁰ Pa⁻¹ (supuesto). Para ≈ 3 500 m³ de líquido,
C ≈ 3,4·10⁻⁶ m³/Pa. Entonces

$$\frac{dP}{dt} = \frac{Q_{entra} - Q_{sale}}{C}$$

**Ejemplo 5.1.** Si se cierra la extracción principal (≈ 100 m³/h =
0,028 m³/s) sin cambiar nada más: dP/dt = 0,028 / 3,4·10⁻⁶ ≈ 8 200 Pa/s,
es decir **0,08 bar/s: 1 bar en 12 s**. Por eso la presión del digestor se
controla con un lazo rápido y existen la válvula de alivio y la de
seguridad. Compare con un vaso que tiene un colchón de gas de 100 m³ a
6 bar: C = V/P ≈ 1,7·10⁻⁴ m³/Pa, 50 veces más lento.

### El modelo

El simulador sigue el **exceso** E de líquido sobre la capacidad
geométrica del vaso:

| Situación | Presión del tope |
|-----------|------------------|
| Lleno y cerrado (E ≥ 0) | $P = P_{ref} + E/C$ |
| Falta líquido, cerrado (E < 0) | vapor: $P = P_{ebullición}$; frío: entra aire, $P = P_{atm}$ |
| Venteo abierto | $P = P_{atm}$; el exceso rebalsa |

En cada paso rápido (0,2 s) se integra $dE/dt = Q_{fijo} - Q_{válvulas}(P) - Q_{alivio}(P)$
con Euler implícito: como el caudal de las válvulas crece con la presión, la
ecuación es monótona y se resuelve con regula falsi en un intervalo seguro.
En cada paso lento (5 s) el balance hidráulico recalcula E exactamente a
partir de los volúmenes que realmente pasaron, de modo que la masa se
conserva.

## 5.2 Margen sobre la ebullición

El licor a 150 °C hierve si la presión baja de su presión de saturación. En
un vaso alto hay que considerar la columna hidrostática: a la profundidad z,
la presión es $P_{tope} + \rho g z$. El tope del digestor no debe bajar de

$$P_{ebullición} = \max_j \left[P_{sat}(T_j) - \rho\,g\,z_j\right]$$

**Ejemplo 5.2.** Tope a 130 °C: $P_{sat}$ = 2,70 bar(a). Retorno de la
circulación superior a 9,5 m de profundidad con licor a ≈ 152 °C:
$P_{sat}$ = 5,02 bar(a) − 1 050·9,81·9,5 Pa (= 0,98 bar) = 4,04 bar(a). El
segundo manda: el tope no puede bajar de ≈ 3 bar(g). En el caso base las
celdas de retorno están algo más frías y el simulador informa un piso de
2,6 bar(g); con ≈ 5,6 bar(g) de operación, el margen es ≈ 3 bar.

Si la presión cae bajo ese piso, el licor hierve en la zona caliente
(**vaporización súbita**): el vapor sostiene la presión en ese valor, el
simulador lo registra como incidente y la columna se desordena. Ocurre, por
ejemplo, si se abre de más la extracción o se detiene una bomba de entrada
con el digestor caliente.

## 5.3 Válvulas, bombas y elementos de seguridad

**Válvula de control:** $Q = K_v\,f(x)\sqrt{\Delta P / 1\,\mathrm{bar}}$, con
$K_v$ el caudal a 1 bar de caída con la válvula totalmente abierta y $f(x)$
la característica (lineal o de igual porcentaje con rangeabilidad 50). Si
hay una malla en serie con resistencia R:

$$\Delta P = R\,Q + \left(\frac{Q}{K_v f}\right)^2\cdot 1\,\mathrm{bar}$$

El actuador tiene un tiempo de carrera (20 s de 0 a 100 %) y una constante de
tiempo.

**Bombas:** arrancan y se detienen con una constante de tiempo de unos
segundos. Cerca de su presión de cierre entregan menos (curva
simplificada): por eso, con la descarga bloqueada, la presión se estabiliza
en vez de subir sin límite.

**Alivio y seguridad (digestor):** el alivio abre en proporción entre 7,5 y
8 bar(g); la seguridad abre de golpe a 9 bar(g) y cierra bajo 8,3 bar(g)
(purga). Cada apertura queda registrada como incidente.

## 5.4 Calentadores

Un calentador de circulación es un intercambiador con vapor que condensa a
temperatura constante $T_s = T_{sat}(P_{MP})$ (191,7 °C con 12 bar(g)). La
temperatura máxima de salida es

$$T_{sal,max} = T_s - (T_s - T_{ent})\,e^{-UA/(\dot m c_p)}$$

**Ejemplo 5.3.** Circulación superior: 1 208 m³/h de licor (incluye el licor
blanco y el filtrado que se le agregan), $\dot m c_p$ = 1 339 kW/K, entra a
136 °C, UA limpio = 800 kW/K. $T_{sal,max}$ = 191,7 − 55,6·e^{−0,60} =
**161,1 °C**: sobra capacidad para la consigna de 156 °C. Con incrustación
f = 1 (UA = 400): 150,4 °C, ya no alcanza. Con f = 3: 143,8 °C. El operador
lo ve como la válvula de vapor abierta al 100 % y la temperatura de cocción
bajando: hay que pasar al calentador de respaldo y lavar con ácido el
incrustado.

El consumo de vapor del caso base es ≈ 108 t/h (1,7 GJ/ADt). Una caída de
presión del cabezal de media presión baja $T_s$ y, con ella, la capacidad de
todos los calentadores.

## 5.5 Ciclones flash y vapor para el silo

El licor extraído está a 130–150 °C y a la presión del digestor. Al entrar a
un ciclón a menor presión, se enfría hasta la temperatura de saturación y el
calor sobrante evapora agua:

$$m_{vapor} = \frac{\rho c_p V (T - T_{sat})}{h_{fg}(T_{sat})}$$

**Ejemplo 5.4.** Flash 2 a 1,1 bar(a) ($T_{sat}$ = 102,3 °C) con 956 m³/h
que llegan a 127,4 °C del flash 1: por m³, 3 990·25,1/2 251 = 44,5 kg de
vapor; en total 0,266 m³/s × 44,5 = 11,8 kg/s = **42,6 t/h**. El licor sale
más concentrado hacia evaporadores.

Ese vapor va al **silo de astillas**, donde calienta las astillas y desplaza
el aire de sus poros (vaporización). Para llevar 58,4 kg/s de madera con su
humedad de 15 a 100 °C hacen falta 58,4·5,0·85 ≈ 24 800 kW, unos 11 kg/s de
vapor (≈ 40 t/h). En el caso base el vapor flash alcanza y sobra; si
faltara, se completa con vapor fresco de baja presión.

**Una cadena típica de la operación:** si evaporadores no puede recibir
licor, se llena el flash 2, luego el flash 1, las extracciones del digestor
no tienen a dónde ir y la presión sube hasta el alivio. El simulador
reproduce esa cadena (prueba automática).

## 5.6 Mallas

Una malla es una placa ranurada por donde se extrae el licor. Su caída de
presión es proporcional al caudal y a su resistencia, que crece con el
taponamiento por finos y con la incrustación:

$$\Delta P = R_0\,(1 + r_f + r_{inc})\,Q$$

Las filas de mallas se **conmutan** periódicamente (se extrae por unas
mientras las otras se limpian por la presión de la columna): eso mantiene
$r_f$ ≈ 0,25. Si la conmutación falla, $r_f$ crece ≈ 1 cada 6 h; el
**retrolavado** lo baja de golpe un 70 %. Cuando la ΔP llega al límite de
succión de la bomba, la circulación pierde caudal y la zona se enfría: es
la misión 4.

## 5.7 La columna: compactación, raspador y colgamiento

Las astillas cocidas son blandas y se compactan bajo su propio peso. El
simulador calcula el esfuerzo efectivo con el modelo de **Janssen** (el
mismo que explica por qué la presión en el fondo de un silo no crece
indefinidamente: la fricción con la pared sostiene parte del peso):

$$\frac{d\sigma}{dz} = \gamma - \frac{\sigma}{\lambda},\qquad \lambda = \frac{D}{4\mu K}$$

con γ el peso sumergido de la columna por unidad de volumen más el arrastre
del licor. Con D = 10 m y μK = 0,08, λ ≈ 31 m: en un digestor de 50 m el
esfuerzo se satura cerca del fondo. La fracción de astillas sube de ≈ 0,39
en el tope a ≈ 0,44 en el fondo.

El esfuerzo en el fondo empuja el **raspador**: su torque y su corriente
son una medida indirecta de cómo se mueve la columna.

**Colgamiento:** si la fricción con la pared sostiene la columna, la parte
alta deja de bajar mientras el soplado sigue sacando la parte baja. Los
síntomas, que el modelo genera solos, son: el nivel de astillas no baja
aunque se siga alimentando; cuando se acaba la parte baja, cae la
consistencia de soplado y el torque del raspador; el hueco que queda se
llena de licor y baja la presión. Al soltarse, la columna cae varios metros
de golpe.

**Lección de modelación.** La primera versión calculaba la compactación de
nuevo en cada paso de 5 s. Al compactarse, cambiaba el espacio libre de
cada celda; eso generaba caudales de licor enormes (≈ 40 000 m³/h) en el
balance hidráulico, y el arrastre de esos caudales cambiaba otra vez la
compactación. Se resolvió con una constante de tiempo de compactación
(10 min) y el caudal filtrado para el arrastre. Moraleja: cuando dos
submodelos se realimentan, el que es físicamente lento debe ser lento
también en el código.

## 5.8 Estados de operación

| Estado | Cómo se representa |
|--------|--------------------|
| Vacío | venteo abierto, bombas detenidas, silo vacío |
| Llenado | venteo abierto: presión atmosférica; al llenarse rebalsa por el venteo |
| Lleno y frío | venteo abierto o cerrado, sin vapor |
| Presurizado | venteo cerrado y bombeo: la presión sube en segundos |
| Calentamiento | circulaciones con vapor |
| Operación | todo en marcha |
| Detenido en caliente | columna detenida; la cocción sigue |
| Enfriamiento y despresurización | si se despresuriza caliente, hay vaporización súbita |

El estado inicial de "operación" es sintético: las parcelas se
precocinan según la edad que tendrían en su posición. Tarda ≈ 10 h en ser
estacionario y en la primera hora el digestor puede abrir el alivio, porque
aún no hay control de presión (Fase 2).

## 5.9 Ejercicios

1. Calcule cuánto tarda la presión del digestor en subir de 5,5 a 7,5 bar(g)
   si se detiene la bomba de extracción final (790 m³/h) y nada más cambia.
2. ¿Qué presión mínima de tope necesita el digestor si la circulación
   inferior devuelve licor a 158 °C a 31 m de profundidad?
3. Con UA = 800 kW/K, ¿a qué presión del cabezal de vapor la circulación
   superior deja de alcanzar 156 °C?
4. ¿Por qué el vapor del flash 2 es mucho mayor que el del flash 1?
5. Explique con la ecuación de Janssen por qué un digestor más ancho (D
   mayor) compacta más la columna en el fondo.
