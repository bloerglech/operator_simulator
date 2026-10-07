# MODELO DE PROCESO — Digestor continuo Lo-Solids, eucalipto

Versión: Fase 0 (estructura del modelo; aún sin implementación).
Este documento se actualiza en cada cambio del modelo. Cada parámetro
mencionado vive en `config/*.json` con su unidad y su origen
(`literatura`, `calibrado`, `supuesto`, `planta`). Los valores numéricos que
aparecen aquí son **orientativos** para dimensionar y probar; los que valen
son los de configuración.

Convenciones: SI interno (s, m, kg, Pa, K, J). Concentraciones en licor en
mol/L (= kmol/m³). Temperaturas mostradas en °C, internas en K
(T[K] = T[°C] + 273,15). Masas de madera en base seca (bs). "Sobre madera"
significa sobre madera seca alimentada. ADt = tonelada secada al aire
(90 % sequedad).

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

### 2.1 Celdas
- Impregnador: `N_imp ≥ 20` celdas; digestor: `N_dig ≥ 60` celdas
  (configurables). Altura `Δz_j`, área `A_j` (permite vasos cónicos por
  tramos), volumen `V_j = A_j Δz_j`.
- Cada malla, separador, punto de adición y boquilla se asigna a una celda.
- La línea de transferencia y la de soplado son tubos de transporte puro
  con retardo `τ = V_tubo / Q` (cola de paquetes, flujo pistón exacto).

### 2.2 Fases en cada celda
1. **Sólido (astilla):** masas de componentes de madera.
2. **Licor retenido:** el que llena los poros de la astilla. Volumen
   `V_r = m_madera · (1/ρ_básica − 1/ρ_pared)` con ρ_pared ≈ 1 500 kg/m³
   (supuesto S-11), modificado por la pérdida de masa durante la cocción.
3. **Licor libre:** el resto del volumen de la celda ocupado por líquido,
   `V_f = V_j − V_sólido − V_r` (en un vaso hidráulico lleno).

Se asume **una sola temperatura por celda** (astilla, licor retenido y libre
en equilibrio térmico; supuesto S-03).

### 2.3 Estado por celda

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
| para cada licor: Na | Sodio total (para cerrar el balance inorgánico) | mol/L |
| T | Temperatura | K |
| ε, σ | Fracción de líquido de la columna; esfuerzo efectivo sobre la columna | —, Pa |

Clases de tamaño k: sobre espesor, aceptadas, palillos, finos (cada una con
fracción másica w_k y espesor medio δ_k). La química del sólido es común a
todas las clases (supuesto S-05); solo la impregnación se sigue por clase.

Sólidos disueltos totales: `DS = LD + XD + CD + OD + SI + aporte de los
iones activos (Na⁺, OH⁻, HS⁻)`.

---

## 3. Materia prima (`config/madera.json`)

Mezcla de E. globulus y E. nitens con fracciones x_g, x_n. La composición de
la mezcla es el promedio ponderado por masa seca. Cada especie tiene:
densidad básica, lignina total (y su reparto inicial en f/p/r), glucano,
xilano, otros carbohidratos, extraíbles, acetilos, MeGlcA y un **factor de
reactividad** que multiplica las velocidades de deslignificación (1 para
globulus; < 1 para nitens).

Valores provisionales (orden de magnitud; **todos `supuesto` hasta que los
confirmes, pregunta P10**):

| Propiedad | globulus | nitens |
|-----------|----------|--------|
| Densidad básica (kg/m³) | 560 | 480 |
| Lignina total (% bs) | 21 | 25 |
| Glucano (% bs) | 48 | 46 |
| Xilano (% bs) | 16 | 15 |
| Extraíbles (% bs) | 2 | 3 |
| Reactividad relativa | 1,00 | 0,85 |

Variables en el tiempo (perturbables): fracción de mezcla, humedad
(base húmeda), densidad aparente en el medidor, distribución de tamaños,
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
Velocidad de la columna en la celda j:

```
v_j = ṁ_w,j / (ρ_col,j · A_j)       ρ_col = masa de madera seca por m³ de vaso
```

Las cantidades por masa de madera (componentes, φ_k, H, θ, licor retenido)
se transportan con `v_j` usando un esquema de volúmenes finitos de segundo
orden con limitador (van Leer), para conservar el frente y el tiempo
muerto. La masa sale por el raspador (impregnador) o por el soplado
(digestor). Si la columna está detenida (`v = 0`) la cinética sigue
ocurriendo (sobrecocción, sección 6.7 de la especificación).

### 5.2 Licor libre (balance hidráulico)
En un vaso hidráulico lleno, para cada celda:

```
F_{j+½} = F_{j−½} + Σ adiciones_j − Σ extracciones_j
          − (d/dt)(V_f + V_r)_j − (retenido que entra/sale con la astilla)
```

F es el caudal volumétrico de licor libre a través de la cara inferior de
la celda (positivo hacia abajo), relativo al vaso. Se integra desde el
tope. El signo resultante define el sentido del flujo: en la zona de
lavado, el filtrado inyectado en el fondo sube hacia las mallas de
extracción final (contracorriente) sin que el modelo lo imponga.

El desbalance global (lo que entra menos lo que sale del vaso) no se
reparte en las celdas: va a la presión (sección 8).

Los escalares del licor libre se transportan con esquema contra la
corriente de primer orden (la dispersión numérica representa en parte la
dispersión real por canalización; limitación documentada).

**Canalización** (perturbación): una fracción β_can del caudal de licor en
una zona pasa sin contacto con la columna; reduce el intercambio
libre ↔ retenido y la eficiencia de lavado.

### 5.3 Difusión libre ↔ retenido
Para cada especie disuelta c (OH⁻, HS⁻, LD, XD, CD, OD, SI):

```
Ṅ_c = (k_D · a_esp) · V_r · (c_f − c_r)          [mol/s o kg/s]
k_D · a_esp = D_eff(T, OH) / (δ_ef / 2)² · s_forma
D_eff = D_ref · exp(−E_D/R · (1/T − 1/T_ref)) · ECCSA(OH)
ECCSA = e_min + (e_max − e_min) · [OH⁻]/([OH⁻] + K_e)
```

δ_ef = espesor medio ponderado por masa de las clases. Modelo de fuerza
impulsora lineal (sin perfil interno en la astilla; limitación L-02).
La dependencia de ECCSA con la alcalinidad sigue la estructura descrita
por Stone (1957); parámetros `supuesto`.

Además, la entrada inicial de licor a la astilla (penetración) arrastra
licor libre al retenido hasta llenar el volumen de poros disponible
(proporcional a 1 − φ̄).

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
vienen de literatura o son supuestos (documentados). ρ_esp es el factor de
reactividad de la mezcla de especies (solo deslignificación).

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

Estructura tipo Purdue (fracciones en paralelo) con energías de activación
y órdenes de Gustafson et al. (1983), que es la referencia de tres fases
más usada. Las tres fracciones reaccionan simultáneamente; la "fase" que
domina en cada momento emerge de sus velocidades.

```
r_f = k_f(T) · [OH]^a_f · L_f                                  (inicial)
r_p = ( k_p1(T) · [OH]^a_p1 + k_p2(T) · [OH]^a_p2 · [HS]^b_p2 ) · L_p · f_DS
r_r = k_r(T) · [OH]^a_r · L_r · f_DS                           (residual)

r_cond = k_c(T) · g(OH) · L_p        (principal → residual, a bajo álcali)
g(OH)  = 1 / (1 + ([OH]/OH_c)^n_c)

r_rep  = k_rep · max(0, OH_rep − [OH]) · LD_r · V_r  (reprecipitación de lignina disuelta)

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

Energías de activación provisionales (Gustafson et al. 1983, **pino**,
`literatura`, a verificar para eucalipto; equivalencias calculadas de las
temperaturas características del artículo):

| Fase | E (kJ/mol) | Órdenes |
|------|-----------|---------|
| Inicial | ≈ 40 | a_f = 0 |
| Principal, término OH | ≈ 143 | a_p1 = 1 |
| Principal, término OH·HS | ≈ 120 | a_p2 = 0,5; b_p2 = 0,4 |
| Residual | ≈ 90 (a verificar) | a_r = 0,7 |

Reparto inicial de la lignina (supuesto, eucalipto): rápida ≈ 20 %,
principal ≈ 72 %, residual ≈ 8 %. Para eucalipto se espera menor
requerimiento de factor H en la fase principal (especificación 6.2): eso
lo produce la calibración de A_p1, A_p2 al caso base (kappa 17 con H en
350–500), no un valor inventado.

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
r_red = k_red · max(0, OH_red − [OH_f]) · XD_f · V_f   → suma a X_b
```

El xilano redepositado trae HexA en la proporción HexA/X del xilano
disuelto (supuesto S-09; se sigue HexA disuelto con el xilano disuelto).

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

- c_κ ≈ 0,15 % lignina por unidad de kappa en pino; para eucalipto se
  usan valores algo menores (≈ 0,13). Queda como parámetro `supuesto`
  (pregunta abierta implícita: si tienes tu correlación de planta, se
  usa).
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
                − α_C · (Σ r_pe + Σ r_h + r_dx)    ácidos de los carbohidratos
                − α_E · r_E                        neutralización de extraíbles
                − α_DS · k_DS(T) · [OH] · DS_org,r · V_r   reacciones de sólidos disueltos
r_ac = k_ac(T) · [OH] · Ac                          rápida, baja E (importante en eucalipto)

dHS_r (mol/s) = − β_L · (r_f + r_p + r_r) + β_lib · (liberación al final)
```

α_L, α_C, α_E, α_DS, β_L se **calibran** contra el álcali residual del caso
base (6–10 g/L en extracciones, 4–7 g/L en el soplado).

### 6.9 Impregnación y rechazos

```
dφ_k/dt = − k_imp(T) · S_vap · h(OH) · φ_k / δ_k²
h(OH) = [OH]/([OH] + K_imp)
S_vap = 1 − exp(−(vapor/madera) · t_silo / τ_vap)   (calidad de vaporización, 0–1)
```

- Lo no impregnado reacciona solo con la fracción ψ (S-08).
- **Rechazos** en el soplado: `R = Σ_k w_k · φ_k,soplado · Y_núcleo`,
  más un término por álcali residual muy bajo (lignina reprecipitada sobre
  astillas mal cocidas).
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

Por celda:

```
d/dt[(m_w·cp_w + ρ_l·(V_r+V_f)·cp_l) · T] = Σ entradas·h − Σ salidas·h
                                            − UA_pérd · (T − T_amb)
```

- cp madera ≈ 1,4 kJ/kg·K; cp licor ≈ 3,8 kJ/kg·K, función de sólidos
  disueltos (supuesto S-12).
- Calor de reacción despreciado (supuesto S-04; la cocción kraft es
  levemente exotérmica).
- Las circulaciones extraen licor de una malla, lo calientan y lo
  devuelven por el tubo central a la celda de retorno configurada.

**Calentadores indirectos (vapor MP):**

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
  (supuesto). Con 7 000 m³ llenos, un desbalance de 0,01 m³/s sube la
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
3. Parámetros ajustables: A_f, A_p1, A_p2, A_r, A_pe,·, A_h,·, A_dx, A_HF,
   A_HD, A_v, α_L, α_C, α_DS. Energías de activación y órdenes **fijos**.
4. Método: por etapas (primero álcali, luego lignina, carbohidratos, HexA,
   viscosidad) y refinamiento conjunto por Levenberg–Marquardt con
   diferencias finitas.
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
| S-06 | Composición de la mezcla de especies = promedio ponderado; reactividad como factor multiplicativo. |
| S-07 | Los 180–240 min de cocción incluyen calentamiento y zona de lavado (ver PLAN §1.3). |
| S-08 | Lo no impregnado reacciona a una fracción ψ de la velocidad normal. |
| S-09 | Xilano redepositado trae HexA en la proporción del xilano disuelto. |
| S-10 | Energías de activación y órdenes de Gustafson (pino) como punto de partida para eucalipto; la diferencia de especie se absorbe en los preexponenciales calibrados. |
| S-11 | Densidad de pared celular 1 500 kg/m³. |
| S-12 | cp de la madera y del licor constantes por tramo (el del licor según sólidos). |
| S-13 | Sin intercambio de especies entre clases de tamaño. |
| S-14 | Álcali residual informado = 40·[OH⁻] (sin ácidos débiles). |
| S-15 | Pérdidas de calor al ambiente con UA constante por vaso. |
| S-16 | Valores provisionales de la tabla de preguntas P1–P18 del plan hasta que los confirmes. |

## 16. Limitaciones conocidas

| Id | Limitación |
|----|-----------|
| L-01 | Modelo 1D: no hay gradientes radiales (salvo la canalización como fracción de bypass). |
| L-02 | Sin perfil de concentración dentro de la astilla (fuerza impulsora lineal). |
| L-03 | Cinética de eucalipto basada en estructura de pino + calibración a un punto: válida cerca del caso base; extrapolaciones lejanas son cualitativas. |
| L-04 | La calibración a un solo estado estacionario no identifica bien las energías de activación; se recomienda agregar datos de planta a otras temperaturas. |
| L-05 | Viscosidad solo por celulosa. |
| L-06 | Índices de blanqueabilidad y color cualitativos. |
| L-07 | Compactación, colgamiento y raspadores con modelo simplificado. |
| L-08 | Bombas de astillas sin hidráulica interna. |

## 17. Referencias (a verificar al implementar)

- Vroom, K. E. (1957). The "H" factor: a means of expressing cooking times
  and temperatures as a single variable. Pulp Pap. Mag. Can.
- Gustafson, R. R., Sleicher, C. A., McKean, W. T., Finlayson, B. A. (1983).
  Theoretical model of the kraft pulping process. Ind. Eng. Chem. Process
  Des. Dev.
- Christensen, T., Albright, L. F., Williams, T. J. (1982). Modelo Purdue de
  cocción kraft (fracciones en paralelo).
- Kubes, G. J., Fleming, B. I., MacLeod, J. M., Bolker, H. I. (1983).
  Viscosities of unbleached alkaline pulps — factor G.
- Stone, J. E. (1957). Difusión en astillas y ECCSA.
- SCAN-CM 15 (relación DP – viscosidad intrínseca).
- Li, J., Gellerstedt, G. — aporte de HexA al número kappa.

Las referencias se usan solo para la **estructura** de las ecuaciones y para
energías de activación y órdenes marcados `literatura`; ningún valor se
usa sin pasar por la calibración o sin marcarse como supuesto.
