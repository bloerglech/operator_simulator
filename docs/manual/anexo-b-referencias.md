# Anexo B. Referencias

**Estado de verificación.** Estas referencias se citaron de memoria al
escribir el simulador; no se tuvo acceso a los textos originales. Autores,
años y títulos son, en lo que sabemos, correctos; volúmenes y páginas deben
revisarse contra el original antes de usarlos en un trabajo formal. Ningún
valor numérico del simulador depende de una de estas referencias sin estar
marcado en `config/` (ver Anexo A): las constantes cinéticas de eucalipto son
**supuestos** o **calibradas**, no tomadas de estas publicaciones.

## Proceso kraft y cocción continua

- Gullichsen, J. y Fogelholm, C.-J. (eds.) (1999). *Chemical Pulping*.
  Papermaking Science and Technology, libro 6. Fapet Oy, Helsinki. —
  Química de la cocción, cocción continua, diseño de digestores.
- Sixta, H. (ed.) (2006). *Handbook of Pulp*. Wiley-VCH, Weinheim. — Cinética
  de cocción, cocción continua modificada (incluye Lo-Solids), eucalipto.
- Smook, G. A. (2002). *Handbook for Pulp & Paper Technologists*, 3.ª ed.
  Angus Wilde. — Introducción general; definiciones de álcali, kappa,
  rendimiento.
- Marcoccia, B. S., Laakso, R. y McClain, G. (1996). Lo-Solids™ pulping:
  principles and applications. *Tappi Journal* 79(6). *(por verificar)* —
  Principio Lo-Solids.

## Cinética y factor H

- Vroom, K. E. (1957). The "H" factor: a means of expressing cooking times
  and temperatures as a single variable. *Pulp and Paper Magazine of Canada*
  58(3). — Factor H: $k_{rel} = \exp(43{,}2 - 16\,115/T)$ (dato de la
  especificación; usado tal cual).
- Gustafson, R. R., Sleicher, C. A., McKean, W. T. y Finlayson, B. A. (1983).
  Theoretical model of the kraft pulping process. *Industrial & Engineering
  Chemistry Process Design and Development* 22(1). *(por verificar)* —
  Estructura de tres fases de la deslignificación. Sus constantes son para
  pino y **no** se usan.
- Christensen, T., Albright, L. F. y Williams, T. J. (1982). A mathematical
  model of the kraft pulping process. Purdue University. *(por verificar)* —
  "Modelo Purdue": componentes que reaccionan en paralelo.
- Kubes, G. J., Fleming, B. I., MacLeod, J. M. y Bolker, H. I. (1983).
  Viscosities of unbleached alkaline pulps. II. The G-factor. *Journal of
  Wood Chemistry and Technology* 3(3). *(por verificar)* — Factor G y
  energía de activación ≈ 179 kJ/mol para la escisión de celulosa (dato de
  la especificación).
- Li, J. y Gellerstedt, G. (1997). The contribution to kappa number from
  hexeneuronic acid groups in pulp xylan. *Carbohydrate Research* 302.
  *(por verificar)* — Aporte de los HexA al kappa (la especificación usa
  11,6 mmol/kg por punto).
- SCAN-CM 15 (Scandinavian Pulp, Paper and Board Testing Committee).
  Viscosidad en solución de cuprietilendiamina. *(por verificar la edición)* —
  Relación $DP^{0,905} = 0{,}75\,[\eta]$.

## Transporte en la astilla

- Stone, J. E. (1957). The effective capillary cross-sectional area of wood
  as a function of pH. *Tappi* 40(7). *(por verificar)* — ECCSA.
- Glueckauf, E. (1955). Theory of chromatography. Part 10. Formulae for
  diffusion into spheres and their application to chromatography.
  *Transactions of the Faraday Society* 51. *(por verificar)* — Aproximación
  de fuerza impulsora lineal.

## Agua y vapor; mecánica de la columna

- IAPWS (2007). *Revised Release on the IAPWS Industrial Formulation 1997 for
  the Thermodynamic Properties of Water and Steam* (IAPWS-IF97). — Ecuación de
  saturación (región 4) usada en `agua.js`; validada en las pruebas contra
  valores de tabla.
- Janssen, H. A. (1895). Versuche über Getreidedruck in Silozellen.
  *Zeitschrift des Vereines Deutscher Ingenieure* 39. *(por verificar)* —
  Esfuerzo en columnas de material granular con fricción en la pared.

## Métodos numéricos

- Patankar, S. V. (1980). *Numerical Heat Transfer and Fluid Flow*.
  Hemisphere, Washington. — Volúmenes finitos, esquema contra la corriente,
  algoritmo de Thomas.
- Levenberg, K. (1944). A method for the solution of certain non-linear
  problems in least squares. *Quarterly of Applied Mathematics* 2.
- Marquardt, D. W. (1963). An algorithm for least-squares estimation of
  nonlinear parameters. *Journal of the Society for Industrial and Applied
  Mathematics* 11(2). — Método de calibración.
- Vigna, S. y Blackman, D. (2018). Scrambled linear pseudorandom number
  generators (xoshiro128**). *(por verificar)* — Generador aleatorio con
  semilla.
