# Manual de operación del digestor

Procedimientos **genéricos** para el simulador (primera versión). No son los
procedimientos de una planta real: deben reemplazarse por los de la planta
antes de usarlos fuera del juego.

## Reglas generales

1. Antes de mover algo, ubique la variable en su pantalla, abra la carátula y lea PV, SP, salida y modo.
2. Cambie las consignas de a poco y espere la respuesta. En la cocción, el efecto en el kappa llega horas después.
3. Reconozca cada alarma leyendo lo que dice. Una alarma reconocida que sigue activa sigue siendo un problema.
4. No puentee enclavamientos. Un enclavamiento disparado se rearma solo cuando se entiende y se corrigió la causa.
5. Confirme con el laboratorio lo que indican los analizadores. Si un valor no cambia, sospeche del instrumento.
6. Anote en el libro de novedades las maniobras y lo que observó.

## Recepción del turno

1. Revise la lista de alarmas y el libro de novedades del turno anterior.
2. Revise en tendencias (8 h) el kappa (AI-701), el factor H (HI-703), la producción (QI-702) y la presión (PI-301).
3. Verifique que los lazos principales estén en su modo normal: caudales de licor en CAS, temperaturas y presiones en AUTO.
4. Pida un kappa al laboratorio para comparar con el analizador.

## Cambio de ritmo de producción

1. Avise a lavado, evaporadores y caustificación (licor blanco) antes de subir.
2. Use la coordinación de ritmo (RC-700, pantalla 6) con una rampa de 150 a 200 ADt/d por hora.
3. **Antes** de subir, compense el menor tiempo de cocción: active el control de factor H (HIC-703) con el objetivo de H actual, o suba 1 a 2 °C las temperaturas de cocción.
4. Durante la rampa vigile el nivel de astillas del digestor (LIC-302), la presión (PI-301) y el nivel de los ciclones flash.
5. Al bajar el ritmo, haga lo inverso: baje primero la temperatura o deje que el control de H lo haga.

## Cambio de madera (humedad, densidad, lote)

1. Pida humedad y densidad de las astillas al laboratorio.
2. Actualice la humedad en el bloque de relación licor/madera (FFC-117).
3. Si la madera es más liviana, el medidor sobrestima la madera: suba la velocidad para mantener la producción.
4. Vigile el álcali residual de la extracción principal (AI-504) como indicador adelantado del kappa y corrija la carga de álcali (FFC-110) de a 0,5 %.

## Licor blanco débil o escaso

1. Si el álcali residual baja sin otra causa, pida el EA del licor blanco: el bloque FFC-110 compensa el caudal con el valor del laboratorio.
2. Si falta licor, calcule la madera que alcanza a cocer: madera (t/h) = caudal (m³/h) × EA (g/L) / (carga % × 10).
3. Baje el ritmo antes de que empiece la falta; vuelva a subir cuando se normalice.

## Presión alta del digestor

1. Verifique la extracción principal (PIC-301 y FI-502) y el nivel de los ciclones flash.
2. Si los evaporadores limitan la recepción, baje las extracciones y el ritmo de inmediato.
3. Si la presión sigue subiendo, baje la alimentación (WIC-101). El enclavamiento I-01 la corta sobre 8,5 bar.
4. No cierre las extracciones de golpe: la presión de un digestor lleno de líquido sube en segundos.

## Caída de una bomba de circulación

1. El enclavamiento cierra el vapor del calentador (I-03, I-04 o I-05).
2. Vuelva a partir la bomba desde el mímico (pantalla 3).
3. Rearme el enclavamiento en la pantalla 8 y devuelva el TIC a automático.
4. Vigile la temperatura de la zona y el kappa de las horas siguientes.

## Mallas tapadas

1. Si la ΔP de unas mallas se acerca a su máximo, retrolave esas mallas y verifique que la conmutación esté activa.
2. Si no basta, baje el caudal de esa extracción y repártalo a las otras.
3. Pida finos de astillas al laboratorio: los finos tapan las mallas.

## Columna colgada

1. Síntomas: la corriente del raspador baja, el nivel de astillas no baja aunque se sople, la consistencia de soplado cae.
2. Baje el soplado y aumente la dilución del fondo. No fuerce el raspador.
3. Cuando la columna cae, el nivel baja de golpe y la corriente del raspador sube: reduzca la alimentación hasta recuperar el nivel.

## Parada corta (lavado detenido)

1. Baje el soplado y la alimentación hasta detenerlos, en ese orden.
2. Mantenga las circulaciones y las temperaturas: el digestor queda lleno y caliente.
3. Mantenga la presión con PIC-301 y vigile el nivel del estanque de soplado.
4. Para volver: parta el soplado lento, luego la alimentación con una rampa, y pida kappa al laboratorio.

## Partida y parada general

Se detallan en la Fase 6 del simulador (misiones 8 y 9).
