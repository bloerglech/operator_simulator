# Anexo A. Tabla de parámetros

Generado automáticamente desde `config/*.json` por `npm run tabla-parametros`.
No editar a mano: cambie la configuración y vuelva a generar.

Orígenes (ver capítulo 1.5): `literatura` (publicación citada), `especificacion`
(caso base definido por el usuario), `calibrado` (ajustado por `npm run calibrar`),
`supuesto` (provisional, a reemplazar con datos reales), `planta` (dato real).

| Origen | Cantidad de parámetros |
|--------|------------------------|
| supuesto | 348 |
| especificacion | 19 |
| literatura | 3 |
| calibrado | 14 |

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
| `corrientes[licor_imp].origen.z` | 27 | m | supuesto |  |
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
| `tubos.licor_imp` | 20 | m3 | supuesto |  |
| `presion.imp.P_diseno` | 6 | bar(g) | supuesto |  |
| `presion.imp.alivio.P_ajuste` | 7.5 | bar(g) | supuesto |  |
| `presion.imp.alivio.sobrepresion` | 0.5 | bar | supuesto | aumento sobre el ajuste para apertura total |
| `presion.imp.alivio.Kv` | 800 | m3/h/bar^0.5 | supuesto |  |
| `presion.imp.alivio.P_destino` | 0 | bar(g) | supuesto |  |
| `presion.imp.seguridad.P_ajuste` | 9 | bar(g) | supuesto |  |
| `presion.imp.seguridad.purga` | 0.7 | bar | supuesto | cierra bajo P_ajuste − purga |
| `presion.imp.seguridad.Kv` | 3000 | m3/h/bar^0.5 | supuesto |  |
| `presion.imp.seguridad.P_destino` | 0 | bar(g) | supuesto |  |
| `presion.dig.P_diseno` | 5.5 | bar(g) | supuesto |  |
| `presion.dig.alivio.P_ajuste` | 7.5 | bar(g) | supuesto |  |
| `presion.dig.alivio.sobrepresion` | 0.5 | bar | supuesto |  |
| `presion.dig.alivio.Kv` | 800 | m3/h/bar^0.5 | supuesto |  |
| `presion.dig.alivio.P_destino` | 0 | bar(g) | supuesto |  |
| `presion.dig.seguridad.P_ajuste` | 9 | bar(g) | supuesto |  |
| `presion.dig.seguridad.purga` | 0.7 | bar | supuesto |  |
| `presion.dig.seguridad.Kv` | 3000 | m3/h/bar^0.5 | supuesto |  |
| `presion.dig.seguridad.P_destino` | 0 | bar(g) | supuesto |  |
| `valvulas.imp_exceso.Kv` | 400 | m3/h/bar^0.5 | supuesto |  |
| `valvulas.imp_exceso.tau` | 2 | s | supuesto |  |
| `valvulas.imp_exceso.carrera` | 20 | s | supuesto |  |
| `valvulas.imp_exceso.P_destino` | 0 | bar(g) | supuesto | estanque de licor de nivel |
| `valvulas.ext_principal.Kv` | 200 | m3/h/bar^0.5 | supuesto |  |
| `valvulas.ext_principal.tau` | 2 | s | supuesto |  |
| `valvulas.ext_principal.carrera` | 20 | s | supuesto |  |
| `bombas.bombas_astillas.P_cierre` | 12 | bar(g) | supuesto |  |
| `bombas.bombas_astillas.margen` | 3 | bar | supuesto |  |
| `bombas.bombas_astillas.tau` | 3 | s | supuesto |  |
| `bombas.bomba_transferencia.P_cierre` | 11 | bar(g) | supuesto |  |
| `bombas.bomba_transferencia.margen` | 3 | bar | supuesto |  |
| `bombas.bomba_transferencia.tau` | 3 | s | supuesto |  |
| `bombas.bomba_circ_sup.tau` | 3 | s | supuesto |  |
| `bombas.bomba_circ_inf.tau` | 3 | s | supuesto |  |
| `bombas.bomba_licor_blanco.P_cierre` | 13 | bar(g) | supuesto |  |
| `bombas.bomba_licor_blanco.margen` | 3 | bar | supuesto |  |
| `bombas.bomba_licor_blanco.tau` | 2 | s | supuesto |  |
| `bombas.bomba_filtrado.P_cierre` | 12 | bar(g) | supuesto |  |
| `bombas.bomba_filtrado.margen` | 3 | bar | supuesto |  |
| `bombas.bomba_filtrado.tau` | 2 | s | supuesto |  |
| `bombas.bomba_lavado.P_cierre` | 12 | bar(g) | supuesto |  |
| `bombas.bomba_lavado.margen` | 3 | bar | supuesto |  |
| `bombas.bomba_lavado.tau` | 2 | s | supuesto |  |
| `bombas.bomba_extraccion_superior.tau` | 2 | s | supuesto |  |
| `bombas.bomba_extraccion_final.tau` | 2 | s | supuesto |  |
| `bombas.bomba_licor_imp.P_cierre` | 11 | bar(g) | supuesto |  |
| `bombas.bomba_licor_imp.margen` | 3 | bar | supuesto |  |
| `bombas.bomba_licor_imp.tau` | 3 | s | supuesto |  |
| `calentadores.retorno_transf.UA_limpio` | 300 | kW/K | supuesto |  |
| `calentadores.retorno_transf.incrustacion` | 0.02 | 1/d | supuesto | aumento de f por día a 150 °C |
| `calentadores.retorno_transf.E_incrustacion` | 40 | kJ/mol | supuesto |  |
| `calentadores.retorno_transf.Q_valvula` | 16 | MW | supuesto | calor con la válvula de vapor totalmente abierta (≈ 1,4 veces el caso base) |
| `calentadores.circ_sup.UA_limpio` | 800 | kW/K | supuesto |  |
| `calentadores.circ_sup.incrustacion` | 0.02 | 1/d | supuesto |  |
| `calentadores.circ_sup.E_incrustacion` | 40 | kJ/mol | supuesto |  |
| `calentadores.circ_sup.Q_valvula` | 36 | MW | supuesto | calor con la válvula de vapor totalmente abierta (≈ 1,4 veces el caso base) |
| `calentadores.circ_inf.UA_limpio` | 700 | kW/K | supuesto |  |
| `calentadores.circ_inf.incrustacion` | 0.02 | 1/d | supuesto |  |
| `calentadores.circ_inf.E_incrustacion` | 40 | kJ/mol | supuesto |  |
| `calentadores.circ_inf.Q_valvula` | 32 | MW | supuesto | calor con la válvula de vapor totalmente abierta (≈ 1,4 veces el caso base) |
| `flash.flash1.P` | 2.5 | bar(a) | supuesto |  |
| `flash.flash1.volumen` | 60 | m3 | supuesto |  |
| `flash.flash1.nivel_consigna` | 50 | % | supuesto |  |
| `flash.flash1.tau_nivel` | 60 | s | supuesto |  |
| `flash.flash2.P` | 1.1 | bar(a) | supuesto |  |
| `flash.flash2.volumen` | 80 | m3 | supuesto |  |
| `flash.flash2.nivel_consigna` | 50 | % | supuesto |  |
| `flash.flash2.tau_nivel` | 60 | s | supuesto |  |
| `evaporadores.limite_recepcion` | 2500 | m3/h | supuesto | capacidad de recepción de licor negro débil; perturbable |
| `silo.volumen` | 1200 | m3 | supuesto | volumen útil de astillas a granel |
| `silo.nivel_inicial` | 70 | % | supuesto |  |
| `silo.tau_vaporizacion` | 10 | min | supuesto | tiempo característico de remoción de aire |
| `silo.T_maxima` | 100 | °C | supuesto | silo atmosférico |
| `medidor.volumen_por_revolucion` | 1.6 | m3 | supuesto |  |
| `medidor.eficiencia_llenado` | 90 | % | supuesto |  |
| `medidor.fraccion_astillas_pila` | 36 | % | supuesto | volumen de astillas / volumen a granel |
| `medidor.velocidad_maxima` | 25 | rpm | supuesto |  |
| `tubo_astillas.capacidad` | 20000 | kg | supuesto |  |
| `tubo_astillas.sobrecapacidad_bombas` | 20 | % | supuesto | caudal extra para vaciar lo acumulado |
| `estanque_soplado.volumen` | 3000 | m3 | supuesto |  |
| `estanque_soplado.nivel_inicial` | 50 | % | supuesto |  |
| `estanque_soplado.consistencia_descarga` | 100 | kg/m3 | supuesto | consistencia nominal de la pulpa que toma el lavado: fija el caudal volumétrico de las bombas de descarga (máximo 1,5 veces el nominal), también cuando el estanque solo tiene licor |
| `mallas.separador_imp.dP_limpia` | 0.15 | bar | supuesto | a caudal de diseño, limpia |
| `mallas.separador_imp.Q_diseno` | 600 | m3/h | supuesto |  |
| `mallas.separador_imp.dP_maxima` | 0.8 | bar | supuesto | límite de succión de la bomba |
| `mallas.separador_imp.tiempo_taponamiento` | 6 | h | supuesto | tiempo en que r_f crece 1 (una R0) sin conmutación, a caudal de diseño y finos normales |
| `mallas.separador_imp.tiempo_limpieza_conmutacion` | 1.5 | h | supuesto | la conmutación de filas mantiene r_f ≈ 0,25 |
| `mallas.separador_imp.eficiencia_retrolavado` | 70 | % | supuesto |  |
| `mallas.separador_imp.incrustacion` | 0.01 | 1/d | supuesto | CaCO3, típica en eucalipto |
| `mallas.separador_imp.E_incrustacion` | 40 | kJ/mol | supuesto |  |
| `mallas.separador_dig.dP_limpia` | 0.15 | bar | supuesto | a caudal de diseño, limpia |
| `mallas.separador_dig.Q_diseno` | 1200 | m3/h | supuesto |  |
| `mallas.separador_dig.dP_maxima` | 0.8 | bar | supuesto | límite de succión de la bomba |
| `mallas.separador_dig.tiempo_taponamiento` | 6 | h | supuesto | tiempo en que r_f crece 1 (una R0) sin conmutación, a caudal de diseño y finos normales |
| `mallas.separador_dig.tiempo_limpieza_conmutacion` | 1.5 | h | supuesto | la conmutación de filas mantiene r_f ≈ 0,25 |
| `mallas.separador_dig.eficiencia_retrolavado` | 70 | % | supuesto |  |
| `mallas.separador_dig.incrustacion` | 0.01 | 1/d | supuesto | CaCO3, típica en eucalipto |
| `mallas.separador_dig.E_incrustacion` | 40 | kJ/mol | supuesto |  |
| `mallas.mallas_superior.dP_limpia` | 0.2 | bar | supuesto | a caudal de diseño, limpia |
| `mallas.mallas_superior.Q_diseno` | 150 | m3/h | supuesto |  |
| `mallas.mallas_superior.dP_maxima` | 0.8 | bar | supuesto | límite de succión de la bomba |
| `mallas.mallas_superior.tiempo_taponamiento` | 6 | h | supuesto | tiempo en que r_f crece 1 (una R0) sin conmutación, a caudal de diseño y finos normales |
| `mallas.mallas_superior.tiempo_limpieza_conmutacion` | 1.5 | h | supuesto | la conmutación de filas mantiene r_f ≈ 0,25 |
| `mallas.mallas_superior.eficiencia_retrolavado` | 70 | % | supuesto |  |
| `mallas.mallas_superior.incrustacion` | 0.01 | 1/d | supuesto | CaCO3, típica en eucalipto |
| `mallas.mallas_superior.E_incrustacion` | 40 | kJ/mol | supuesto |  |
| `mallas.mallas_circ_sup.dP_limpia` | 0.3 | bar | supuesto | a caudal de diseño, limpia |
| `mallas.mallas_circ_sup.Q_diseno` | 1100 | m3/h | supuesto |  |
| `mallas.mallas_circ_sup.dP_maxima` | 1 | bar | supuesto | límite de succión de la bomba |
| `mallas.mallas_circ_sup.tiempo_taponamiento` | 6 | h | supuesto | tiempo en que r_f crece 1 (una R0) sin conmutación, a caudal de diseño y finos normales |
| `mallas.mallas_circ_sup.tiempo_limpieza_conmutacion` | 1.5 | h | supuesto | la conmutación de filas mantiene r_f ≈ 0,25 |
| `mallas.mallas_circ_sup.eficiencia_retrolavado` | 70 | % | supuesto |  |
| `mallas.mallas_circ_sup.incrustacion` | 0.01 | 1/d | supuesto | CaCO3, típica en eucalipto |
| `mallas.mallas_circ_sup.E_incrustacion` | 40 | kJ/mol | supuesto |  |
| `mallas.mallas_principal.dP_limpia` | 0.3 | bar | supuesto | a caudal de diseño, limpia |
| `mallas.mallas_principal.Q_diseno` | 450 | m3/h | supuesto |  |
| `mallas.mallas_principal.dP_maxima` | 1 | bar | supuesto | límite de succión de la bomba |
| `mallas.mallas_principal.tiempo_taponamiento` | 6 | h | supuesto | tiempo en que r_f crece 1 (una R0) sin conmutación, a caudal de diseño y finos normales |
| `mallas.mallas_principal.tiempo_limpieza_conmutacion` | 1.5 | h | supuesto | la conmutación de filas mantiene r_f ≈ 0,25 |
| `mallas.mallas_principal.eficiencia_retrolavado` | 70 | % | supuesto |  |
| `mallas.mallas_principal.incrustacion` | 0.01 | 1/d | supuesto | CaCO3, típica en eucalipto |
| `mallas.mallas_principal.E_incrustacion` | 40 | kJ/mol | supuesto |  |
| `mallas.mallas_circ_inf.dP_limpia` | 0.3 | bar | supuesto | a caudal de diseño, limpia |
| `mallas.mallas_circ_inf.Q_diseno` | 1100 | m3/h | supuesto |  |
| `mallas.mallas_circ_inf.dP_maxima` | 1 | bar | supuesto | límite de succión de la bomba |
| `mallas.mallas_circ_inf.tiempo_taponamiento` | 6 | h | supuesto | tiempo en que r_f crece 1 (una R0) sin conmutación, a caudal de diseño y finos normales |
| `mallas.mallas_circ_inf.tiempo_limpieza_conmutacion` | 1.5 | h | supuesto | la conmutación de filas mantiene r_f ≈ 0,25 |
| `mallas.mallas_circ_inf.eficiencia_retrolavado` | 70 | % | supuesto |  |
| `mallas.mallas_circ_inf.incrustacion` | 0.01 | 1/d | supuesto | CaCO3, típica en eucalipto |
| `mallas.mallas_circ_inf.E_incrustacion` | 40 | kJ/mol | supuesto |  |
| `mallas.mallas_final.dP_limpia` | 0.3 | bar | supuesto | a caudal de diseño, limpia |
| `mallas.mallas_final.Q_diseno` | 900 | m3/h | supuesto |  |
| `mallas.mallas_final.dP_maxima` | 1 | bar | supuesto | límite de succión de la bomba |
| `mallas.mallas_final.tiempo_taponamiento` | 6 | h | supuesto | tiempo en que r_f crece 1 (una R0) sin conmutación, a caudal de diseño y finos normales |
| `mallas.mallas_final.tiempo_limpieza_conmutacion` | 1.5 | h | supuesto | la conmutación de filas mantiene r_f ≈ 0,25 |
| `mallas.mallas_final.eficiencia_retrolavado` | 70 | % | supuesto |  |
| `mallas.mallas_final.incrustacion` | 0.01 | 1/d | supuesto | CaCO3, típica en eucalipto |
| `mallas.mallas_final.E_incrustacion` | 40 | kJ/mol | supuesto |  |

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
| `fraccion_astillas_columna` | 40 | % | supuesto | fracción media usada para armar la columna del estado inicial; la real la calcula la compactación |
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
| `compresibilidad_licor` | 4.6e-10 | 1/Pa | literatura | agua a 25-150 °C, orden de magnitud |
| `compresibilidad_vaso` | 5e-10 | 1/Pa | supuesto | elasticidad del manto; ajusta la rapidez de las presurizaciones |
| `margen_ebullicion` | 0 | bar | supuesto | margen sobre la presión de saturación para declarar vaporización súbita |
| `compactacion.s0` | 36 | % | supuesto | astillas frescas sin carga |
| `compactacion.s_max` | 55 | % | supuesto |  |
| `compactacion.c_kappa` | 0.15 | - | supuesto | ablandamiento de la astilla cocida |
| `compactacion.c_esfuerzo` | 0.12 | - | supuesto |  |
| `compactacion.esfuerzo_ref` | 5 | kPa | supuesto |  |
| `compactacion.mu_K` | 0.08 | - | supuesto | fricción con la pared × coeficiente de empuje lateral |
| `compactacion.k_arrastre` | 200000 | - | supuesto | Pa/m por m/s de velocidad superficial del licor (+ hacia abajo) |
| `compactacion.tau` | 10 | min | supuesto | la columna se compacta o expande con esta constante de tiempo; también filtra el caudal de licor usado para el arrastre |
| `colgamiento.hueco_maximo` | 600 | m3 | supuesto | al superarlo, la columna colgada cae (≈ 7,6 m en el fondo del digestor) |
| `colgamiento.fraccion_liberacion` | 0.6 | - | supuesto | si las extracciones bajo la columna (corrientes_liberacion) bajan de esta fracción de su caudal al colgarse, la columna deja de estar apretada contra las mallas |
| `colgamiento.tiempo_liberacion` | 300 | s | supuesto | tiempo con las extracciones bajas para que la columna se suelte sin caer de golpe |
| `raspadores.imp.torque_vacio` | 15 | - | supuesto | kN·m |
| `raspadores.imp.k_torque` | 4 | - | supuesto | kN·m por kPa |
| `raspadores.imp.corriente_vacio` | 40 | - | supuesto | A |
| `raspadores.imp.k_corriente` | 1.5 | - | supuesto | A por kN·m |
| `raspadores.imp.corriente_alarma` | 250 | - | supuesto | A |
| `raspadores.dig.torque_vacio` | 25 | - | supuesto | kN·m |
| `raspadores.dig.k_torque` | 6 | - | supuesto | kN·m por kPa |
| `raspadores.dig.corriente_vacio` | 60 | - | supuesto | A |
| `raspadores.dig.k_corriente` | 1.2 | - | supuesto | A por kN·m |
| `raspadores.dig.corriente_alarma` | 350 | - | supuesto | A |

## config/energia.json

| Parámetro | Valor | Unidad | Origen | Fuente / nota |
|-----------|-------|--------|--------|---------------|
| `T_ambiente` | 20 | °C | supuesto |  |
| `UA_perdidas.imp` | 5 | kW/K | supuesto |  |
| `UA_perdidas.dig` | 15 | kW/K | supuesto |  |
| `vapor.P_MP` | 12 | bar(g) | supuesto | cabezal de vapor de media presión a los calentadores (P8) |
| `vapor.P_BP` | 3.5 | bar(g) | supuesto | vapor fresco de baja presión al silo |
| `vapor.vapor_bp_max` | 15 | kg/s | supuesto | capacidad de vapor fresco al silo |
| `T_astillas_patio` | 15 | °C | supuesto | temperatura de las astillas en el patio |

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
| `reacciones.lignina_rapida.A` | 0.008832 | 1/s | calibrado | calibrado 2026-10-07 (objetivo: kappa) |
| `reacciones.lignina_rapida.E` | 50 | kJ/mol | supuesto |  |
| `reacciones.lignina_rapida.a_OH` | 0 | - | supuesto |  |
| `reacciones.lignina_principal_OH.A` | 0.0008832 | 1/s | calibrado | calibrado 2026-10-07 (objetivo: kappa) |
| `reacciones.lignina_principal_OH.E` | 130 | kJ/mol | supuesto |  |
| `reacciones.lignina_principal_OH.a_OH` | 1 | - | supuesto |  |
| `reacciones.lignina_principal_HS.A` | 0.001178 | 1/s | calibrado | calibrado 2026-10-07 (objetivo: kappa) |
| `reacciones.lignina_principal_HS.E` | 120 | kJ/mol | supuesto |  |
| `reacciones.lignina_principal_HS.a_OH` | 0.5 | - | supuesto |  |
| `reacciones.lignina_principal_HS.b_HS` | 0.4 | - | supuesto |  |
| `reacciones.lignina_residual.A` | 0.0004122 | 1/s | calibrado | calibrado 2026-10-07 (objetivo: kappa) |
| `reacciones.lignina_residual.E` | 117 | kJ/mol | supuesto |  |
| `reacciones.lignina_residual.a_OH` | 0.7 | - | supuesto |  |
| `reacciones.condensacion.A` | 0.00005 | 1/s | supuesto | lignina principal → residual con álcali bajo |
| `reacciones.condensacion.E` | 100 | kJ/mol | supuesto |  |
| `reacciones.condensacion.OH_c` | 3 | g/L NaOH | supuesto |  |
| `reacciones.condensacion.n` | 4 | - | supuesto |  |
| `reacciones.reprecipitacion.k` | 0.0005 | 1/s | supuesto | por mol/L bajo el umbral |
| `reacciones.reprecipitacion.OH_umbral` | 3 | g/L NaOH | supuesto |  |
| `reacciones.celulosa_peeling.A` | 0.0003975 | 1/s | calibrado | calibrado 2026-10-07 (objetivo: rendimiento) |
| `reacciones.celulosa_peeling.E` | 100 | kJ/mol | supuesto |  |
| `reacciones.celulosa_hidrolisis.A` | 0.00003533 | 1/s | calibrado | calibrado 2026-10-07 (objetivo: rendimiento) |
| `reacciones.celulosa_hidrolisis.E` | 150 | kJ/mol | supuesto |  |
| `reacciones.xilano_disolucion.A` | 0.0006223 | 1/s | calibrado | calibrado 2026-10-07 (objetivo: rendimiento) |
| `reacciones.xilano_disolucion.E` | 80 | kJ/mol | supuesto |  |
| `reacciones.xilano_disolucion.a_OH` | 1 | - | supuesto |  |
| `reacciones.xilano_hidrolisis.A` | 0.00004416 | 1/s | calibrado | calibrado 2026-10-07 (objetivo: rendimiento) |
| `reacciones.xilano_hidrolisis.E` | 120 | kJ/mol | supuesto |  |
| `reacciones.otros_peeling.A` | 0.0006621 | 1/s | calibrado | calibrado 2026-10-07 (objetivo: rendimiento) |
| `reacciones.otros_peeling.E` | 90 | kJ/mol | supuesto |  |
| `reacciones.otros_hidrolisis.A` | 0.00004416 | 1/s | calibrado | calibrado 2026-10-07 (objetivo: rendimiento) |
| `reacciones.otros_hidrolisis.E` | 120 | kJ/mol | supuesto |  |
| `reacciones.extraibles.A` | 0.001 | 1/s | supuesto |  |
| `reacciones.extraibles.E` | 40 | kJ/mol | supuesto |  |
| `reacciones.acetilos.A` | 0.005 | 1/s | supuesto | desacetilación rápida |
| `reacciones.acetilos.E` | 40 | kJ/mol | supuesto |  |
| `reacciones.hexa_formacion.A` | 0.0003594 | 1/s | calibrado | calibrado 2026-10-07 (objetivo: kappaHexA) |
| `reacciones.hexa_formacion.E` | 110 | kJ/mol | supuesto |  |
| `reacciones.hexa_formacion.a_OH` | 1 | - | supuesto |  |
| `reacciones.hexa_degradacion.A` | 0.00003 | 1/s | supuesto |  |
| `reacciones.hexa_degradacion.E` | 120 | kJ/mol | supuesto |  |
| `reacciones.hexa_degradacion.a_OH` | 0 | - | supuesto | sobre todo térmica |
| `reacciones.viscosidad.A` | 6.269e-8 | 1/s | calibrado | calibrado 2026-10-07 (objetivo: viscosidad) |
| `reacciones.viscosidad.E` | 179 | kJ/mol | especificacion | Kubes et al. (1983), factor G; verificar |
| `reacciones.viscosidad.a_OH` | 1 | - | supuesto |  |
| `reacciones.viscosidad.beta_DS` | 0.005 | L/g | supuesto | daño extra por sólidos orgánicos disueltos (efecto Lo-Solids) |
| `reacciones.redeposito_xilano.k` | 0.0001 | 1/s | supuesto | por mol/L bajo el umbral |
| `reacciones.redeposito_xilano.OH_umbral` | 10 | g/L NaOH | supuesto |  |
| `solidos_disueltos.kappa_DS` | 0.002 | L/g | supuesto | freno de la deslignificación: f = 1/(1 + kappa_DS·DS_org) |
| `consumo_alcali.alfa_lignina` | 3.83 | mol/kg | calibrado | calibrado 2026-10-07 (objetivo: alcaliExtraccion) |
| `consumo_alcali.alfa_carbohidratos` | 6 | mol/kg | supuesto | OH⁻ por kg de carbohidrato degradado (ácidos) |
| `consumo_alcali.alfa_extraibles` | 3 | mol/kg | supuesto |  |
| `consumo_alcali.A_DS` | 0.00009 | 1/s | supuesto | mol OH⁻ por kg de sólido orgánico disuelto, por s y por mol/L de OH⁻ |
| `consumo_alcali.E_DS` | 100 | kJ/mol | supuesto |  |
| `consumo_alcali.beta_HS_lignina` | 0.5 | mol/kg | supuesto | HS⁻ por kg de lignina disuelta |
| `impregnacion.A` | 0.007791 | 1/s | calibrado | calibrado 2026-10-07 (objetivo: rechazos) |
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
| `astillas.T_vaporizacion` | 100 | °C | supuesto | consigna: el vapor fresco completa lo que no da el vapor flash |
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
| `caudales.ext_principal` | 100 | m3/h | supuesto | caudal de diseño de la válvula (apertura inicial) |
| `caudales.imp_exceso` | 190 | m3/h | supuesto | caudal de diseño de la válvula (apertura inicial) |
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

## Sistema de control (config/instrumentos, lazos, enclavamientos, alarmas)

Formato compacto: **todos estos valores son supuestos** de diseño de un DCS
típico, no datos de una planta. Sintonías verificadas con pruebas de escalón
(`npm run sintonia`, ver `docs/SINTONIA.md`).

### Transmisores y analizadores

Ruido: desviación estándar en % del rango. τ: filtro de primer orden (s).
Analizadores: periodo de muestreo / tiempo de análisis (s) / error (desv. est.).

| Tag | Descripción | Variable | Rango | Ruido % | τ s | Analizador |
|-----|-------------|----------|-------|---------|-----|------------|
| WI-101 | Caudal de astillas (medidor, densidad nominal) | `W:medidor` | 0–300 t/h | 0.3 | 2 |  |
| SI-101 | Velocidad del medidor de astillas | `rpm:medidor` | 0–25 rpm | 0.1 | 1 |  |
| LI-102 | Nivel del silo de astillas | `L:silo` | 0–100 % | 0.5 | 10 |  |
| TI-103 | Temperatura de astillas vaporizadas | `T:silo` | 0–120 °C | 0.2 | 30 |  |
| WI-104 | Astillas acumuladas en el tubo de astillas | `M:tubo` | 0–30 t | 0.5 | 5 |  |
| FI-111 | Licor blanco a la alimentación | `Q:lb_alim` | 0–400 m3/h | 0.5 | 3 |  |
| FI-112 | Licor blanco a la transferencia | `Q:lb_transf` | 0–100 m3/h | 0.5 | 3 |  |
| FI-113 | Licor blanco a la circulación superior | `Q:lb_sup` | 0–200 m3/h | 0.5 | 3 |  |
| FI-114 | Licor blanco a la circulación inferior | `Q:lb_inf` | 0–200 m3/h | 0.5 | 3 |  |
| FI-115 | Licor negro a la impregnación | `Q:licor_imp` | 0–500 m3/h | 0.5 | 3 |  |
| FI-116 | Circulación de tope del impregnador | `Q:circ_tope_imp` | 0–500 m3/h | 0.5 | 3 |  |
| LW-117 | Relación licor/madera (calculada) | `LW` | 0–8 m³/t | 0 | 10 |  |
| PI-201 | Presión del impregnador | `P:imp` | 0–12 bar(g) | 0.2 | 0.5 |  |
| LI-202 | Nivel de astillas del impregnador | `L:astillas:imp` | 0–23 m | 0.5 | 10 |  |
| TI-203 | Temperatura de impregnación | `T:zona:imp:impregnacion` | 0–200 °C | 0.1 | 20 |  |
| FI-204 | Exceso del separador del impregnador | `Q:imp_exceso` | 0–500 m3/h | 0.5 | 3 |  |
| II-205 | Corriente del raspador del impregnador | `I:raspador:imp` | 0–400 A | 0.5 | 2 |  |
| FI-211 | Retorno de la circulación de transferencia | `Q:retorno_transf` | 0–1500 m3/h | 0.5 | 3 |  |
| TI-212 | Salida del calentador de transferencia | `T:calentador:retorno_transf` | 50–200 °C | 0.1 | 5 |  |
| PI-301 | Presión del digestor (tope) | `P:dig` | 0–12 bar(g) | 0.2 | 0.5 |  |
| LI-302 | Nivel de astillas del digestor | `L:astillas:dig` | 0–57 m | 0.5 | 10 |  |
| TI-303 | Temperatura del tope del digestor | `T:zona:dig:tope` | 0–200 °C | 0.1 | 20 |  |
| TI-304 | Temperatura de cocción superior | `T:zona:dig:coccion_superior` | 0–200 °C | 0.1 | 20 |  |
| TI-305 | Temperatura de cocción inferior | `T:zona:dig:coccion_inferior` | 0–200 °C | 0.1 | 20 |  |
| TI-306 | Temperatura de la zona de lavado | `T:zona:dig:lavado` | 0–200 °C | 0.1 | 20 |  |
| II-307 | Corriente del raspador del digestor | `I:raspador:dig` | 0–500 A | 0.5 | 2 |  |
| FI-401 | Circulación de cocción superior | `Q:circ_sup` | 0–1500 m3/h | 0.5 | 3 |  |
| TI-402 | Salida del calentador superior | `T:calentador:circ_sup` | 50–200 °C | 0.1 | 5 |  |
| FI-403 | Circulación de cocción inferior | `Q:circ_inf` | 0–1500 m3/h | 0.5 | 3 |  |
| TI-404 | Salida del calentador inferior | `T:calentador:circ_inf` | 50–200 °C | 0.1 | 5 |  |
| FI-405 | Filtrado a la circulación superior | `Q:fil_sup` | 0–400 m3/h | 0.5 | 3 |  |
| FI-406 | Filtrado a la circulación inferior | `Q:fil_inf` | 0–400 m3/h | 0.5 | 3 |  |
| FI-410 | Vapor de media presión a calentadores | `vapor:total` | 0–200 t/h | 0.5 | 5 |  |
| FI-501 | Extracción superior | `Q:ext_superior` | 0–300 m3/h | 0.5 | 3 |  |
| FI-502 | Extracción principal a flash | `Q:ext_principal` | 0–500 m3/h | 0.5 | 3 |  |
| FI-503 | Extracción final | `Q:ext_final` | 0–1500 m3/h | 0.5 | 3 |  |
| AI-504 | Álcali efectivo en la extracción principal | `EA:corriente:ext_principal` | 0–40 g/L | 0 | 0 | 600 / 120 / ±0.3 |
| AI-505 | Álcali efectivo en la extracción final | `EA:corriente:ext_final` | 0–40 g/L | 0 | 0 | 600 / 120 / ±0.3 |
| LI-510 | Nivel del ciclón flash 1 | `L:flash:flash1` | 0–100 % | 0.5 | 3 |  |
| LI-511 | Nivel del ciclón flash 2 | `L:flash:flash2` | 0–100 % | 0.5 | 3 |  |
| FI-512 | Licor negro débil a evaporadores | `Q:flash:flash2` | 0–2500 m3/h | 0.5 | 5 |  |
| PDI-521 | ΔP separador del impregnador | `dP:malla:separador_imp` | 0–2 bar | 0.5 | 5 |  |
| PDI-522 | ΔP separador del digestor | `dP:malla:separador_dig` | 0–2 bar | 0.5 | 5 |  |
| PDI-523 | ΔP mallas de extracción superior | `dP:malla:mallas_superior` | 0–2 bar | 0.5 | 5 |  |
| PDI-524 | ΔP mallas de la circulación superior | `dP:malla:mallas_circ_sup` | 0–2 bar | 0.5 | 5 |  |
| PDI-525 | ΔP mallas de extracción principal | `dP:malla:mallas_principal` | 0–2 bar | 0.5 | 5 |  |
| PDI-526 | ΔP mallas de la circulación inferior | `dP:malla:mallas_circ_inf` | 0–2 bar | 0.5 | 5 |  |
| PDI-527 | ΔP mallas de extracción final | `dP:malla:mallas_final` | 0–2 bar | 0.5 | 5 |  |
| FI-601 | Filtrado de lavado al fondo | `Q:fil_fondo` | 0–2000 m3/h | 0.5 | 3 |  |
| FI-602 | Dilución del fondo | `Q:dilucion` | 0–500 m3/h | 0.5 | 3 |  |
| FI-603 | Soplado (lechada) | `Q:soplado` | 0–2000 m3/h | 0.5 | 3 |  |
| TI-604 | Temperatura de soplado | `T:corriente:soplado` | 0–150 °C | 0.1 | 10 |  |
| CI-605 | Consistencia de soplado | `Cs:soplado` | 0–20 % | 1 | 10 |  |
| LI-606 | Nivel del estanque de soplado | `L:estanque` | 0–100 % | 0.5 | 10 |  |
| FD-607 | Factor de dilución (calculado) | `FD` | 0–6 m³/ADt | 0 | 60 |  |
| AI-701 | Kappa en el soplado (analizador) | `kappa:soplado` | 0–100  | 0 | 0 | 1500 / 360 / ±0.5 |
| QI-702 | Producción (calculada) | `prod` | 0–4000 ADt/d | 0 | 60 |  |
| HI-703 | Factor H en el soplado (calculado) | `H:soplado` | 0–1500  | 0 | 60 |  |

### Laboratorio (retardo 20–40 min)

| Análisis | Nombre | Error (desv. est.) |
|----------|--------|--------------------|
| kappa | Kappa de la pulpa | ±0.4  |
| viscosidad | Viscosidad intrínseca | ±15 mL/g |
| rendimiento | Rendimiento (estimado) | ±0.5 % |
| rechazos | Rechazos | ±0.05 % |
| alcali_ext_principal | Álcali residual, extracción principal | ±0.2 g/L |
| alcali_ext_final | Álcali residual, extracción final | ±0.2 g/L |
| alcali_soplado | Álcali residual, soplado | ±0.2 g/L |
| humedad_astillas | Humedad de astillas | ±0.8 % |
| densidad_astillas | Densidad básica de astillas | ±8 kg/m³ |
| finos_astillas | Finos en astillas (granulometría) | ±0.4 % |
| licor_blanco_EA | Álcali efectivo del licor blanco | ±1 g/L |
| licor_blanco_sulfidez | Sulfidez del licor blanco | ±0.8 % |

### Lazos

| Lazo | Descripción | PV | Salida | Kc | Ti s | Acción | Modo inicial (maestros) |
|------|-------------|----|--------|----|------|--------|-------------------------|
| WIC-101 | Ritmo de producción: caudal de astillas (velocidad del medidor) | WI-101 | medidor  | 0.3 | 8 | inversa | AUTO |
| LIC-102 | Nivel del silo de astillas (transportador) | LI-102 | servicio transportadorSilo | 3 | 900 | inversa | AUTO |
| FIC-111 | Licor blanco a la alimentación | FI-111 | caudal lb_alim | 0.3 | 4 | inversa | CAS (FFC-110) |
| FIC-112 | Licor blanco a la transferencia | FI-112 | caudal lb_transf | 0.3 | 4 | inversa | CAS (FFC-110) |
| FIC-113 | Licor blanco a la circulación superior | FI-113 | caudal lb_sup | 0.3 | 4 | inversa | CAS (FFC-110) |
| FIC-114 | Licor blanco a la circulación inferior | FI-114 | caudal lb_inf | 0.3 | 4 | inversa | CAS (FFC-110) |
| FIC-115 | Licor negro a la impregnación | FI-115 | caudal licor_imp | 0.3 | 4 | inversa | CAS (FFC-117) |
| FIC-116 | Circulación de tope del impregnador | FI-116 | caudal circ_tope_imp | 0.3 | 4 | inversa | AUTO |
| PIC-201 | Presión del impregnador (exceso del separador) | PI-201 | valvula imp_exceso | 2 | 40 | directa | AUTO |
| LIC-202 | Nivel de astillas del impregnador (transferencia) | LI-202 | madera transferencia | 4 | 1800 | directa | AUTO |
| FIC-211 | Retorno de la circulación de transferencia | FI-211 | caudal retorno_transf | 0.3 | 4 | inversa | AUTO |
| TIC-212 | Temperatura de salida del calentador de transferencia | TI-212 | vapor retorno_transf | 6 | 60 | inversa | AUTO |
| PIC-301 | Presión del digestor (extracción principal) | PI-301 | valvula ext_principal | 3 | 30 | directa | AUTO |
| LIC-302 | Nivel de astillas del digestor (soplado) | LI-302 | madera soplado | 6 | 1500 | directa | AUTO |
| FIC-401 | Circulación de cocción superior | FI-401 | caudal circ_sup | 0.3 | 4 | inversa | AUTO |
| TIC-402 | Temperatura de salida del calentador superior | TI-402 | vapor circ_sup | 4 | 60 | inversa | AUTO |
| FIC-403 | Circulación de cocción inferior | FI-403 | caudal circ_inf | 0.3 | 4 | inversa | AUTO |
| TIC-404 | Temperatura de salida del calentador inferior | TI-404 | vapor circ_inf | 4 | 60 | inversa | AUTO |
| FIC-405 | Filtrado a la circulación superior | FI-405 | caudal fil_sup | 0.3 | 4 | inversa | AUTO |
| FIC-406 | Filtrado a la circulación inferior | FI-406 | caudal fil_inf | 0.3 | 4 | inversa | AUTO |
| FIC-501 | Extracción superior | FI-501 | caudal ext_superior | 0.3 | 4 | inversa | AUTO |
| FIC-503 | Extracción final | FI-503 | caudal ext_final | 0.3 | 4 | inversa | CAS (FFC-503) |
| LIC-510 | Nivel del ciclón flash 1 | LI-510 | flash flash1 | 2 | 300 | directa | AUTO |
| LIC-511 | Nivel del ciclón flash 2 | LI-511 | flash flash2 | 2 | 300 | directa | AUTO |
| FIC-601 | Filtrado de lavado al fondo | FI-601 | caudal fil_fondo | 0.3 | 4 | inversa | CAS (FDC-607 o TIC-604) |
| FIC-602 | Dilución del fondo | FI-602 | caudal dilucion | 0.3 | 4 | inversa | CAS (FFC-602) |
| CIC-605 | Consistencia de soplado (licor de la lechada de soplado; la dilución lo sigue) | CI-605 | caudal soplado | 1 | 300 | directa | AUTO |
| TIC-604 | Temperatura de soplado (maestro alternativo del filtrado de lavado) | TI-604 | consigna de FIC-601 | 4 | 1200 | directa | MAN |
| FDC-607 | Factor de dilución (filtrado de lavado) | FD-607 | consigna de FIC-601 | 1 | 300 | inversa | AUTO |

### Bloques de cálculo y control avanzado

| Bloque | Descripción | Tipo | Activo | Parámetros |
|--------|-------------|------|--------|------------|
| FFC-110 | Carga de álcali (razón sobre madera) y reparto del licor blanco | carga_alcali | sí | `{"carga":18,"EA_licor_blanco":117.5,"reparto":{"FIC-111":50,"FIC-112":10,"FIC-113":20,"FIC-114":20}}` |
| FFC-117 | Relación licor/madera en la alimentación (licor negro) | licor_madera | sí | `{"relacion":4,"humedad":47.5}` |
| FFC-503 | Coordinación del lavado: la extracción final sigue los cambios del filtrado de lavado | seguimiento | sí | `{"fuente":"lazo:FIC-601","esclavo":"FIC-503","ganancia":1}` |
| FFC-602 | Coordinación del fondo: la dilución sigue los cambios del licor de soplado | seguimiento | sí | `{"fuente":"corriente:soplado","esclavo":"FIC-602","ganancia":1}` |
| RC-700 | Coordinación de cambios de ritmo (control avanzado) | ritmo | no | `{"produccion":3000,"rampa":150,"rendimiento":53.5}` |
| HIC-703 | Control de factor H con corrección por ritmo (control avanzado) | factor_h | no | `{"objetivo":460,"tiempo_superior":1,"tiempo_inferior":1.2,"H_resto":60,"ganancia":0.0015,"bias_max":8}` |
| AIC-701 | Control de kappa con el analizador (control avanzado) | kappa | no | `{"objetivo":17,"ganancia":6,"Ti":10800}` |

### Enclavamientos (rearme manual)

| Id | Descripción | Condición (retardo) | Acciones |
|----|-------------|---------------------|----------|
| I-01 | Parada de alimentación por presión muy alta del digestor | PI-301 > 8.5 (2 s) | WIC-101 → 0 % |
| I-02 | Parada de alimentación por nivel de astillas muy alto en el digestor | LI-302 > 56 (30 s) | WIC-101 → 0 % |
| I-03 | Pérdida de circulación superior con vapor abierto: cierra el vapor | FI-401 < 300 (10 s) | TIC-402 → 0 % |
| I-04 | Pérdida de circulación inferior con vapor abierto: cierra el vapor | FI-403 < 300 (10 s) | TIC-404 → 0 % |
| I-05 | Pérdida de circulación de transferencia: cierra el vapor | FI-211 < 300 (10 s) | TIC-212 → 0 % |
| I-06 | Temperatura de soplado muy alta: detiene el soplado | TI-604 > 98 (60 s) | LIC-302 → 0 % |
| I-07 | Corriente muy alta del raspador del digestor: detiene soplado y alimentación | II-307 > 350 (5 s) | LIC-302 → 0 %; WIC-101 → 0 % |
| I-08 | Estanque de soplado lleno: detiene el soplado | LI-606 > 95 (10 s) | LIC-302 → 0 % |
| I-09 | Protección de la bomba de circulación superior (ΔP de mallas muy alta) | PDI-524 > 0.95 (60 s) | bomba bomba_circ_sup detener; TIC-402 → 0 % |
| I-10 | Protección de la bomba de circulación inferior (ΔP de mallas muy alta) | PDI-526 > 0.95 (60 s) | bomba bomba_circ_inf detener; TIC-404 → 0 % |
| I-11 | Parada de alimentación por nivel de astillas muy alto en el impregnador | LI-202 > 22.8 (30 s) | WIC-101 → 0 % |

### Alarmas configuradas

Además se generan solas una alarma de prioridad 1 por cada enclavamiento
disparado y una de prioridad 3 por cada transmisor con señal fuera de rango.
Supresión del grupo "proceso" con WI-101 < 20 durante 600 s.

| Id | Mensaje | Fuente | Tipo y límite | Banda | Retardo s | Prioridad | Grupo |
|----|---------|--------|---------------|-------|-----------|-----------|-------|
| PI-301-AA | Presión del digestor muy alta | PI-301 | alta 8 | 0.2 | 2 | 1 | seguridad |
| PI-301-A | Presión del digestor alta | PI-301 | alta 7 | 0.2 | 5 | 2 | seguridad |
| PI-301-B | Presión del digestor baja: riesgo de vaporización | PI-301 | baja 4 | 0.2 | 5 | 2 | seguridad |
| PI-201-A | Presión del impregnador alta | PI-201 | alta 7 | 0.2 | 5 | 2 | seguridad |
| PI-201-B | Presión del impregnador baja | PI-201 | baja 3.5 | 0.2 | 10 | 3 | proceso |
| LI-302-A | Nivel de astillas del digestor alto | LI-302 | alta 55.5 | 0.3 | 30 | 2 | proceso |
| LI-302-B | Nivel de astillas del digestor bajo | LI-302 | baja 45 | 0.3 | 30 | 2 | proceso |
| LI-202-A | Nivel de astillas del impregnador alto | LI-202 | alta 22.5 | 0.2 | 30 | 3 | proceso |
| LI-202-B | Nivel de astillas del impregnador bajo | LI-202 | baja 18 | 0.2 | 30 | 3 | proceso |
| TI-304-B | Temperatura de cocción superior baja | TI-304 | baja 144 | 0.5 | 120 | 3 | proceso |
| TI-304-A | Temperatura de cocción superior alta | TI-304 | alta 153 | 0.5 | 120 | 3 | proceso |
| TI-305-B | Temperatura de cocción inferior baja | TI-305 | baja 147 | 0.5 | 120 | 3 | proceso |
| TI-305-A | Temperatura de cocción inferior alta | TI-305 | alta 156 | 0.5 | 120 | 3 | proceso |
| TI-604-A | Temperatura de soplado alta | TI-604 | alta 92 | 1 | 60 | 2 | proceso |
| AI-504-B | Álcali residual bajo en la extracción principal | AI-504 | baja 4 | 0.3 | 0 | 2 | proceso |
| AI-505-B | Álcali residual bajo en la extracción final | AI-505 | baja 4 | 0.3 | 0 | 2 | proceso |
| AI-701-A | Kappa alto en el soplado | AI-701 | alta 19 | 0.3 | 0 | 3 | proceso |
| AI-701-B | Kappa bajo en el soplado | AI-701 | baja 15 | 0.3 | 0 | 3 | proceso |
| CI-605-A | Consistencia de soplado alta | CI-605 | alta 12 | 0.3 | 60 | 4 | proceso |
| CI-605-B | Consistencia de soplado baja | CI-605 | baja 6 | 0.3 | 60 | 4 | proceso |
| LI-510-A | Nivel alto en el ciclón flash 1 | LI-510 | alta 85 | 2 | 10 | 3 | equipo |
| LI-511-A | Nivel alto en el ciclón flash 2 | LI-511 | alta 85 | 2 | 10 | 3 | equipo |
| LI-606-A | Nivel alto en el estanque de soplado | LI-606 | alta 85 | 2 | 10 | 2 | equipo |
| LI-606-B | Nivel bajo en el estanque de soplado | LI-606 | baja 10 | 2 | 30 | 4 | equipo |
| LI-102-B | Nivel bajo en el silo de astillas | LI-102 | baja 20 | 2 | 30 | 3 | equipo |
| WI-104-A | Astillas acumulándose en el tubo de astillas | WI-104 | alta 2 | 0.5 | 10 | 2 | equipo |
| PDI-524-A | ΔP alta en las mallas de circulación superior | PDI-524 | alta 0.8 | 0.05 | 60 | 3 | equipo |
| PDI-525-A | ΔP alta en las mallas de extracción principal | PDI-525 | alta 0.8 | 0.05 | 60 | 3 | equipo |
| PDI-526-A | ΔP alta en las mallas de circulación inferior | PDI-526 | alta 0.8 | 0.05 | 60 | 3 | equipo |
| PDI-527-A | ΔP alta en las mallas de extracción final | PDI-527 | alta 0.8 | 0.05 | 60 | 3 | equipo |
| II-307-A | Corriente alta del raspador del digestor | II-307 | alta 300 | 10 | 10 | 2 | equipo |
| II-205-A | Corriente alta del raspador del impregnador | II-205 | alta 220 | 10 | 10 | 3 | equipo |
| FI-401-B | Caudal bajo en la circulación superior | FI-401 | baja 600 | 20 | 10 | 2 | proceso |
| FI-403-B | Caudal bajo en la circulación inferior | FI-403 | baja 600 | 20 | 10 | 2 | proceso |
| FI-211-B | Caudal bajo en la circulación de transferencia | FI-211 | baja 600 | 20 | 10 | 2 | proceso |
| TIC-402-D | El calentador superior no alcanza su consigna | lazo:TIC-402 | desviacion 4 | 0.5 | 300 | 3 | equipo |
| TIC-404-D | El calentador inferior no alcanza su consigna | lazo:TIC-404 | desviacion 4 | 0.5 | 300 | 3 | equipo |
| TIC-212-D | El calentador de transferencia no alcanza su consigna | lazo:TIC-212 | desviacion 4 | 0.5 | 300 | 3 | equipo |
| EV-apertura_alivio | Abrió la válvula de alivio | evento:apertura_alivio | evento  | 0 | 0 | 1 | seguridad |
| EV-apertura_seguridad | Abrió la válvula de seguridad | evento:apertura_seguridad | evento  | 0 | 0 | 1 | seguridad |
| EV-vaporizacion_subita | Vaporización súbita en el vaso | evento:vaporizacion_subita | evento  | 0 | 0 | 1 | seguridad |
| EV-caida_columna | Caída de la columna de astillas | evento:caida_columna | evento  | 0 | 0 | 2 | equipo |
| EV-detencion_bomba | Bomba detenida | evento:detencion_bomba | evento  | 0 | 0 | 3 | equipo |
