# MODELO DE PROCESO — Digestor continuo Lo-Solids, eucalipto

Versión: Fase 1b (transporte, hidráulica, energía y cinética de cocción
calibrada). La sección 17 resume qué está implementado. Explicación
didáctica en `docs/manual/`.
Este documento se actualiza en cada cambio del modelo. Cada parámetro
mencionado vive en `config/*.json` con su unidad y su origen
(`literatura`, `calibrado`, `supuesto`, `especificacion`, `planta`). Los
valores numéricos que aparecen aquí son **orientativos** para dimensionar y
probar; los que valen son los de configuración.

Convenciones internas (`src/sim/unidades.js`): s, m, m³, m³/s, kg, kg/s, kJ,
kW. Temperaturas internas en **°C** (se pasan a K solo dentro de las
expresiones de Arrhenius y del factor H). Concentraciones en licor: mol/L
para OH⁻ y HS⁻, g/L (= kg/m³) para sólidos. La configuración puede usar
unidades de planta (m³/h, g/L como NaOH o Na₂O, %, MW…); el cargador las
convierte. Masas de madera en base seca (bs). "Sobre madera" significa sobre
madera seca alimentada. ADt = tonelada secada al aire (90 % sequedad).

---

## 1. Visión general

```
silo (vaporización) → medidor → tubo de astillas → bombas de astillas
   → [IMPREGNADOR: separador, impregnación cocorriente, raspador]
   → línea de transferencia (calentadores, LB) → [DIGESTOR:
        separador superior + extracción superior
        circulación de cocción superior (calentador, LB, filtrado)
        zona de cocción superior (cocorriente)
        mallas de extracción inferior (principal)
        circulación de cocción inferior (calentador, LB, filtrado)
        zona de cocción inferior (cocorriente)
        mallas de extracción final / circulación de lavado
        zona de lavado y enfriamiento en contracorriente (filtrado frío)
        raspador, dilución, válvula de soplado ]
   → estanque de soplado
extracciones → ciclón flash 1 → ciclón flash 2 → filtro de fibras → evaporadores
vapor flash → silo de astillas
```

La topología (vasos, zonas, sentidos de flujo, número de extracciones,
puntos de adición) se lee de `config/topologia.json`. El código no supone
nombres de zonas: recorre la lista de zonas y puntos definidos ahí.

---

## 2. Discretización

El modelo combina dos representaciones:

- **Licor libre: celdas fijas (eulerianas)** a lo alto de cada vaso. Cada
  celda tiene su volumen de licor libre, temperatura y concentraciones.
- **Astillas: parcelas que se mueven (lagrangianas).** La columna es una
  pila de parcelas; cada parcela lleva su madera, su licor retenido, su
  temperatura, su factor H y su edad. Al retirar astillas por el fondo, toda
  la pila baja. Esto da flujo pistón exacto (el escalón de una perturbación
  llega al soplado sin "suavizarse" por error numérico), maneja de forma
  natural el nivel de la columna, los vasos parcialmente llenos y la columna
  detenida (la parcela sigue cocinándose donde está).

En la Fase 0 se había propuesto un esquema euleriano TVD para las astillas;
se reemplazó por las parcelas porque elimina la dispersión numérica del
tiempo muerto, que es central para el juego.

### 2.1 Celdas
- Impregnador: `N_imp ≥ 20` celdas; digestor: `N_dig ≥ 60` celdas
  (configurables). Altura `Δz` igual en todas; área `A_j` integrada de los
  tramos del vaso (permite vasos escalonados o cónicos), `V_j = A_j Δz`.
- Cada malla, separador, punto de adición y boquilla se asigna a la celda que
  contiene su altura (`z` desde el tope, en `config/topologia.json`).
- Tuberías con volumen retenido (transferencia, retornos de circulación):
  cola de paquetes con flujo pistón exacto, retardo `τ = V_tubo / Q`. Su
  contenido forma parte del inventario.

### 2.2 Parcelas de astillas
- Tamaño: la masa objetivo de una parcela es la masa de astillas de una
  celda dividida por `parcelas_por_celda` (3 por defecto). Las astillas que
  entran por el tope se funden con la parcela superior mientras esta no
  alcance la masa objetivo; luego se abre una nueva.
- Cada parcela ocupa un volumen de vaso `vol / s_col`, donde `vol` es el
  volumen de astilla (con poros) y `s_col` la fracción del vaso ocupada por
  astillas (`hidraulica.fraccion_astillas_columna`; constante en la Fase 1a,
  variable con la compactación en la Fase 1c).
- Las parcelas se apilan desde el fondo; la fracción de cada parcela que cae
  en cada celda (`f_ij`) se calcula en cada paso. El nivel de astillas es la
  altura del tope de la pila.

Fases líquidas:
1. **Licor retenido** (dentro de la parcela): llena los poros de la astilla.
   Volumen de poros `V_p = m · (1/ρ_básica − 1/ρ_pared)` (ρ_pared, S-11).
   Al entrar, los poros tienen el agua de la humedad de la astilla y aire.
2. **Licor libre** (en la celda): `V_f,j ≤ V_j − Σ_i f_ij · vol_i`.

Temperatura: cada celda tiene la temperatura de su licor libre y cada parcela
la suya; se acercan con una transferencia de calor rápida (constante de
tiempo ≈ 11 s para 4 mm, `hidraulica.k_calor`), de modo que en la práctica
se cumple el supuesto S-03 sin imponerlo.

### 2.3 Estado (completo, incluye lo de las Fases 1b y 1c)

Por parcela (sólido y licor retenido) y por celda (licor libre). En la
Fase 1a están implementados: masa, volumen, poros, licor retenido, T,
especies del licor, H, edad y marca (trazador del sólido).

| Símbolo | Descripción | Unidad |
|---------|-------------|--------|
| L_f, L_p, L_r | Lignina rápida (inicial), principal, residual | kg |
| C_a, C_b | Celulosa accesible a peeling / celulosa estable | kg |
| X_a, X_b | Xilano reactivo / xilano estable | kg |
| G_a, G_b | Otros carbohidratos (glucomanano, etc.) reactivos / estables | kg |
| E | Extraíbles | kg |
| Ac | Grupos acetilo | mol |
| M | Ácido 4-O-metilglucurónico en xilano | mol |
| HexA | Ácidos hexenurónicos en xilano | mol |
| ν | 1/DP de la celulosa (escisiones por unidad) | — |
| φ_k | Fracción no impregnada de la clase de tamaño k | — |
| H | Factor H acumulado (promedio por masa) | h |
| θ | Edad (tiempo de residencia acumulado, promedio por masa) | s |
| R_rep | Lignina reprecipitada (contabilizada aparte para blanqueabilidad) | kg |
| para cada licor (r, f): [OH⁻], [HS⁻] | Iones activos | mol/L |
| para cada licor: LD, XD, CD, OD | Lignina, xilano, otros carbohidratos/ácidos y extraíbles disueltos | kg/m³ |
| para cada licor: SI | Sólidos inorgánicos inertes (Na₂CO₃, Na₂SO₄, NaCl…) | kg/m³ |
| para cada licor: TR | Trazador (pruebas y didáctica) | g/L |
| T | Temperatura | °C |
| ε, σ | Fracción de líquido de la columna; esfuerzo efectivo sobre la columna | —, Pa |

Clases de tamaño k: sobre espesor, aceptadas, palillos, finos (cada una con
fracción másica w_k y espesor medio δ_k). La química del sólido es común a
todas las clases (supuesto S-05); solo la impregnación se sigue por clase.

Sólidos disueltos totales: `DS = LD + XD + CD + OD + SI + aporte de los
iones activos (Na⁺, OH⁻, HS⁻)`.

---

## 3. Materia prima (`config/madera.json`)

Una sola especie: **Eucalyptus nitens**. No hay mezcla de especies ni
parámetros de otras maderas. Todas las propiedades están en
`config/madera.json` y son configurables: densidad básica, lignina total
(y su reparto inicial en f/p/r), glucano, xilano, otros carbohidratos,
extraíbles, acetilos, MeGlcA y un **factor de reactividad** (1 por
defecto) que multiplica las velocidades de deslignificación. Este factor
permite representar lotes de nitens que cuecen más fácil o más difícil
(edad, procedencia) sin tocar la cinética.

Valores provisionales (orden de magnitud; **todos `supuesto` hasta que los
confirmes, pregunta P10**):

| Propiedad (E. nitens) | Valor provisional |
|-----------------------|-------------------|
| Densidad básica (kg/m³) | 480 |
| Lignina total (% bs) | 25 |
| Glucano (% bs) | 46 |
| Xilano (% bs) | 15 |
| Otros carbohidratos (% bs) | 4 |
| Extraíbles (% bs) | 3 |
| Reactividad relativa | 1,00 |

Variables en el tiempo (perturbables): propiedades del lote (densidad,
lignina, reactividad: "cambio de campaña de madera"), humedad (base
húmeda), densidad aparente en el medidor, distribución de tamaños,
contenido de corteza (aporta lignina y extraíbles extra, más finos y
consumo de álcali), envejecimiento (menos extraíbles, más consumo inicial).

**Medidor de astillas:** caudal de madera seca
`ṁ_w = n · V_rev · η_llenado · ρ_aparente · (1 − humedad)` donde ρ_aparente
es la densidad aparente húmeda. Un cambio de densidad o humedad cambia la
producción si no se corrige la velocidad (esto es intencional: es lo que
pasa en planta).

---

## 4. Licores (`config/licores.json`)

Química del licor blanco (base NaOH, en mol/L):

- Na₂S en solución: Na₂S + H₂O → NaOH + NaHS, por lo que
  [OH⁻] = NaOH + Na₂S y [HS⁻] = Na₂S (moles).
- Álcali efectivo EA = NaOH + ½ Na₂S (como NaOH) ⇒ **EA (mol/L) = [OH⁻]**.
- Álcali activo AA = NaOH + Na₂S (como NaOH) = [OH⁻] + [HS⁻].
- Sulfidez S = Na₂S / AA (ambos como NaOH) = 2[HS⁻] / ([OH⁻] + [HS⁻]).
- Conversión a g/L: como NaOH ×40,00; como Na₂O ×31,00 (unidad
  seleccionable en la interfaz, sección 6.4 de la especificación).
- Eficiencia de caustificación define el Na₂CO₃ (inerte) del licor blanco.

Dado EA y S en el licor blanco: [OH⁻] = EA/40;
[HS⁻] = [OH⁻]·S/(2 − S) (con S como fracción y EA en g/L NaOH).

El álcali residual que se informa como "g/L" es EA titulable ≈ 40·[OH⁻]
(supuesto S-14: se ignora el aporte de ácidos débiles a la titulación).

**Filtrado de lavado:** temperatura, [OH⁻], [HS⁻], DS orgánicos e
inorgánicos (perturbables: más caliente, más sucio).

**Reparto del licor blanco** entre alimentación, transferencia,
circulación superior e inferior: fracciones que suman 1 (lazo de reparto).

---

## 5. Transporte e hidráulica dentro de los vasos

### 5.1 Astillas (flujo pistón)
Cada paso lento (`src/sim/columna.js`):
1. Se retira por el fondo la masa `ṁ_salida · dt` (raspador del impregnador
   o soplado del digestor); la parcela del fondo se divide si hace falta.
2. Se agregan por el tope las astillas que llegan (medidor de astillas o
   línea de transferencia).
3. Se recalcula la ubicación de la pila: la parcela i ocupa el intervalo de
   volumen de vaso `[V_bajo,i , V_bajo,i + vol_i/s_col]` medido desde el fondo,
   que se reparte entre las celdas (fracciones `f_ij`).

La velocidad de la columna en cada celda resulta de esto:
`v_j = ṁ_salida / (ρ_col · A_j)` con `ρ_col = s_col · ρ_básica`. Si no se
retira nada, la columna queda detenida y las parcelas siguen acumulando
factor H (y, desde la Fase 1b, cocinándose).

### 5.2 Licor libre (balance hidráulico)
`src/sim/hidraulica.js`. En cada paso, con la capacidad de licor libre de
cada celda `cap_j = V_j − Σ_i f_ij vol_i`:

1. Volumen total nuevo = anterior + adiciones − extracciones − penetración −
   salida de fondo. Si se pide sacar más de lo que hay, se reducen las
   salidas en proporción.
2. Si supera la capacidad total, el vaso está **lleno** y el exceso sale por
   la **corriente de cierre** del vaso (`corriente_cierre` en la topología:
   el separador del impregnador y la extracción principal del digestor). En
   la Fase 1c esto se reemplaza por el balance de presión (sección 8): el
   exceso eleva la presión y los lazos actúan sobre las válvulas. Sin
   corriente de cierre, el exceso sale como rebalse por el tope.
3. Si no está lleno, el licor ocupa las celdas desde el fondo; lo que entra
   en celdas secas cae a la superficie del licor.
4. Caudal por cara, integrado desde el tope (positivo hacia abajo):

```
F_{j+½} = F_{j−½} + adiciones_j − extracciones_j − penetración_j − (V_f,j,nuevo − V_f,j,ant)/dt
```

con `F_tope = 0` y `F_fondo` = salida de fondo. El signo define el sentido
del flujo: en el caso base el filtrado del fondo sube hacia las mallas de
extracción final (contracorriente), y la extracción principal aspira licor
desde arriba y desde abajo (efecto Lo-Solids), sin que el modelo lo imponga.

Los escalares del licor libre (T y concentraciones) se transportan con un
esquema contra la corriente **implícito** (`src/sim/transporte.js`):
conservativo, sin valores negativos y estable con cualquier paso y con
celdas casi vacías. Lo que sale por extracciones, penetración, cierre y
fondo sale con la concentración nueva de su celda, así que el balance cierra
exactamente. La dispersión numérica de primer orden en el licor representa
en parte la dispersión real por canalización (limitación L-09).

**Canalización** (perturbación, Fase 5): una fracción β_can del caudal de
licor en una zona pasa sin contacto con la columna; reduce el intercambio
libre ↔ retenido y la eficiencia de lavado.

### 5.3 Penetración y difusión libre ↔ retenido

**Penetración** (llenado de los poros con licor): la parte de cada parcela
que está en una celda con licor toma licor libre a razón de

```
dV_r/dt = k_pen(T) · (V_p − V_r),    k_pen = k_ref · exp(−E/R · (1/T − 1/T_ref))
```

En la Fase 1b se agregan la calidad de vaporización, el álcali y el espesor
por clase de tamaño (sección 6.9).

**Difusión** de cada especie (OH⁻, HS⁻, LD, XD, CD, OD, SI, TR):

```
dc_r/dt = k_D · (c_f − c_r)
k_D = 3 · D_eff / L²          L = espesor/2 (lámina, fuerza impulsora lineal de Glueckauf)
D_eff = D_ref · exp(−E_D/R · (1/T − 1/T_ref)) · ECCSA([OH⁻]_r) · factor_especie
ECCSA = e_min + (e_max − e_min) · [OH⁻]/([OH⁻] + K_e)
```

**Calor**: `dT_astilla/dt = k_calor · (T_licor − T_astilla)`.

Las tres transferencias se integran **implícitamente**, acoplando el licor
libre de cada celda con todas las porciones de parcela que hay en ella
(solución cerrada en `src/sim/intercambio.js`; versión optimizada en
`vaso.js`). Conserva exactamente Σ C·x y es estable con cualquier paso.
Sin perfil de concentración dentro de la astilla (limitación L-02). La
dependencia de ECCSA con la alcalinidad sigue la estructura descrita por
Stone (1957); todos los parámetros son `supuesto`.

---

## 6. Cinética (`config/cinetica.json`)

### 6.1 Forma general
Todas las constantes se escriben respecto a una temperatura de referencia
T_ref (por defecto 443,15 K = 170 °C) para que la calibración esté bien
condicionada:

```
k_i(T) = A_i · ρ_esp · exp(−E_i/R · (1/T − 1/T_ref))
```

A_i (preexponencial a T_ref) se **calibra**; E_i y los órdenes de reacción
son `supuesto` para eucalipto mientras no haya datos propios (ver 6.3).
ρ_esp es el factor de reactividad del lote de nitens (solo
deslignificación).

Las reacciones usan las concentraciones del **licor retenido** (dentro de
la astilla) y solo ocurren en la fracción impregnada (1 − φ̄), salvo una
fracción residual ψ en lo no impregnado (supuesto S-08).

Integración: para cada paso lento se usa la solución exponencial exacta de
las reacciones de primer orden con las concentraciones congeladas al
inicio del paso; el consumo de álcali se limita para que [OH⁻] no quede
negativo (con reparto proporcional entre reacciones si hay limitación).

### 6.2 Factor H (Vroom)

```
k_rel(T) = exp(43,2 − 16115 / T)          T en K
H(t) = ∫ k_rel(T) dt                       t en horas
```

Velocidades relativas de referencia que usarán las pruebas (calculadas con
la fórmula): 100 °C → 1,014; 120 °C → 9,12; 140 °C → 66,3; 148 °C → 139;
150 °C → 166,8; 152 °C → 199; 160 °C → 401,7.

El factor H se acumula en cada celda (por masa de astilla) y se muestra:
H en el soplado, H en cada zona, H "calculado" que verá el control
avanzado.

### 6.3 Deslignificación (tres fracciones en paralelo)

Estructura de tres fases (inicial, principal, residual) tipo Gustafson,
escrita como fracciones en paralelo (tipo Purdue): las tres fracciones
reaccionan simultáneamente y la "fase" que domina en cada momento emerge de
sus velocidades. Solo se toma la **forma** de las ecuaciones; ningún
parámetro proviene de modelos para otras maderas.

```
r_f = k_f(T) · [OH]^a_f · L_f                                  (inicial)
r_p = ( k_p1(T) · [OH]^a_p1 + k_p2(T) · [OH]^a_p2 · [HS]^b_p2 ) · L_p · f_DS
r_r = k_r(T) · [OH]^a_r · L_r · f_DS                           (residual)

r_cond = k_c(T) · g(OH) · L_p        (principal → residual, a bajo álcali)
g(OH)  = 1 / (1 + ([OH]/OH_c)^n_c)

r_rep  = k_rep · max(0, OH_rep − [OH]) · LD_r · V_r  (reprecipitación de la lignina disuelta en el licor retenido)

dL_f/dt = −r_f
dL_p/dt = −r_p − r_cond
dL_r/dt = −r_r + r_cond + r_rep
dR_rep/dt = r_rep          (marcador para blanqueabilidad y color)
lignina disuelta al licor retenido: + (r_f + r_p + r_r − r_rep)
```

- `f_DS = 1 / (1 + κ_DS · DS_org,r)`: freno leve por sólidos disueltos
  orgánicos (efecto Lo-Solids, supuesto).
- La dependencia de la lignina residual con el álcali proviene de
  `r_cond` (más condensación cuanto menos álcali) y de `r_rep`.

**Parámetros para eucalipto.** Energías de activación y órdenes de
reacción quedan en configuración como `supuesto` hasta contar con datos de
eucalipto (pregunta P19). La calibración a un solo estado estacionario
ajusta los preexponenciales, pero no puede identificar las energías de
activación (limitación L-04); por eso conviene calibrarlas con datos de
planta o de laboratorio de nitens a dos o más temperaturas. Mientras
tanto, la rutina de calibración verifica que con las E elegidas el modelo
reproduzca el caso base **y** tenga sensibilidad a la temperatura
coherente con el factor H (Vroom usa ≈ 134 kJ/mol, que se usa como
referencia de orden para la fase principal).

| Fase | E (kJ/mol) | Órdenes | Origen |
|------|-----------|---------|--------|
| Inicial | 50 | a_f = 0 | supuesto |
| Principal, término OH | 130 | a_p1 = 1 | supuesto |
| Principal, término OH·HS | 120 | a_p2 = 0,5; b_p2 = 0,4 | supuesto |
| Residual | 117 | a_r = 0,7 | supuesto |

(Valores vigentes en `config/cinetica.json`; las A de cada fase están
calibradas, ver `docs/CALIBRACION.md`.)

Reparto inicial de la lignina (supuesto, eucalipto): rápida ≈ 20 %,
principal ≈ 72 %, residual ≈ 8 %. El menor requerimiento de factor H del
eucalipto en la fase principal (especificación 6.2) lo produce la
calibración de A_p1, A_p2 al caso base (kappa 17 con H en 350–500).

### 6.4 Carbohidratos

Para cada polímero P ∈ {C, X, G} con fracción reactiva P_a y estable P_b:

```
peeling:      r_pe,P = k_pe,P(T) · [OH] · P_a        (se agota con P_a; incluye detención)
hidrólisis:   r_h,P  = k_h,P(T)  · [OH] · P_b        (alcalina, alta E)
dP_a/dt = −r_pe,P ;  dP_b/dt = −r_h,P  (+ redepósito en X_b)
```

Xilano: además de peeling e hidrólisis, **disolución** de xilano
(ramificado) a alto álcali: `r_dx = k_dx(T) · [OH]^a_dx · X_a`.

**Redepósito de xilano** (interruptor `redeposito_xilano`): cuando el
álcali baja al final de la cocción,

```
r_red = k_red · max(0, OH_red − [OH_r]) · XD_r · V_r   → suma a X_b  (desde el licor retenido)
```

El xilano redepositado trae HexA en la proporción HexA/X del xilano que
queda en la fibra (supuesto S-09; el HexA disuelto no se sigue).

Rendimiento: `Y = (Σ lignina + Σ carbohidratos + E_restante) / madera
alimentada`, calculado en el soplado.

### 6.5 Ácidos hexenurónicos (HexA)

```
r_form = k_HF(T) · [OH]^a_HF · M          (MeGlcA → HexA)
r_deg  = k_HD(T) · [OH]^a_HD · HexA       (a_HD pequeño: degradación sobre todo térmica)
dM/dt    = −r_form − (M/X)    · r_Xdisuelto
dHexA/dt = +r_form − r_deg − (HexA/X) · r_Xdisuelto + aporte por redepósito
```

### 6.6 Kappa

```
kappa_lignina = (lignina en pulpa, % sobre pulpa) / c_κ
kappa_HexA    = (HexA, mmol/kg pulpa) / 11,6
kappa         = kappa_lignina + kappa_HexA
```

- c_κ: % de lignina en pulpa por unidad de kappa de lignina, para
  eucalipto (provisional 0,13, `supuesto`). Si tienes tu correlación de
  planta, se usa esa.
- 11,6 mmol/kg por punto de kappa: dato de la especificación (`literatura`).
- La lignina reprecipitada cuenta como lignina en el kappa.

### 6.7 Viscosidad (enfoque de factor G, Kubes)

```
dν/dt = k_v(T) · [OH]^a_v · (1 + β_DS · DS_org,r)        ν = 1/DP escisiones
E_v ≈ 179 kJ/mol (a verificar con Kubes et al., 1983)
DP(t) = 1 / (1/DP_0 + ν(t))
[η] (mL/g) = DP^0,905 / 0,75        (relación SCAN-CM 15, a verificar)
```

Para [η] = 1 150 mL/g, DP ≈ 1 750. El término (1 + β_DS·DS) representa el
daño adicional por sólidos disueltos (efecto Lo-Solids, supuesto). El
aporte de los hemicelulosas a la viscosidad medida se ignora
(limitación L-05).

### 6.8 Consumo de álcali

```
dOH_r (mol/s) = − r_ac                              desacetilación (1 mol OH/mol acetilo)
                − α_L · (r_f + r_p + r_r)          por kg de lignina disuelta
                − α_C · (Σ r_pe + Σ r_h + r_dx)    ácidos de los carbohidratos (incluye el xilano disuelto)
                − α_E · r_E                        neutralización de extraíbles
                − α_DS · k_DS(T) · [OH] · DS_org,r · V_r   reacciones de sólidos disueltos
r_ac = k_ac(T) · [OH] · Ac                          rápida, baja E (importante en eucalipto)

dHS_r (mol/s) = − β_L · (r_f + r_p + r_r) + β_lib · (liberación al final)
```

α_L, α_C, α_E, α_DS, β_L se **calibran** contra el álcali residual del caso
base (6–10 g/L en extracciones, 4–7 g/L en el soplado).

### 6.9 Impregnación y rechazos

```
dφ_k/dt = − k_imp(T) · S_vap · h(OH) · (δ_ref/δ_k)² · φ_k
h(OH) = [OH]/([OH] + K_OH)
S_vap = calidad de vaporización (0–1), propiedad del lote de astillas
        (en la Fase 1c se calcula con el modelo del silo: vapor/madera y tiempo)
```

- Lo no impregnado reacciona solo con la fracción ψ (S-08).
- **Rechazos** en el soplado: `R = Σ_k w_k · φ_k(T = T_inicio_cocción) · Y_núcleo`:
  lo que no estaba impregnado cuando la astilla llegó a 140 °C termina como
  astilla mal cocida (la impregnación química sigue después, pero la cocción
  de ese núcleo ya quedó atrasada). Con álcali bajo, h(OH) frena la
  impregnación y suben los rechazos.
- Sobre espesor y mala vaporización ⇒ más rechazos y más kappa.

### 6.10 Efecto Lo-Solids (resumen)
La concentración de sólidos orgánicos disueltos (DS_org) en las fases
principal y residual:
1. frena levemente la deslignificación (`f_DS`),
2. aumenta la escisión de celulosa (`β_DS`),
3. consume álcali (`α_DS`),
4. reduce el índice de blanqueabilidad (sección 6.11).

Las extracciones con reposición de licor blanco y filtrado mantienen
DS_org bajo. La prueba cualitativa compara el caso base con uno sin
extracción inferior ni filtrado.

### 6.11 Índices de calidad derivados (supuesto, cualitativos)
- **Blanqueabilidad** (0–1): baja con la lignina reprecipitada, con la
  integral de DS_org·t en la fase residual y con kappa_HexA alto.
- **Color de la pulpa** (blancura sin blanquear, %ISO): baja con
  reprecipitación y álcali residual bajo.
Sirven para puntaje y alarmas de calidad; no pretenden ser cuantitativos.

---

## 7. Energía (`config/energia.json`)

Entalpía con referencia 0 °C: licor `ρ·cp·V·T`, parcela
`(m·cp_madera + ρ·cp·V_r)·T`. El licor libre lleva la temperatura como un
escalar más del transporte; las parcelas, la suya (sección 5.3). Pérdidas al
ambiente por vaso, repartidas por volumen de celda:

```
dT_j/dt = −UA_j · (T_j − T_amb) / (ρ·cp·V_f,j)        (integración exacta)
```

- cp madera 1,4 kJ/kg·K; licor ρ = 1 050 kg/m³, cp = 3,8 kJ/kg·K,
  **constantes** en la Fase 1a (supuesto S-12; la dependencia con los
  sólidos disueltos queda para la Fase 1c). La humedad de las astillas se
  trata como licor con esas mismas propiedades (S-18).
- Calor de reacción despreciado (supuesto S-04; la cocción kraft es
  levemente exotérmica).
- Las circulaciones extraen licor de una malla, lo calientan y lo
  devuelven por el tubo central a la celda de retorno configurada.

**Calentadores indirectos (vapor MP).** En la Fase 1a se simplifican a
"llevar la corriente a `T_salida` con una potencia máxima `Q_max`"
(`config/energia.json`); la potencia entregada queda en la contabilidad de
energía. Modelo completo (Fase 1c):

```
Q = U·A · ΔT_ml(T_vap, T_in, T_out)
1/U = 1/U_limpio + R_inc(t)
dR_inc/dt = k_inc · exp(−E_inc/R·(1/T − 1/T_ref))    (CaCO₃; lavado ácido → R_inc = 0)
ṁ_vap = Cv · x_válvula · √(ρ · (P_cabezal − P_carcasa))
Q = ṁ_vap · h_fg(P_carcasa),   T_vap = T_sat(P_carcasa)
```

Se resuelve P_carcasa por bisección en cada paso rápido. Con incrustación,
la válvula se abre más para el mismo Q hasta saturar: es el síntoma de
pérdida de capacidad. Calentador de respaldo conmutables.

**Ciclones flash:**

```
fracción vaporizada = cp_l · (T_in − T_sat(P_flash)) / h_fg(P_flash)
```

El vapor del flash 1 va al silo de astillas; nivel y presión de cada
ciclón son estados dinámicos (balance de masa y de vapor).

**Silo de astillas:** temperatura de las astillas vaporizadas, consumo de
vapor flash + vapor fresco BP, calidad de vaporización `S_vap`.

Propiedades del agua/vapor (T_sat, P_sat, h_fg): correlaciones de
IAPWS-IF97 simplificadas (región de saturación).

---

## 8. Presión y elementos de seguridad

Cada vaso es un nodo de presión:

```
dP/dt = (Σ Q_entra − Σ Q_sale + Q_vap,súbita) / C_eff
C_eff = V_liq · (β_liq + β_vaso) + V_gas / (γ · P)
```

- β_liq ≈ 4,6·10⁻¹⁰ 1/Pa (agua); β_vaso por elasticidad del manto
  (supuesto). Con ≈ 4 000 m³ llenos, un desbalance de 0,01 m³/s sube la
  presión del orden de 0,02–0,04 bar/s: segundos a decenas de segundos,
  como pide la especificación.
- V_gas > 0 en los estados de llenado y en la opción "fase vapor" (donde la
  presión del tope la fija el vapor directo). La misma ecuación cubre vaso
  parcialmente lleno y lleno.
- Todos los caudales dependen de la presión (válvulas
  `Q = Cv·f(x)·√(ΔP/ρ)`, bombas con curva), por lo que la presión se
  integra con Euler implícito (una iteración de Newton) en el paso rápido.
- **Vaporización súbita:** si `P < P_sat(T_máx de las celdas superiores) +
  margen`, se genera vapor `Q_vap = k_flash · (P_sat − P)`, que empuja la
  presión hacia arriba con golpe y se registra como incidente.
- **Válvula de alivio** (proporcional sobre su ajuste) y **válvula de
  seguridad** (apertura total con histéresis). Cada apertura queda en el
  registro de incidentes.

---

## 9. Columna de astillas

- **Nivel de astillas:** altura del tope de la columna (masa de astillas
  en el vaso / ρ_col / A). Medido por un transmisor con su ruido.
- **Compactación:** `ρ_col = ρ_col,0 · (1 + c_σ · σ) · (1 + c_κ · (κ_0 −
  kappa_local)/κ_0)` (más compactación cuanto más cocida la astilla).
- **Esfuerzo efectivo** (tipo Janssen, 1D):
  `dσ/dz = (1−ε)(ρ_s − ρ_l)·g − f_arrastre(F/A − v) − (4 μ_p K / D)·σ`
  (arrastre del licor: hacia abajo en cocorriente, hacia arriba en
  contracorriente; fricción con la pared).
- **Movimiento:** si la fuerza neta disponible en una sección no supera la
  fricción (μ_p alto por perturbación, astillas pegadas), la columna sobre
  ese punto se detiene (**colgamiento**): sube el nivel medido, cae la
  consistencia de soplado, baja el torque del raspador; al soltarse cae de
  golpe.
- **Raspadores:** torque ∝ σ en el fondo · área · μ; corriente del motor
  proporcional; enclavamiento por alta corriente.
- **Consistencia de soplado:** masa de pulpa / (pulpa + licor) en la salida;
  se controla con la dilución del fondo.

Esta parte es la más simplificada y sus parámetros son `supuesto`, ajustados
para que los síntomas sean creíbles (limitación L-07).

---

## 10. Mallas

Para cada juego de mallas (filas alternadas):

```
ΔP_m = Q_m · (R_0 + R_finos + R_inc) / A_abierta
dR_finos/dt = k_f · c_finos · Q_m / A − k_retro · R_finos · [retrolavado]
              − k_conm · R_finos · [conmutación]
dR_inc/dt   = k_inc,m(T)                     (CaCO₃, solo se limpia con lavado ácido)
```

El caudal máximo de extracción queda limitado por la presión disponible
(vaso − ciclón flash − pérdidas); con mallas tapadas la válvula satura y
el balance del digestor cambia.

---

## 11. Alimentación (línea de astillas)

- Silo: inventario (masa), nivel, vaporización (sección 7).
- Medidor: caudal (sección 3).
- Tubo de astillas: nivel de licor con balance de volumen.
- Bombas de astillas en serie: caudal de lechada; si una se detiene, cae la
  alimentación y la presión de entrada al impregnador.
- Primera fracción de licor blanco y licor de retorno de la circulación de
  tope: relación licor/madera de la alimentación.

Nivel de detalle: suficiente para lazos, enclavamientos y fallas de la
sección 10 de la especificación; no se modela la hidráulica interna de las
bombas de astillas (limitación L-08).

---

## 12. Instrumentación y laboratorio

- **Transmisor:** `medida = retardo_τd(filtro_τ(valor_real)) + ruido(σ) +
  deriva(t)`, saturado al rango; modos de falla: congelado, fuera de rango
  alto/bajo, deriva lenta. Ruido del flujo aleatorio de instrumentos.
- **Analizador de kappa** (soplado): muestra cada 20–30 min, resultado =
  kappa de la pulpa que pasaba en el instante de muestreo + error
  N(0, σ_κ), publicado al terminar el análisis.
- **Analizadores de álcali residual** en circulaciones y extracciones
  (muestreo discreto).
- **Laboratorio:** solicitudes (kappa, viscosidad, álcali residual,
  humedad y granulometría de astillas, licor blanco) con retraso de
  20–40 min y error propio.

---

## 13. Calibración

Rutina `herramientas/calibrar.js` (Fase 1b):

1. Correr el caso base hasta estado estacionario (≥ 3 residencias, o
   hasta que el cambio de kappa en 1 h sea < 0,05).
2. Objetivos (centro de los rangos de la sección 7 de la especificación):
   kappa 17; kappa HexA 5; rendimiento 53,5 %; viscosidad 1 150 mL/g;
   álcali residual 8 g/L en las extracciones y 5,5 g/L en el soplado;
   rechazos 0,3 %.
3. Parámetros ajustables (S-27): seis factores multiplicativos, uno por
   mecanismo — deslignificación (A de las tres fracciones), α_L, degradación
   de carbohidratos (A de peeling, hidrólisis y disolución de xilano), A_HF,
   A_v y A de impregnación. Energías de activación y órdenes **fijos**.
4. Método: Levenberg–Marquardt sobre el logaritmo de los factores, con
   jacobiano por diferencias finitas; cada evaluación parte del estado
   estacionario anterior.
5. Comprobación: H en el soplado dentro de 350–500 y temperaturas del caso
   base respetadas. Si no se alcanza un objetivo dentro de su rango, la
   rutina lo informa en vez de forzar parámetros fuera de límites físicos.
6. Escribe los parámetros en `config/cinetica.json` con
   `origen: "calibrado"` y la fecha.

---

## 14. Estados de operación

El mismo modelo cubre: vasos vacíos (sin columna, V_gas = V), llenado con
licor y astillas, lleno y frío, presurizado, calentamiento (circulaciones
con vapor), operación normal, detenido en caliente (columna detenida,
cinética activa), enfriamiento y despresurización. Requisitos numéricos:
sin divisiones por caudales o masas nulas (umbrales mínimos explícitos),
la cinética es válida bajo 100 °C (la Arrhenius simplemente da velocidades
mínimas).

---

## 15. Supuestos (lista)

| Id | Supuesto |
|----|----------|
| S-01 | Flujo pistón de astillas, con dispersión solo numérica (controlada por el esquema TVD). |
| S-02 | Vaso hidráulico lleno: el licor es incompresible salvo en el balance de presión global. |
| S-03 | Una temperatura por celda (astilla y licores en equilibrio térmico). |
| S-04 | Calor de reacción despreciable. |
| S-05 | Química del sólido común a todas las clases de tamaño; solo la impregnación es por clase. |
| S-06 | Una sola especie (E. nitens) con propiedades de lote configurables; las diferencias entre lotes se representan con composición, densidad y un factor de reactividad multiplicativo. |
| S-07 | Los 180–240 min de cocción incluyen calentamiento y zona de lavado (ver PLAN §1.3). |
| S-08 | Lo no impregnado reacciona a una fracción ψ de la velocidad normal. |
| S-09 | Xilano redepositado trae HexA en la proporción del xilano disuelto. |
| S-10 | Energías de activación y órdenes de reacción provisionales (supuesto) hasta tener datos de eucalipto; solo la estructura de las ecuaciones se toma de la literatura general de cocción kraft. |
| S-11 | Densidad de pared celular 1 500 kg/m³. |
| S-12 | cp de la madera y del licor constantes por tramo (el del licor según sólidos). |
| S-13 | Sin intercambio de especies entre clases de tamaño. |
| S-14 | Álcali residual informado = 40·[OH⁻] (sin ácidos débiles). |
| S-15 | Pérdidas de calor al ambiente con UA constante por vaso. |
| S-16 | Valores provisionales de la tabla de preguntas P1–P19 del plan (aceptados por el usuario para avanzar). |
| S-17 | Fase 1a: con el vaso lleno, el exceso de licor sale por la corriente de cierre (separador del impregnador, extracción principal del digestor). Se reemplaza por el balance de presión en la Fase 1c. |
| S-18 | La humedad de la astilla entra como licor retenido con las propiedades del licor (agua pura sin especies). |
| S-19 | Fracción de astillas en la columna constante (40 %) hasta la Fase 1c (compactación). |
| S-20 | Calentadores como temperatura de salida con potencia máxima hasta la Fase 1c (vapor, incrustación). |
| S-21 | El caso base inicial parte con astillas ya impregnadas con el licor inicial del vaso; el estado estacionario se alcanza en ≈ 2 residencias (≈ 9 h). |
| S-22 | El licor de impregnación (licor negro caliente a 150 °C) entra como fuente externa; en la Fase 1c se conecta a la extracción correspondiente. |
| S-24 | Con ρ·cp del licor constante, el calor sensible de la madera que se disuelve (cp_madera·Δm·T) se registra como término aparte del balance de energía en vez de pasar al licor. |
| S-25 | Las salidas de astillas (raspador, soplado) se especifican en base madera alimentada (m0): equivale a retirar un volumen fijo de columna, porque la astilla no cambia de volumen al cocinarse (hasta la compactación de la Fase 1c). Sin control de nivel (Fase 2), así el nivel no depende del rendimiento. |
| S-26 | Filtrado de lavado con 5 g/L de álcali efectivo (antes 2), para que el álcali residual del soplado quede en 4–7 g/L. |
| S-27 | Solo se calibran 6 factores (deslignificación, consumo de álcali por lignina, degradación de carbohidratos, formación de HexA, escisión de celulosa, impregnación); el resto de las constantes cinéticas son supuestos de orden de magnitud. |
| S-28 | Caso base: filtrado de lavado al fondo 1 180 m³/h con extracción final 790 m³/h (ambos +70 respecto de la Fase 1a) para un factor de dilución de 2,2 m³/ADt sin que el filtrado frío suba a la zona de cocción. |
| S-29 | Difusión libre ↔ retenido con τ ≈ 9 min a 150 °C (D_ref = 2,5·10⁻⁹ m²/s); condensación (OH_c) y reprecipitación de lignina centradas en 3 g/L de álcali dentro de la astilla. Con valores más lentos o umbrales más altos, el interior de la astilla quedaba sin álcali y la temperatura dejaba de bajar el kappa. |
| S-23 | Una tubería entre vasos entrega en cada paso el volumen que se le ingresó en el paso anterior (desfase de un paso lento, 5 s), lo que evita lazos algebraicos. |

## 16. Limitaciones conocidas

| Id | Limitación |
|----|-----------|
| L-01 | Modelo 1D: no hay gradientes radiales (salvo la canalización como fracción de bypass). |
| L-02 | Sin perfil de concentración dentro de la astilla (fuerza impulsora lineal). |
| L-03 | Cinética calibrada a un punto de operación: válida cerca del caso base; extrapolaciones lejanas son cualitativas hasta calibrar con más datos de nitens. |
| L-04 | La calibración a un solo estado estacionario no identifica bien las energías de activación; se recomienda agregar datos de planta a otras temperaturas. |
| L-05 | Viscosidad solo por celulosa. |
| L-06 | Índices de blanqueabilidad y color cualitativos. |
| L-07 | Compactación, colgamiento y raspadores con modelo simplificado. |
| L-08 | Bombas de astillas sin hidráulica interna. |
| L-09 | Dispersión numérica de primer orden en el licor libre (no en las astillas). |
| L-10 | Resolución de la columna: una parcela ≈ 1/3 de celda (≈ 1,5 min de residencia en el impregnador, ≈ 2,5 min en el digestor). |

## 17. Estado de implementación

| Parte | Estado |
|-------|--------|
| Unidades, parámetros con origen, validación de configuración | Fase 1a ✔ |
| Generador aleatorio con semilla y flujos separados | Fase 1a ✔ (aún sin uso en la física) |
| Geometría de vasos por tramos, celdas | Fase 1a ✔ |
| Columna lagrangiana de parcelas, nivel de astillas | Fase 1a ✔ (compactación constante) |
| Balance hidráulico, sentido de flujo, vasos parciales, cierre | Fase 1a ✔ |
| Transporte implícito del licor libre | Fase 1a ✔ |
| Penetración, difusión, calor libre ↔ retenido | Fase 1a ✔ |
| Tuberías con flujo pistón (transferencia, retornos) | Fase 1a ✔ |
| Calentadores (simplificados), pérdidas al ambiente | Fase 1a ✔ |
| Factor H por parcela | Fase 1a ✔ |
| Contabilidad y cierre de balances | Fase 1a ✔ |
| Guardar/cargar, determinismo, comandos con registro | Fase 1a ✔ |
| Cinética (lignina, carbohidratos, HexA, viscosidad, álcali, impregnación por clase) | Fase 1b ✔ |
| Calibración (`npm run calibrar`, resultado en `docs/CALIBRACION.md`) | Fase 1b ✔ |
| Índices de blanqueabilidad y color (§6.11) | Fase 5 (puntaje) |
| Presión, alivio, vapor, flash, mallas, compactación, alimentación, propiedades del licor | Fase 1c |

## 18. Referencias (a verificar al implementar)

- Vroom, K. E. (1957). The "H" factor: a means of expressing cooking times
  and temperatures as a single variable. Pulp Pap. Mag. Can.
- Gustafson, R. R., Sleicher, C. A., McKean, W. T., Finlayson, B. A. (1983).
  Theoretical model of the kraft pulping process (solo estructura de tres
  fases).
- Christensen, T., Albright, L. F., Williams, T. J. (1982). Modelo Purdue
  (solo estructura de fracciones en paralelo).
- Kubes, G. J., Fleming, B. I., MacLeod, J. M., Bolker, H. I. (1983).
  Viscosities of unbleached alkaline pulps — factor G.
- Stone, J. E. (1957). Difusión en astillas y ECCSA.
- SCAN-CM 15 (relación DP – viscosidad intrínseca).
- Li, J., Gellerstedt, G. — aporte de HexA al número kappa.

Las referencias se usan solo para la **estructura** de las ecuaciones y para
constantes generales (factor H, HexA/kappa, viscosidad–DP). Ningún
parámetro cinético de otras maderas se usa: los de eucalipto se calibran o
se marcan como supuesto.
