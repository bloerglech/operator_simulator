# Eventos: perturbaciones y fallas

Generado por `npm run documentar` desde `config/eventos.json` (no editar a mano).
Cada evento tiene una causa, síntomas coherentes en las variables y una
respuesta correcta conocida. Se activan desde el panel del instructor, desde
el guion de una misión o con el generador aleatorio (operación libre).

Generador: tiempo medio entre eventos 6 h (dificultad 1), 3 h (dificultad 2), 1,5 h (dificultad 3).
En dificultad 3 no hay aviso previo por radio o teléfono.

## Madera

### Lluvia: astillas más húmedas (`lluvia`)

- **Causa:** Llueve sobre la pila de astillas del patio.
- **Síntomas:** Sube la relación licor/madera (LW-117) con el mismo licor; el álcali se diluye: baja el álcali residual de las extracciones (AI-504) y, 3 a 5 h después, sube el kappa.
- **Respuesta correcta:** Pedir humedad de astillas al laboratorio, actualizar la humedad en FFC-117 (relación licor/madera) y, si el kappa sube, aumentar levemente la carga de álcali en FFC-110.
- **Mecanismo en el simulador:** fuente astillas.humedad hasta 53 % en 1 h. Duración: 6 h, luego vuelve a la normalidad.
- Dificultad mínima 1, peso 3 en el generador.

### Temporal: astillas muy húmedas (`lluvia_fuerte`)

- **Causa:** Temporal sobre la pila de astillas: la madera llega muy mojada.
- **Síntomas:** Sube la relación licor/madera (LW-117) con el mismo licor; el álcali se diluye: baja el álcali residual de las extracciones (AI-504) y, 3 a 5 h después, sube el kappa.
- **Respuesta correcta:** Pedir humedad de astillas al laboratorio, actualizar la humedad en FFC-117 (relación licor/madera) y, si el kappa sube, aumentar levemente la carga de álcali en FFC-110.
- **Mecanismo en el simulador:** fuente astillas.humedad hasta 56 % en 1 h. Duración: 12 h, luego vuelve a la normalidad.
- Dificultad mínima 2, peso 1 en el generador.

### Madera más liviana (`densidad_baja`)

- **Causa:** Llega un lote de nitens de menor densidad básica.
- **Síntomas:** El medidor calcula la madera con la densidad nominal: entra menos madera de la que indica WI-101. La carga real de álcali sube: sube el álcali residual y baja el kappa; baja la producción real (QI-702).
- **Respuesta correcta:** Pedir densidad al laboratorio; subir la velocidad del medidor para recuperar la producción y corregir la carga de álcali según el kappa.
- **Mecanismo en el simulador:** fuente astillas.densidad hasta 440 en 30 min. Duración: 8 h, luego vuelve a la normalidad.
- Dificultad mínima 1, peso 2 en el generador.

### Madera más densa (`densidad_alta`)

- **Causa:** Llega un lote de mayor densidad básica.
- **Síntomas:** Entra más madera de la indicada: baja el álcali residual, sube el kappa y la producción real.
- **Respuesta correcta:** Pedir densidad al laboratorio; aumentar la carga de álcali o bajar la velocidad del medidor.
- **Mecanismo en el simulador:** fuente astillas.densidad hasta 520 en 30 min. Duración: 8 h, luego vuelve a la normalidad.
- Dificultad mínima 1, peso 2 en el generador.

### Astillas con sobre espesor (`sobre_espesor`)

- **Causa:** Falla del astillador: más astillas gruesas.
- **Síntomas:** La impregnación es más lenta: suben los rechazos (laboratorio) y algo el kappa, horas después.
- **Respuesta correcta:** Pedir granulometría y rechazos; aumentar la temperatura y el tiempo de impregnación, o la carga de álcali a la alimentación; avisar al patio.
- **Mecanismo en el simulador:** fuente astillas.impregnabilidad hasta 0.55 en 10 min. Duración: 4 h, luego vuelve a la normalidad.
- Dificultad mínima 2, peso 2 en el generador.

### Exceso de finos (`finos`)

- **Causa:** Astillas sobre astilladas o recicladas.
- **Síntomas:** Las mallas se tapan más rápido: sube su ΔP (PDI-52x) y baja el caudal que pueden extraer.
- **Respuesta correcta:** Mantener la conmutación de mallas activa, retrolavar las que se acerquen al límite y bajar la extracción si es necesario.
- **Mecanismo en el simulador:** perturbar finos hasta 2.5 en 10 min. Duración: 6 h, luego vuelve a la normalidad.
- Dificultad mínima 2, peso 2 en el generador.

### Astillas envejecidas (`envejecidas`)

- **Causa:** Astillas almacenadas mucho tiempo en la pila.
- **Síntomas:** La madera es menos reactiva: sube el kappa varias horas después sin otra causa visible.
- **Respuesta correcta:** Confirmar con el kappa del laboratorio; subir el factor H (temperatura) o la carga de álcali.
- **Mecanismo en el simulador:** fuente astillas.reactividad × 0.88 en 30 min. Duración: 8 h, luego vuelve a la normalidad.
- Dificultad mínima 2, peso 1 en el generador.

## Licor blanco

### Licor blanco débil (`licor_debil`)

- **Causa:** La caustificación entrega licor con menos álcali efectivo.
- **Síntomas:** El caudal de licor blanco no cambia, pero la carga real baja: cae el álcali residual de las extracciones y sube el kappa horas después.
- **Respuesta correcta:** Pedir EA del licor blanco al laboratorio: el bloque FFC-110 lo toma y compensa el caudal. Vigilar que haya licor suficiente.
- **Mecanismo en el simulador:** fuente licor_blanco.OH hasta 106 g/L NaOH en 1 h. Duración: 8 h, luego vuelve a la normalidad.
- Dificultad mínima 1, peso 2 en el generador.

### Baja la sulfidez del licor blanco (`sulfidez_baja`)

- **Causa:** Pérdidas de azufre en el ciclo de recuperación.
- **Síntomas:** Deslignificación algo más lenta: sube el kappa; la viscosidad baja.
- **Respuesta correcta:** Pedir sulfidez al laboratorio; compensar con temperatura o carga y avisar a recuperación.
- **Mecanismo en el simulador:** fuente licor_blanco.HS × 0.8 en 1 h. Duración: 8 h, luego vuelve a la normalidad.
- Dificultad mínima 2, peso 1 en el generador.

### Falta de licor blanco (`falta_licor`)

- **Causa:** Problema en la caustificación: hay menos licor blanco disponible.
- **Síntomas:** Los caudales de licor blanco (FI-111 a FI-114) quedan bajo su consigna aunque las válvulas abran: la carga real cae y el kappa sube horas después.
- **Respuesta correcta:** Bajar el ritmo de producción para que la carga se mantenga con el licor disponible, o aceptar kappa alto por un periodo corto.
- **Mecanismo en el simulador:** servicio licorBlancoMax hasta 220 m3/h en 10 min. Duración: 2 h, luego vuelve a la normalidad.
- Dificultad mínima 2, peso 1 en el generador.

## Servicios

### Caída de presión del vapor de media (`vapor_bajo`)

- **Causa:** Problema en la caldera de poder o alto consumo en otra área.
- **Síntomas:** Las válvulas de vapor de los TIC abren al máximo y las temperaturas de las circulaciones caen; baja el factor H.
- **Respuesta correcta:** Si no se recupera, bajar el ritmo para mantener el factor H; avisar a energía.
- **Mecanismo en el simulador:** servicio presionVaporMP hasta 8.5 bar(g) en 5 min. Duración: 1 h, luego vuelve a la normalidad.
- Dificultad mínima 1, peso 2 en el generador.

### Filtrado de lavado más caliente (`filtrado_caliente`)

- **Causa:** El lavado envía filtrado más caliente.
- **Síntomas:** Sube la temperatura del fondo y del soplado (TI-604) y el riesgo de vaporización en el estanque.
- **Respuesta correcta:** Aumentar el filtrado de lavado (factor de dilución) o pasar FIC-601 al control de temperatura de soplado (TIC-604).
- **Mecanismo en el simulador:** fuente filtrado.T hasta 88 en 30 min. Duración: 4 h, luego vuelve a la normalidad.
- Dificultad mínima 2, peso 1 en el generador.

### Filtrado de lavado sucio (`filtrado_sucio`)

- **Causa:** El lavado opera con baja eficiencia.
- **Síntomas:** Suben los sólidos disueltos en el fondo y en la cocción inferior; consume álcali; baja la viscosidad.
- **Respuesta correcta:** Aumentar el factor de dilución y la extracción final; avisar al lavado.
- **Mecanismo en el simulador:** fuente filtrado.LD hasta 35 en 30 min. Duración: 4 h, luego vuelve a la normalidad.
- Dificultad mínima 2, peso 1 en el generador.

### Evaporadores limitan la recepción de licor (`evaporadores_limitados`)

- **Causa:** Problema en la planta de evaporadores.
- **Síntomas:** Los ciclones flash se llenan (LI-510/511 altos), la extracción principal queda limitada y la presión del digestor sube en segundos.
- **Respuesta correcta:** Bajar el filtrado de lavado al fondo (FIC-601, fuera de cascada) en lo que falta en evaporadores: la extracción final lo sigue (FFC-503) y el balance del digestor se mantiene. Vigilar PI-301, LI-510/511 y la válvula de alivio; devolver FIC-601 a cascada cuando se normalice.
- **Mecanismo en el simulador:** servicio limiteEvaporadores hasta 800 m3/h en 5 min. Duración: 2 h, luego vuelve a la normalidad.
- Dificultad mínima 2, peso 1 en el generador.

### Evaporadores restringen fuerte la recepción de licor (`evaporadores_restringidos`)

- **Causa:** Falla en un efecto de los evaporadores: reciben un tercio menos de licor negro débil.
- **Síntomas:** FI-512 cae a 600 m³/h, los ciclones flash se llenan en minutos, la válvula de PIC-301 abre hasta el 100 % y la presión del digestor sube hasta la válvula de alivio (7,5 bar).
- **Respuesta correcta:** En los primeros minutos: FIC-601 a automático (fuera de cascada) y bajar su consigna unos 300 m³/h; FFC-503 baja la extracción final en lo mismo. Bajar el ritmo no alcanza: su efecto es lento. Volver FIC-601 a cascada al normalizarse.
- **Mecanismo en el simulador:** servicio limiteEvaporadores hasta 600 m3/h en 1 min. Duración: 1 h, luego vuelve a la normalidad.
- Dificultad mínima 3, peso 1 en el generador.

## Equipos

### Caída de la bomba de circulación superior (`bomba_circ_sup`)

- **Causa:** Disparo eléctrico de la bomba.
- **Síntomas:** FI-401 cae a cero, el enclavamiento I-03 cierra el vapor, la temperatura de cocción superior baja; el balance de licor cambia y la presión puede subir.
- **Respuesta correcta:** Volver a partir la bomba, rearmar I-03 y devolver TIC-402 a automático; vigilar la presión mientras tanto.
- **Mecanismo en el simulador:** `{"tipo":"bomba","id":"bomba_circ_sup","accion":"detener"}`. Duración: hasta que el operador lo resuelva.
- Dificultad mínima 2, peso 2 en el generador.

### Caída de la bomba de transferencia (`bomba_transferencia`)

- **Causa:** Disparo de la bomba de transferencia.
- **Síntomas:** Se detiene la transferencia de astillas al digestor: sube el nivel del impregnador, baja el del digestor, cae FI-211 y I-05 cierra el vapor de la transferencia.
- **Respuesta correcta:** Partir la bomba de inmediato; si no se puede, bajar la alimentación de astillas para no llenar el impregnador.
- **Mecanismo en el simulador:** `{"tipo":"bomba","id":"bomba_transferencia","accion":"detener"}`. Duración: hasta que el operador lo resuelva.
- Dificultad mínima 3, peso 1 en el generador.

### Caída de las bombas de astillas (`bombas_astillas`)

- **Causa:** Disparo de las bombas de astillas.
- **Síntomas:** Se corta la alimentación al impregnador: baja su nivel y, más tarde, el del digestor.
- **Respuesta correcta:** Partir las bombas; mientras tanto bajar el soplado para mantener el nivel del digestor.
- **Mecanismo en el simulador:** `{"tipo":"bomba","id":"bombas_astillas","accion":"detener"}`. Duración: 10 min.
- Dificultad mínima 2, peso 1 en el generador.

### Falla del raspador del impregnador (`raspador_imp`)

- **Causa:** Problema mecánico en el raspador de fondo del impregnador.
- **Síntomas:** Sube la corriente del raspador (II-205), la descarga se vuelve irregular y el nivel del impregnador oscila.
- **Respuesta correcta:** Bajar la alimentación, avisar a mantención y vigilar la corriente para no disparar el motor.
- **Mecanismo en el simulador:** perturbar friccion (imp) hasta 1.8 en 5 min. Duración: 2 h, luego vuelve a la normalidad.
- Dificultad mínima 2, peso 1 en el generador.

### Taponamiento de las mallas de extracción principal (`mallas_principales`)

- **Causa:** Finos y depósitos tapan las mallas.
- **Síntomas:** Sube PDI-525 hacia su máximo; la extracción principal no alcanza su caudal y sube la presión.
- **Respuesta correcta:** Retrolavar las mallas, mantener la conmutación y repartir la extracción hacia las otras mallas.
- **Mecanismo en el simulador:** `{"tipo":"perturbar","id":"taponamiento","malla":"mallas_principal","valor":1.5}`; perturbar finos hasta 2 en 5 min. Duración: 4 h, luego vuelve a la normalidad.
- Dificultad mínima 2, peso 2 en el generador.

### Calentador incrustado (`calentador_incrustado`)

- **Causa:** Depósitos de carbonato de calcio en el calentador inferior.
- **Síntomas:** La válvula de vapor de TIC-404 abre cada vez más y la temperatura no alcanza la consigna.
- **Respuesta correcta:** Conmutar al calentador de respaldo y lavar con ácido el incrustado.
- **Mecanismo en el simulador:** `{"tipo":"perturbar","id":"incrustacion","equipo":"circ_inf","valor":1.6}`. Duración: hasta que el operador lo resuelva.
- Dificultad mínima 2, peso 1 en el generador.

### Válvula pegada (`valvula_pegada`)

- **Causa:** Falla del actuador de una válvula de control.
- **Síntomas:** La salida del lazo cambia pero el caudal o la temperatura no responden; el lazo se satura.
- **Respuesta correcta:** Reconocer la falla en la tendencia (salida que se mueve, PV que no), pasar a manual y operar con los otros lazos; avisar a instrumentación.
- **Mecanismo en el simulador:** `{"tipo":"actuador","id":"$lazo","falla":"pegado"}`. Duración: 2 h. Parámetros posibles: lazo ∈ {FIC-401, FIC-403, FIC-503, TIC-402, FIC-601}.
- Dificultad mínima 3, peso 1 en el generador.

### Apagón (`apagon`)

- **Causa:** Corte total de energía eléctrica de la planta (falla en la subestación).
- **Síntomas:** Todas las bombas se detienen a la vez: la presión salta unos segundos (pueden abrir el alivio y la seguridad), los enclavamientos I-03, I-04 e I-05 cortan el vapor y luego el digestor queda a la presión de saturación, con el licor hirviendo en el tope. Lavado, evaporadores y el transportador de astillas también se detienen. El DCS sigue en línea (UPS).
- **Respuesta correcta:** Durante el corte: cerrar el soplado (LIC-302 en manual, salida 0), cortar la madera (WIC-101 en 0) y la transferencia (LIC-202 en manual, 0) y sacar de cascada FIC-115. Con la energía de vuelta: partir primero la bomba de filtrado y el lavado al fondo para llenar y presurizar, después las circulaciones (superior, inferior, transferencia), las bombas de licor y de extracción; rearmar los enclavamientos y volver los TIC a automático; partir como en una parada corta.
- **Mecanismo en el simulador:** `{"tipo":"bomba","id":"bombas_astillas","accion":"detener"}`; `{"tipo":"bomba","id":"bomba_transferencia","accion":"detener"}`; `{"tipo":"bomba","id":"bomba_circ_sup","accion":"detener"}`; `{"tipo":"bomba","id":"bomba_circ_inf","accion":"detener"}`; `{"tipo":"bomba","id":"bomba_licor_blanco","accion":"detener"}`; `{"tipo":"bomba","id":"bomba_filtrado","accion":"detener"}`; `{"tipo":"bomba","id":"bomba_lavado","accion":"detener"}`; `{"tipo":"bomba","id":"bomba_extraccion_superior","accion":"detener"}`; `{"tipo":"bomba","id":"bomba_extraccion_final","accion":"detener"}`; `{"tipo":"bomba","id":"bomba_licor_imp","accion":"detener"}`; `{"tipo":"servicio","id":"energia","valor":0}`; servicio lavado hasta 0 en 0 min; servicio limiteEvaporadores hasta 0 en 0 min. Duración: 30 min, luego vuelve a la normalidad.
- Dificultad mínima 3, peso 0 en el generador.

## Columna

### Columna colgada en el digestor (`colgamiento`)

- **Causa:** La columna de astillas se apoya en la pared y deja de bajar.
- **Síntomas:** El nivel de astillas (LI-302) sube aunque LIC-302 sople al máximo, la consistencia de soplado (CI-605) cae, la presión del digestor baja (se saca licor del hueco) y, si el hueco llega a 600 m³, la columna cae de golpe.
- **Respuesta correcta:** Bajar la alimentación, pasar LIC-302 a manual con menos soplado y bajar las extracciones bajo la columna (FIC-601 fuera de cascada; la extracción final lo sigue): con ellas bajo el 60 % durante 5 min la columna se suelta. Volver de a poco, con el soplado en proporción a la madera.
- **Mecanismo en el simulador:** `{"tipo":"perturbar","id":"colgamiento","vaso":"dig","valor":30}`. Duración: hasta que el operador lo resuelva.
- Dificultad mínima 3, peso 1 en el generador.

### Canalización en el digestor (`canalizacion`)

- **Causa:** El licor encuentra caminos preferentes en la columna (finos, compactación irregular).
- **Síntomas:** El álcali residual de las extracciones sube (se consume menos) mientras el kappa también sube; la temperatura de la zona es menos uniforme.
- **Respuesta correcta:** Reducir las extracciones y aumentar la circulación; cambios suaves de ritmo para recompactar la columna.
- **Mecanismo en el simulador:** perturbar canalizacion (dig) hasta 0.4 en 10 min. Duración: 4 h, luego vuelve a la normalidad.
- Dificultad mínima 3, peso 1 en el generador.

## Aguas abajo

### El lavado recibe menos pulpa (`lavado_lento`)

- **Causa:** Restricción en la línea de lavado.
- **Síntomas:** Sube el nivel del estanque de soplado (LI-606).
- **Respuesta correcta:** Bajar el ritmo antes de que el estanque llegue a su alarma alta.
- **Mecanismo en el simulador:** servicio lavado × 0.7 en 5 min. Duración: 3 h, luego vuelve a la normalidad.
- Dificultad mínima 1, peso 1 en el generador.

### Parada del lavado (`parada_lavado`)

- **Causa:** El lavado se detiene por una falla.
- **Síntomas:** El estanque de soplado se llena rápidamente: alarma LI-606 alta y luego el enclavamiento I-08 corta el soplado.
- **Respuesta correcta:** Bajar el soplado y la alimentación de inmediato (parada corta) y mantener el digestor caliente.
- **Mecanismo en el simulador:** servicio lavado hasta 0 en 0 min. Duración: 1 h, luego vuelve a la normalidad.
- Dificultad mínima 2, peso 1 en el generador.

### Parada larga del lavado (`parada_lavado_larga`)

- **Causa:** Falla mayor en el lavado (rotura de un filtro o de su accionamiento): no recibe pulpa durante unas 2,5 horas.
- **Síntomas:** El estanque de soplado se llena (LI-606 sube ≈ 0,6 % por minuto); a 95 % el enclavamiento I-08 corta el soplado, el nivel de astillas del digestor sube y I-02 corta la alimentación.
- **Respuesta correcta:** Parada corta en caliente: cortar la alimentación y el soplado antes de los enclavamientos, bajar las temperaturas de cocción unos 10 °C para no sobrecocer las astillas detenidas y mantener las circulaciones. Al volver el lavado, partir el soplado y la madera en escalones y subir las temperaturas.
- **Mecanismo en el simulador:** servicio lavado hasta 0 en 0 min. Duración: 2,5 h, luego vuelve a la normalidad.
- Dificultad mínima 3, peso 1 en el generador.

## Instrumentos

### Falla del analizador de kappa (`analizador_kappa`)

- **Causa:** El analizador de kappa deja de actualizar.
- **Síntomas:** AI-701 muestra el mismo valor por más de un periodo de muestreo.
- **Respuesta correcta:** Notar que no cambia, pedir kappa al laboratorio y no usar el control de kappa mientras tanto.
- **Mecanismo en el simulador:** `{"tipo":"instrumento","id":"AI-701","falla":"congelado"}`. Duración: 3 h.
- Dificultad mínima 1, peso 2 en el generador.

### Transmisor congelado (`transmisor_congelado`)

- **Causa:** Falla de un transmisor: la señal queda fija.
- **Síntomas:** El valor no cambia mientras las variables relacionadas sí; el lazo que lo usa deja de corregir.
- **Respuesta correcta:** Comparar con variables relacionadas, pasar el lazo a manual y avisar a instrumentación.
- **Mecanismo en el simulador:** `{"tipo":"instrumento","id":"$tag","falla":"congelado"}`. Duración: 2 h. Parámetros posibles: tag ∈ {TI-304, LI-302, FI-401, PI-201, TI-212}.
- Dificultad mínima 2, peso 1 en el generador.
