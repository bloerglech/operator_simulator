# Anexo A. Tabla de parámetros

Generado automáticamente desde `config/*.json` por `npm run tabla-parametros`.
No editar a mano: cambie la configuración y vuelva a generar.

Orígenes (ver capítulo 1.5): `literatura` (publicación citada), `especificacion`
(caso base definido por el usuario), `calibrado` (ajustado por `npm run calibrar`),
`supuesto` (provisional, a reemplazar con datos reales), `planta` (dato real).

| Origen | Cantidad de parámetros |
|--------|------------------------|
| supuesto | 184 |
| especificacion | 19 |
| calibrado | 14 |
| literatura | 2 |

## config/simulacion.json

| Parámetro | Valor | Unidad | Origen | Fuente / nota |
|-----------|-------|--------|--------|---------------|
| `dt_rapido` | 0.2 | s | supuesto | presión, válvulas, PID (Fase 1c/2) |
| `dt_lento` | 5 | s | supuesto | celdas, transporte, cinética; múltiplo entero de dt_rapido |

## config/topologia.json

| Parámetro | Valor | Unidad | Origen | Fuente / nota |
|-----------|-------|--------|--------|---------------|
| `vasos[imp].zonas[impregnacion].desde` | 0 | m | supuesto |  |
| `vasos[imp].zonas[impregnacion].hasta` | 23 | m | supuesto |  |
| `vasos[dig].zonas[tope].desde` | 0 | m | supuesto |  |
| `vasos[dig].zonas[tope].hasta` | 9 | m | supuesto |  |
| `vasos[dig].zonas[coccion_superior].desde` | 9 | m | supuesto |  |
| `vasos[dig].zonas[coccion_superior].hasta` | 27 | m | supuesto |  |
| `vasos[dig].zonas[coccion_inferior].desde` | 27 | m | supuesto |  |
| `vasos[dig].zonas[coccion_inferior].hasta` | 47 | m | supuesto |  |
| `vasos[dig].zonas[lavado].desde` | 47 | m | supuesto |  |
| `vasos[dig].zonas[lavado].hasta` | 57 | m | supuesto |  |
| `corrientes[circ_tope_imp].origen.z` | 1 | m | supuesto |  |
| `corrientes[imp_exceso].origen.z` | 1 | m | supuesto |  |
| `corrientes[retorno_transf].origen.z` | 1 | m | supuesto |  |
| `corrientes[retorno_transf].destino.z` | 22.5 | m | supuesto |  |
| `corrientes[ext_superior].origen.z` | 3 | m | supuesto |  |
| `corrientes[circ_sup].origen.z` | 9 | m | supuesto |  |
| `corrientes[circ_sup].destino.z` | 9 | m | supuesto |  |
| `corrientes[ext_principal].origen.z` | 27 | m | supuesto |  |
| `corrientes[circ_inf].origen.z` | 31 | m | supuesto |  |
| `corrientes[circ_inf].destino.z` | 31 | m | supuesto |  |
| `corrientes[ext_final].origen.z` | 47 | m | supuesto |  |
| `corrientes[fil_fondo].destino.z` | 56 | m | supuesto |  |
| `corrientes[dilucion].destino.z` | 56.9 | m | supuesto |  |

## config/equipos.json

| Parámetro | Valor | Unidad | Origen | Fuente / nota |
|-----------|-------|--------|--------|---------------|
| `vasos.imp.tramos[0].altura` | 23 | m | supuesto |  |
| `vasos.imp.tramos[0].diametro` | 7.5 | m | supuesto |  |
| `vasos.dig.tramos[0].altura` | 30 | m | supuesto |  |
| `vasos.dig.tramos[0].diametro` | 9 | m | supuesto |  |
| `vasos.dig.tramos[1].altura` | 27 | m | supuesto |  |
| `vasos.dig.tramos[1].diametro` | 10 | m | supuesto |  |
| `tubos.circ_tope_imp` | 10 | m3 | supuesto |  |
| `tubos.transferencia` | 12 | m3 | supuesto | ≈ 30 s a caudal nominal |
| `tubos.retorno_transf` | 15 | m3 | supuesto |  |
| `tubos.circ_sup` | 15 | m3 | supuesto |  |
| `tubos.circ_inf` | 15 | m3 | supuesto |  |

## config/madera.json

| Parámetro | Valor | Unidad | Origen | Fuente / nota |
|-----------|-------|--------|--------|---------------|
| `densidad_basica` | 480 | kg/m3 | supuesto |  |
| `densidad_pared_celular` | 1500 | kg/m3 | supuesto | S-11 |
| `cp` | 1.4 | kJ/(kg·K) | supuesto | madera seca |
| `espesor_medio` | 4 | mm | supuesto | para la difusión libre-retenido |
| `reactividad` | 1 | - | supuesto | multiplica la deslignificación; representa lotes más o menos fáciles de cocer |
| `composicion.lignina` | 24.5 | % | supuesto |  |
| `composicion.glucano` | 46 | % | supuesto | celulosa |
| `composicion.xilano` | 17 | % | supuesto | incluye los grupos urónicos |
| `composicion.otros_carbohidratos` | 6 | % | supuesto | glucomanano, galactano, arabinano, etc. |
| `composicion.extraibles` | 3 | % | supuesto |  |
| `composicion.acetilos` | 3 | % | supuesto | en el xilano; importante en eucalipto |
| `composicion.cenizas` | 0.5 | % | supuesto | inertes, quedan en la pulpa |
| `MeGlcA` | 110 | mmol/kg | supuesto | ácido 4-O-metilglucurónico en el xilano, por kg de madera |
| `DP_inicial` | 3500 | - | supuesto | grado de polimerización de la celulosa de la madera (equivalente viscosimétrico) |
| `clases_tamano[sobre_espesor].fraccion` | 4 | % | supuesto |  |
| `clases_tamano[sobre_espesor].espesor` | 8 | mm | supuesto |  |
| `clases_tamano[aceptadas].fraccion` | 86 | % | supuesto |  |
| `clases_tamano[aceptadas].espesor` | 4 | mm | supuesto |  |
| `clases_tamano[palillos].fraccion` | 4 | % | supuesto |  |
| `clases_tamano[palillos].espesor` | 3 | mm | supuesto |  |
| `clases_tamano[finos].fraccion` | 6 | % | supuesto |  |
| `clases_tamano[finos].espesor` | 1.5 | mm | supuesto |  |

## config/licores.json

| Parámetro | Valor | Unidad | Origen | Fuente / nota |
|-----------|-------|--------|--------|---------------|
| `especies[OH].factor_difusion` | 1 | - | supuesto |  |
| `especies[HS].factor_difusion` | 1 | - | supuesto |  |
| `especies[LD].factor_difusion` | 0.3 | - | supuesto | molécula grande |
| `especies[XD].factor_difusion` | 0.3 | - | supuesto |  |
| `especies[CD].factor_difusion` | 0.6 | - | supuesto |  |
| `especies[OD].factor_difusion` | 0.6 | - | supuesto |  |
| `especies[SI].factor_difusion` | 1 | - | supuesto |  |
| `especies[TR].factor_difusion` | 1 | - | supuesto |  |
| `densidad` | 1050 | kg/m3 | supuesto | constante (S-12) |
| `cp` | 3.8 | kJ/(kg·K) | supuesto | constante (S-12) |
| `fuentes.licor_blanco.T` | 90 | °C | supuesto | P13 |
| `fuentes.licor_blanco.EA` | 117.5 | g/L NaOH | especificacion |  |
| `fuentes.licor_blanco.sulfidez` | 32 | % | especificacion |  |
| `fuentes.licor_blanco.caustificacion` | 82 | % | supuesto | P13 |
| `fuentes.licor_blanco.otros_inertes` | 5 | g/L | supuesto | Na2SO4, NaCl, etc. |
| `fuentes.filtrado.T` | 75 | °C | supuesto | P12 |
| `fuentes.filtrado.composicion.OH` | 5 | g/L NaOH | supuesto | álcali residual del lavado; ajustado para que el soplado quede en 4-7 g/L |
| `fuentes.filtrado.composicion.HS` | 0.01 | mol/L | supuesto |  |
| `fuentes.filtrado.composicion.LD` | 15 | g/L | supuesto |  |
| `fuentes.filtrado.composicion.CD` | 8 | g/L | supuesto |  |
| `fuentes.filtrado.composicion.OD` | 1 | g/L | supuesto |  |
| `fuentes.filtrado.composicion.SI` | 16 | g/L | supuesto |  |
| `fuentes.licor_impregnacion.T` | 150 | °C | supuesto | licor negro caliente a la alimentación |
| `fuentes.licor_impregnacion.composicion.OH` | 15 | g/L NaOH | supuesto |  |
| `fuentes.licor_impregnacion.composicion.HS` | 0.2 | mol/L | supuesto |  |
| `fuentes.licor_impregnacion.composicion.LD` | 60 | g/L | supuesto |  |
| `fuentes.licor_impregnacion.composicion.CD` | 30 | g/L | supuesto |  |
| `fuentes.licor_impregnacion.composicion.OD` | 3 | g/L | supuesto |  |
| `fuentes.licor_impregnacion.composicion.SI` | 40 | g/L | supuesto |  |

## config/hidraulica.json

| Parámetro | Valor | Unidad | Origen | Fuente / nota |
|-----------|-------|--------|--------|---------------|
| `fraccion_astillas_columna` | 40 | % | supuesto | volumen de astillas (con poros) / volumen del vaso |
| `penetracion.k_ref` | 0.2 | 1/s | supuesto | ≈ 5 s de constante de tiempo a T_ref |
| `penetracion.T_ref` | 100 | °C | supuesto |  |
| `penetracion.E` | 15 | kJ/mol | supuesto |  |
| `difusion.D_ref` | 2.5e-9 | m2/s | supuesto | ≈ 9 min de constante de tiempo a 150 °C con 4 mm (Fase 1b: con 20 min el interior de la astilla quedaba sin álcali) |
| `difusion.T_ref` | 150 | °C | supuesto |  |
| `difusion.E` | 20 | kJ/mol | supuesto |  |
| `difusion.eccsa_min` | 0.3 | - | supuesto |  |
| `difusion.eccsa_max` | 1 | - | supuesto |  |
| `difusion.K_e` | 0.1 | mol/L | supuesto |  |
| `k_calor` | 0.09 | 1/s | supuesto | calentamiento de astillas de 4 mm, ≈ 11 s |

## config/energia.json

| Parámetro | Valor | Unidad | Origen | Fuente / nota |
|-----------|-------|--------|--------|---------------|
| `T_ambiente` | 20 | °C | supuesto |  |
| `UA_perdidas.imp` | 5 | kW/K | supuesto |  |
| `UA_perdidas.dig` | 15 | kW/K | supuesto |  |
| `calentadores.retorno_transf.Q_max` | 30 | MW | supuesto |  |
| `calentadores.circ_sup.Q_max` | 45 | MW | supuesto |  |
| `calentadores.circ_inf.Q_max` | 45 | MW | supuesto |  |

## config/cinetica.json

| Parámetro | Valor | Unidad | Origen | Fuente / nota |
|-----------|-------|--------|--------|---------------|
| `T_ref` | 150 | °C | supuesto | temperatura de referencia de las constantes A |
| `reparto_lignina.rapida` | 20 | % | supuesto |  |
| `reparto_lignina.principal` | 72 | % | supuesto |  |
| `reparto_lignina.residual` | 8 | % | supuesto |  |
| `fraccion_reactiva.celulosa` | 5 | % | supuesto | accesible al peeling |
| `fraccion_reactiva.xilano` | 50 | % | supuesto | disoluble |
| `fraccion_reactiva.otros_carbohidratos` | 70 | % | supuesto | accesible al peeling |
| `reacciones.lignina_rapida.A` | 0.009112 | 1/s | calibrado | calibrado 2026-10-07 (objetivo: kappa) |
| `reacciones.lignina_rapida.E` | 50 | kJ/mol | supuesto |  |
| `reacciones.lignina_rapida.a_OH` | 0 | - | supuesto |  |
| `reacciones.lignina_principal_OH.A` | 0.0009112 | 1/s | calibrado | calibrado 2026-10-07 (objetivo: kappa) |
| `reacciones.lignina_principal_OH.E` | 130 | kJ/mol | supuesto |  |
| `reacciones.lignina_principal_OH.a_OH` | 1 | - | supuesto |  |
| `reacciones.lignina_principal_HS.A` | 0.001215 | 1/s | calibrado | calibrado 2026-10-07 (objetivo: kappa) |
| `reacciones.lignina_principal_HS.E` | 120 | kJ/mol | supuesto |  |
| `reacciones.lignina_principal_HS.a_OH` | 0.5 | - | supuesto |  |
| `reacciones.lignina_principal_HS.b_HS` | 0.4 | - | supuesto |  |
| `reacciones.lignina_residual.A` | 0.0004252 | 1/s | calibrado | calibrado 2026-10-07 (objetivo: kappa) |
| `reacciones.lignina_residual.E` | 117 | kJ/mol | supuesto |  |
| `reacciones.lignina_residual.a_OH` | 0.7 | - | supuesto |  |
| `reacciones.condensacion.A` | 0.00005 | 1/s | supuesto | lignina principal → residual con álcali bajo |
| `reacciones.condensacion.E` | 100 | kJ/mol | supuesto |  |
| `reacciones.condensacion.OH_c` | 3 | g/L NaOH | supuesto |  |
| `reacciones.condensacion.n` | 4 | - | supuesto |  |
| `reacciones.reprecipitacion.k` | 0.0005 | 1/s | supuesto | por mol/L bajo el umbral |
| `reacciones.reprecipitacion.OH_umbral` | 3 | g/L NaOH | supuesto |  |
| `reacciones.celulosa_peeling.A` | 0.0004134 | 1/s | calibrado | calibrado 2026-10-07 (objetivo: rendimiento) |
| `reacciones.celulosa_peeling.E` | 100 | kJ/mol | supuesto |  |
| `reacciones.celulosa_hidrolisis.A` | 0.00003675 | 1/s | calibrado | calibrado 2026-10-07 (objetivo: rendimiento) |
| `reacciones.celulosa_hidrolisis.E` | 150 | kJ/mol | supuesto |  |
| `reacciones.xilano_disolucion.A` | 0.0006473 | 1/s | calibrado | calibrado 2026-10-07 (objetivo: rendimiento) |
| `reacciones.xilano_disolucion.E` | 80 | kJ/mol | supuesto |  |
| `reacciones.xilano_disolucion.a_OH` | 1 | - | supuesto |  |
| `reacciones.xilano_hidrolisis.A` | 0.00004593 | 1/s | calibrado | calibrado 2026-10-07 (objetivo: rendimiento) |
| `reacciones.xilano_hidrolisis.E` | 120 | kJ/mol | supuesto |  |
| `reacciones.otros_peeling.A` | 0.0006887 | 1/s | calibrado | calibrado 2026-10-07 (objetivo: rendimiento) |
| `reacciones.otros_peeling.E` | 90 | kJ/mol | supuesto |  |
| `reacciones.otros_hidrolisis.A` | 0.00004593 | 1/s | calibrado | calibrado 2026-10-07 (objetivo: rendimiento) |
| `reacciones.otros_hidrolisis.E` | 120 | kJ/mol | supuesto |  |
| `reacciones.extraibles.A` | 0.001 | 1/s | supuesto |  |
| `reacciones.extraibles.E` | 40 | kJ/mol | supuesto |  |
| `reacciones.acetilos.A` | 0.005 | 1/s | supuesto | desacetilación rápida |
| `reacciones.acetilos.E` | 40 | kJ/mol | supuesto |  |
| `reacciones.hexa_formacion.A` | 0.0003761 | 1/s | calibrado | calibrado 2026-10-07 (objetivo: kappaHexA) |
| `reacciones.hexa_formacion.E` | 110 | kJ/mol | supuesto |  |
| `reacciones.hexa_formacion.a_OH` | 1 | - | supuesto |  |
| `reacciones.hexa_degradacion.A` | 0.00003 | 1/s | supuesto |  |
| `reacciones.hexa_degradacion.E` | 120 | kJ/mol | supuesto |  |
| `reacciones.hexa_degradacion.a_OH` | 0 | - | supuesto | sobre todo térmica |
| `reacciones.viscosidad.A` | 6.766e-8 | 1/s | calibrado | calibrado 2026-10-07 (objetivo: viscosidad) |
| `reacciones.viscosidad.E` | 179 | kJ/mol | especificacion | Kubes et al. (1983), factor G; verificar |
| `reacciones.viscosidad.a_OH` | 1 | - | supuesto |  |
| `reacciones.viscosidad.beta_DS` | 0.005 | L/g | supuesto | daño extra por sólidos orgánicos disueltos (efecto Lo-Solids) |
| `reacciones.redeposito_xilano.k` | 0.0001 | 1/s | supuesto | por mol/L bajo el umbral |
| `reacciones.redeposito_xilano.OH_umbral` | 10 | g/L NaOH | supuesto |  |
| `solidos_disueltos.kappa_DS` | 0.002 | L/g | supuesto | freno de la deslignificación: f = 1/(1 + kappa_DS·DS_org) |
| `consumo_alcali.alfa_lignina` | 5.401 | mol/kg | calibrado | calibrado 2026-10-07 (objetivo: alcaliExtraccion) |
| `consumo_alcali.alfa_carbohidratos` | 6 | mol/kg | supuesto | OH⁻ por kg de carbohidrato degradado (ácidos) |
| `consumo_alcali.alfa_extraibles` | 3 | mol/kg | supuesto |  |
| `consumo_alcali.A_DS` | 0.00009 | 1/s | supuesto | mol OH⁻ por kg de sólido orgánico disuelto, por s y por mol/L de OH⁻ |
| `consumo_alcali.E_DS` | 100 | kJ/mol | supuesto |  |
| `consumo_alcali.beta_HS_lignina` | 0.5 | mol/kg | supuesto | HS⁻ por kg de lignina disuelta |
| `impregnacion.A` | 0.006442 | 1/s | calibrado | calibrado 2026-10-07 (objetivo: rechazos) |
| `impregnacion.E` | 30 | kJ/mol | supuesto |  |
| `impregnacion.K_OH` | 2 | g/L NaOH | supuesto |  |
| `impregnacion.espesor_ref` | 4 | mm | supuesto |  |
| `impregnacion.psi` | 10 | % | supuesto | velocidad relativa de reacción en lo no impregnado (S-08) |
| `impregnacion.T_inicio_coccion` | 140 | °C | supuesto | lo no impregnado al pasar esta temperatura termina como rechazo |
| `impregnacion.rendimiento_nucleo` | 85 | % | supuesto | fracción de la madera no impregnada que sale como rechazo |
| `kappa.lignina_por_kappa` | 0.13 | % | supuesto | % de lignina en pulpa por unidad de kappa (eucalipto) |
| `kappa.HexA_por_kappa` | 11.6 | mmol/kg | especificacion |  |
| `viscosidad.exponente` | 0.905 | - | literatura | Fuente: SCAN-CM 15: DP^0,905 = 0,75·[η]. verificar |
| `viscosidad.factor` | 0.75 | - | literatura | Fuente: SCAN-CM 15. verificar |

## config/caso_base.json

| Parámetro | Valor | Unidad | Origen | Fuente / nota |
|-----------|-------|--------|--------|---------------|
| `produccion` | 3000 | ADt/d | especificacion |  |
| `rendimiento_nominal` | 53.5 | % | especificacion | solo para convertir producción en madera hasta la Fase 1b |
| `astillas.humedad` | 47.5 | % | especificacion | base húmeda |
| `astillas.T` | 95 | °C | supuesto | después de la vaporización |
| `astillas.vaporizacion` | 95 | % | supuesto | calidad de vaporización (remoción de aire), P14 |
| `alcali.carga_EA` | 18 | % | especificacion | como NaOH sobre madera seca |
| `alcali.reparto.lb_alim` | 50 | % | especificacion |  |
| `alcali.reparto.lb_transf` | 10 | % | especificacion |  |
| `alcali.reparto.lb_sup` | 20 | % | especificacion |  |
| `alcali.reparto.lb_inf` | 20 | % | especificacion |  |
| `caudales.licor_imp` | 260 | m3/h | supuesto |  |
| `caudales.circ_tope_imp` | 230 | m3/h | supuesto |  |
| `caudales.transferencia` | 1080 | m3/h | supuesto | licor libre que sale con las astillas |
| `caudales.retorno_transf` | 900 | m3/h | supuesto |  |
| `caudales.ext_superior` | 72 | m3/h | supuesto |  |
| `caudales.circ_sup` | 1000 | m3/h | supuesto |  |
| `caudales.fil_sup` | 144 | m3/h | supuesto |  |
| `caudales.circ_inf` | 1000 | m3/h | supuesto |  |
| `caudales.fil_inf` | 180 | m3/h | supuesto |  |
| `caudales.ext_final` | 790 | m3/h | supuesto |  |
| `caudales.fil_fondo` | 1180 | m3/h | supuesto |  |
| `caudales.dilucion` | 180 | m3/h | supuesto |  |
| `caudales.soplado` | 720 | m3/h | supuesto | licor libre que sale con la pulpa |
| `temperaturas_calentadores.retorno_transf` | 140 | °C | especificacion | 130-140 °C |
| `temperaturas_calentadores.circ_sup` | 156 | °C | supuesto |  |
| `temperaturas_calentadores.circ_inf` | 155 | °C | supuesto |  |
| `estado_inicial.imp.nivel_astillas` | 21.5 | m | supuesto | desde el fondo |
| `estado_inicial.imp.T` | 115 | °C | supuesto |  |
| `estado_inicial.dig.nivel_astillas` | 55 | m | supuesto | desde el fondo |
| `estado_inicial.dig.T` | 148 | °C | supuesto |  |
| `objetivos_calibracion.kappa.objetivo` | 17 | - | especificacion |  |
| `objetivos_calibracion.kappa.tolerancia` | 0.3 | - | supuesto |  |
| `objetivos_calibracion.kappaHexA.objetivo` | 5 | - | especificacion | 4-6 puntos |
| `objetivos_calibracion.kappaHexA.tolerancia` | 0.3 | - | supuesto |  |
| `objetivos_calibracion.rendimiento.objetivo` | 53.5 | - | especificacion | % sobre madera |
| `objetivos_calibracion.rendimiento.tolerancia` | 0.3 | - | supuesto |  |
| `objetivos_calibracion.viscosidad.objetivo` | 1150 | mL/g | especificacion |  |
| `objetivos_calibracion.viscosidad.tolerancia` | 20 | mL/g | supuesto |  |
| `objetivos_calibracion.alcaliExtraccion.objetivo` | 8 | - | especificacion | g/L como NaOH en la extracción principal |
| `objetivos_calibracion.alcaliExtraccion.tolerancia` | 0.3 | - | supuesto |  |
| `objetivos_calibracion.rechazos.objetivo` | 0.3 | - | especificacion | % sobre pulpa (< 0,5) |
| `objetivos_calibracion.rechazos.tolerancia` | 0.05 | - | supuesto |  |
