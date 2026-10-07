# Manual del simulador de digestor Lo-Solids

Material de estudio para ingenieros recién titulados. Explica el proceso de
cocción kraft continua, cómo se diseña un sistema de cocción como el del
simulador y cómo está construido el modelo: ecuaciones, supuestos, métodos
numéricos, parámetros y de dónde viene cada uno.

El manual se escribe por capítulos a medida que se completa cada fase del
simulador, para que describa lo que realmente está implementado.

| Capítulo | Contenido | Estado |
|----------|-----------|--------|
| [1. Introducción](01-introduccion.md) | Propósito, organización del simulador, convenciones, cómo leer los parámetros | Fase 1a |
| [2. El proceso y su diseño](02-proceso-y-diseno.md) | Cocción kraft, digestor Lo-Solids, cálculos de diseño paso a paso | Fase 1a |
| [3. Transporte, hidráulica y energía](03-transporte-hidraulica-energia.md) | Modelo de la columna, del licor y del calor; métodos numéricos | Fase 1a |
| [4. Cinética de cocción y calibración](04-cinetica-y-calibracion.md) | Deslignificación, carbohidratos, HexA, viscosidad, álcali, impregnación, calibración | Fase 1b |
| [5. Presión, equipos y estados de operación](05-presion-equipos-estados.md) | Presión del vaso hidráulico, válvulas y seguridad, calentadores, flash, silo, mallas, compactación, colgamiento | Fase 1c |
| 6. Control, enclavamientos y alarmas | Lazos PID, tiempos muertos, control avanzado | Fase 2 (pendiente) |
| 7. Operación y perturbaciones | Respuesta a eventos, procedimientos | Fases 5–6 (pendiente) |
| [Anexo A. Tabla de parámetros](anexo-a-parametros.md) | Valor, unidad, origen y fuente de cada parámetro (generado) | Se completa en cada fase |
| [Anexo B. Referencias](anexo-b-referencias.md) | Bibliografía, con el estado de verificación de cada dato | Se completa en cada fase |

## Cómo usar este manual

- Cada capítulo tiene ejemplos resueltos con los números del caso base. Puedes
  reproducirlos con `npm run caso-base`.
- Cuando un valor viene de la literatura, se cita la fuente. Cuando es un
  supuesto o fue calibrado, se dice explícitamente. **Ningún valor se presenta
  como "de literatura" sin serlo.**
- Las referencias marcadas *(por verificar)* se citaron de memoria y deben
  revisarse contra el original antes de usarlas en un trabajo formal.
- Este manual enseña ingeniería conceptual y básica. No reemplaza los datos
  del proveedor de tecnología ni las normas de diseño de recipientes a
  presión para un proyecto real.
