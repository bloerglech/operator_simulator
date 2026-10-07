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

1. El digestor trabaja lleno de líquido: lo que entra tiene que salir. Si una salida se cierra (por ejemplo, evaporadores limita la recepción), la presión sube en minutos y PIC-301 abre su válvula al 100 % sin poder hacer más.
2. Revise el licor a evaporadores (FI-512), el nivel de los ciclones flash (LI-510, LI-511) y la salida de PIC-301.
3. Baje **en la misma cantidad** lo que entra: saque FIC-601 (filtrado de lavado al fondo) de cascada y baje su consigna en lo que falta en evaporadores; el bloque FFC-503 baja la extracción final en lo mismo.
4. Bajar el ritmo también ayuda, pero es lento. El enclavamiento I-01 corta la alimentación sobre 8,5 bar; el alivio abre a 7,5 bar.
5. Al normalizarse, devuelva FIC-601 a cascada.

## Caída de una bomba de circulación

1. El enclavamiento cierra el vapor del calentador (I-03, I-04 o I-05).
2. Vuelva a partir la bomba desde el mímico (pantalla 3).
3. Rearme el enclavamiento en la pantalla 8 (solo se puede si su condición ya no está presente) y devuelva el TIC a automático.
4. Vigile la temperatura de la zona y el kappa de las horas siguientes.

## Mallas tapadas

1. La ΔP de las mallas (PDI-524 a PDI-527) sube de a poco durante horas: revísela en cada recepción de turno.
2. Verifique que la conmutación esté activa en todas las mallas (sin conmutación siempre extraen las mismas ranuras y se tapan).
3. Retrolave las mallas que pasen de 0,7 bar. A 0,95 bar la bomba de circulación se protege (I-09, I-10) y corta el vapor.
4. Pida finos de astillas al laboratorio: los finos tapan las mallas. Si aun así sube, baje el caudal de esa extracción o el ritmo.

## Columna colgada

1. Síntomas que no calzan entre sí: el nivel de astillas (LI-302) sube aunque el soplado está al máximo, la consistencia de soplado (CI-605) cae, el raspador anda liviano y la presión baja (se está sacando licor del hueco).
2. Soplar más solo agranda el hueco: si llega al límite, la columna cae de golpe.
3. Baje la alimentación (WIC-101 a la mitad) para que el nivel no llegue a I-02, pase LIC-302 a manual con menos soplado y baje la extracción bajo la columna bajando el filtrado de lavado (FIC-601 fuera de cascada, ≈ 750 m³/h). La columna se suelta en unos minutos.
4. Vuelva de a poco: soplado manual en proporción a la madera, madera y lavado en escalones; con el ritmo completo, LIC-302 a AUTO con la consigna en el nivel actual y FIC-601 a CAS (a bajo ritmo, FDC-607 cortaría el lavado).

## Parada corta (lavado detenido)

1. Si lavado no puede recibir pulpa, pare **antes** que los enclavamientos: WIC-101 en 0 y LIC-302 en manual con salida 0 (el estanque de soplado deja de subir; a 95 % I-08 corta el soplado).
2. Saque FIC-115 de cascada para que el impregnador siga lleno de licor (sin madera, FFC-117 lo lleva a cero y la transferencia lo vacía).
3. Baje unos 10 °C las temperaturas de cocción: las astillas detenidas se siguen cociendo. Mantenga las circulaciones andando. Sin soplado, FDC-607, TIC-604 y CIC-605 quedan retenidos.
4. Para volver: primero el filtrado de lavado al fondo (FIC-601 en AUTO, ≈ 400 m³/h) para enfriar el fondo (si no, I-06 corta el soplado por temperatura); después madera, soplado y lavado juntos en escalones de 25 t/h cada 10 min, con las temperaturas de vuelta.
5. Con el ritmo completo: LIC-302 a AUTO con la consigna en el nivel actual, FIC-115 y FIC-601 a CAS. La pulpa que estuvo detenida sale con kappa bajo unas horas.

## Parada general

1. Baje el ritmo al 60 % con RC-700 (rampa de 600 ADt/d por hora).
2. Corte astillas y transferencia juntas: desactive RC-700, WIC-101 en 0 y LIC-202 en manual con salida 0 (si la transferencia sigue, el impregnador vacía sus astillas en el digestor y el nivel llega a I-02). FIC-115 fuera de cascada.
3. Detenga el soplado (LIC-302 en manual, salida 0).
4. Corte el vapor de los tres calentadores (TIC-402, TIC-404 y TIC-212 en manual, salida 0) con las bombas de circulación andando.
5. Enfríe desplazando con filtrado de lavado (FIC-601 en AUTO, ≈ 600 m³/h): entra a unos 75 °C por el fondo y sale por las extracciones. Tarda muchas horas.
6. Solo con el digestor bajo 100 °C (TI-303, TI-304 y TI-305): detenga el filtrado (un vaso lleno de líquido no baja su presión mientras le entra líquido), baje las consignas de PIC-301 y PIC-201 y abra los venteos (pantallas 1 y 2). Despresurizar caliente hace hervir el licor dentro del digestor.

## Puesta en marcha desde frío

1. Cierre los venteos y llene: filtrado de lavado al fondo (FIC-601 ≈ 300 m³/h) y licor negro al impregnador (FIC-115 en AUTO ≈ 400 m³/h hasta que PI-201 suba). Un vaso que no está lleno de líquido no toma presión y su circulación de tope no anda.
2. Vuelva las consignas de PIC-301 (5,5 bar) y PIC-201 (6,1 bar); con presión, FIC-115 a ≈ 260 m³/h.
3. Caliente en rampa: TIC-402, TIC-404 y TIC-212 en AUTO con la consigna en la temperatura actual, subiendo unos 15 °C cada media hora hasta 156, 155 y 140 °C.
4. Con la zona de cocción caliente (TI-304 sobre 148 °C), LIC-202 en AUTO (≈ 21 m) y madera, soplado manual y lavado juntos en escalones de 25 t/h cada 15 min.
5. Con el ritmo completo: LIC-302 a AUTO con la consigna en el nivel actual, TIC-604 a AUTO, FIC-601 y FIC-115 a CAS. El kappa entra en banda recién unas 10 horas después: lo que estuvo detenido sale sobrecocido y después crudo.

## Apagón

1. El DCS sigue en línea (UPS) y las válvulas obedecen, pero ninguna bomba anda ni puede partir. La presión salta unos segundos (pueden abrir el alivio y la seguridad) y los enclavamientos I-03, I-04 e I-05 cortan el vapor.
2. En los primeros minutos: LIC-302 en manual con salida 0 (el soplado seguiría sacando licor), WIC-101 en 0, LIC-202 en manual con salida 0 y FIC-115 fuera de cascada. FIC-503 en AUTO con 0.
3. Con la energía de vuelta, parta las bombas en orden, una por minuto: filtrado y lavado (FIC-601 ≈ 400 m³/h: llena y presuriza), circulaciones superior e inferior, transferencia (LIC-202 con algo de salida, para que haya caudal de retorno), extracciones, licores y astillas.
4. Rearme I-03, I-04 e I-05 cuando su circulación ande y vuelva los TIC a AUTO. Con presión, FIC-503 a CAS.
5. Parta como en una parada corta.
