# 7. Operación y perturbaciones

Este capítulo reúne lo que el simulador enseña sobre la **operación** del
digestor: cómo responde a las perturbaciones típicas, por qué las respuestas
correctas son las que son y qué errores llevan a un enclavamiento o a pulpa
fuera de especificación. Cada sección corresponde a un capítulo de la campaña
(`docs/MISIONES.md`) y a un procedimiento (`docs/PROCEDIMIENTOS.md`, que
también se lee dentro del juego). Las cifras son las del caso base y las que
se midieron al calibrar las misiones con jugadores simulados
(`tests/campana.test.js`, `tests/planes/`).

## 7.1 Cuatro ideas que explican casi todo

1. **El tiempo muerto de la calidad.** Una acción sobre la cocción
   (temperatura, carga de álcali, ritmo) recién se ve en el kappa del soplado
   3 a 5 horas después: es el tiempo que tarda la astilla afectada en bajar
   desde la zona de cocción. Quien espera a ver el kappa para actuar llega
   tarde. Por eso existen los **indicadores adelantados**: el álcali residual
   de las extracciones (AI-504, AI-505), la relación licor/madera (LW-117) y
   el factor H previsto (HI-703).

2. **El digestor está lleno de líquido.** Su compresibilidad efectiva es del
   orden de 10⁻⁹ 1/Pa (S-31): un desbalance de 300 m³/h entre lo que entra y
   lo que sale mueve la presión 2 bar en unos 8 segundos (sección 5.1). Si
   en las misiones el alivio tarda minutos en abrir es porque los lazos de
   presión absorben el desbalance mientras su válvula tiene recorrido. La regla de operación
   es de balance, no de control: si una salida se limita, hay que bajar **en
   la misma cantidad** una entrada. Los lazos de presión (PIC-301, PIC-201)
   solo corrigen desbalances pequeños.

3. **Lo que está detenido se sigue cociendo.** Una astilla quieta a 146 °C
   acumula factor H igual que una que avanza. En toda parada (lavado detenido,
   colgamiento, apagón) la pulpa que estuvo detenida sale sobrecocida (kappa
   bajo) y, si la zona se enfrió, la siguiente sale cruda. En el simulador este
   efecto es más fuerte que en la práctica (L-13).

4. **Volver de a poco y en proporción.** Madera, soplado y filtrado de lavado
   se mueven juntos: el filtrado lava y enfría el fondo y es la mayor entrada
   de líquido; el soplado es la salida de pulpa. Subir uno sin los otros rompe
   el balance de líquido o el de sólidos.

## 7.2 Madera húmeda (capítulo 1)

Más humedad trae más agua con la misma madera seca: la relación
licor/madera sube de 4,0 a ≈ 4,2 y el álcali se diluye; la impregnación y la
cocción se hacen más lentas y el kappa sube horas después. La respuesta:
pedir la humedad al laboratorio, corregirla en FFC-117 (que baja el licor
negro y devuelve la relación a 4,0) y, si aun así el álcali residual baja,
subir la carga de a 0,5 %.

## 7.3 Cambio de ritmo (capítulo 2)

A más ritmo, menos tiempo en la zona de cocción y menos factor H. Con la
coordinación de ritmo (RC-700) madera, licores, extracciones y lavado se
mueven en rampa; el tiempo de cocción hay que compensarlo **antes**:
control de factor H (HIC-703) activado al empezar la rampa, o 1 a 2 °C más.
Sin compensar, el kappa sube 3 a 4 horas después de la rampa.

## 7.4 Licor blanco débil o escaso (capítulo 3)

FFC-110 calcula el caudal de licor blanco con el álcali efectivo del último
análisis: si el licor se debilita y nadie lo mide, la carga real baja sin que
ningún caudal cambie. Lo delata el álcali residual. Una muestra tomada al
comienzo del cambio no lo ve completo (capítulo 11): hay que repetirla. Si
falta licor, la única forma de mantener la carga es bajar la madera:
madera (t/h) = caudal (m³/h) × EA (g/L) / (carga % × 10).

## 7.5 Mallas (capítulo 4)

La ΔP de las mallas sube de a poco durante horas (finos, conmutación
detenida). Con 4,5 veces los finos normales y la conmutación detenida, la
alarma de 0,8 bar llega a los ≈ 160 min y la protección de la bomba
(0,95 bar) a los ≈ 200 min. Retrolavar y reactivar la conmutación devuelve
la ΔP a ≈ 0,5 bar; solo retrolavar sin corregir la causa vuelve a taparlas.

## 7.6 Presurización (capítulo 5)

Cuando evaporadores baja su recepción de ≈ 930 a 600 m³/h, los ciclones
flash se llenan, la extracción queda estrangulada, PIC-301 abre su válvula al
100 % y el alivio abre en ≈ 15 minutos. Bajar el ritmo es demasiado lento.
La respuesta que funciona en el simulador: sacar FIC-601 de cascada y bajar
su consigna ≈ 300 m³/h; el bloque FFC-503 baja la extracción final en lo
mismo y el balance se cierra. Bajar el filtrado un 40 % de golpe es
demasiado: la presión cae bajo la de saturación y se pierde la circulación
de transferencia.

## 7.7 Colgamiento (capítulo 6)

Síntomas que no calzan: el nivel de astillas sube aunque LIC-302 sopla al
máximo, la consistencia de soplado cae y la presión baja porque se está
sacando licor del hueco bajo la columna. Si el hueco llega a 600 m³ la
columna cae de golpe (S-33). La columna se suelta sin caer si las
extracciones bajo ella bajan del 60 % de su caudal durante 5 minutos (S-46):
como la extracción principal la maneja la presión, la única forma práctica es
bajar el filtrado de lavado (la extracción final lo sigue). La vuelta debe
ser en proporción: con la mitad de madera, la mitad de soplado y de lavado;
devolver LIC-302 a automático con el nivel bajo hace que corte el soplado y
la presión sube al alivio.

## 7.8 Parada corta (capítulo 7)

Cuando el lavado no recibe pulpa, el estanque de soplado se llena a ≈ 0,6 %
por minuto: hay ≈ 90 minutos antes de que I-08 corte el soplado. Parar antes
(madera y soplado) evita la cadena I-08 → nivel alto → I-02. Durante la
parada: FIC-115 fuera de cascada (sin madera, FFC-117 lleva el licor negro a
cero y la transferencia vacía el impregnador) y temperaturas unos grados
abajo. Para partir, el filtrado de lavado va **primero**: sin él, el fondo
está caliente y el soplado parte con la temperatura sobre el límite de I-06.
Pero va moderado (≈ 250 m³/h) y seguido de cerca por el primer escalón de
madera y soplado: con la válvula de soplado cerrada no sale licor por el
fondo, todo el filtrado tiene que salir por las extracciones, y 400 m³/h
sin soplado llevan PIC-301 al 100 % y la presión al alivio en minutos.

## 7.9 Parada general y puesta en marcha (capítulos 8 y 9)

Enfriar un digestor de ≈ 4 000 m³ lleno de astillas toma más de 12 horas
desplazando con filtrado a 75 °C; sin soplado todo ese filtrado sale por las
extracciones, así que la final se saca de cascada y se sube (≈ 400 m³/h)
para que la principal no se sature. Despresurizar caliente hace hervir el licor
dentro del vaso (la presión cae bajo la de saturación). Un vaso lleno de
líquido no baja su presión mientras le entra líquido: primero se detiene el
filtrado, después se bajan las consignas y se abren los venteos.

La partida es el camino inverso. Un vaso que no está lleno de líquido no
toma presión, y la circulación de tope del impregnador no anda sin licor
libre arriba: hay que llenar el impregnador con licor negro antes de
presurizar. Se calienta en rampa (≈ 15 °C cada media hora) y se parte en
escalones, con la extracción final de vuelta en cascada para que siga al
filtrado; el kappa entra en banda unas 10 horas después de partir (un grado
más en la cocción al terminar los escalones acorta la cola de kappa alto).

## 7.10 Apagón (capítulo 10)

Sin energía el DCS sigue en línea (UPS) y las válvulas obedecen, pero
ninguna bomba anda ni puede partir (S-50). Los enclavamientos de pérdida de
circulación cortan el vapor. El soplado, en cambio, sigue sacando licor por
la presión del digestor: hay que cerrarlo. Al volver la energía el orden
importa: filtrado (llenar y presurizar con la extracción final en 0),
circulaciones y transferencia (con algo de salida, para que haya caudal de
retorno y se pueda rearmar I-05), extracciones, licores y astillas.

## 7.11 Lo que el simulador no representa bien

- La sensibilidad del kappa al factor H es unas dos veces la habitual (L-13):
  los cambios de ritmo y las paradas mueven el kappa más que en la práctica.
- El arranque o la detención simultánea de todas las bombas da un
  transitorio de presión de segundos (L-16).
- Los procedimientos son genéricos: deben reemplazarse por los de la planta.

## 7.12 Ejercicios

1. Con el caso base, calcule cuánto debe bajar la madera si el licor blanco
   disponible cae a 220 m³/h con EA 106 g/L y carga 18 %. Compárelo con la
   respuesta del capítulo 3.
2. En el capítulo 5, ¿por qué bajar el ritmo un 20 % no evita la apertura
   del alivio? Estime con el volumen del digestor y su compresibilidad cuánto
   tarda la presión en subir 2 bar con un desbalance de 300 m³/h.
3. Juegue el capítulo 7 sin bajar las temperaturas durante la parada y
   compare el tiempo fuera de especificación del informe.
