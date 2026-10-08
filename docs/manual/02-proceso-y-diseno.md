# 2. El proceso y su diseño

Este capítulo describe el proceso de cocción kraft continua Lo-Solids y
muestra, paso a paso, cómo se dimensiona un sistema como el del simulador a
partir de la producción y de unos pocos datos de diseño. Todos los números
son los del caso base (`config/caso_base.json`).

## 2.1 La cocción kraft

El objetivo de la cocción es separar las fibras de la madera disolviendo la
**lignina**, el polímero que las mantiene unidas, conservando la mayor
cantidad posible de **celulosa** y **hemicelulosas** (en eucalipto, sobre todo
xilano). El producto es la pulpa café o "pulpa cruda".

La madera se cuece en **licor blanco**, una solución acuosa de hidróxido de
sodio (NaOH) y sulfuro de sodio (Na₂S), a 140–170 °C durante varias horas. En
solución el sulfuro se hidroliza:

$$\mathrm{Na_2S + H_2O \rightarrow NaOH + NaHS}$$

de modo que las especies activas son los iones **OH⁻** e **HS⁻**. El OH⁻
fragmenta y disuelve la lignina y también ataca los carbohidratos; el HS⁻
acelera la deslignificación y la hace más selectiva (menos daño a la
celulosa por unidad de lignina removida).

### Definiciones de álcali

Por convención, todas las cantidades se expresan "como NaOH" (o "como Na₂O").
Con concentraciones molares:

| Término | Definición | En función de los iones |
|---------|-----------|--------------------------|
| Álcali efectivo (EA) | NaOH + ½ Na₂S | [OH⁻] |
| Álcali activo (AA) | NaOH + Na₂S | [OH⁻] + [HS⁻] |
| Sulfidez (S) | Na₂S / AA | 2[HS⁻] / ([OH⁻] + [HS⁻]) |
| Eficiencia de caustificación (CE) | NaOH / (NaOH + Na₂CO₃) | — |

(NaOH y Na₂S en equivalentes de NaOH; en moles, cada Na₂S cuenta como dos
NaOH en el álcali activo y como uno en el efectivo.)

Para convertir: 1 mol/L de EA = 40,0 g/L como NaOH = 31,0 g/L como Na₂O.

**Ejemplo 2.1 — Composición del licor blanco.** El caso base tiene
EA = 117,5 g/L como NaOH, sulfidez 32 % y caustificación 82 %.

- [OH⁻] = EA = 117,5 / 40 = **2,94 mol/L**
- De S = 2[HS⁻]/([OH⁻]+[HS⁻]): [HS⁻] = [OH⁻]·S/(2 − S) = 2,94 × 0,32 / 1,68 = **0,56 mol/L**
- NaOH libre = [OH⁻] − [HS⁻] = 2,38 mol/L
- Na₂CO₃ (de CE): Na₂CO₃ = NaOH·(1/CE − 1)/2 = 2,38 × 0,2195 / 2 = 0,26 mol/L
  = **27,7 g/L** de carbonato, que no participa en la cocción (es un sólido
  inerte que viaja con el licor).

En el simulador: `src/sim/licor.js`, función `licorBlanco`.

## 2.2 La madera

El simulador usa una sola especie, *Eucalyptus nitens*, con propiedades
configurables (`config/madera.json`). Valores del caso base (**todos
supuestos**, a reemplazar con datos de la planta):

| Propiedad | Valor |
|-----------|-------|
| Densidad básica (masa seca / volumen verde) | 480 kg/m³ |
| Lignina | 24,5 % |
| Glucano (celulosa) | 46 % |
| Xilano (con grupos urónicos) | 17 % |
| Otros carbohidratos | 6 % |
| Extraíbles | 3 % |
| Acetilos | 3 % |
| Cenizas | 0,5 % |
| Humedad de las astillas | 47,5 % base húmeda |

**Humedad.** La humedad en base húmeda es agua / (agua + madera seca). Con
47,5 %, cada kg de madera seca trae 0,475/0,525 = **0,905 kg de agua**, que
entra al digestor y diluye el licor. Por eso una lluvia que sube la humedad
sube el kappa si no se corrige la carga de licor.

**Poros.** La pared celular tiene una densidad cercana a 1 500 kg/m³
(supuesto S-11). El volumen de poros por kg de madera seca es

$$v_p = \frac{1}{\rho_{básica}} - \frac{1}{\rho_{pared}} = \frac{1}{480} - \frac{1}{1500} = 1{,}417\times10^{-3}\ \mathrm{m^3/kg}$$

Con 0,905 × 10⁻³ m³/kg de agua, los poros están llenos en un 64 %; el resto es
aire que la **vaporización** de las astillas debe desplazar para que el licor
pueda entrar. Lo que no se impregna termina como **rechazos** (astillas mal
cocidas).

**Tamaño.** Las astillas se clasifican por espesor: sobre espesor (4 %, 8 mm),
aceptadas (86 %, 4 mm), palillos (4 %, 3 mm) y finos (6 %, 1,5 mm). El
espesor controla cuánto tarda el licor en llegar al centro de la astilla, que
crece con el cuadrado del espesor.

## 2.3 La cocción continua y el principio Lo-Solids

En un digestor continuo las astillas forman una **columna** que baja
lentamente por un vaso alto mientras el licor se agrega, se extrae y se hace
circular en distintos puntos. El primer digestor continuo comercial fue el
Kamyr (Suecia, década de 1950). En un digestor **hidráulico** el vaso está
completamente lleno de líquido y presurizado; en uno de **fase vapor** el tope
tiene un espacio de vapor que calienta las astillas.

El sistema del simulador es un **Lo-Solids de dos vasos** (tecnología Andritz):
un **impregnador** a baja temperatura y un **digestor hidráulico**, unidos
por la **línea de transferencia**.

**Principio Lo-Solids.** Durante la cocción, la madera disuelta (lignina,
carbohidratos degradados, extraíbles) se acumula en el licor como **sólidos
disueltos**. Esos sólidos consumen álcali, dañan la celulosa (bajan la
viscosidad) y empeoran la blanqueabilidad. La idea de Lo-Solids es
**extraer licor varias veces a lo largo del digestor y reponerlo con licor
blanco y filtrado de lavado**, para mantener baja la concentración de sólidos
disueltos en las fases principal y residual de la deslignificación. Se
obtiene un perfil de álcali más parejo, se puede cocer a menor temperatura y
mejoran la viscosidad, el rendimiento, la blanqueabilidad y el movimiento de
la columna. Que los sólidos disueltos **frenen la deslignificación** no es
parte del principio publicado: en el simulador es un supuesto agregado
(sección 4.3). (Referencias: Marcoccia et al. sobre Lo-Solids, y el capítulo de
cocción continua de Sixta, *Handbook of Pulp*, 2006 — *por verificar*.)

### Recorrido de las astillas y del licor

```
silo de astillas (vaporización) → medidor de astillas → tubo de astillas → bombas de astillas
 → IMPREGNADOR (cocorriente, 110–120 °C, ≈ 50 min)
 → línea de transferencia (licor calentado a 130–140 °C, primera adición de licor blanco)
 → DIGESTOR
     tope: separador (devuelve el licor de transferencia al impregnador) y extracción superior
     circulación de cocción superior (calentador, licor blanco, filtrado)
     zona de cocción superior, cocorriente (≈ 148 °C)
     mallas de extracción principal (sacan licor desde arriba y desde abajo)
     circulación de cocción inferior (calentador, licor blanco, filtrado)
     zona de cocción inferior, cocorriente (≈ 152 °C)
     mallas de extracción final
     zona de lavado en contracorriente (filtrado frío desde el fondo)
     raspador, dilución, soplado (< 90 °C)
 → estanque de soplado
licor extraído → ciclones flash → evaporadores
```

## 2.4 Cálculos de diseño paso a paso

Datos de partida (sección 7 de la especificación): producción 3 000 ADt/d,
rendimiento 53,5 %, carga de álcali efectivo 18 % sobre madera repartida
50/10/20/20 entre alimentación, transferencia, circulación superior e
inferior, relación licor/madera 4 m³/t en la impregnación, tiempos de
impregnación 45–60 min y de cocción 180–240 min, factor de dilución
2,0–2,5 m³/ADt.

### Paso 1 — Madera necesaria

$$\dot m_{madera} = \frac{P \cdot 0{,}9}{Y} = \frac{3000 \times 0{,}9}{0{,}535} = 5\,047\ \mathrm{t/d} = 58{,}4\ \mathrm{kg/s}\ \text{(seca)}$$

con P la producción en ADt/d e Y el rendimiento. En volumen de madera sólida:
5 047 / 0,48 = 10 514 m³/d, dato útil para el patio de maderas.

### Paso 2 — Licor blanco

Álcali necesario: 0,18 × 58,4 = 10,51 kg NaOH/s = 262,9 mol/s.
Con [OH⁻] = 2,94 mol/L = 2 940 mol/m³:

$$Q_{LB} = \frac{262{,}9}{2\,940} = 0{,}0895\ \mathrm{m^3/s} = 322\ \mathrm{m^3/h}$$

Repartido: alimentación 161 m³/h, transferencia 32 m³/h, circulación
superior 64 m³/h, inferior 64 m³/h.

> Nota (Fase 1c): las astillas salen del silo a 100 °C con ≈ 0,19 kg de
> condensado por kg de madera (capítulo 5.5), y el licor negro caliente de
> la impregnación sale de la extracción principal del digestor. Los números
> de este capítulo usan los valores de diseño de la Fase 1a; el simulador
> da valores levemente distintos.

### Paso 3 — Relación licor/madera en la impregnación

La relación licor/madera (L/W) cuenta todo el líquido que acompaña a la
madera al entrar al impregnador, incluida su humedad:

$$L/W = \frac{Q_{LB,alim} + Q_{licor\ negro} + Q_{circ.\ tope} + Q_{humedad}}{\dot m_{madera}}$$

Humedad: 58,4 × 0,905 = 52,9 kg/s ≈ 0,0529 m³/s = 190 m³/h. Para
L/W = 4,0 m³/t se necesitan 4,0 × 58,4 × 3,6 = 841 m³/h en total, es decir
841 − 190 − 161 = **490 m³/h** entre la circulación de tope y el licor negro
caliente. El caso base usa 230 m³/h de circulación de tope y 260 m³/h de
licor negro a 150 °C. La proporción entre ambos fija la temperatura de
impregnación (113 °C en el caso base).

### Paso 4 — Volumen de los vasos a partir de los tiempos

Las astillas no llenan el vaso: entre ellas hay licor. Si s es la fracción
del volumen del vaso ocupada por astillas (incluidos sus poros), la masa de
madera seca por m³ de vaso es

$$\rho_{col} = s \cdot \rho_{básica} = 0{,}40 \times 480 = 192\ \mathrm{kg/m^3}$$

(s = 0,40 es un supuesto; en la realidad la columna se compacta al
cocinarse y s crece hacia abajo; se modela en la Fase 1c).

El caudal volumétrico de columna es 58,4 / 192 = 0,304 m³/s. El volumen de
columna necesario para un tiempo de residencia τ es V = 0,304 · τ:

| Vaso | τ objetivo | Volumen de columna | Dimensiones elegidas |
|------|-----------|-------------------|----------------------|
| Impregnador | 52 min | 950 m³ | Ø 7,5 m; columna de 21,5 m en un vaso de 23 m |
| Digestor | 3,55 h | 3 890 m³ | Ø 9 m × 30 m + Ø 10 m × 27 m; columna de 54,9 m |

Verificación (impregnador): área = π·7,5²/4 = 44,2 m²; velocidad de columna
= 0,304/44,2 = 6,9 mm/s = 24,8 m/h; 21,5 m / 24,8 m/h = **52 min**.

Residencia total: 52 min + 30 s de transferencia + 3,55 h = **4,42 h**, dentro
del rango de 4 a 6 h. Es exactamente lo que mide el simulador (edad media de
las astillas en el soplado).

> **Observación.** En la Fase 0 se propuso un digestor de ≈ 7 000 m³. Con
> s = 0,40 eso daba más de 6 h de residencia. Es un buen ejemplo de por qué el
> dimensionamiento debe hacerse con la densidad de la columna y no con la del
> licor o la de la madera sola.

### Paso 5 — Velocidad de la columna y tiempos por zona

En el digestor la velocidad es 0,304/63,6 = 4,8 mm/s (17,2 m/h) en la parte de
Ø 9 m y 0,304/78,5 = 3,9 mm/s (13,9 m/h) en la de Ø 10 m. Con las alturas de
`config/topologia.json`, los tiempos aproximados son:

| Zona | Alturas (desde el tope) | Tiempo |
|------|-------------------------|--------|
| Tope y calentamiento | 2–9 m | ≈ 25 min |
| Cocción superior | 9–27 m | ≈ 60 min |
| Cocción inferior | 27–47 m | ≈ 80 min |
| Lavado en contracorriente | 47–57 m | ≈ 40 min |

### Paso 6 — Factor H

El factor H (Vroom, 1957) resume en un número el efecto combinado del tiempo
y la temperatura sobre la deslignificación:

$$H = \int k_{rel}(T)\,dt\ [\mathrm{h}], \qquad k_{rel} = \exp\left(43{,}2 - \frac{16\,115}{T}\right),\ T\ \text{en K}$$

k_rel vale ≈ 1 a 100 °C y se duplica cada ≈ 8 °C cerca de 150 °C:

| T (°C) | 113 | 128 | 140 | 148 | 150 | 152 |
|--------|-----|-----|-----|-----|-----|-----|
| k_rel | 4,3 | 21 | 66 | 137 | 167 | 198 |

Estimación del caso base: cocción superior 1,0 h × 137 ≈ 137; cocción
inferior (≈ 152–153 °C) 1,1 h × 210 ≈ 230; transiciones, tope y lavado ≈ 60;
impregnación ≈ 4. Total ≈ **430**. El simulador da <!-- generado:factor_h -->460<!-- /generado -->: la diferencia está sobre todo en los tiempos por zona, algo mayores en el simulador que en el paso 5.

Nota sobre el rango de la especificación: si los 180–240 min de cocción
fueran todos a 148–152 °C, H sería de 420 a 800. El rango 350–500 implica que
esos minutos incluyen el calentamiento y la zona de lavado (supuesto S-07).

### Paso 7 — Hidráulica del digestor

En un vaso hidráulico lleno, el licor que entra tiene que salir. El caudal de
licor libre que cruza cada sección horizontal (positivo hacia abajo) se
obtiene sumando desde el tope todo lo que entra y restando todo lo que sale.
El caso base da (tabla generada desde el simulador con `npm run tablas-manual`):

<!-- generado:hidraulica -->
| Tramo (m desde el tope) | Caudal de licor libre (m³/h) | Sentido |
|------------------------|-----------------------|---------|
| Entrada por el tope (transferencia) | +1 080 m³/h | ↓ |
| Bajo el separador (sale el retorno, 900 m³/h) | +180 | ↓ |
| Bajo la extracción superior (sale 72) | +108 | ↓ |
| Cocción superior (entran 64 de licor blanco y 144 de filtrado por la circulación: +316) | +308 → +286 | ↓ cocorriente |
| Entre las mallas de extracción principal y la circulación inferior (sube licor hacia las mallas) | −76 | ↑ |
| Cocción inferior (entran 64 de licor blanco y 180 de filtrado: +168) | +165 → +150 | ↓ cocorriente |
| Zona de lavado (sube el filtrado del fondo) | −640 | ↑ contracorriente |
<!-- /generado -->

Dentro de cada zona de cocción el caudal disminuye hacia abajo (compare lo
que entra con el caudal al final del tramo):
la madera que se disuelve deja poros que se llenan con licor, y ese licor
deja de ser libre (penetración en las astillas).

Dos rasgos del Lo-Solids aparecen solos en el balance: la extracción
principal aspira licor **desde arriba y desde abajo**, y la zona de lavado
trabaja en **contracorriente**. Observe que nada de esto se impone en el
modelo: sale de dónde entra y sale cada corriente.

### Paso 8 — Factor de dilución

$$FD = \frac{Q_{filtrado\ al\ fondo} - Q_{licor\ con\ la\ pulpa}}{P}\quad [\mathrm{m^3/ADt}]$$

Es el licor de lavado "neto" que se usa por tonelada: lo que entra al fondo
menos lo que se va con la pulpa en el soplado (licor libre más el retenido
en las fibras). Un FD mayor lava mejor pero diluye el licor que va a
evaporadores. El caso base apunta a 2,0–2,5 m³/ADt.

**Ejemplo 2.3.** En el caso base entran al fondo 1 180 m³/h de filtrado más
180 m³/h de dilución (0,378 m³/s), y salen con la pulpa ≈ 0,30 m³/s de licor
(libre + retenido en las fibras cocidas). Con 3 000 ADt/d = 0,0347 ADt/s:
FD = (0,378 − 0,301)/0,0347 ≈ **2,2 m³/ADt**.

**Atención:** si se sube el filtrado del fondo, hay que subir en la misma
cantidad la extracción final. Si no, el filtrado extra no tiene salida abajo:
sube por la columna hasta las mallas de extracción principal, que lo sacan
(PIC-301 mantiene la presión). La cocción inferior sigue en cocorriente y
no se enfría, pero el caudal que baja por ella se reduce a la mitad, y con
él la parte del licor blanco de la circulación inferior que acompaña a las
astillas: el álcali de la zona baja y el kappa sube (tabla en la sección
4.10). Por eso el caso base usa <!-- generado:fil_fondo -->1 180<!-- /generado --> m³/h de
filtrado y <!-- generado:ext_final -->790<!-- /generado --> m³/h de extracción final.

### Paso 9 — Energía

Se calienta la madera, su humedad y todo el licor que entra frío (licor
blanco a 90 °C, filtrados a 75 °C) hasta la temperatura de cocción. En el
caso base los calentadores entregan ≈ 12 MW (transferencia), ≈ 26 MW
(circulación superior) y ≈ 22 MW (inferior): ≈ 60 MW, o sea
60 000 kW × 86 400 s / 3 000 ADt ≈ **1,7 GJ/ADt**. Parte de ese calor se
recupera luego en los ciclones flash (Fase 1c).

**Ejemplo 2.2 — calor mínimo para la madera.** Llevar de 95 a 150 °C la
madera (cp 1,4 kJ/kg·K) y su humedad (0,0529 m³/s, que el modelo trata como
licor con ρ·cp = 3 990 kJ/m³·K):

$$(58{,}4 \times 1{,}4 + 0{,}0529 \times 3\,990) \times 55 = (82 + 211) \times 55 \approx 16\,100\ \mathrm{kW}$$

Unos 16 MW. El resto se va en calentar el licor blanco y los filtrados que
se agregan y en compensar el enfriamiento del filtrado de lavado que sube
desde el fondo.

## 2.5 Calidad de la pulpa

| Indicador | Qué mide | Caso base |
|-----------|----------|-----------|
| Número kappa | Lignina residual (más los ácidos hexenurónicos) | 17 ± 1 |
| Rendimiento | Pulpa / madera seca | 53–54 % |
| Viscosidad intrínseca | Largo de las cadenas de celulosa (resistencia) | 1 100–1 200 mL/g |
| Rechazos | Astillas mal cocidas | < 0,5 % |
| Álcali residual | Álcali que queda en el licor | 6–10 g/L extracciones, 4–7 g/L soplado |

Cómo los calcula el modelo se ve en el capítulo 4.

## 2.6 Ejercicios

1. Si la producción sube a 3 300 ADt/d sin cambiar los vasos, ¿cuál es el
   nuevo tiempo de residencia total? ¿Qué temperatura de cocción haría
   falta para mantener H = 430? (Pista: H ∝ τ · k_rel(T).)
2. Con humedad 52 % en vez de 47,5 %, ¿cuánta agua extra entra por hora? ¿Qué
   le pasa a la relación L/W si no se cambia ningún caudal?
3. Calcule el caudal de licor blanco si la carga baja a 17 % y el EA del
   licor blanco cae a 110 g/L.
4. ¿Por qué la residencia del impregnador no depende del caudal de licor,
   sino solo del de madera? (Pista: flujo pistón de la columna.)
