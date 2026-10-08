# MODELO DE PROCESO — Digestor continuo Lo-Solids, eucalipto

Versión: Fase 1c (transporte, hidráulica, energía, cinética calibrada,
presión y equipos). La sección 17 resume qué está implementado. Explicación
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
  eucalipto (provisional 0,15, `supuesto`; antes 0,13). La literatura da
  lignina Klason ≈ 0,160 × kappa total en eucalipto (Foelkel, 2019, por
  verificar), pero ese factor incluye el aporte de los HexA, que aquí se
  suman aparte. Si tienes tu correlación de planta (Klason + soluble, kappa
  y HexA sobre la misma muestra), se usa esa.
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

## 7. Energía y equipos auxiliares (`config/energia.json`, `config/equipos.json`)

Entalpía con referencia 0 °C: licor `ρ·cp·V·T`, parcela
`(m·cp_madera + ρ·cp·V_r)·T`, vapor `h_fg(T_s) + (ρ·cp/1000)·T_s` por kg (el
agua condensada se cuenta como licor, 1 kg = 1 L). El licor libre lleva la
temperatura como un escalar más del transporte; las parcelas, la suya
(sección 5.3). Pérdidas al ambiente por vaso, repartidas por volumen de celda:

```
dT_j/dt = −UA_j · (T_j − T_amb) / (ρ·cp·V_f,j)        (integración exacta)
```

- cp madera 1,4 kJ/kg·K; licor ρ = 1 050 kg/m³, cp = 3,8 kJ/kg·K,
  **constantes** (S-12). La dependencia con los sólidos disueltos (≈ 3 %
  en cp) no se implementó: no cambia la dinámica y complicaría el transporte
  de la temperatura (decisión de la Fase 1c).
- Propiedades del agua (`src/sim/agua.js`): presión de saturación de
  IAPWS-IF97 región 4 (`literatura`); calor latente ajustado a las tablas de
  vapor (error < 0,1 % entre 100 y 200 °C).

### 7.1 Calentadores (`equipos.calentadores`)

Lado del vapor isotérmico a T_s = T_sat(P_MP):

```
T_sal,max = T_s − (T_s − T_ent) · exp(−UA/(ṁ·cp))
T_sal = min(T_consigna, T_sal,max)       Q = ṁ·cp·(T_sal − T_ent)       ṁ_vapor = Q / h_fg(T_s)
UA = UA_limpio / (1 + f),   df/dt = k_inc · exp(−E/R·(1/T − 1/T_ref))   (CaCO₃)
```

Cada calentador tiene una unidad de respaldo limpia (comando `conmutar`) y
se puede lavar con ácido (f = 0). Si la consigna no se alcanza, el
calentador queda "saturado". Con el control (Fase 2) el TIC maneja la
válvula de vapor: T_consigna se reemplaza por
`T_ent + apertura · Q_valvula / (ṁ·cp)`, con `Q_valvula` el calor a válvula
totalmente abierta (≈ 1,4 veces el caso base, supuesto); sigue limitado
por T_sal,max. UA_limpio se dimensionó con ≈ 30 % de margen
sobre el caso base (P8). Una caída de presión del cabezal MP baja T_s y la
capacidad.

### 7.2 Ciclones flash y evaporadores

El licor de las extracciones superior, principal y final entra al flash 1
(2,5 bar(a)); su líquido pasa al flash 2 (1,1 bar(a)) y de ahí a
evaporadores. En cada flash el licor se enfría a T_sat(P):

```
m_vapor = ρ·cp·V·(T − T_sat) / h_fg(T_sat)        (los sólidos se concentran en el licor que queda)
```

Nivel: control proporcional ideal hacia la consigna (τ = 60 s) hasta la
Fase 2. La salida del flash 2 está limitada por la **capacidad de recepción
de evaporadores** (perturbable). Si un flash se llena (≥ 98 %), el anterior
no puede descargar; si el flash 1 se llena, las extracciones del digestor
quedan bloqueadas (las válvulas no pasan y las bombas no impulsan) y la
presión del digestor sube: es la cadena de la misión 5.

### 7.3 Silo de astillas y vaporización

El vapor de ambos flash llega al silo en el paso siguiente. Se usa primero
el vapor flash y luego vapor fresco de baja presión (hasta su máximo) para
llevar las astillas a la consigna (100 °C, silo atmosférico); el vapor flash
sobrante se ventea. Balance exacto:

```
C·(T − T_silo) = Σ m_v·(h_v − c·T)          C = m·cp_madera + V_agua·ρ·cp
```

El condensado queda como humedad de las astillas (≈ 0,19 kg/kg). La calidad
de vaporización:

```
S_vap = (1 − exp(−t_residencia/τ_vap)) · min(1, (T − T_patio)/(T_consigna − T_patio))
```

con t_residencia = inventario del silo / caudal del medidor.

### 7.4 Medidor, tubo de astillas y bombas

Medidor volumétrico: `ṁ_seca = rpm · V_rev · η · s_pila · ρ_básica`. Con la
velocidad fija, un lote de menor densidad baja la producción (como en la
planta). Si las bombas de astillas no dan (detenidas o cerca de su presión de
cierre), las astillas se acumulan en el tubo de astillas y se recuperan con
un 20 % de sobrecapacidad al volver a partir.

### 7.5 Estanque de soplado

Recibe la pulpa y el licor del soplado; sale al lavado a la tasa pedida
(perturbable: "parada de lavado"). Nivel = volumen de licor + astillas /
volumen del estanque; si se llena, rebalsa (se registra).

## 8. Presión y elementos de seguridad (`src/sim/presion.js`)

Cada vaso hidráulico tiene un estado de presión con el **exceso** de líquido
E sobre la capacidad geométrica (E > 0: lleno y comprimido; E < 0: falta
líquido):

```
lleno y cerrado:      P = P_ref + E / C,      C = V_líquido · (β_licor + β_vaso) + V_gas / P_abs
falta líquido:        P = max(P_ebullición, P_atm)     (vapor o rompedor de vacío)
venteo abierto:       P = P_atm (el exceso rebalsa)
P_ebullición = max_j (P_sat(T_j) − ρ·g·z_j)            (piso: el licor hierve si P cae bajo él)
```

- β_licor = 4,6·10⁻¹⁰ 1/Pa, β_vaso = 5·10⁻¹⁰ 1/Pa (supuesto), V_gas = 0,1 %
  del licor (gas arrastrado con las astillas, supuesto; revisión B-04). C se
  recalcula en cada paso lento con la presión del momento, así que
  C(P)·(P − P_atm) es la compresión isotérmica del gas desde la atmósfera.
  En el digestor a 6,5 bar(a): 3,4·10⁻⁶ (líquido) + 5,4·10⁻⁶ (gas)
  ≈ 8,7·10⁻⁶ m³/Pa; un desbalance de 50 m³/h cambia la presión
  ≈ 1 bar/min (con el líquido solo eran ≈ 2,5 bar/min). **La presión responde en segundos a minutos**, como pide
  la especificación. Por verificar: β_licor a 150 °C es más cercana a
  6·10⁻¹⁰ y β_vaso por la fórmula de pared delgada da del orden de 10⁻⁹
  (depende del espesor del manto); con el gas dominando, ninguna de las dos
  cambia mucho C.
- Paso rápido (0,2 s): `dE/dt = Q_fijo − Q_válvulas(P) − Q_alivio(P) − Q_seguridad(P)`,
  integrado con Euler implícito (regula falsi; la función es monótona).
  Q_fijo suma las corrientes con bomba (con su factor de marcha y su curva)
  y la penetración medida en el paso lento anterior.
- Paso lento: el balance hidráulico (`hidraulica.js`) recalcula E exacto con
  los volúmenes que realmente pasaron (los de las válvulas los acumuló el
  paso rápido). Así la masa se conserva exactamente.
- Válvulas (`valvulas.js`): `Q = Kv·f(x)·√(ΔP/1 bar)` con característica
  lineal o de igual porcentaje, actuador con tiempo de carrera y constante de
  tiempo, y la malla en serie: `ΔP = R·Q + (Q/(Kv·f))²·1 bar`. La presión
  aguas arriba incluye la hidrostática hasta la malla.
- Hoy las válvulas con presión son la **extracción principal** (a flash 1) y
  el **exceso del separador del impregnador** (P5). Las demás corrientes son
  de caudal fijo (bomba + control de flujo ideal hasta la Fase 2).
- Bombas: factor de marcha de primer orden (partida/detención) y curva
  simplificada: el caudal baja linealmente a 0 en los últimos `margen` bar
  antes de la presión de cierre.
- **Alivio:** apertura proporcional entre su ajuste y ajuste + sobrepresión.
  **Seguridad:** abre sobre su ajuste y cierra bajo ajuste − purga. Cada
  apertura, cada episodio de vaporización súbita y cada maniobra quedan en el
  registro de eventos con su tiempo.
- La apertura inicial de las válvulas se calcula para el caudal de diseño a
  la presión de diseño; sin control (Fase 2), la presión se acomoda donde
  entra lo mismo que sale.

## 9. Columna de astillas (`src/sim/columna.js`)

- **Nivel:** altura del tope de la pila de parcelas.
- **Compactación (Janssen):** se recorre la pila desde el tope:

```
dσ/dz = γ − σ/λ,   λ = D/(4·μK),   γ = (m/V)·(1 − ρ_licor/ρ_pared)·g + k_arrastre·q_licor
s = s0 · (1 + c_κ·(1 − κ/κ0)) · (1 + c_σ·σ/(σ + σ_ref))      (con s ≤ s_max)
```

  q_licor es la velocidad superficial del licor (+ hacia abajo): la
  cocorriente compacta y la contracorriente afloja. s se acerca a su valor con
  una constante de tiempo de 10 min y el arrastre usa el caudal filtrado: sin
  eso, compactación e hidráulica se realimentan paso a paso (se probó). El
  esfuerzo en el fondo empuja el **raspador**:
  `torque = T0 + k_T·σ_fondo`, `corriente = I0 + k_I·torque`.
- **Colgamiento:** las parcelas sobre la altura colgada no bajan; lo que sale
  por el fondo deja un hueco de licor bajo ellas. Síntomas que aparecen solos:
  el nivel no baja aunque se siga alimentando, cuando se vacía la parte baja
  cae la consistencia de soplado y el torque del raspador, y el hueco
  absorbe licor (baja la presión). Al superar el hueco máximo (600 m³) o con
  el comando `soltar_columna`, la columna cae (evento con la altura de caída).
  La fricción con la pared (μK) es perturbable.
- **Canalización:** pendiente (Fase 5, perturbaciones).

## 10. Mallas (`src/sim/mallas.js`)

```
R = R0·(1 + r_f + r_inc),   ΔP = R·Q
dr_f/dt = (Q/Q_d)·(finos/finos_ref)/τ_tap − [conmutación]·r_f/τ_limp
retrolavado: r_f ← r_f·(1 − η_retro)        lavado ácido: r_inc ← 0
dr_inc/dt = k_inc·exp(−E/R·(1/T − 1/T_ref))
```

Con la conmutación de filas el taponamiento se estabiliza en ≈ 0,25 R0; sin
ella crece ≈ 1 R0 cada 6 h. Las corrientes con bomba quedan limitadas a la
ΔP máxima de la bomba (pierden caudal); las corrientes con válvula ven R en
serie. Siete juegos: separadores del impregnador y del digestor, mallas de
extracción superior, principal y final, y mallas de ambas circulaciones.

## 11. Alimentación (línea de astillas)

Ver 7.3 y 7.4. El licor de impregnación (licor negro caliente) sale de las
mallas de extracción principal del digestor con su bomba (S-22 resuelto).
La hidráulica interna de las bombas de astillas no se modela (L-08).

## 12. Instrumentación, control, enclavamientos y alarmas (`src/control/`)

El sistema de control es una **extensión** de la planta
(`crearPlanta(config, { extension })`, `src/control/sistema.js`): el
simulador no depende de él. Corre en cada paso rápido (0,2 s) antes de los
equipos y guarda todo su estado en `estado.control` (se guarda, carga y es
determinista). Orden en cada paso: transmisores → enclavamientos → bloques y
lazos → alarmas. El control arranca en el primer paso lento (antes no hay
niveles ni temperaturas de salida calculados) tomando como consigna inicial
el valor medido (`"sp": "pv"`) o la configurada. `crearSistema(config,
{ horasPrevias })` corre antes la planta sin control para partir cerca del
estado estacionario (el estado inicial del simulador es sintético, S-30).

### 12.1 Instrumentos (`instrumentos.js`, `mediciones.js`)

- **Transmisor:** `medida = filtro_τ(retardo_τd(valor_real)) + ruido + deriva`,
  saturada al rango. Ruido blanco N(0, σ) con σ en % del rango, del flujo
  aleatorio `instrumentos`. Fallas: `congelado`, `alto`/`bajo` (señal fuera
  de rango: calidad "mala", alarma de falla, el lazo pasa a manual) y
  `deriva` (1 % del rango por hora).
- **Variables medidas:** nombres cortos resueltos al construir
  (`P:dig`, `T:zona:dig:coccion_superior`, `L:astillas:dig`, `FD`, `kappa:soplado`…;
  lista en `mediciones.js`). Algunas son calculadas como en un DCS real
  (relación licor/madera, factor de dilución, producción, factor H).
- **Analizadores** (álcali en extracciones, kappa en el soplado): muestra
  cada `periodo`, publica tras `analisis` s con error N(0, σ) y mantiene el
  valor hasta la siguiente muestra. Kappa: cada 25 min, análisis 6 min.
- **Laboratorio:** el operador pide un análisis; se toma el valor verdadero
  en ese instante, se le suma el error del análisis y se publica entre 20 y
  40 min después (flujo aleatorio `laboratorio`).

### 12.2 PID (`pid.js`)

Forma ISA en % del rango del PV:
`u = Kc·[e + (1/Ti)∫e dt − Td·dPV_f/dt]`, acción directa o inversa,
derivada sobre el PV filtrado (sin golpe al cambiar la consigna).
Anti-windup por **integración condicional**: si el paso integral llevaría la
salida más allá de un límite, se integra solo hasta el límite.
**Transferencia sin golpe:** en MAN el integral sigue a la salida; al pasar a
AUTO/CAS se inicializa para que la salida no salte. Modos MAN, AUTO y CAS.

### 12.3 Lazos y actuadores (`lazos.js`, `config/lazos.json`)

29 lazos (lista en el anexo A del manual). Salidas posibles: válvula del
simulador, caudal de una corriente, caudal de madera de un descargador,
velocidad del medidor, válvula de vapor de un calentador, salida de un
ciclón flash, un servicio, o la consigna de otro lazo (cascada).
**Actuador** de cada salida (salvo cascadas): primer orden τ, límite de
velocidad (tiempo de carrera) y banda muerta; falla "pegado" (instructor).
Las válvulas del simulador ya tienen su propia dinámica (§8), aquí solo
se agrega la banda muerta. En MAN, si otro movió el actuador, el lazo
adopta esa posición. Un maestro cuyo esclavo no está en CAS sigue al
esclavo (no acumula integral). Un esclavo puede tener varios maestros
posibles y el operador elige uno (FIC-601: factor de dilución FDC-607 o
temperatura de soplado TIC-604).

Sintonías verificadas con escalones de consigna (`npm run sintonia`,
`docs/SINTONIA.md`, `tests/sintonia.test.js`): sin oscilación sostenida,
sobrepaso y asentamiento dentro de los límites de `"prueba"` de cada lazo.

### 12.4 Bloques de cálculo y control avanzado

| Tipo | Cálculo |
|------|---------|
| `carga_alcali` (FFC-110) | Licor blanco total = carga·W/EA (m³/h), repartido en % a los FIC en CAS. El EA del licor blanco se actualiza con el último análisis de laboratorio. W filtrado (τ 60 s). |
| `licor_madera` (FFC-117) | Licor negro a la alimentación = L/W·W − agua de la astilla − otros licores al tope. Humedad del laboratorio. |
| `seguimiento` (FFC-503, FFC-602) | El esclavo sigue los cambios de una fuente desde la activación: extracción final ← filtrado de lavado; dilución ← licor de soplado. |
| `ritmo` (RC-700) | Rampa de la consigna de madera (ADt/d por hora) y escalado proporcional de las consignas marcadas `escala_ritmo`. |
| `factor_h` (HIC-703) | H previsto = [k_rel(T_sup)·t_sup + k_rel(T_inf)·t_inf + H_resto]·(W_base/W) + corrección (al activarse, H medido − H previsto). Integral: sesgo de ±8 °C sobre las consignas de TIC-402 y TIC-404. |
| `kappa` (AIC-701) | PI muestreado: con cada valor nuevo del analizador corrige el objetivo de H (si HIC-703 está activo) o la carga de álcali. |

### 12.5 Enclavamientos (`enclavamientos.js`)

Condición sobre la **medición** (un transmisor en falla puede disparar en
falso), con retardo. Al dispararse ejecuta una vez sus comandos (detener
bomba) y mientras siga disparado fuerza salidas de lazos (que quedan en MAN).
Rearme manual, aceptado solo si la condición desapareció. El instructor
puede puentear. Lista en el anexo A.

### 12.6 Alarmas (`alarmas.js`)

Inspirado en ISA-18.2: tipos alta, baja, desviación de lazo y evento;
banda muerta, retardo de activación, prioridades 1–4. Estados: normal →
activa sin reconocer → reconocida → normal; "retornada sin reconocer" si la
condición desaparece antes. Se generan solas las alarmas de enclavamiento
(prioridad 1) y de falla de señal (prioridad 3). Supresión del grupo
"proceso" con la alimentación detenida; archivo temporal (máx. 8 h, no para
prioridad 1). Se cuenta la tasa de activaciones en 10 min (criterio de
inundación: < 10).

### 12.7 Escenarios, eventos y misiones (`src/escenarios/`, `src/misiones/`)

El **director** es una segunda extensión de la planta (`crearJuego`):
aplica los eventos del catálogo `config/eventos.json` (rampas de una
variable, comandos directos, duración y reversión; parámetros sorteados con
el flujo aleatorio `eventos`), el generador aleatorio de la operación libre,
los indicadores del turno (producción en especificación, estadística de
kappa, consumos específicos, alarmas y respuesta, paradas, economía), el
libro de novedades y la misión en curso. Las misiones son datos
(`src/misiones/campana.js`) con condiciones declarativas (`condiciones.js`).
Todo vive en `estado.escenario` (determinista y guardable). Detalle de cada
evento en `docs/EVENTOS.md` y de cada misión en `docs/MISIONES.md`.

Perturbaciones nuevas en el simulador para los eventos: impregnabilidad del
lote (astillas con sobre espesor), límite de suministro de licor blanco,
canalización (fracción del contacto licor-astilla que se pierde en el
intercambio de calor y especies) y taponamiento directo de mallas.

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

El mismo modelo cubre: vasos vacíos (venteo abierto, bombas detenidas, silo
vacío), llenado con licor y astillas (con el venteo abierto, a presión
atmosférica; rebalsa al llenarse), lleno y frío, presurizado (venteo cerrado y
bombeo), calentamiento (circulaciones con vapor), operación normal, detenido
en caliente (columna detenida, cinética activa), enfriamiento y
despresurización (con vaporización súbita si se despresuriza caliente). Las
pruebas cubren vacío, llenado, presurización, columna detenida y
vaporización súbita; las secuencias completas de partida y parada son de la
Fase 6.

El estado inicial de operación es sintético: las parcelas se precocinan según
su edad esperada (S-30). Tarda ≈ 10 h en llegar al estado estacionario y en
la primera hora puede abrir el alivio del digestor (sin control de presión);
los escenarios del juego partirán de estados estables guardados. Requisitos numéricos:
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
| S-17 | ~~Corriente de cierre~~ — reemplazada en la Fase 1c por el balance de presión (§8). |
| S-18 | La humedad de la astilla entra como licor retenido con las propiedades del licor (agua pura sin especies). |
| S-19 | Fracción de astillas 40 % solo para armar la columna inicial; desde la Fase 1c la calcula la compactación (§9). |
| S-20 | ~~Calentadores con potencia máxima~~ — reemplazado en la Fase 1c por el modelo con vapor e incrustación (§7.1). |
| S-21 | El caso base inicial parte con astillas ya impregnadas con el licor inicial del vaso; el estado estacionario se alcanza en ≈ 2 residencias (≈ 9 h). |
| S-22 | ~~El licor de impregnación entra como fuente externa~~ — reemplazado en la Fase 1c por S-35. |
| S-24 | Con ρ·cp del licor constante, el calor sensible de la madera que se disuelve (cp_madera·Δm·T) se registra como término aparte del balance de energía en vez de pasar al licor. |
| S-25 | Las salidas de astillas (raspador, soplado) se especifican en base madera alimentada (m0): equivale a retirar un volumen fijo de columna, porque la astilla no cambia de volumen al cocinarse (hasta la compactación de la Fase 1c). Sin control de nivel (Fase 2), así el nivel no depende del rendimiento. |
| S-26 | Filtrado de lavado con 5 g/L de álcali efectivo (antes 2), para que el álcali residual del soplado quede en 4–7 g/L. |
| S-27 | Solo se calibran 6 factores (deslignificación, consumo de álcali por lignina, degradación de carbohidratos, formación de HexA, escisión de celulosa, impregnación); el resto de las constantes cinéticas son supuestos de orden de magnitud. |
| S-28 | Caso base: filtrado de lavado al fondo 1 180 m³/h con extracción final 790 m³/h (ambos +70 respecto de la Fase 1a) para un factor de dilución de 2,2 m³/ADt sin que el filtrado frío suba a la zona de cocción. |
| S-29 | Difusión libre ↔ retenido con τ ≈ 9 min a 150 °C (D_ref = 2,5·10⁻⁹ m²/s); condensación (OH_c) y reprecipitación de lignina centradas en 3 g/L de álcali dentro de la astilla. Con valores más lentos o umbrales más altos, el interior de la astilla quedaba sin álcali y la temperatura dejaba de bajar el kappa. |
| S-30 | Estado inicial de operación sintético: parcelas precocinadas según su edad esperada en la columna, con un licor de cocción típico; tasa de penetración inicial estimada. |
| S-31 | Presión: compresibilidad del vaso 5·10⁻¹⁰ 1/Pa y gas libre arrastrado 0,1 % del licor (`hidraulica.fraccion_gas`), que se comprime en forma isotérmica y domina la capacidad (C = V·(β_licor + β_vaso) + V_gas/P_abs; revisión B-04); válvulas con presión solo en la extracción principal y el exceso del impregnador; el resto de las corrientes con caudal fijado (desde la Fase 2 lo fija el control a través de actuadores, S-37). |
| S-32 | Ciclones flash a presión constante y nivel con control proporcional ideal (desde la Fase 2, LIC-510/511 fijan la salida); el vapor de ambos va al silo; el condensado de la vaporización queda como humedad de las astillas. |
| S-33 | Compactación tipo Janssen con μK = 0,08 y constante de tiempo de 10 min; hueco máximo de colgamiento 600 m³. |
| S-34 | Mallas: ΔP limpia 0,15–0,3 bar, taponamiento ≈ 1 R0 cada 6 h sin conmutación, equilibrio ≈ 0,25 R0 con conmutación. |
| S-35 | Licor de impregnación desde la extracción principal (260 m³/h); por la válvula de extracción principal a flash pasan ≈ 100 m³/h. |
| S-36 | Instrumentos, lazos, bloques, enclavamientos y alarmas: todos los valores son supuestos de un DCS típico (formato compacto en `config/instrumentos|lazos|enclavamientos|alarmas.json`). |
| S-37 | Las salidas de caudal de los FIC fijan el caudal de la corriente a través de un actuador de primer orden (τ 4 s, carrera 30 s); no se modela la hidráulica de cada válvula de línea. |
| S-38 | El licor de la lechada de soplado es un caudal fijado (CIC-605 lo manipula); la dilución lo sigue con el bloque FFC-602. Equivale a controlar la consistencia con la dilución a caudal total de soplado constante. Con la válvula de soplado cerrada (sin pulpa pedida) no sale licor (L-15). |
| S-39 | El nivel de astillas del digestor se controla con el caudal de pulpa del soplado (LIC-302) y el del impregnador con la transferencia (LIC-202); el raspador no se manipula. |
| S-40 | Factor H previsto del bloque HIC-703 con tiempos de zona fijos (1,0 h y 1,2 h) más una corrección tomada al activarse. |
| S-41 | Astillas con sobre espesor: un factor de impregnabilidad del lote multiplica la velocidad de impregnación de todas las clases (no se cambia la distribución de tamaños por parcela). |
| S-42 | Falta de licor blanco: un límite de suministro reparte en proporción el caudal pedido por las cuatro adiciones. |
| S-43 | Canalización: el licor que pasa por caminos preferentes no intercambia con las astillas; se representa reduciendo el intercambio libre ↔ retenido del vaso. |
| S-44 | Indicadores del turno con valores verdaderos del proceso; la pulpa fuera de especificación se valoriza con 40 % de descuento; precios en `config/campana.json` (supuestos). |
| S-45 | Consignas de LIC-202 (22,1 m) y PIC-201 (6,1 bar) iguales al estado estacionario sin control, para que el control no desplace el punto calibrado; las circulaciones de cocción no se escalan con el ritmo. |
| S-46 | Colgamiento: la columna se suelta sin caer de golpe si las extracciones bajo ella (principal y final) se mantienen bajo el 60 % de su caudal al colgarse durante 5 min (supuesto que representa aflojar la compactación contra las mallas); si el hueco supera 600 m³ cae de golpe. |
| S-47 | Estanque de soplado: el lavado toma pulpa a su tasa, con un caudal volumétrico de descarga de hasta 1,5 veces el nominal (consistencia de descarga 100 kg/m³); con solo licor en el estanque, la descarga sigue. |
| S-48 | Alivio y seguridad descargan el licor libre más alto del vaso: si el tope está lleno de astillas, el licor llega a la válvula a través del lecho. |
| S-49 | La coordinación de ritmo (RC-700) conserva su base al desactivarse; mientras está inactiva y hay madera la renueva con el estado actual, así al partir después de una parada escala desde un estado coherente. |
| S-50 | Energía eléctrica como servicio (0/1): durante un apagón las bombas no pueden partir; el DCS y las válvulas siguen operando (UPS). |
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
| L-11 | No se modela el nivel de licor del tubo de astillas: el lazo "nivel del tubo de astillas" de la especificación queda pendiente (el tubo solo acumula astillas, WI-104). |
| L-12 | Los enclavamientos y alarmas son un conjunto mínimo representativo, no una lista de una planta real. |
| L-13 | El kappa es muy sensible al factor H (≈ −0,045 kappa por unidad de H cerca del caso base, unas dos veces lo habitual en eucalipto, por verificar con datos de planta): los cambios de ritmo o de temperatura mueven el kappa más que en la práctica. Consecuencia del calibrado a un solo punto (L-03, L-04). Por lo mismo, en una parada de 2,5 h las astillas detenidas en la zona de cocción salen con kappa 8–12 aunque se bajen 10–20 °C las temperaturas (en la práctica la caída es menor). |
| L-14 | El control de factor H predice el H con las temperaturas de zona, que responden en 1–2 h: su ganancia es baja a propósito para no oscilar. |
| L-15 | *(Corregida.)* Antes, con la válvula de soplado cerrada (LIC-302 en 0) seguía saliendo el licor de la lechada (≈ 100 m³/h). Ahora el soplado sin pulpa pedida no saca licor, ni en el paso lento ni en el balance de volumen del paso rápido (la transferencia sí sigue moviendo licor sin astillas). Las paradas de los capítulos 7 y 8 se recalibraron: filtrado moderado al partir y extracción final fuera de cascada al enfriar. |
| L-16 | Al detenerse o partir todas las bombas a la vez la presión de los vasos tiene un transitorio de segundos (puede abrir el alivio y la seguridad) porque las bombas no tienen inercia hidráulica coherente entre sí. |
| L-17 | El balance de energía no incluye el calor de las reacciones de cocción (exotérmico y pequeño frente a los calentadores). No se encontró un valor confiable por kg de madera disuelta; si se agrega, sería un término por parcela (`energia.calor_reaccion`). Revisión B-06. |
| L-18 | Compactación moderada: la fracción de astillas sube solo de ≈ 0,39 a ≈ 0,44. Las correlaciones de la literatura (Härkönen, por verificar) sugieren más compactación hacia el fondo. La residencia y el factor H son proporcionales a la fracción de astillas supuesta. Revisión B-07. |
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
| Presión de los vasos, válvulas, bombas, alivio, seguridad, vaporización súbita, venteo | Fase 1c ✔ |
| Calentadores con vapor e incrustación, ciclones flash, evaporadores, silo, medidor, tubo de astillas, estanque de soplado | Fase 1c ✔ |
| Mallas, compactación, colgamiento, raspadores | Fase 1c ✔ |
| Propiedades del licor variables con los sólidos | Descartado (ver §7) |
| Canalización | Fase 5 |
| Instrumentos con fallas, analizadores, laboratorio | Fase 2 ✔ |
| PID ISA, modos, actuadores, 29 lazos con pruebas de escalón | Fase 2 ✔ |
| Bloques de relación, seguimiento, ritmo, factor H, kappa | Fase 2 ✔ |
| Enclavamientos (11) y alarmas (43 + generadas) | Fase 2 ✔ (I-11 en la Fase 6) |
| Nivel de licor del tubo de astillas | Pendiente (L-11) |
| Eventos (27), generador aleatorio, director, indicadores del turno | Fase 5 ✔ |
| Motor de misiones, tutorial y capítulos 1 a 3 | Fase 5 ✔ |
| Capítulos 4 a 11, paradas, partida desde frío y apagón | Fase 6 ✔ |

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
