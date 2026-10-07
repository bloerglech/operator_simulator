# 1. Introducción

## 1.1 Qué es el simulador

Es un juego de operador de sala de control de una planta de celulosa kraft de
eucalipto (*Eucalyptus nitens*), centrado en el sistema de cocción continua
Lo-Solids de dos vasos: un impregnador y un digestor hidráulico. Su prioridad
es la fidelidad del proceso: que los tiempos muertos, las respuestas a los
cambios y las consecuencias de las decisiones se parezcan a las de una planta
real.

Para eso hay un **modelo de proceso** que resuelve, en el tiempo, los balances
de masa, de especies químicas y de energía en todo el sistema de cocción, más
la cinética de las reacciones de cocción. Este manual explica ese modelo.

## 1.2 Organización del software

```
src/sim/      el modelo (JavaScript puro; corre en el navegador y en Node)
config/       todos los parámetros, en archivos JSON
herramientas/ scripts: caso base, calibración
tests/        pruebas automáticas (balances, respuestas, determinismo…)
docs/         especificación, plan, modelo y este manual
```

La simulación está completamente separada de la presentación (pantallas DCS,
mundo 3D). Las pantallas solo pueden **leer** una instantánea del estado y
**enviar comandos** (cambiar un caudal, una temperatura, la composición de una
fuente). Así, cambiar el arte del juego nunca cambia un resultado del proceso.

## 1.3 Dos relojes: paso rápido y paso lento

El proceso tiene fenómenos muy rápidos (la presión de un vaso lleno de
líquido cambia en segundos) y muy lentos (la cocción dura horas). El modelo
usa dos pasos de tiempo fijos:

- **Paso rápido** de 0,2 s: presión, válvulas, controladores (desde las
  Fases 1c y 2).
- **Paso lento** de 5 s: columna de astillas, licor, calor y reacciones.

Los pasos son fijos e independientes de los cuadros por segundo del juego. Por
eso el resultado es el mismo a velocidad x1 o x300: a x300 simplemente se
ejecutan más pasos por segundo real. Esto se verifica con una prueba
automática que compara el estado completo, número por número.

## 1.4 Convenciones y unidades

Internamente el modelo usa:

| Magnitud | Unidad interna |
|----------|----------------|
| Tiempo | s |
| Longitud, volumen | m, m³ |
| Caudal | m³/s (licor), kg/s (madera) |
| Masa | kg (madera siempre en base seca) |
| Temperatura | °C (se pasa a K dentro de las expresiones de Arrhenius) |
| Energía, potencia | kJ, kW |
| OH⁻ y HS⁻ | mol/L |
| Sólidos disueltos | g/L (= kg/m³) |

Los archivos de configuración aceptan unidades de planta (m³/h, g/L como NaOH
o como Na₂O, %, MW…) y el programa las convierte al cargar.

Definiciones que se usan en todo el manual:

- **ADt** (*air dry tonne*): tonelada de pulpa secada al aire, es decir, con
  90 % de sequedad. 1 ADt = 0,9 t de pulpa seca.
- **Sobre madera**: porcentaje respecto de la madera seca alimentada. Por
  ejemplo, una carga de álcali de 18 % sobre madera significa 0,18 kg de
  álcali (como NaOH) por kg de madera seca.
- **Álcali efectivo (EA)**: NaOH + ½ Na₂S, expresado como NaOH. Ver el
  capítulo 2.

## 1.5 Cómo leer los parámetros

Cada parámetro de proceso en `config/` tiene esta forma:

```json
"carga_EA": { "valor": 18, "unidad": "%", "origen": "especificacion" }
```

El campo `origen` dice de dónde viene el número:

| Origen | Significado |
|--------|-------------|
| `literatura` | Tomado de una publicación (se indica `fuente`) |
| `especificacion` | Valor del caso base que definió el usuario del simulador |
| `calibrado` | Ajustado por la rutina de calibración para reproducir el caso base |
| `supuesto` | Valor provisional razonable, a reemplazar con datos reales |
| `planta` | Dato real de la planta (cuando se cargue) |

Esta distinción es importante para estudiar: un parámetro `calibrado` no es
una constante física medida, sino el valor que hace que el modelo reproduzca
la planta en un punto de operación. Un parámetro `supuesto` es una estimación
de orden de magnitud. El Anexo A lista todos los parámetros.

## 1.6 Cómo reproducir los ejemplos

```bash
npm install
npm run caso-base      # corre 24 h simuladas e imprime indicadores y perfiles
npm test               # todas las pruebas automáticas
```
