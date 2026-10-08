# 3. Transporte, hidráulica y energía

Este capítulo explica cómo el simulador representa el movimiento de las
astillas y del licor, el intercambio entre el licor libre y el licor dentro
de las astillas, y el balance de energía. Corresponde a la Fase 1a. El código
está en `src/sim/` y cada sección indica el archivo.

## 3.1 La idea central: dos representaciones

En un digestor conviven dos cosas que se mueven de forma muy distinta:

- **Las astillas** bajan como un bloque (una columna), todas a la misma
  velocidad en una sección dada. Es un **flujo pistón**: lo que entra junto
  sale junto, horas después.
- **El licor libre** (entre las astillas) se mueve según dónde se agrega y
  dónde se extrae: puede bajar con las astillas (cocorriente), subir
  (contracorriente) o casi detenerse.

Por eso el modelo usa:

1. **Celdas fijas** (enfoque *euleriano*) para el licor libre: el vaso se
   divide a lo alto en N celdas iguales (20 en el impregnador y 60 en el
   digestor), cada una con su volumen de licor, temperatura y
   concentraciones.
2. **Parcelas que se mueven** (enfoque *lagrangiano*) para las astillas: la
   columna es una pila de "paquetes" de astillas. Cada parcela recuerda su
   propia historia: temperatura, licor retenido, factor H, edad, composición.

### ¿Por qué parcelas y no celdas para las astillas?

Si las astillas se transportaran entre celdas fijas con un esquema numérico
simple (contra la corriente de primer orden), un escalón a la entrada
(por ejemplo, un cambio de lote de madera) llegaría al soplado "suavizado"
por **dispersión numérica**. Con N celdas, el ancho de ese frente
artificial es del orden de τ/√N: con 60 celdas y 3,5 h, unos ±27 min. Para un
juego cuyo objetivo es hacer sentir el tiempo muerto, eso es inaceptable.
Con parcelas, el escalón llega intacto (la prueba automática mide el tiempo
muerto y lo compara con el tránsito teórico con 2 % de tolerancia).

## 3.2 La columna de astillas (`columna.js`)

Cada parcela i tiene masa de madera $m_i$, volumen de astilla $V_{ast,i}$
(incluidos los poros) y ocupa un volumen de vaso

$$V_{col,i} = \frac{V_{ast,i}}{s}$$

donde s es la fracción del vaso ocupada por astillas (0,40 en el caso base).
Las parcelas se apilan desde el fondo. En cada paso de tiempo:

1. Se retira por el fondo una masa $\dot m_{salida}\,\Delta t$ (raspador o
   soplado), en base madera alimentada. Si hace falta, la parcela del fondo
   se divide en dos.
2. Se agregan por el tope las astillas que llegan. Si la parcela del tope es
   más chica que un tercio de la masa de una celda, la nueva se funde con
   ella; si no, se abre una parcela nueva. Así hay unas 3 parcelas por celda.
3. Se calcula qué fracción $f_{ij}$ de cada parcela cae en cada celda,
   recorriendo la pila desde abajo con el volumen acumulado.

El **nivel de astillas** es la altura del tope de la pila. Si no se retira
nada, la columna no se mueve: las parcelas siguen calentándose y
cocinándose donde están, como en una parada real.

**Fusión de parcelas.** Al fundir dos parcelas, las cantidades extensivas
(masas, volúmenes, moles) se suman y las intensivas se promedian con el peso
que corresponde: la temperatura con la capacidad calorífica, las
concentraciones del licor retenido con su volumen, el factor H y la edad con
la masa. Así se conserva exactamente la masa, las especies y la energía.

## 3.3 Las tres fases líquidas y sólidas

Para una parcela de masa seca m:

- Volumen de astilla: $V_{ast} = m/\rho_{básica}$.
- Volumen de poros: $V_p = V_{ast} - m/\rho_{pared}$.
- **Licor retenido** $V_r \le V_p$: al entrar, es el agua de la humedad; luego
  se llena con licor (penetración).

En cada celda j, el espacio disponible para **licor libre** es

$$cap_j = V_j - \sum_i f_{ij}\,V_{ast,i}$$

## 3.4 Balance hidráulico del licor libre (`hidraulica.js`)

En cada paso, para cada vaso:

1. **Volumen total nuevo** = anterior + adiciones − extracciones −
   penetración − salida por el fondo. Si se pide sacar más de lo que hay,
   todas las salidas se reducen en la misma proporción.
2. **¿Vaso lleno?** Si el volumen supera la capacidad total, el exceso sale
   por la **corriente de cierre** (en el caso base, la extracción principal
   del digestor y el separador del impregnador). Es una simplificación de
   la Fase 1a: en la planta, ese exceso sube la presión del vaso en segundos
   y el control actúa sobre una válvula (capítulo 5).
3. **Llenado desde el fondo.** Si el vaso no está lleno, el licor ocupa las
   celdas de abajo hacia arriba; lo que entra en celdas secas cae a la
   superficie.
4. **Caudal por cara.** Con los volúmenes nuevos, el caudal que cruza la cara
   inferior de cada celda se obtiene integrando desde el tope:

$$F_{j+\frac12} = F_{j-\frac12} + A_j - E_j - P_j - \frac{V_{f,j}^{nuevo} - V_{f,j}^{anterior}}{\Delta t}$$

con $F_{tope}=0$, $A_j$ adiciones, $E_j$ extracciones y $P_j$ penetración en
la celda j. Positivo es hacia abajo. Al llegar al fondo, F debe ser igual a
la salida de licor por el fondo; la diferencia (error de redondeo) se
informa como "residuo hidráulico" y es del orden de 10⁻¹⁵.

Este cálculo es el que produce, sin imponerlo, la contracorriente en la zona
de lavado y la aspiración doble de la extracción principal (capítulo 2,
paso 7).

## 3.5 Transporte del licor libre (`transporte.js`)

Para un escalar x (temperatura o concentración) en la celda j, el balance en
un paso con el esquema **contra la corriente implícito** es

$$V_j^{n+1}x_j^{n+1} = V_j^n x_j^n + \Delta t\left[\sum \text{entradas}\cdot x_{aguas\ arriba}^{n+1} - \sum \text{salidas}\cdot x_j^{n+1}\right] + \sum A_j x_{A}$$

"Contra la corriente" (*upwind*) significa que lo que cruza una cara lleva el
valor de la celda de donde viene. "Implícito" significa que se usan los
valores nuevos ($n+1$), lo que da un sistema tridiagonal (cada celda depende
solo de sus vecinas) que se resuelve con el algoritmo de Thomas.

Propiedades que se eligieron a propósito (Patankar, 1980):

- **Conservativo:** lo que sale de una celda entra exactamente a la otra.
- **Positivo:** la matriz es una matriz M (diagonal dominante, fuera de la
  diagonal ≤ 0), así que no aparecen concentraciones negativas.
- **Incondicionalmente estable:** sirve con cualquier paso de tiempo y con
  celdas casi vacías (llenado, vaciado), sin la restricción de Courant de
  los esquemas explícitos.

Las extracciones salen con la concentración **nueva** de su celda; por eso lo
que se lleva cada corriente se calcula después de resolver, y el balance
cierra con error de redondeo (≈ 10⁻¹³ relativo en las pruebas).

**Costo:** el esquema de primer orden tiene dispersión numérica en el licor
(limitación L-09). En un digestor real el licor ya tiene dispersión por la
canalización y la mezcla en las mallas, así que se acepta.

## 3.6 Intercambio entre el licor libre y la astilla (`intercambio.js`, `vaso.js`)

Tres transferencias ocurren entre el licor libre de una celda y las porciones
de parcela que hay en ella.

### Penetración

El licor libre entra a los poros con aire:

$$\frac{dV_r}{dt} = k_{pen}(T)\,(V_p - V_r), \qquad k_{pen} = k_{ref}\,e^{-\frac{E}{R}\left(\frac1T-\frac1{T_{ref}}\right)}$$

### Difusión

Una vez dentro, los iones y los sólidos disueltos se mueven por difusión
entre el licor libre y el retenido. Se usa la aproximación de **fuerza
impulsora lineal**:

$$\frac{dc_r}{dt} = k_D\,(c_f - c_r), \qquad k_D = \frac{3\,D_{ef}}{L^2}$$

donde L es el semiespesor de la astilla (2 mm). El factor 3 es el que hace
que la aproximación lineal reproduzca la velocidad inicial de la solución
exacta de difusión en una lámina (Glueckauf, 1955, para la esfera usa 15 —
*por verificar*). La difusividad efectiva depende de la temperatura y de la
alcalinidad:

$$D_{ef} = D_{ref}\,e^{-\frac{E_D}{R}\left(\frac1T-\frac1{T_{ref}}\right)}\cdot ECCSA([OH^-])$$

$$ECCSA = e_{min} + (e_{max}-e_{min})\frac{[OH^-]}{[OH^-]+K_e}$$

La **ECCSA** (*effective capillary cross-sectional area*) representa que la
madera hinchada en álcali deja pasar mejor los iones; la idea viene de Stone
(1957) *(por verificar)*. Los valores de $D_{ref}$, $E_D$ y la forma de ECCSA
son **supuestos** elegidos para una constante de tiempo de ≈ 9 min a 150 °C
con astillas de 4 mm (en la Fase 1b se aceleró desde ≈ 20 min; ver
capítulo 4.10).

**Ejemplo 3.1.** Con $D_{ref} = 2{,}5\times10^{-9}$ m²/s, ECCSA = 1 y
L = 2 mm: $k_D = 3 \times 2{,}5\times10^{-9} / (0{,}002)^2 = 1{,}9\times10^{-3}$ s⁻¹,
es decir τ = 1/k_D ≈ 9 min. Con astillas de 8 mm (sobre espesor), L = 4 mm y
τ ≈ 36 min: cuatro veces más lento. Con poco álcali la ECCSA baja (hasta
0,3) y la difusión se hace hasta tres veces más lenta. Por eso el sobre espesor da rechazos.

### Calor

$$\frac{dT_{ast}}{dt} = k_{calor}\,(T_f - T_{ast}),\qquad k_{calor}\approx \frac{3\,\alpha}{L^2}$$

Con la difusividad térmica de la madera húmeda α ≈ 1,2·10⁻⁷ m²/s, $k_{calor}$
≈ 0,09 s⁻¹ (≈ 11 s). Es tan rápido que, en la práctica, astilla y licor
tienen la misma temperatura en cada celda.

### Integración implícita "en estrella"

Una celda contiene licor libre (capacidad $C_f$, valor $x_f$) y varias
porciones de parcelas (capacidad $C_p$, valor $x_p$, constante $a_p = k_p\Delta t$).
Con Euler implícito para todas a la vez:

$$x_p^{n+1} = \frac{x_p^n + a_p\,x_f^{n+1}}{1+a_p}$$

$$x_f^{n+1} = \frac{C_f\,x_f^n + \sum_p \frac{C_p\,a_p}{1+a_p}\,x_p^n}{C_f + \sum_p \frac{C_p\,a_p}{1+a_p}}$$

Es una solución cerrada (no hace falta iterar), estable con cualquier paso y
que conserva exactamente $C_f x_f + \sum_p C_p x_p$. Para especies, C es un
volumen; para calor, una capacidad calorífica (kJ/K).

## 3.7 Tuberías (`tubo.js`)

La línea de transferencia y los retornos de las circulaciones tienen volumen
propio. Se modelan como una **cola**: lo que entra se pone al final y lo que
sale se toma del principio. El tiempo de transporte es exactamente
τ = V/Q. Una tubería entre vasos entrega en cada paso el volumen que se le
ingresó en el paso anterior (5 s de desfase), lo que evita tener que resolver
todo el sistema a la vez.

## 3.8 Energía

La entalpía se mide desde 0 °C:

- licor: $H = \rho\,c_p\,V\,T$ con ρ·cp = 1 050 × 3,8 = 3 990 kJ/(m³·K)
  (constante, supuesto S-12);
- parcela: $H = (m\,c_{p,madera} + \rho c_p V_r)\,T$, con $c_{p,madera}$ = 1,4 kJ/(kg·K).

La temperatura del licor libre viaja con el mismo esquema de transporte que
las concentraciones. Los **calentadores** de las circulaciones llevan la
corriente a su temperatura de salida, con una potencia máxima. Las
**pérdidas** al ambiente se reparten por volumen de celda y se integran en
forma exacta:

$$T_j^{n+1} = T_{amb} + (T_j^n - T_{amb})\,e^{-UA_j\Delta t / C_j}$$

## 3.9 Contabilidad y verificación

El simulador lleva la cuenta de todo lo que entra (fuentes, calentadores), sale
(sumideros, pérdidas) y se genera o consume (reacciones). En cualquier
momento verifica, para el licor, la madera, cada especie y la energía:

$$\text{error} = (\text{inventario} - \text{inventario inicial}) - (\text{entradas} - \text{salidas} + \text{producción})$$

La especificación exige menos de 0,1 % en masa y 1 % en energía. El modelo
da ≈ 10⁻¹³, porque todos los pasos son conservativos por construcción. Esta
prueba se corre automáticamente en cada cambio del código.

## 3.10 Determinismo

Con la misma semilla y los mismos comandos (aplicados en el mismo paso), el
estado es idéntico número por número, sin importar si la simulación avanzó
de a 1 s (x1) o de a 1 800 s (x300 o más). Guardar y cargar reproduce
exactamente la continuación. Ambas cosas tienen prueba automática.

## 3.11 Para profundizar

- Patankar, S. V. (1980). *Numerical Heat Transfer and Fluid Flow*.
  Hemisphere. — Volúmenes finitos, esquemas contra la corriente, algoritmo
  de Thomas.
- Glueckauf, E. (1955). Theory of chromatography. Part 10. Formulae for
  diffusion into spheres and their application to chromatography. *Trans.
  Faraday Soc.* 51, 1540. *(por verificar)* — Aproximación de fuerza
  impulsora lineal.
- Stone, J. E. (1957). The effective capillary cross-sectional area of wood
  as a function of pH. *Tappi* 40(7). *(por verificar)* — ECCSA.
- Vroom, K. E. (1957). The "H" factor: a means of expressing cooking times
  and temperatures as a single variable. *Pulp Paper Mag. Can.* 58(3).
  *(por verificar)*

## 3.12 Ejercicios

1. Con 60 celdas y un esquema euleriano de primer orden, estime la
   dispersión numérica de un escalón que recorre el digestor en 3,5 h.
   Compárela con la resolución de las parcelas (≈ 2,5 min).
2. Demuestre que la solución "en estrella" conserva $C_f x_f + \sum_p C_p x_p$.
3. Si la extracción final sube de <!-- generado:ext_final -->790<!-- /generado --> (caso base) a 900 m³/h sin cambiar nada más, ¿qué
   le pasa al caudal en la zona de lavado y en la cocción inferior? Verifique
   con el simulador (`enviarComando` con `ajustar ext_final caudal`).
4. ¿Por qué el esquema implícito no necesita cumplir la condición de Courant?
   ¿Qué se pierde a cambio?
