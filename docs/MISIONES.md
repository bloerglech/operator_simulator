# Misiones

Generado por `npm run documentar` desde `src/misiones/campana.js` (no editar a mano).
Orden de la campaña: `tutorial` → `turno_noche` → `mas_toneladas` → `licor_debil` → `mallas` → `presurizacion` → `columna_colgada` → `parada_corta` → `parada_general` → `puesta_en_marcha` → `apagon` → `record`.
Cada misión superada desbloquea la siguiente. Medallas según la fracción de
puntos: oro ≥ 90 %, plata ≥ 70 %, bronce con todos los objetivos principales.
La prueba `tests/misiones.test.js` juega cada misión con la respuesta
esperada (debe aprobar) y sin hacer nada (debe fallar).

## Capítulo 0. Primer día

**Qué enseña:** Caminar e interactuar, pantallas, carátulas, consignas, modos, alarmas, tendencias, laboratorio, radio y aceleración del tiempo.

**Situación inicial:** caso base tras 8 h de operación. Planta estable. Aprende a moverte, leer y operar el DCS.

**Guion:**

- a los 0 min: Carmen Soto, jefa de turno (telefono): «Bienvenida a la sala de control. Hoy la planta está tranquila: aprovecha de conocer el DCS. Te voy a ir pidiendo cosas, sin apuro.» · objetivo `consola`
- `{"objetivo":"auto"}`: Luis Paredes, terreno (radio): «Sala, te habla Luis. Estoy revisando el transmisor de nivel del silo; te va a saltar una alarma, no te asustes.» · `{"tipo":"instrumento","id":"LI-102","falla":"bajo"}`
- `{"objetivo":"alarma"}`: `{"tipo":"instrumento","id":"LI-102","falla":null}` · Luis Paredes, terreno (radio): «Listo, ya dejé el transmisor del silo conectado. Gracias por reconocer la alarma.»
- `{"objetivo":"acelerar"}`: Carmen Soto, jefa de turno (telefono): «Muy bien. Eso es lo básico: mirar, entender antes de mover, y mover de a poco. Mañana te toca el turno de noche.» · fin de la misión

**Objetivos:**

- (principal) Acércate a la consola 2 (digestor) y opérala, o abre las pantallas DCS
- (principal) Abre la pantalla «2 Digestor»
- (principal) Abre la carátula de TIC-402 (temperatura del calentador superior)
- (principal) Sube la consigna de TIC-402 a 157 °C
- (principal) Pasa FIC-405 (filtrado a la circulación superior) a manual
- (principal) Devuelve FIC-405 a automático
- (principal) Reconoce las alarmas nuevas
- (principal) Arma una tendencia que incluya TI-402 (pantalla «7 Tendencias»)
- (principal) Pide un kappa al laboratorio (pantalla «6 Calidad y laboratorio»)
- (principal) Llama por radio a Luis, el operador de terreno
- (principal) Acelera el tiempo (×60) y espera el resultado del laboratorio

**Condiciones de falla:** ninguna

**Criterios de evaluación:** Sin enclavamientos disparados (1 pt) · Sin aperturas de la válvula de alivio (1 pt); cada objetivo secundario suma 1 pt.

**Respuesta ideal:** Antes de mover algo, ubicar la variable en su pantalla, abrir la carátula y leer PV, SP, salida y modo. Cambiar consignas de a poco. Reconocer cada alarma leyendo qué dice. Usar tendencias para ver la historia y el laboratorio para confirmar lo que dicen los analizadores.

## Capítulo 1. Turno de noche

**Qué enseña:** El tiempo muerto entre una causa y su efecto en el kappa; la relación licor/madera y la carga de álcali; el laboratorio como confirmación.

**Situación inicial:** caso base tras 8 h de operación. Llega astilla mojada por la lluvia. Mantener el kappa en banda hasta el cambio de turno.

**Guion:**

- a los 0 min: Carmen Soto, jefa de turno (telefono): «Buenas noches. Te dejo la planta estable, kappa 17. Desde la medianoche entra astilla de la pila 4, la que se mojó con la lluvia de la tarde. Necesito el kappa en banda, 16 a 18, hasta el cambio de turno en 8 horas.»
- a los 10 min: evento `lluvia`
- a los 45 min: Luis Paredes, terreno (radio): «Sala, acá en la correa las astillas vienen chorreando. Esa pila estuvo todo el día bajo el agua.»
- a los 3 h y no `{"comando":{"tipo":"laboratorio","analisis":"humedad_astillas"}}`: Andrea Ruiz, laboratorio (telefono): «Hola, te llamo del laboratorio: ¿no quieres que te midamos la humedad de las astillas? Con esta lluvia debe estar sobre 50 %.»
- a los 8 h: Carmen Soto, jefa de turno (telefono): «Ya llegó el turno de la mañana. Veamos cómo quedó la noche.» · fin de la misión

**Objetivos:**

- (principal, al final) Entregar el turno con kappa del soplado entre 16 y 18
- (principal, al final) No más de 1 hora de pulpa fuera de especificación
- (secundario) Pedir la humedad de las astillas al laboratorio
- (secundario) Corregir la humedad en el bloque de relación licor/madera (FFC-117)

**Condiciones de falla:** El kappa pasó de 22: la pulpa no sirve para el blanqueo y hubo que desviarla. · Abrió la válvula de seguridad del digestor.

**Criterios de evaluación:** Desviación estándar del kappa menor que 0,6 (2 pt) · Producción media de al menos 2 900 ADt/d (1 pt) · Sin aperturas de la válvula de alivio (1 pt) · Sin enclavamientos disparados (1 pt); cada objetivo secundario suma 1 pt.

**Respuesta ideal:** La astilla húmeda trae más agua: con el mismo licor sube la relación licor/madera (LW-117 pasa de 4,0 a ≈ 4,2) y el álcali queda más diluido. El efecto en el kappa llega 3 a 5 horas después, cuando ya es tarde para corregir. La respuesta es anticiparse: pedir la humedad al laboratorio apenas llega el aviso, actualizarla en FFC-117 (que baja el licor negro y devuelve la relación a 4,0) y vigilar el álcali residual de la extracción principal (AI-504) como indicador adelantado. Subir la carga de álcali solo si, aun así, el kappa del analizador sube.

## Capítulo 2. Piden más toneladas

**Qué enseña:** La coordinación de ritmo: madera, álcali, licores, extracciones y temperaturas se mueven juntos; a más ritmo, menos tiempo de cocción y menos factor H.

**Situación inicial:** caso base tras 8 h de operación, y luego `{"tipo":"bloque","id":"RC-700","accion":"parametro","campo":"produccion","valor":2550}`, `{"tipo":"bloque","id":"RC-700","accion":"parametro","campo":"rampa","valor":300}`, `{"tipo":"bloque","id":"RC-700","accion":"activar"}`, `{"tipo":"bloque","id":"HIC-703","accion":"parametro","campo":"objetivo","valor":440}`, `{"tipo":"bloque","id":"HIC-703","accion":"activar"}` (9 h); `{"tipo":"bloque","id":"RC-700","accion":"parametro","campo":"rampa","valor":150}`, `{"tipo":"bloque","id":"HIC-703","accion":"desactivar"}` (0 h). Subir del 85 % al 100 % del ritmo sin sacar el kappa de banda.

**Guion:**

- a los 0 min: Carmen Soto, jefa de turno (telefono): «Estamos al 85 %, unas 2 550 toneladas por día. Ventas necesita recuperar: quiero ver 3 000 en el soplado antes de 5 horas, sin sacar el kappa de banda. El control de ritmo, RC-700, está activo en la pantalla de calidad.»
- `{"tag":"QI-702","op":">=","valor":2800}`: Luis Paredes, terreno (radio): «Sala, los calentadores están pidiendo más vapor. ¿Estás mirando las temperaturas de cocción?»
- a los 7 h: Carmen Soto, jefa de turno (telefono): «Terminó el turno. Revisemos las toneladas.» · fin de la misión

**Objetivos:**

- (principal, durante 30 min, plazo 5 h) Llegar a 2 950 ADt/d o más en el soplado (QI-702) dentro de 5 horas y mantenerlo 30 minutos
- (principal, al final) Terminar el turno con kappa entre 16 y 18
- (principal, al final) No más de 3 horas de pulpa fuera de especificación
- (secundario) Compensar el menor tiempo de cocción (control de factor H o temperaturas)

**Condiciones de falla:** El kappa pasó de 22: la pulpa no sirve para el blanqueo. · El nivel de astillas del digestor llegó al enclavamiento: se cortó la alimentación. · Abrió la válvula de seguridad del digestor.

**Criterios de evaluación:** Al menos 800 ADt producidas en el turno (2 pt) · Menos de 1,5 horas fuera de especificación (2 pt) · Desviación estándar del kappa menor que 1,2 (1 pt) · Sin aperturas de la válvula de alivio (1 pt) · Sin enclavamientos disparados (1 pt); cada objetivo secundario suma 1 pt.

**Respuesta ideal:** Subir el ritmo con la coordinación RC-700 (rampa de 150 a 200 ADt/d por hora) para que madera, álcali, licores y extracciones se muevan juntos. Como a más ritmo la astilla pasa menos tiempo en la cocción, el factor H baja y el kappa sube 3 a 4 horas después: activar el control de factor H (HIC-703) al empezar la rampa, o subir las temperaturas de cocción 1 a 2 °C, anticipándose. Vigilar el nivel de astillas del digestor y la presión durante la rampa.

## Capítulo 3. Licor débil

**Qué enseña:** La carga de álcali es una razón: si el licor es más débil hace falta más caudal; si no hay licor, la única forma de mantener la carga es bajar el ritmo.

**Situación inicial:** caso base tras 8 h de operación. Baja la concentración del licor blanco y después escasea. Compensar o bajar el ritmo.

**Guion:**

- a los 0 min: Carmen Soto, jefa de turno (telefono): «Turno tranquilo por ahora. Caustificación anda con problemas en el apagador, así que ojo con el licor blanco.»
- a los 10 min: evento `licor_debil`
- a los 2 h: Felipe Mora, caustificación (telefono): «Hola, te habla Felipe de caustificación. Tuvimos el apagador con problemas toda la mañana; el licor puede venir más débil de lo normal.»
- a los 3 h: Felipe Mora, caustificación (telefono): «Malas noticias: en 15 minutos te vamos a poder mandar solo unos 220 metros cúbicos por hora de licor blanco, durante unas dos horas.»
- a los 3,25 h: evento `falta_licor`
- a los 7 h: Carmen Soto, jefa de turno (telefono): «Fin del turno. Veamos cómo resultó.» · fin de la misión

**Objetivos:**

- (principal, al final) Terminar el turno con kappa entre 16 y 18
- (principal, al final) No más de 1,5 horas de pulpa fuera de especificación
- (secundario) Pedir el álcali efectivo del licor blanco al laboratorio
- (secundario) Bajar el ritmo mientras falta licor blanco

**Condiciones de falla:** El kappa pasó de 22: la pulpa no sirve para el blanqueo. · Abrió la válvula de seguridad del digestor.

**Criterios de evaluación:** Desviación estándar del kappa menor que 0,8 (2 pt) · Rechazos bajo 0,5 % en promedio (1 pt) · Sin aperturas de la válvula de alivio (1 pt) · Sin enclavamientos disparados (1 pt); cada objetivo secundario suma 1 pt.

**Respuesta ideal:** Un licor más débil no cambia ningún caudal: lo delata el álcali residual de las extracciones (AI-504, AI-505) que baja sin otra causa. Pedir el EA del licor blanco al laboratorio: FFC-110 usa ese valor y sube el caudal para mantener la carga. Cuando caustificación avisa que faltará licor, calcular cuánta madera alcanza a cocerse con el licor disponible (carga = caudal × EA / madera) y bajar el ritmo antes de que empiece la falta, para no entregar pulpa cruda; volver al ritmo cuando se normalice.

## Capítulo 4. Mallas

**Qué enseña:** Las mallas se tapan de a poco: la ΔP (PDI-52x) avisa horas antes. Conmutación, retrolavado y la causa (finos) se atienden antes de que la bomba se proteja.

**Situación inicial:** caso base tras 8 h de operación. Astillas con muchos finos y la conmutación de mallas detenida tras una mantención. Que no se tapen.

**Guion:**

- a los 0 min: `{"tipo":"mallas","id":"mallas_circ_sup","accion":"conmutacion_off"}` · `{"tipo":"mallas","id":"mallas_circ_inf","accion":"conmutacion_off"}` · `{"tipo":"perturbar","id":"finos","valor":4.5}` · Carmen Soto, jefa de turno (telefono): «Buen día. Instrumentación estuvo trabajando en el PLC de las mallas durante la noche; quedaron de avisar cuando terminen. El patio está recuperando astillas del acopio viejo.»
- a los 45 min: Luis Paredes, terreno (radio): «Sala, pasé por la correa: las astillas vienen con harto aserrín y astilla rota. Ojo con las mallas.»
- (`{"tag":"PDI-524","op":">=","valor":0.8}` o `{"tag":"PDI-526","op":">=","valor":0.8}`): Luis Paredes, terreno (radio): «Sala, en terreno se escucha raro la bomba de circulación. ¿Cómo ves la presión diferencial de las mallas?»
- a los 5 h: Carmen Soto, jefa de turno (telefono): «Fin del turno. Veamos cómo quedaron las mallas.» · fin de la misión

**Objetivos:**

- (principal) Dejar la conmutación activa en las mallas de circulación superior e inferior
- (principal) Retrolavar las mallas de circulación cuando su ΔP suba
- (secundario) Pedir el contenido de finos de las astillas al laboratorio
- (principal, al final) Terminar el turno con la ΔP de ambas mallas de circulación bajo 0,7 bar
- (principal, al final) Terminar el turno con kappa entre 16 y 18

**Condiciones de falla:** La ΔP de las mallas llegó al límite: la bomba de circulación se detuvo y se cortó el vapor de cocción. · El kappa pasó de 22: la pulpa no sirve para el blanqueo. · Abrió la válvula de seguridad del digestor.

**Criterios de evaluación:** Conmutación activa antes de que la ΔP llegara a la alarma (2 pt) · Conmutación activa al entregar el turno (1 pt) · Desviación estándar del kappa menor que 0,6 (1 pt) · Sin aperturas de la válvula de alivio (1 pt) · Sin enclavamientos disparados (1 pt); cada objetivo secundario suma 1 pt.

**Respuesta ideal:** Al recibir la planta, revisar el estado de los equipos que tocó mantención: la conmutación de mallas detenida hace que siempre extraigan las mismas ranuras y se tapen. Activarla apenas se nota. Cuando el patio avisa finos, pedir el análisis y vigilar la ΔP de todas las mallas (PDI-524 a PDI-527): sube de a poco durante horas. Retrolavar antes de 0,8 bar; si aun así sube, bajar el caudal de circulación o el ritmo. La bomba se protege a 0,95 bar y corta el vapor de cocción: eso cuesta horas de pulpa cruda.

## Capítulo 5. Primera presurización

**Qué enseña:** El digestor está lleno de líquido: lo que entra tiene que salir. Si una salida se cierra, la presión sube rápido; la respuesta es bajar en la misma cantidad lo que entra, no esperar al control.

**Situación inicial:** caso base tras 8 h de operación. Evaporadores restringe de golpe la recepción de licor. La presión del digestor sube en minutos.

**Guion:**

- a los 0 min: Carmen Soto, jefa de turno (telefono): «Hola. Planta normal, ritmo completo. Evaporadores anda con un efecto sucio; si llaman, atiéndelos rápido.»
- a los 10 min: Rodrigo Vera, evaporadores (telefono): «¡Sala! Rodrigo, de evaporadores. Se nos tapó el efecto 3: desde ya solo puedo recibir unos 600 metros cúbicos por hora de licor débil. Te aviso cuando se arregle.» · evento `evaporadores_restringidos`
- (`{"tag":"LI-511","op":">=","valor":90}` o `{"tag":"LI-510","op":">=","valor":90}`): Luis Paredes, terreno (radio): «Sala, los ciclones flash están llenos, y la extracción se escucha estrangulada. ¿Qué hacemos?»
- `{"tag":"PI-301","op":">","valor":6.5}`: Luis Paredes, terreno (radio): «¡Sala, la presión del digestor está subiendo fuerte! Pasó de 6,5.»
- a los 1,25 h: Rodrigo Vera, evaporadores (telefono): «Sala, ya lavamos el efecto 3. Puedes mandar todo el licor de nuevo. Gracias por la paciencia.»
- a los 2,5 h: Carmen Soto, jefa de turno (telefono): «Buen trabajo. Revisemos cómo quedó la presión.» · fin de la misión

**Objetivos:**

- (principal) Bajar el filtrado de lavado al fondo (FIC-601) a 950 m³/h o menos mientras dure la restricción
- (secundario) Devolver FIC-601 a cascada cuando evaporadores se normalice
- (principal, al final) Terminar con la presión del digestor entre 5 y 6 bar
- (principal, al final) Terminar con kappa entre 16 y 18

**Condiciones de falla:** Abrió la válvula de alivio: el digestor descargó licor caliente al estanque de alivio. · Abrió la válvula de seguridad del digestor. · La presión del digestor llegó al enclavamiento: se cortó la alimentación.

**Criterios de evaluación:** Presión del digestor siempre bajo 6,5 bar (2 pt) · Sin enclavamientos disparados (1 pt) · Desviación estándar del kappa menor que 0,6 (1 pt); cada objetivo secundario suma 1 pt.

**Respuesta ideal:** El digestor trabaja lleno de líquido: casi no hay volumen que absorba un desbalance, por eso la presión sube en minutos. Cuando evaporadores restringe, los ciclones flash se llenan y la extracción queda estrangulada; PIC-301 abre su válvula al 100 % y ya no puede hacer nada. La respuesta es reducir en la misma cantidad lo que entra: sacar FIC-601 de cascada y bajar su consigna en lo que falta en evaporadores (≈ 300 m³/h); la extracción final la sigue por FFC-503. Bajar el ritmo también ayuda, pero es lento. Al normalizarse, devolver FIC-601 a cascada.

## Capítulo 6. Columna colgada

**Qué enseña:** Los síntomas de un colgamiento (nivel que no baja aunque se sople, soplado aguado, presión que cae) y cómo soltar la columna: menos alimentación, menos soplado y menos extracción bajo la zona colgada; después, volver de a poco.

**Situación inicial:** caso base tras 8 h de operación. La columna de astillas deja de bajar en el digestor. Reconocerlo y soltarla antes de que caiga sola.

**Guion:**

- a los 0 min: Carmen Soto, jefa de turno (telefono): «Hola. Anoche hubo varias paradas cortas y la astilla viene compactada. Vigila el fondo del digestor.»
- a los 5 min: evento `colgamiento`
- a los 9 min: Luis Paredes, terreno (radio): «Sala, estoy en el soplado: la lechada sale aguada, casi pura agua. Y el raspador del digestor anda liviano. Algo raro hay en el fondo.»
- `{"incidente":"liberacion_columna"}`: Luis Paredes, terreno (radio): «¡Sala, se sintió un golpe en el digestor y el raspador volvió a tomar carga! La columna bajó.» · Carmen Soto, jefa de turno (telefono): «Bien. Ahora vuelve a la normalidad de a poco: primero el lavado y el soplado, después la madera.»
- a los 5 h: Carmen Soto, jefa de turno (telefono): «Terminó el turno. Revisemos cómo quedó.» · fin de la misión

**Objetivos:**

- (principal) Bajar la alimentación de astillas (WIC-101) a 120 t/h o menos para que el nivel no llegue al enclavamiento
- (principal) Soltar la columna antes de que caiga sola
- (principal, al final) Terminar el turno con la alimentación de vuelta a 200 t/h o más
- (principal, al final) Terminar el turno con la presión del digestor entre 5 y 6 bar
- (secundario) Devolver FIC-601 y LIC-302 a su modo normal

**Condiciones de falla:** La columna cayó de golpe sobre el hueco: golpe de ariete en el digestor y astillas crudas al soplado. · El nivel de astillas del digestor llegó al enclavamiento: se cortó la alimentación. · Abrió la válvula de seguridad del digestor.

**Criterios de evaluación:** Sin aperturas de la válvula de alivio (2 pt) · Kappa final entre 15 y 19 (1 pt) · Producción del turno de al menos 400 ADt (1 pt) · Sin enclavamientos disparados (1 pt); cada objetivo secundario suma 1 pt.

**Respuesta ideal:** Un colgamiento se reconoce por síntomas que no calzan entre sí: el nivel de astillas (LI-302) no baja aunque LIC-302 sople al máximo, la consistencia del soplado (CI-605) cae, el raspador anda liviano y la presión baja porque se está sacando licor del hueco. Soplar más solo agranda el hueco: si llega al límite, la columna cae de golpe. La respuesta: bajar la alimentación (para que el nivel no llegue al enclavamiento), pasar LIC-302 a manual con menos soplado y reducir la extracción bajo la columna bajando el filtrado de lavado (FIC-601 fuera de cascada; la extracción final lo sigue). Con la columna suelta, volver de a poco: dejar el soplado manual en proporción a la madera (la mitad de madera, la mitad de soplado) y subir en escalones la madera, el filtrado de lavado y el soplado juntos, vigilando la presión; recién con el ritmo completo, LIC-302 a AUTO con la consigna en el nivel actual y FIC-601 a CAS (a bajo ritmo FDC-607 cortaría el lavado). Las astillas que quedaron colgadas se cocieron de más: el kappa bajará unas horas.

## Capítulo 7. Parada corta

**Qué enseña:** Una parada corta ordenada: cortar madera y soplado antes de que lo hagan los enclavamientos, mantener lleno el impregnador y caliente (no tanto) el digestor, y partir en escalones con el lavado primero.

**Situación inicial:** caso base tras 8 h de operación. El lavado se detiene por dos horas y media. Parar el digestor en caliente, sin enclavamientos, y volver a partir.

**Guion:**

- a los 0 min: Carmen Soto, jefa de turno (telefono): «Hola. Turno normal por ahora. El lavado tuvo problemas con un filtro en la noche.»
- a los 10 min: Marta Díaz, lavado (telefono): «Sala, habla Marta, de lavado. Se cortó la tela del filtro 2: vamos a estar detenidos unas dos horas y media. No podemos recibir pulpa, lo siento.» · evento `parada_lavado_larga`
- `{"tag":"LI-606","op":">=","valor":70}`: Luis Paredes, terreno (radio): «Sala, el estanque de soplado va en 70 % y subiendo. A 95 se corta el soplado solo.»
- a los 2,667 h: Marta Díaz, lavado (telefono): «Sala, ya cambiamos la tela. Pueden mandar pulpa de nuevo, de a poco por favor.» · Carmen Soto, jefa de turno (telefono): «Parte de a poco: primero el lavado al fondo y el soplado, después la madera en escalones. Quiero el ritmo completo antes de una hora y media.»
- a los 7 h: Carmen Soto, jefa de turno (telefono): «Terminó el turno. Revisemos la parada.» · fin de la misión

**Objetivos:**

- (principal) Cortar la alimentación de astillas (WIC-101)
- (principal) Detener el soplado (LIC-302 en manual con salida 0)
- (secundario) Mantener lleno el impregnador (FIC-115 en automático con caudal)
- (secundario) Bajar unos 10 °C las temperaturas de cocción mientras dure la parada
- (principal, al final) Terminar el turno con la alimentación de vuelta a 200 t/h o más
- (principal, al final) Terminar el turno con la presión del digestor entre 5 y 6 bar
- (secundario) Dejar LIC-302, FIC-115 y FIC-601 en su modo normal

**Condiciones de falla:** El estanque de soplado se llenó: el enclavamiento cortó el soplado con el digestor alimentando. · El nivel de astillas del digestor llegó al enclavamiento: se cortó la alimentación. · La temperatura de soplado llegó al enclavamiento: el fondo estaba caliente al partir el soplado (faltó el filtrado de lavado frío). · La presión del digestor llegó al enclavamiento. · Abrió la válvula de seguridad del digestor.

**Criterios de evaluación:** Sin aperturas de la válvula de alivio (2 pt) · Menos de 4 horas de pulpa fuera de especificación (1 pt) · Sin enclavamientos disparados (1 pt); cada objetivo secundario suma 1 pt.

**Respuesta ideal:** Al saber que el lavado no recibirá pulpa, parar antes que los enclavamientos: WIC-101 a 0 y LIC-302 en manual con salida 0 (el estanque deja de subir). Durante la parada: FIC-115 fuera de cascada para que el impregnador siga lleno (si no, la transferencia lo vacía y al partir falta presión), las temperaturas de cocción unos 10 °C abajo y las circulaciones andando; FDC-607 queda retenido sin soplado. Para partir: primero el filtrado de lavado al fondo (FIC-601 en AUTO, unos 400 m³/h) para enfriar el fondo; después madera y soplado juntos en escalones de unas 25 t/h cada 10 minutos, con las temperaturas de vuelta a su valor. Con el ritmo completo, LIC-302 a AUTO con la consigna en el nivel actual y FIC-115 y FIC-601 a CAS. La pulpa que estuvo detenida sale sobrecocida (kappa bajo) unas horas: es el costo de la parada.

## Capítulo 8. Parada general

**Qué enseña:** El orden de una parada larga y por qué: sin astillas ni transferencia no sube el nivel; sin soplado no se vacía el fondo; sin vapor y con filtrado frío el digestor se enfría; recién bajo 100 °C se puede bajar la presión sin que el licor hierva.

**Situación inicial:** caso base tras 8 h de operación. Detención larga programada: bajar el ritmo, cortar astillas, soplado y vapor, enfriar y despresurizar en orden.

**Guion:**

- a los 0 min: Carmen Soto, jefa de turno (telefono): «Hoy es la parada general para la mantención anual. Quiero el digestor frío y sin presión para mañana temprano. Sigue el procedimiento del manual: ritmo al 60 % con RC-700, después astillas y transferencia, soplado, vapor, enfriar con filtrado y al final despresurizar. Sin apuro, en orden.»
- `{"objetivo":"vapor"}` y `{"tag":"TI-303","op":"<","valor":100}` y `{"tag":"TI-304","op":"<","valor":100}` y `{"tag":"TI-305","op":"<","valor":100}`: Luis Paredes, terreno (radio): «Sala, el digestor está bajo 100 °C en el tope y en las dos zonas de cocción. Listo para despresurizar cuando digas.»
- `{"objetivo":"despresurizar"}`: Carmen Soto, jefa de turno (telefono): «Digestor frío y sin presión. Entrego la planta a mantención. Buen trabajo.» · fin de la misión
- a los 22 h: Carmen Soto, jefa de turno (telefono): «Se acabó el plazo de la parada. Mantención no puede entrar.» · fin de la misión

**Objetivos:**

- (principal) Bajar el ritmo al 60 % (WIC-101 a 130 t/h o menos) con una rampa
- (principal) Cortar las astillas (WIC-101 en 0) y detener la transferencia (LIC-202 en manual, salida 0)
- (secundario) Mantener lleno de licor el impregnador (FIC-115 en automático)
- (principal) Detener el soplado (LIC-302 en manual, salida 0)
- (principal) Cortar el vapor de los calentadores (TIC-402, TIC-404 y TIC-212 en manual, salida 0)
- (secundario) Enfriar desplazando con filtrado de lavado (FIC-601 en automático, 500 m³/h o más)
- (principal) Con el digestor bajo 100 °C, detener el filtrado y despresurizar (venteos abiertos, PI-301 bajo 0,5 bar)

**Condiciones de falla:** Bajaste la presión con el digestor sobre 110 °C: el licor hierve dentro (vaporización súbita), golpea la columna y daña las mallas. · El nivel de astillas del digestor llegó al enclavamiento. · Se perdió la circulación de transferencia: el digestor quedó sin presión en el tope. · El estanque de soplado se llenó. · Abrió la válvula de seguridad del digestor.

**Criterios de evaluación:** Planta entregada en menos de 18 horas (1 pt) · Sin aperturas de la válvula de alivio (1 pt) · Sin enclavamientos disparados (1 pt); cada objetivo secundario suma 1 pt.

**Respuesta ideal:** En orden: (1) bajar el ritmo al 60 % con RC-700 y rampa, para que el fondo y el lavado se adapten; (2) cortar astillas y transferencia juntas (WIC-101 en 0 y LIC-202 en manual con salida 0), con FIC-115 fuera de cascada para que el impregnador siga lleno de licor; (3) detener el soplado (LIC-302 en manual, salida 0); (4) cortar el vapor de los tres calentadores con las bombas andando; (5) enfriar desplazando con filtrado de lavado (FIC-601 en AUTO, ≈ 600 m³/h): el licor frío entra por el fondo y sale por las extracciones; tarda muchas horas; (6) recién con el digestor bajo 100 °C (TI-303, TI-304 y TI-305), detener el filtrado (un vaso lleno de líquido no baja su presión mientras le entra líquido), bajar las consignas de PIC-301 y PIC-201 y abrir los venteos. Despresurizar caliente hace hervir el licor dentro del digestor.

## Capítulo 9. Puesta en marcha

**Qué enseña:** El orden de una partida: cerrar venteos y llenar (el impregnador también), presurizar, calentar en rampa con las circulaciones andando, partir madera, soplado y lavado juntos en escalones y esperar el kappa: lo que estuvo detenido sale fuera de especificación por horas.

**Situación inicial:** caso base tras 8 h de operación, y luego `{"tipo":"lazo","id":"WIC-101","accion":"consigna","valor":130}` (1.5 h); `{"tipo":"lazo","id":"WIC-101","accion":"consigna","valor":0}`, `{"tipo":"lazo","id":"FIC-115","accion":"modo","valor":"AUTO"}`, `{"tipo":"lazo","id":"FIC-601","accion":"modo","valor":"AUTO"}`, `{"tipo":"lazo","id":"LIC-202","accion":"modo","valor":"MAN"}`, `{"tipo":"lazo","id":"LIC-302","accion":"modo","valor":"MAN"}`, `{"tipo":"lazo","id":"TIC-402","accion":"modo","valor":"MAN"}`, `{"tipo":"lazo","id":"TIC-404","accion":"modo","valor":"MAN"}`, `{"tipo":"lazo","id":"TIC-212","accion":"modo","valor":"MAN"}` (0 h); `{"tipo":"lazo","id":"LIC-202","accion":"salida","valor":0}`, `{"tipo":"lazo","id":"LIC-302","accion":"salida","valor":0}`, `{"tipo":"lazo","id":"TIC-402","accion":"salida","valor":0}`, `{"tipo":"lazo","id":"TIC-404","accion":"salida","valor":0}`, `{"tipo":"lazo","id":"TIC-212","accion":"salida","valor":0}`, `{"tipo":"lazo","id":"FIC-601","accion":"consigna","valor":600}` (13.5 h); `{"tipo":"lazo","id":"FIC-601","accion":"consigna","valor":0}`, `{"tipo":"lazo","id":"PIC-301","accion":"consigna","valor":1}`, `{"tipo":"lazo","id":"PIC-201","accion":"consigna","valor":1.5}` (0.2 h); `{"tipo":"venteo","id":"dig","accion":"abrir"}`, `{"tipo":"venteo","id":"imp","accion":"abrir"}` (2 h). Arranque después de la parada general: el digestor está lleno de astillas, frío y venteado.

**Guion:**

- a los 0 min: Carmen Soto, jefa de turno (telefono): «Mantención terminó. El digestor está lleno de astillas, frío y venteado. Hay que partir: cierra los venteos, llena y presuriza, calienta de a poco y después parte madera y soplado. Quiero ritmo completo y kappa en banda para mañana.»
- `{"objetivo":"presurizar"}`: Luis Paredes, terreno (radio): «Sala, los dos vasos con presión y sin fugas en terreno. Puedes calentar.»
- `{"objetivo":"calentar"}`: Carmen Soto, jefa de turno (telefono): «Temperaturas de cocción arriba. Parte la madera de a poco, con el soplado y el lavado en la misma proporción.»
- a los 20 h: Carmen Soto, jefa de turno (telefono): «Veinte horas de partida. Revisemos cómo quedó.» · fin de la misión

**Objetivos:**

- (principal) Cerrar los venteos, llenar el impregnador y presurizar ambos vasos (PI-301 y PI-201 sobre 5 bar)
- (principal) Calentar en rampa hasta la temperatura de cocción (TI-304 sobre 148 °C)
- (principal) Llegar al ritmo nominal (WI-101 sobre 200 t/h) con soplado y lavado en proporción
- (secundario) Dejar los lazos en su modo normal (LIC-302, LIC-202 y TIC-604 en AUTO; FIC-601 y FIC-115 en CAS)
- (principal, al final) Terminar con kappa entre 16 y 18
- (principal, al final) Terminar con la presión del digestor entre 5 y 6 bar

**Condiciones de falla:** Abrió la válvula de seguridad del digestor. · El nivel de astillas del digestor llegó al enclavamiento. · El estanque de soplado se llenó. · El impregnador se llenó de astillas: enclavamiento I-11.

**Criterios de evaluación:** A lo más 40 aperturas del alivio en la partida (1 pt) · Menos de 10 horas de pulpa fuera de especificación (2 pt) · Sin enclavamientos disparados (1 pt); cada objetivo secundario suma 1 pt.

**Respuesta ideal:** Partir es el camino inverso de la parada, en orden: (1) cerrar los venteos y llenar: filtrado de lavado al fondo (FIC-601, ≈ 300 m³/h) y licor negro al impregnador (FIC-115 en AUTO, ≈ 400 m³/h hasta que PI-201 suba): un vaso que no está lleno de líquido no toma presión y su circulación de tope no anda; (2) calentar en rampa con los tres TIC en AUTO, unos 15 °C cada media hora; (3) con la zona de cocción caliente, partir la transferencia (LIC-202 en AUTO) y madera, soplado manual y lavado juntos en escalones; (4) con el ritmo completo, LIC-302 a AUTO con la consigna en el nivel actual y FIC-601 y FIC-115 a CAS. Las astillas que estuvieron detenidas salen sobrecocidas y luego crudas: el kappa entra en banda recién unas 10 horas después de partir.

## Capítulo 10. Apagón

**Qué enseña:** Qué queda andando sin energía (el DCS con su UPS, las válvulas), qué hacer en los primeros minutos y el orden de partida de las bombas: primero llenar y presurizar, después circular, al final alimentar.

**Situación inicial:** caso base tras 8 h de operación. Corte total de energía a plena carga. Asegurar el digestor y, cuando vuelva la energía, partir en orden.

**Guion:**

- a los 0 min: Carmen Soto, jefa de turno (telefono): «Hola. La subestación está en mantención y trabajan con una sola línea. Debería ser un turno normal.»
- a los 20 min:  (mural): «Las luces parpadean y se apagan. Silencio: se detuvieron todas las bombas. Las pantallas siguen encendidas con la UPS.» · evento `apagon`
- a los 21 min: Luis Paredes, terreno (radio): «¡Sala! Se cayó todo, no hay ninguna bomba andando. Sonó la válvula de seguridad del digestor. ¿Qué cierro?»
- a los 51 min: Carmen Soto, jefa de turno (telefono): «Volvió la energía. Parte en orden: primero el filtrado para llenar y presurizar, después las circulaciones y la transferencia, al final licores y extracciones. Rearma los enclavamientos y después parte como en una parada corta.»
- a los 7 h: Carmen Soto, jefa de turno (telefono): «Terminó el turno. Revisemos cómo quedó la planta.» · fin de la misión

**Objetivos:**

- (principal, plazo 10 min) Cerrar el soplado (LIC-302 en manual, salida 0) y cortar la madera (WIC-101 en 0)
- (secundario) Detener la transferencia (LIC-202 en manual, salida 0) y sacar FIC-115 de cascada
- (principal) Partir las bombas de filtrado, circulaciones y transferencia
- (principal) Llenar y presurizar el digestor (PI-301 sobre 5 bar)
- (principal) Rearmar los enclavamientos I-03, I-04 e I-05 y devolver el vapor a automático
- (principal, al final) Terminar el turno con la alimentación de vuelta a 200 t/h o más
- (principal, al final) Terminar el turno con la presión del digestor entre 5 y 6 bar

**Condiciones de falla:** Abrió la válvula de seguridad durante la partida. · El nivel de astillas del digestor llegó al enclavamiento. · El estanque de soplado se llenó. · El impregnador se llenó de astillas: enclavamiento I-11.

**Criterios de evaluación:** A lo más 3 aperturas del alivio después de volver la energía (2 pt) · Kappa final entre 15 y 19 (1 pt) · Producción del turno de al menos 450 ADt (1 pt); cada objetivo secundario suma 1 pt.

**Respuesta ideal:** Durante el corte el DCS sigue en línea y las válvulas obedecen, pero ninguna bomba anda: el soplado sigue sacando licor por la presión del digestor y la transferencia y la madera partirían solas al volver la energía. Cerrar el soplado y la transferencia, cortar la madera y sacar FIC-115 de cascada. Con la energía de vuelta: partir primero la bomba de filtrado y el lavado al fondo con la extracción final (FIC-503) en AUTO y 0, para llenar y presurizar; después las circulaciones superior e inferior y la transferencia (LIC-202 con algo de salida, para que haya caudal de retorno); luego licores y extracciones. Rearmar I-03, I-04 e I-05 cuando su circulación ande, TIC a AUTO, FIC-503 a CAS al tener presión y partir como en una parada corta: madera, soplado y lavado juntos en escalones.

## Capítulo 11. Récord

**Qué enseña:** Todo lo anterior junto: anticiparse con el laboratorio, mantener el balance del digestor y no confiar a ciegas en un analizador.

**Situación inicial:** caso base tras 8 h de operación. Turno de 12 horas con perturbaciones encadenadas. Meta: toneladas dentro de especificación y margen.

**Guion:**

- a los 0 min: Carmen Soto, jefa de turno (telefono): «Hoy vamos por el récord del mes: quiero 1 250 toneladas dentro de especificación en el turno de 12 horas, y sin regalar álcali ni vapor. Te advierto que viene lluvia y que caustificación anda complicada.»
- a los 30 min: evento `lluvia_fuerte` · Luis Paredes, terreno (radio): «Sala, se largó a llover fuerte en el patio. La pila de astillas está a la intemperie.»
- a los 3 h: evento `licor_debil` · Felipe Mora, caustificación (telefono): «Sala, Felipe. El apagador sigue mal: el licor blanco puede venir más débil desde ahora.»
- a los 6 h: Rodrigo Vera, evaporadores (telefono): «Sala, Rodrigo de evaporadores. Por dos horas solo puedo recibir 800 metros cúbicos por hora de licor débil.» · evento `evaporadores_limitados`
- a los 9 h: evento `analizador_kappa`
- a los 12 h: Carmen Soto, jefa de turno (telefono): «Terminó el turno. Veamos si hubo récord.» · fin de la misión

**Objetivos:**

- (principal, al final) Producir 1 250 ADt o más dentro de especificación
- (principal, al final) Margen de al menos 230 USD por ADt
- (secundario) Corregir la humedad de las astillas en FFC-117 con el dato del laboratorio
- (secundario) Pedir el álcali efectivo del licor blanco
- (secundario) Bajar el filtrado de lavado mientras evaporadores esté limitado
- (secundario) Verificar el kappa con el laboratorio cuando el analizador falle

**Condiciones de falla:** El kappa pasó de 22: la pulpa no sirve para el blanqueo. · Abrió la válvula de seguridad del digestor.

**Criterios de evaluación:** Desviación estándar del kappa menor que 0,7 (2 pt) · Sin aperturas de la válvula de alivio (1 pt) · Sin enclavamientos disparados (1 pt); cada objetivo secundario suma 1 pt.

**Respuesta ideal:** Cada perturbación tiene su respuesta y casi todas se anticipan: con la lluvia, humedad al laboratorio y FFC-117 corregido (y algo más de carga de álcali si el kappa del analizador sube); con el licor débil, EA al laboratorio cuando termine de bajar (una muestra temprana no ve todo el cambio) para que FFC-110 compense; con evaporadores limitado, bajar el filtrado de lavado en lo que no reciben, mirando FI-512 (con lluvia y licor débil entra más licor: unos 300 m³/h menos) y devolverlo a cascada al normalizarse; con el analizador congelado, el laboratorio manda. Las toneladas salen solas si el kappa no sale de banda.
