# Calibración del caso base

Generado por `npm run calibrar` el 2026-10-07. 23 simulaciones hasta estado estacionario.

Método: Levenberg–Marquardt sobre el logaritmo de seis factores multiplicativos;
jacobiano por diferencias finitas; cada evaluación corre la planta hasta que el
kappa cambia menos de 0,05 y el rendimiento menos de 0,02 puntos en una hora.
Las energías de activación y los órdenes de reacción no se ajustan.

## Objetivos

| Variable | Objetivo | Tolerancia | Resultado |
|----------|----------|------------|-----------|
| kappa | 17 | ±0.3 | 17.03 |
| alcaliExtraccion | 8 | ±0.3 | 7.99 |
| rendimiento | 53.5 | ±0.3 | 53.50 |
| kappaHexA | 5 | ±0.3 | 5.00 |
| viscosidad | 1150 | ±20 | 1150 |
| rechazos | 0.3 | ±0.05 | 0.30 |

Otros indicadores del estado calibrado: factor H en el soplado 431,
álcali residual en el soplado 5.4 g/L (como NaOH).

## Parámetros ajustados

| Constante (config/cinetica.json) | Antes | Después | Factor |
|----------------------------------|-------|---------|--------|
| reacciones.lignina_rapida.A | 1.605e-2 | 9.112e-3 | 0.568 |
| reacciones.lignina_principal_OH.A | 1.605e-3 | 9.112e-4 | 0.568 |
| reacciones.lignina_principal_HS.A | 2.140e-3 | 1.215e-3 | 0.568 |
| reacciones.lignina_residual.A | 7.489e-4 | 4.252e-4 | 0.568 |
| consumo_alcali.alfa_lignina | 6.064e+0 | 5.401e+0 | 0.891 |
| reacciones.celulosa_peeling.A | 7.401e-4 | 4.134e-4 | 0.559 |
| reacciones.celulosa_hidrolisis.A | 6.579e-5 | 3.675e-5 | 0.559 |
| reacciones.xilano_disolucion.A | 1.159e-3 | 6.473e-4 | 0.559 |
| reacciones.xilano_hidrolisis.A | 8.223e-5 | 4.593e-5 | 0.559 |
| reacciones.otros_peeling.A | 1.233e-3 | 6.887e-4 | 0.559 |
| reacciones.otros_hidrolisis.A | 8.223e-5 | 4.593e-5 | 0.559 |
| reacciones.hexa_formacion.A | 6.333e-4 | 3.761e-4 | 0.594 |
| reacciones.viscosidad.A | 1.064e-7 | 6.766e-8 | 0.636 |
| impregnacion.A | 6.631e-3 | 6.442e-3 | 0.971 |
