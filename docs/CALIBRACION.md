# Calibración del caso base

Generado por `npm run calibrar` el 2026-10-07. 15 simulaciones hasta estado estacionario.

Método: Levenberg–Marquardt sobre el logaritmo de seis factores multiplicativos;
jacobiano por diferencias finitas; cada evaluación corre la planta hasta que el
kappa cambia menos de 0,05 y el rendimiento menos de 0,02 puntos en una hora.
Las energías de activación y los órdenes de reacción no se ajustan.

## Objetivos

| Variable | Objetivo | Tolerancia | Resultado |
|----------|----------|------------|-----------|
| kappa | 17 | ±0.3 | 17.09 |
| alcaliExtraccion | 8 | ±0.3 | 7.98 |
| rendimiento | 53.5 | ±0.3 | 53.57 |
| kappaHexA | 5 | ±0.3 | 4.98 |
| viscosidad | 1150 | ±20 | 1153 |
| rechazos | 0.3 | ±0.05 | 0.30 |

Otros indicadores del estado calibrado: factor H en el soplado 461,
álcali residual en el soplado 5.3 g/L (como NaOH).

## Parámetros ajustados

| Constante (config/cinetica.json) | Antes | Después | Factor |
|----------------------------------|-------|---------|--------|
| reacciones.lignina_rapida.A | 9.112e-3 | 8.832e-3 | 0.969 |
| reacciones.lignina_principal_OH.A | 9.112e-4 | 8.832e-4 | 0.969 |
| reacciones.lignina_principal_HS.A | 1.215e-3 | 1.178e-3 | 0.969 |
| reacciones.lignina_residual.A | 4.252e-4 | 4.122e-4 | 0.969 |
| consumo_alcali.alfa_lignina | 5.401e+0 | 3.830e+0 | 0.709 |
| reacciones.celulosa_peeling.A | 4.134e-4 | 3.975e-4 | 0.961 |
| reacciones.celulosa_hidrolisis.A | 3.675e-5 | 3.533e-5 | 0.961 |
| reacciones.xilano_disolucion.A | 6.473e-4 | 6.223e-4 | 0.961 |
| reacciones.xilano_hidrolisis.A | 4.593e-5 | 4.416e-5 | 0.961 |
| reacciones.otros_peeling.A | 6.887e-4 | 6.621e-4 | 0.961 |
| reacciones.otros_hidrolisis.A | 4.593e-5 | 4.416e-5 | 0.961 |
| reacciones.hexa_formacion.A | 3.761e-4 | 3.594e-4 | 0.956 |
| reacciones.viscosidad.A | 6.766e-8 | 6.269e-8 | 0.926 |
| impregnacion.A | 6.442e-3 | 7.791e-3 | 1.209 |
