# Misiones

Generado por `npm run documentar` desde `src/misiones/campana.js` (no editar a mano).
Orden de la campaña: `tutorial` → `turno_noche` → `mas_toneladas` → `licor_debil`.
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

**Situación inicial:** caso base tras 8 h de operación, y luego 9 h con `{"tipo":"bloque","id":"RC-700","accion":"parametro","campo":"produccion","valor":2550}`, `{"tipo":"bloque","id":"RC-700","accion":"parametro","campo":"rampa","valor":300}`, `{"tipo":"bloque","id":"RC-700","accion":"activar"}`, `{"tipo":"bloque","id":"HIC-703","accion":"parametro","campo":"objetivo","valor":440}`, `{"tipo":"bloque","id":"HIC-703","accion":"activar"}`. Subir del 85 % al 100 % del ritmo sin sacar el kappa de banda.

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
