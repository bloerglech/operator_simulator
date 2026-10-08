# 4. Cinética de cocción y calibración

Este capítulo explica qué reacciones ocurren dentro de la astilla durante la
cocción, cómo se escriben en el modelo, de dónde vienen sus parámetros y cómo
se calibran para reproducir el caso base. Corresponde a la Fase 1b. El código
está en `src/sim/cinetica.js`; los parámetros, en `config/cinetica.json` y
`config/madera.json`.

> **Advertencia sobre los parámetros.** El simulador toma de la literatura la
> **forma** de las ecuaciones (cinética de tres fases de la deslignificación,
> factor H, factor G de la viscosidad, relación HexA–kappa). Las energías de
> activación y los órdenes de reacción de eucalipto son **supuestos**
> razonables mientras no haya datos de laboratorio de *E. nitens*. Las
> constantes de velocidad se **calibran** para reproducir el caso base. Por
> eso el modelo es confiable cerca del caso base y cualitativo lejos de él.

## 4.1 Dónde ocurren las reacciones

Las reacciones ocurren **dentro de la astilla**, en el licor retenido, no en
el licor libre. El licor libre solo trae álcali y se lleva lo disuelto, por
difusión (capítulo 3). Esto tiene dos consecuencias que se ven en el juego:

1. Un cambio en el licor libre (más licor blanco) tarda minutos en notarse
   en la reacción, porque primero tiene que difundir hacia la astilla.
2. Lo que ve el analizador de álcali en una extracción es el licor libre, no
   el licor donde realmente ocurre la cocción.

Además, las reacciones solo ocurren en la parte **impregnada** de la astilla.
Lo no impregnado reacciona a una fracción ψ = 10 % de la velocidad normal
(supuesto S-08).

Cada parcela lleva su propia composición, que cambia con el tiempo:

| Componente | Símbolo | Descripción |
|------------|---------|-------------|
| Lignina | $L_f, L_p, L_r$ | Fracciones rápida (inicial), principal y residual |
| Celulosa | $C_a, C_b$ | Accesible al *peeling* y estable |
| Xilano | $X_a, X_b$ | Disoluble y estable |
| Otros carbohidratos | $G_a, G_b$ | Accesibles al *peeling* y estables |
| Extraíbles | $E$ | Resinas, ácidos grasos |
| Acetilos | $Ac$ | Grupos acetilo del xilano |
| Cenizas | $Ce$ | Inertes |
| MeGlcA, HexA | $M$, $Hx$ | Ácidos urónicos del xilano (en mol) |
| Grado de polimerización | $1/DP$ | Largo medio de las cadenas de celulosa |
| No impregnado | $\varphi_k$ | Fracción no impregnada de cada clase de tamaño |

## 4.2 Forma general de las velocidades

Todas las constantes de velocidad siguen la ley de Arrhenius, escrita respecto
de una temperatura de referencia $T_{ref}$ = 150 °C:

$$k(T) = A \cdot \exp\left[-\frac{E}{R}\left(\frac{1}{T} - \frac{1}{T_{ref}}\right)\right]$$

Escribirla así (y no como $A_0 e^{-E/RT}$) tiene una ventaja práctica: A es la
velocidad a 150 °C, un número de magnitud razonable, y la calibración puede
cambiar A sin que se mueva E. Con la forma clásica, $A_0$ sería del orden de
$10^{12}$–$10^{16}$ y estaría fuertemente correlacionado con E.

**Integración.** En cada paso de 5 s las concentraciones del licor retenido
se congelan y cada componente decae con la solución exacta de primer orden:

$$\Delta X = X\left(1 - e^{-k\Delta t}\right)$$

Si el álcali que consumirían todas las reacciones supera el 95 % del
disponible en la astilla, todas se reducen en la misma proporción. Así el
álcali nunca queda negativo.

## 4.3 Deslignificación

### Las tres fases

Las cocciones de laboratorio muestran tres etapas (Gustafson et al., 1983,
*por verificar*):

1. **Inicial:** una fracción de la lignina (≈ 20 %) se disuelve rápido aun a
   baja temperatura, durante la impregnación. Consume poco álcali por la
   lignina, pero en eucalipto la neutralización de acetilos ocurre al mismo
   tiempo.
2. **Principal:** la mayor parte de la lignina (≈ 70 %) sale a temperatura
   de cocción, con fuerte dependencia de la temperatura y del álcali.
3. **Residual:** la última fracción sale muy lento. Si el álcali baja
   demasiado, parte de la lignina principal se condensa y pasa a residual.

El modelo las trata como **tres fracciones que reaccionan en paralelo**
(estructura del modelo Purdue, Christensen et al., 1982, *por verificar*): la
"fase" que domina en cada momento resulta de las velocidades, sin umbrales
artificiales.

$$r_f = k_f(T)\,[OH^-]^{a_f}\,L_f$$

$$r_p = \left(k_{p1}(T)\,[OH^-] + k_{p2}(T)\,[OH^-]^{0,5}[HS^-]^{0,4}\right) f_{DS}\,L_p$$

$$r_r = k_r(T)\,[OH^-]^{0,7}\,f_{DS}\,L_r$$

El término con $[HS^-]$ representa el efecto acelerador del sulfuro: por eso
una baja de sulfidez sube el kappa. Los órdenes 0,5, 0,4 y 0,7 provienen de la
estructura de Gustafson y son **supuestos** para eucalipto.

### Condensación y reprecipitación

Con álcali bajo, parte de la lignina principal se vuelve residual:

$$r_c = k_c(T)\,g([OH^-])\,L_p, \qquad g = \frac{1}{1 + ([OH^-]/OH_c)^n}$$

con <!-- generado:umbrales -->$OH_c$ = 3 g/L y n = 4 (supuestos): g vale ≈ 0,06 con 6 g/L, 0,5 con 3 g/L y ≈ 0,94 con 1,5 g/L. Además, la lignina ya disuelta **reprecipita** sobre la fibra cuando el álcali cae bajo 3 g/L:<!-- /generado -->

$$r_{rep} = k_{rep}\,\max(0,\,OH_{umbral} - [OH^-])\cdot LD_r V_r$$

Ambos efectos explican el comportamiento que se observa en planta: un álcali
residual muy bajo da **kappa más alto, pulpa más oscura y peor
blanqueabilidad**. Por eso existe la alarma de álcali residual bajo.

### Efecto de los sólidos disueltos (Lo-Solids)

$$f_{DS} = \frac{1}{1 + \kappa_{DS}\,DS_{org}}$$

con $DS_{org}$ en g/L (lignina, carbohidratos y extraíbles disueltos en el
licor retenido). Con 80 g/L, $f_{DS}$ = 0,86: la deslignificación se frena un
14 %. Es un supuesto que representa cualitativamente el principio Lo-Solids;
su valor debe ajustarse con datos de planta.

### Reactividad de la madera

Todas las velocidades de deslignificación se multiplican por un factor de
reactividad del lote (1 en el caso base). Una madera menos reactiva (0,85)
necesita más carga de álcali o más temperatura para llegar al mismo kappa.

## 4.4 Carbohidratos

Los carbohidratos se pierden por dos mecanismos:

- ***Peeling*** (despolimerización terminal): el álcali "pela" las cadenas
  desde su extremo reductor, unidad por unidad, hasta que una reacción de
  detención lo para. Es importante a baja temperatura. Se representa como
  una fracción accesible ($C_a$, $G_a$) que se consume con primer orden y se
  agota.
- **Hidrólisis alcalina:** corta las cadenas al azar a alta temperatura,
  creando nuevos extremos donde vuelve a empezar el *peeling*. Afecta a la
  fracción estable ($C_b$, $X_b$, $G_b$).

$$r_{pe} = k_{pe}(T)\,[OH^-]\,C_a, \qquad r_h = k_h(T)\,[OH^-]\,C_b$$

El **xilano** de eucalipto se disuelve en parte como polímero al inicio de la
cocción (alto álcali). Cuando el álcali baja al final, una parte del xilano
disuelto se **redeposita** sobre las fibras (interruptor en la
configuración), lo que sube el rendimiento:

$$r_{red} = k_{red}\,\max(0,\,OH_{red} - [OH^-])\cdot XD_r V_r$$

Los productos de degradación (ácidos isosacarínicos y otros) quedan en el
licor como sólidos orgánicos disueltos y **consumen álcali** (sección 4.7).

## 4.5 Ácidos hexenurónicos (HexA)

El xilano de eucalipto tiene grupos de ácido 4-O-metilglucurónico (MeGlcA).
Durante la cocción, parte se convierte en ácido hexenurónico (HexA), que se
degrada lentamente a alta temperatura:

$$\frac{dM}{dt} = -r_{form} - \frac{M}{X}r_{X,dis}, \qquad \frac{dHx}{dt} = r_{form} - r_{deg} - \frac{Hx}{X}r_{X,dis}$$

$$r_{form} = k_{HF}(T)\,[OH^-]\,M, \qquad r_{deg} = k_{HD}(T)\,Hx$$

Los últimos términos indican que cuando se disuelve xilano, se pierden con él
sus MeGlcA y HexA.

Los HexA **consumen permanganato en la medición de kappa**, como la lignina,
aunque no son lignina (Li y Gellerstedt, *por verificar*). En eucalipto
aportan varios puntos de kappa y no se eliminan con más cocción, sino en el
blanqueo (etapa ácida caliente o con ozono/dióxido de cloro). Por eso un
kappa 17 de eucalipto tiene solo ≈ 12 de lignina.

## 4.6 Número kappa y otras calidades

$$\kappa = \underbrace{\frac{\%\ \text{lignina en pulpa}}{c_\kappa}}_{\kappa_{lignina}} + \underbrace{\frac{\text{HexA (mmol/kg pulpa)}}{11{,}6}}_{\kappa_{HexA}}$$

con $c_\kappa$ = <!-- generado:lignina_por_kappa -->0,15<!-- /generado --> % de lignina por unidad del kappa de lignina
(supuesto provisional) y 11,6 mmol/kg de HexA por punto de kappa (dato de la
especificación).

Sobre $c_\kappa$: la literatura sobre el número kappa da lignina Klason
≈ 0,160 × kappa en eucalipto, 0,152 en fibra larga y 0,165 en abedul
(Foelkel, 2019, *por verificar*). Es decir, el eucalipto **no** va por
debajo de las coníferas. Pero ese factor es sobre el kappa **total**, que en
eucalipto incluye un aporte grande de los HexA; en el modelo los HexA se
suman aparte, así que el factor sobre el kappa de lignina no es directamente
0,160. El valor definitivo debe salir del laboratorio de la planta: lignina
Klason + soluble, kappa y HexA sobre la misma muestra de pulpa café.

**Rendimiento:** masa de pulpa / masa de madera alimentada, en base seca.
**Rechazos:** la parte de la madera que no estaba impregnada al alcanzar la
temperatura de cocción (140 °C) termina como astilla mal cocida:

$$R = \sum_k w_k\,\varphi_k(T = 140\,°C)\cdot y_{núcleo}$$

con $y_{núcleo}$ = 85 % (supuesto).

**Viscosidad intrínseca (factor G de Kubes).** El álcali corta las cadenas de
celulosa al azar; el número de cortes por unidad crece como

$$\frac{d(1/DP)}{dt} = k_v(T)\,[OH^-]\,(1 + \beta_{DS} DS_{org})$$

con energía de activación ≈ 179 kJ/mol (Kubes et al., 1983, *por verificar*;
dato de la especificación). Es mucho mayor que la de la deslignificación
principal (≈ 130 kJ/mol): **subir la temperatura daña más la celulosa que lo
que acelera la deslignificación**, y por eso Lo-Solids busca cocer a menor
temperatura. La viscosidad se calcula con la relación SCAN-CM 15
*(por verificar)*:

$$DP^{0{,}905} = 0{,}75\,[\eta] \quad \Rightarrow \quad [\eta] = \frac{DP^{0{,}905}}{0{,}75}\ \ \mathrm{mL/g}$$

Para 1 150 mL/g, DP ≈ 1 750.

## 4.7 Consumo de álcali

El OH⁻ se consume por:

$$\dot n_{OH} = \alpha_L\,r_{L} + \alpha_C\,r_{C} + \alpha_E\,r_E + \frac{r_{Ac}}{0{,}043} + A_{DS}\,e^{\ldots}[OH^-]\,DS_{org}V_r$$

| Término | Qué representa | Valor |
|---------|---------------|-------|
| $\alpha_L$ | mol OH⁻ por kg de lignina disuelta (fenoles, ácidos) | calibrado |
| $\alpha_C$ | mol OH⁻ por kg de carbohidrato degradado (ácidos isosacarínicos y otros) | 6 mol/kg, supuesto (≈ un ácido por unidad de anhidroglucosa, 162 g) |
| $\alpha_E$ | saponificación de extraíbles | 3 mol/kg, supuesto |
| $r_{Ac}/0{,}043$ | desacetilación: 1 mol OH⁻ por mol de acetilo (43 g/mol) | estequiométrico |
| $A_{DS}$ | reacciones de los sólidos disueltos con el álcali | supuesto |

La **desacetilación** es rápida y ocurre en la impregnación. En eucalipto, con
3 % de acetilos, consume 0,03/0,043 = 0,70 mol OH⁻ por kg de madera, es
decir 28 g NaOH/kg: ¡casi un 3 % de la carga de 18 % se va solo en esto! Por
eso la impregnación es crítica en eucalipto.

El HS⁻ se consume poco ($\beta_{HS}$ = 0,5 mol/kg de lignina, supuesto).

## 4.8 Impregnación por clase de tamaño

$$\frac{d\varphi_k}{dt} = -k_{imp}(T)\cdot S_{vap}\cdot\frac{[OH^-]}{[OH^-]+K_{OH}}\cdot\left(\frac{\delta_{ref}}{\delta_k}\right)^2\varphi_k$$

- $S_{vap}$: calidad de la vaporización (0–1). Si queda aire en las astillas,
  el licor no entra.
- El factor $(\delta_{ref}/\delta_k)^2$ dice que una astilla del doble de
  espesor tarda cuatro veces más: el tiempo de difusión crece con el cuadrado
  de la distancia.
- Con poco álcali la impregnación química es lenta.

## 4.9 Conservación

Todo lo que pierde la madera aparece en el licor como sólido orgánico
disuelto: la prueba automática verifica que
$\Delta m_{madera} + \Delta(LD + XD + CD + OD) = 0$ con error de redondeo.
Como el modelo usa ρ·cp constante para el licor (supuesto S-12), el calor
sensible de la madera disuelta se registra aparte en la contabilidad de
energía (supuesto S-24).

## 4.10 Calibración

### Qué se calibra y por qué

El caso base da seis números que el modelo debe reproducir: kappa, aporte de
HexA, rendimiento, viscosidad, álcali residual en la extracción y rechazos.
Hay muchos más parámetros que objetivos, así que se eligen **seis factores
multiplicativos**, uno por mecanismo, cada uno asociado principalmente a un
objetivo:

| Factor | Multiplica | Objetivo principal |
|--------|-----------|--------------------|
| Deslignificación | $A$ de las tres fracciones de lignina | kappa |
| Consumo de álcali por lignina | $\alpha_L$ | álcali residual en la extracción principal |
| Degradación de carbohidratos | $A$ de *peeling*, hidrólisis y disolución de xilano | rendimiento |
| Formación de HexA | $A_{HF}$ | aporte de HexA al kappa |
| Escisión de celulosa | $A_v$ | viscosidad |
| Impregnación | $A_{imp}$ | rechazos |

Las energías de activación, los órdenes de reacción y los repartos iniciales
**no se calibran**: con un solo punto de operación no se pueden identificar
(limitación L-04). Para identificarlas hacen falta datos a otras
temperaturas, cargas o ritmos.

### Método

1. Cada evaluación corre la planta completa hasta estado estacionario (hasta
   que el kappa cambie menos de 0,05 y el rendimiento menos de 0,02 puntos en
   una hora), partiendo del estado de la evaluación anterior para ahorrar
   tiempo.
2. Se trabaja con el logaritmo de los factores (siempre positivos; cambios
   relativos).
3. Residuo normalizado: $r_i = (y_i - y_i^{obj})/tol_i$.
4. **Levenberg–Marquardt:** jacobiano por diferencias finitas (un paso de 10 %
   en cada factor) y paso
   $\delta = -(J^TJ + \lambda\,\mathrm{diag}(J^TJ))^{-1}J^Tr$. Si el paso no
   mejora, se aumenta λ (más cerca del descenso por gradiente); si mejora, se
   reduce (más cerca de Gauss–Newton).
5. Termina cuando todos los objetivos quedan dentro de su tolerancia.

El resultado y los valores ajustados quedan en `docs/CALIBRACION.md`, y los
parámetros en `config/cinetica.json` con `origen: "calibrado"`.

### Resultado

<!-- generado:resultado -->
| Objetivo | Caso base (especificación) | Modelo calibrado |
|----------|----------------------------|------------------|
| Kappa | 17 ± 1 | 17,2 |
| Aporte de HexA | 4–6 | 5,0 |
| Rendimiento | 53–54 % | 53,5 % |
| Viscosidad | 1 100–1 200 mL/g | 1 151 mL/g |
| Álcali residual, extracción principal | 6–10 g/L | 8,0 g/L |
| Rechazos | < 0,5 % | 0,30 % |

Sin calibrar directamente, el modelo también queda dentro de los rangos en:
factor H 460 (350–500), álcali residual en la extracción final 6,5 g/L
(6–10), en el soplado 5,3 g/L (4–7), y xilano en la pulpa 17 %.
<!-- /generado -->

Valores calibrados (a 150 °C; detalle en `docs/CALIBRACION.md`):

<!-- generado:constantes -->
| Constante | Valor | Unidad |
|-----------|-------|--------|
| $A$ lignina rápida | 8,301·10⁻³ | 1/s |
| $A$ lignina principal, término OH⁻ | 8,301·10⁻⁴ | 1/s·(mol/L)⁻¹ |
| $A$ lignina principal, término OH⁻·HS⁻ | 1,107·10⁻³ | 1/s·(mol/L)⁻⁰·⁹ |
| $A$ lignina residual | 3,874·10⁻⁴ | 1/s·(mol/L)⁻⁰·⁷ |
| $\alpha_L$ | 3,83 | mol OH⁻/kg lignina |
| $A$ peeling de celulosa | 4,085·10⁻⁴ | 1/s·(mol/L)⁻¹ |
| $A$ hidrólisis de celulosa | 3,631·10⁻⁵ | 1/s·(mol/L)⁻¹ |
| $A$ disolución de xilano | 6,396·10⁻⁴ | 1/s·(mol/L)⁻¹ |
| $A$ formación de HexA | 3,699·10⁻⁴ | 1/s·(mol/L)⁻¹ |
| $A$ escisión de celulosa | 6,344·10⁻⁸ | 1/s·(mol/L)⁻¹ |
| $A$ impregnación | 7,708·10⁻³ | 1/s |
<!-- /generado -->

<!-- generado:orden_magnitud -->
**Verificación de orden de magnitud.** Con [OH⁻] ≈ 0,28 mol/L (≈ 11 g/L, el álcali dentro de la astilla en las zonas de cocción del perfil de abajo) y
[HS⁻] ≈ 0,2 mol/L, la lignina principal decae a 150 °C con

$$k ≈ 8{,}30\times10^{-4}\times0{,}28 + 1{,}11\times10^{-3}\times0{,}28^{0{,}5}\times0{,}2^{0{,}4} ≈ 5{,}40\times10^{-4}\ \mathrm{s^{-1}}$$

y, con el freno por sólidos disueltos ($f_{DS}$ ≈ 0,81 con 120 g/L), τ ≈ 38 min. En
≈ 2,5 h de cocción efectiva son ≈ 4 constantes de tiempo: la lignina principal baja a ≈ 2 % de la inicial
y el kappa final queda dominado por la lignina residual y los HexA, que es lo que se observa en eucalipto.
<!-- /generado -->

### Perfil de la cocción a lo largo del digestor

Así avanza la cocción en el caso base calibrado (en estado estacionario,
generado por `npm run tablas-manual`; z desde el tope del digestor, valores promedio de las
astillas en cada altura):

<!-- generado:perfil -->
| z (m) | Zona | T (°C) | EA libre (g/L) | EA dentro de la astilla (g/L) | Sólidos org. (g/L) | H | Kappa | Rend. % |
|-------|------|--------|----------------|-------------------------------|--------------------|---|-------|---------|
| 2,4 | Tope | 130 | 25,4 | 11,6 | 66 | 6 | 137 | 89,5 |
| 8,1 | Calentamiento | 135 | 14,6 | 13,4 | 79 | 37 | 113 | 81,4 |
| 10,0 | Circ. superior | 148 | 23,9 | 12,5 | 50 | 52 | 102 | 78,3 |
| 17,6 | Cocción sup. | 148 | 12,9 | 8,8 | 94 | 114 | 73 | 70,4 |
| 25,2 | Cocción sup. | 148 | 8,6 | 6,8 | 122 | 175 | 57 | 66,2 |
| 30,9 | Circ. inferior | 153 | 26,0 | 14,4 | 39 | 244 | 39 | 61,4 |
| 38,5 | Cocción inf. | 153 | 11,7 | 10,2 | 123 | 363 | 23 | 55,9 |
| 46,1 | Fin cocción | 146 | 8,4 | 7,7 | 142 | 459 | 17,2 | 53,5 |
| 55,6 | Lavado / fondo | 76 | 5,0 | 6,0 | 25 | 460 | 17,2 | 53,5 |
<!-- /generado -->

Observe: (1) en cada circulación el álcali sube de golpe (licor blanco) y
los sólidos disueltos bajan (extracción + filtrado): ese es el perfil
"parejo" de Lo-Solids; (2) el álcali dentro de la astilla va por detrás del
libre (difusión); (3) la cocción termina al entrar a la zona de lavado: el
kappa ya no cambia bajo los 47 m porque la temperatura cae.

### Lo que enseñó la calibración

La calibración no fue un trámite: cada vez que no convergía, mostraba un
problema del modelo. Vale la pena conocerlos porque son errores típicos al
modelar digestores.

1. **El nivel de la columna se caía.** Al principio, el soplado retiraba
   kg/s de *pulpa* iguales a los kg/s de *madera* alimentada. Como la pulpa
   pesa ≈ 54 % de la madera, la columna se vaciaba. Corrección: las salidas
   de astillas se miden en base madera alimentada, que equivale a un volumen
   de columna (supuesto S-25). En la planta esto lo resuelve el control de
   nivel (Fase 2).
2. **El rendimiento no bajaba.** Se calibraba con la disolución del xilano,
   pero la fracción disoluble ya se había agotado: el parámetro no tenía
   efecto. Se cambió por un factor común para toda la degradación de
   carbohidratos, que incluye la hidrólisis de la celulosa (un reservorio
   grande que nunca se agota).
3. **Subir el lavado arruinaba la cocción.** Para llevar el factor de
   dilución a 2,2 se aumentó el filtrado del fondo sin tocar la extracción
   final, y el kappa saltó de 17 a 27. Entonces se atribuyó a filtrado frío
   que subía a la zona de cocción inferior. Una revisión posterior registró
   el caso celda por celda y esa explicación no cuadra: la cocción inferior
   sigue en cocorriente y no se enfría (el factor H incluso sube). El
   filtrado extra sube hasta las mallas de extracción principal; baja a la
   mitad el caudal que desciende por la cocción inferior y, con él, la parte
   del licor blanco de la circulación inferior que acompaña a las astillas.
   El álcali de la zona baja y el kappa sube (8 h después de un escalón de
   +70 m³/h, desde el caso base calibrado):

<!-- generado:filtrado_fondo -->
| Caso (a las 8 h) | Kappa | H | Caudal en la cocción inferior (m³/h) | Caudal hacia las mallas de extracción (m³/h) | EA libre a 38,5 m (g/L) | EA dentro de la astilla a 38,5 m (g/L) | EA mínimo dentro de la astilla, cocción inferior (g/L) | T a 46 m (°C) |
|---|---|---|---|---|---|---|---|---|
| Caso base | 17,2 | 460 | +155 | −76 | 11,7 | 10,2 | 7,7 | 146 |
| +70 m³/h de filtrado al fondo | 18,0 | 473 | +84 | −147 | 10,3 | 8,9 | 6,5 | 144 |
| +70 de filtrado y +70 de extracción final | 17,3 | 458 | +154 | −77 | 11,7 | 10,2 | 7,8 | 145 |
<!-- /generado -->

   Con el modelo actual el salto es mucho menor que entonces. En el modelo
   de entonces el álcali dentro de la astilla quedaba cerca del umbral de
   condensación (6 g/L, lección 4) y la condensación amplificaba la caída
   de álcali. Ahora el álcali dentro de la astilla no baja del mínimo que
   muestra la tabla, lejos de los umbrales de 3 g/L, que casi no participan.
   Subir la extracción final en lo mismo anula el efecto (última fila): es
   la regla de operación que aplica FFC-503 (sección 6.5).

4. **Más temperatura no bajaba el kappa.** Con la difusión inicial
   (τ ≈ 20 min), el interior de las astillas quedaba con 4 g/L de álcali en
   la zona inferior, aunque el licor libre tenía 12 g/L. Al subir la
   temperatura se consumía más álcali, aumentaba la reprecipitación de
   lignina y el kappa volvía a subir. Se corrigió con una difusión más rápida
   (τ ≈ 9 min) y umbrales de condensación y reprecipitación más bajos
   (3 g/L). La lección: **lo que importa es el álcali dentro de la astilla,
   no el que mide el analizador en la extracción**.

## 4.11 Sensibilidades del modelo calibrado

Efecto de cambios típicos aplicados desde el estado estacionario, medido a
las 8 h (más que la residencia total de 4,4 h). Se reproduce con
`npm run sensibilidades` (y el manual se actualiza con `npm run tablas-manual`).

<!-- generado:sensibilidades -->
| Caso (efecto a las 8 h) | Kappa | κ HexA | Rend. % | Visc. mL/g | EA extr. g/L | EA sopl. g/L | Rech. % | H |
|------|-------|--------|---------|------------|--------------|--------------|---------|---|
| Caso base | 17,2 | 5,0 | 53,5 | 1 151 | 8,0 | 5,3 | 0,30 | 460 |
| +3 °C en ambas circulaciones de cocción | 14,2 | 5,1 | 52,1 | 1 023 | 7,1 | 5,2 | 0,31 | 577 |
| +10 % de licor blanco (carga 18 → 19,8 %) | 15,2 | 5,3 | 51,9 | 1 078 | 9,3 | 5,5 | 0,32 | 461 |
| −10 % de licor blanco (carga 18 → 16,2 %) | 19,9 | 4,7 | 55,3 | 1 229 | 6,7 | 5,2 | 0,28 | 459 |
| +10 % de ritmo sin compensar | 22,3 | 4,6 | 56,1 | 1 267 | 7,4 | 5,2 | 0,65 | 405 |
| Doble filtrado a las circulaciones (y más extracción) | 22,7 | 4,6 | 56,0 | 1 335 | 9,6 | 5,2 | 0,28 | 403 |
| Humedad de astillas 47,5 → 52,5 % | 19,7 | 4,8 | 55,2 | 1 227 | 6,5 | 5,2 | 0,35 | 457 |
| Madera 15 % menos reactiva | 21,8 | 5,0 | 53,7 | 1 144 | 8,3 | 5,3 | 0,28 | 458 |
| Sulfidez 32 → 28 % | 17,7 | 5,0 | 53,5 | 1 148 | 8,1 | 5,3 | 0,30 | 460 |
| Silo con poco vapor (30 % del flash, sin vapor fresco) | 19,1 | 4,9 | 54,2 | 1 190 | 9,4 | 5,3 | 6,96 | 413 |
<!-- /generado -->

Cómo leerla:

<!-- generado:lectura_sensibilidades -->
- **Temperatura:** −3,0 puntos de kappa por +3 °C (H de 460 a 577), pero −128 mL/g de
  viscosidad y −1,4 puntos de rendimiento. La celulosa sufre más que la
  lignina (mayor energía de activación).
- **Álcali:** +10 % de carga baja el kappa 2,0 puntos y −10 % lo sube 2,7. En el modelo,
  cada punto de kappa vale ≈ 0,7 puntos de rendimiento: bajar kappa cuesta rendimiento. La
  magnitud es un resultado del modelo, por validar con datos de planta.
- **Ritmo:** +10 % de producción sin compensar sube el kappa 5,1 puntos:
  menos tiempo (H baja de 460 a 405) y menos álcali por tonelada.
- **Dilución con filtrado:** baja los sólidos disueltos y sube la
  viscosidad (efecto Lo-Solids), pero el filtrado entra a 75 °C: enfría las zonas de cocción (H de 460 a 403),
  diluye el álcali y sube el kappa 5,5 puntos. Hay que compensar.
- **Humedad:** 5 puntos más de humedad suben el kappa 2,5 puntos, casi lo mismo que 10 % menos de carga (+2,7).
- **Silo con poco vapor:** las astillas llegan con aire y menos calientes: la impregnación empeora, los rechazos pasan de 0,30 a 6,96 %
  y el kappa sube 1,9 puntos.
- Todos estos efectos aparecen en el soplado **4 a 5 horas después** del
  cambio: ese es el tiempo muerto que el operador tiene que anticipar.
<!-- /generado -->

Advertencia: las magnitudes dependen de las energías de activación y órdenes
supuestos (S-10). Las direcciones son robustas; los valores exactos deben
validarse con datos de planta.

## 4.12 Ejercicios

1. ¿Por qué un aumento de 3 °C baja la viscosidad más de lo que la sube la
   menor carga de álcali que permite? (Compare las energías de activación de
   la deslignificación principal y de la escisión de celulosa.)
2. Calcule cuánto álcali (kg NaOH/t madera) consume la desacetilación si los
   acetilos son 3,5 % en vez de 3 %.
3. Si el kappa total es 17 y el aporte de HexA es 5, ¿cuánta lignina queda en
   la pulpa? ¿Y sobre madera, con rendimiento 53,5 %?
4. Explique por qué los rechazos dependen del cuadrado del espesor de la
   astilla. ¿Qué haría con un aumento de sobre espesor del 4 al 8 %?
5. Con el simulador, baje la sulfidez del licor blanco de 32 % a 28 %
   (comando `fuente licor_blanco HS`) y observe el kappa después de 6 h.
