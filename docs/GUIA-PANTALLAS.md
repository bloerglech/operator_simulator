# Guía de las pantallas DCS

Cómo se juega con las pantallas en 2D (Fase 3). Se abren con `npm run dev`
(desarrollo) o con la versión compilada (`npm run build` y servir `dist/`).

## Inicio

- **Nueva partida:** la planta corre 8 h sin operador con el caso base para
  llegar cerca del estado estacionario (≈ 5 s de espera) y entrega la sala en
  operación normal, a ×1. Lo ocurrido en esas 8 h no aparece en los eventos.
- **Continuar:** la partida guardada en este navegador.
- **Importar:** un archivo JSON exportado antes (menú *Partida*).

## Barra superior

| Elemento | Uso |
|----------|-----|
| Reloj `D1 08:00:00` | Día y hora de planta (tiempo simulado) |
| ❚❚ ×1 ×10 ×60 ×300 | Pausa y aceleración. El resultado es el mismo a cualquier velocidad. Si el computador no alcanza la velocidad pedida aparece "simulando ×N" |
| Contadores 1–4 | Alarmas activas o sin reconocer por prioridad (1 crítica, roja; 2 alta, naranja; 3 media, amarilla; 4 baja, azul). Clic: pantalla de alarmas |
| Reconocer | Reconoce todas las alarmas |
| Partida | Guardar en el navegador, exportar a archivo, volver al menú |
| Instructor | Panel para provocar fallas y perturbaciones |

Bajo la barra, el **banner** muestra la alarma más importante sin reconocer.

## Convenciones de color (alto desempeño)

Fondo gris y líneas en grises: el color se reserva para lo anormal. Un valor
con borde de color tiene una alarma de esa prioridad (parpadea si no está
reconocida). Fondo rosado: señal del transmisor fuera de rango (calidad mala).
En los bloques de lazo, el modo MAN aparece en azul y CAS en verde.

## Pantallas

1. **Alimentación:** silo, medidor (ritmo, WIC-101), tubo y bombas de
   astillas, licores a la alimentación (carga de álcali y relación
   licor/madera en cascada), impregnador (nivel, presión, temperatura,
   raspador) y circulación de transferencia con su calentador.
2. **Digestor:** zonas, columna de astillas, mallas, circulaciones,
   extracciones, presión, nivel, temperaturas y perfiles de temperatura y
   álcali por altura.
3. **Circulaciones y calentadores:** bomba, caudal, calentador y temperatura
   de cada circulación, adiciones de licor blanco y filtrado, ΔP de mallas.
4. **Extracciones y flash:** extracciones superior, principal (control de
   presión) y final, licor al impregnador, ciclones flash y licor a
   evaporadores.
5. **Fondo y soplado:** lavado en contracorriente, filtrado y factor de
   dilución (o temperatura de soplado), dilución y consistencia, soplado y
   estanque.
6. **Calidad y laboratorio:** indicadores de calidad con sus referencias,
   pedidos al laboratorio (20–40 min) y bloques de control avanzado
   (activar, ajustar parámetros).
7. **Tendencias:** hasta 6 series (transmisores, consignas `TAG.sp` y salidas
   `TAG.out`), grupos predefinidos, ventana de 15 min a 8 h, escala
   automática o del instrumento.
8. **Alarmas y eventos:** alarmas activas (reconocer, archivar 1 h, ver),
   enclavamientos (rearmar cuando la condición desapareció), eventos del
   proceso e historial de alarmas.
9. **Perfiles:** kappa, álcali libre y dentro de la astilla, sólidos
   disueltos, temperatura y factor H por altura. Es una ayuda didáctica que
   se puede ocultar (modo realista).

## Operar un lazo (carátula)

Clic en un bloque de lazo o en un valor que sea el PV de un lazo. La
carátula muestra PV, SP y salida con barras, el modo, la posición del
actuador y una tendencia de 30 min.

- **Consigna:** escriba y Enter (o *Fijar SP*), o use − / + (1 % del rango).
  Si el lazo estaba en CAS pasa a AUTO.
- **Salida:** solo en MAN.
- **Modo:** MAN, AUTO, CAS (si tiene maestro). Un lazo forzado por un
  enclavamiento queda en MAN hasta que se rearme el enclavamiento.
- **Maestro:** FIC-601 (filtrado de lavado) puede seguir a FDC-607 (factor de
  dilución) o a TIC-604 (temperatura de soplado).
- **Sintonía:** Kc, Ti y Td (s).

Clic en una bomba: partir o detener. En una malla: retrolavar, conmutación,
lavado ácido. En un calentador: conmutar a la unidad de respaldo, lavado ácido.

## Celular

La interfaz se adapta a pantallas angostas: la navegación se desplaza
horizontalmente, los mímicos se recorren con el dedo y las carátulas se
abren desde abajo.

## Verificación

`npm run e2e` abre Chromium, recorre las 9 pantallas y comprueba: operar un
lazo, cambio de ritmo con la coordinación de ritmo, ×300 sin bloquear la
interfaz (≈ 300 s simulados por segundo, 60 cuadros por segundo), responder
a una alarma con enclavamiento (reconocer, rearmar, volver a partir la
bomba) y guardar la partida.
