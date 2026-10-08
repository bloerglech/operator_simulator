# Calibración del caso base

Generado por `npm run calibrar` el 2026-10-08. 8 simulaciones hasta estado estacionario.

Método: Levenberg–Marquardt sobre el logaritmo de seis factores multiplicativos;
jacobiano por diferencias finitas; cada evaluación corre la planta hasta que el
kappa cambia menos de 0,05 y el rendimiento menos de 0,02 puntos en una hora.
Las energías de activación y los órdenes de reacción no se ajustan.

## Objetivos

| Variable | Objetivo | Tolerancia | Resultado |
|----------|----------|------------|-----------|
| kappa | 17 | ±0.3 | 17.17 |
| alcaliExtraccion | 8 | ±0.3 | 8.02 |
| rendimiento | 53.5 | ±0.3 | 53.46 |
| kappaHexA | 5 | ±0.3 | 5.02 |
| viscosidad | 1150 | ±20 | 1148 |
| rechazos | 0.3 | ±0.05 | 0.30 |

Otros indicadores del estado calibrado: factor H en el soplado 460,
álcali residual en el soplado 5.3 g/L (como NaOH).

## Parámetros ajustados

| Constante (config/cinetica.json) | Antes | Después | Factor |
|----------------------------------|-------|---------|--------|
| reacciones.lignina_rapida.A | 8.832e-3 | 8.301e-3 | 0.940 |
| reacciones.lignina_principal_OH.A | 8.832e-4 | 8.301e-4 | 0.940 |
| reacciones.lignina_principal_HS.A | 1.178e-3 | 1.107e-3 | 0.940 |
| reacciones.lignina_residual.A | 4.122e-4 | 3.874e-4 | 0.940 |
| consumo_alcali.alfa_lignina | 3.830e+0 | 3.831e+0 | 1.000 |
| reacciones.celulosa_peeling.A | 3.975e-4 | 4.085e-4 | 1.028 |
| reacciones.celulosa_hidrolisis.A | 3.533e-5 | 3.631e-5 | 1.028 |
| reacciones.xilano_disolucion.A | 6.223e-4 | 6.396e-4 | 1.028 |
| reacciones.xilano_hidrolisis.A | 4.416e-5 | 4.539e-5 | 1.028 |
| reacciones.otros_peeling.A | 6.621e-4 | 6.805e-4 | 1.028 |
| reacciones.otros_hidrolisis.A | 4.416e-5 | 4.539e-5 | 1.028 |
| reacciones.hexa_formacion.A | 3.594e-4 | 3.699e-4 | 1.029 |
| reacciones.viscosidad.A | 6.269e-8 | 6.344e-8 | 1.012 |
| impregnacion.A | 7.791e-3 | 7.708e-3 | 0.989 |
