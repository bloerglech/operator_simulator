// Misiones de la campaña, definidas como datos (ver motor.js para el formato).
// Personajes (originales): Carmen Soto, jefa de turno (teléfono); Luis
// Paredes, operador de terreno (radio); Andrea Ruiz, laboratorio; Felipe
// Mora, caustificación. Las horas son de planta (el turno parte a las 08:00
// en el reloj del juego). El orden de la campaña está en config/campana.json.

const H = 3600
const MIN = 60
const jefa = (texto, extra = {}) => ({ mensaje: { quien: 'Carmen Soto, jefa de turno', canal: 'telefono', texto, ...extra } })
const radio = (texto, extra = {}) => ({ mensaje: { quien: 'Luis Paredes, terreno', canal: 'radio', texto, ...extra } })
const pista = (tras, texto, resaltar = null, canal = 'radio') => ({ tras, quien: canal === 'radio' ? 'Luis Paredes, terreno' : 'Ayuda', canal, texto, resaltar })

// ---------------------------------------------------------------------------
// 0. Primer día (tutorial)

const tutorial = {
  id: 'tutorial',
  capitulo: 'Capítulo 0',
  titulo: 'Primer día',
  resumen: 'Planta estable. Aprende a moverte, leer y operar el DCS.',
  ensena: 'Caminar e interactuar, pantallas, carátulas, consignas, modos, alarmas, tendencias, laboratorio, radio y aceleración del tiempo.',
  inicio: { horasPrevias: 8 },
  sinFalla: true,
  guion: [
    { id: 'bienvenida', cuando: { tiempo: 0 }, acciones: [
      jefa('Bienvenida a la sala de control. Hoy la planta está tranquila: aprovecha de conocer el DCS. Te voy a ir pidiendo cosas, sin apuro.'),
      { mostrar: 'consola' }] },
    { id: 'falla_silo', cuando: { objetivo: 'auto' }, acciones: [
      radio('Sala, te habla Luis. Estoy revisando el transmisor de nivel del silo; te va a saltar una alarma, no te asustes.'),
      { comando: { tipo: 'instrumento', id: 'LI-102', falla: 'bajo' } }] },
    { id: 'repara_silo', cuando: { objetivo: 'alarma' }, acciones: [
      { comando: { tipo: 'instrumento', id: 'LI-102', falla: null } },
      radio('Listo, ya dejé el transmisor del silo conectado. Gracias por reconocer la alarma.')] },
    { id: 'cierre', cuando: { objetivo: 'acelerar' }, acciones: [
      jefa('Muy bien. Eso es lo básico: mirar, entender antes de mover, y mover de a poco. Mañana te toca el turno de noche.'),
      { terminar: true }] },
  ],
  objetivos: [
    { id: 'consola', tipo: 'principal', texto: 'Acércate a la consola 2 (digestor) y opérala, o abre las pantallas DCS',
      condicion: { o: [{ jugador: 'dcs' }, { jugador: 'cerca', valor: 'interaccion_consola_2' }] }, oculto: true,
      pistas: [pista(60, 'Camina con W A S D hasta la consola del medio y presiona E. En celular, usa el joystick y toca Operar.', null, 'ayuda')] },
    { id: 'pantalla', tipo: 'principal', texto: 'Abre la pantalla «2 Digestor»', desde: { objetivo: 'consola' },
      condicion: { jugador: 'pantalla', valor: 'digestor' },
      pistas: [pista(45, 'Arriba están las pestañas de las pantallas. Busca «2 Digestor».', null, 'ayuda')] },
    { id: 'caratula', tipo: 'principal', texto: 'Abre la carátula de TIC-402 (temperatura del calentador superior)', desde: { objetivo: 'pantalla' },
      condicion: { jugador: 'caratula', valor: 'TIC-402' },
      pistas: [pista(45, 'Haz clic en el bloque TIC-402, a la derecha del digestor.', 'TIC-402', 'ayuda')] },
    { id: 'consigna', tipo: 'principal', texto: 'Sube la consigna de TIC-402 a 157 °C', desde: { objetivo: 'caratula' },
      condicion: { lazo: 'TIC-402', campo: 'sp', entre: [156.8, 157.2] },
      pistas: [pista(60, 'En la carátula escribe 157 en el campo de SP y presiona Enter (o «Fijar SP»).', 'TIC-402', 'ayuda')] },
    { id: 'manual', tipo: 'principal', texto: 'Pasa FIC-405 (filtrado a la circulación superior) a manual', desde: { objetivo: 'consigna' },
      condicion: { comando: { tipo: 'lazo', id: 'FIC-405', accion: 'modo', valor: 'MAN' } },
      pistas: [pista(60, 'FIC-405 está en la pantalla «3 Circulaciones». En su carátula, botón MAN.', 'FIC-405', 'ayuda')] },
    { id: 'auto', tipo: 'principal', texto: 'Devuelve FIC-405 a automático', desde: { objetivo: 'manual' },
      condicion: { lazo: 'FIC-405', modo: 'AUTO' },
      pistas: [pista(45, 'Botón AUTO en la misma carátula. La salida no salta: el cambio es sin golpe.', 'FIC-405', 'ayuda')] },
    { id: 'alarma', tipo: 'principal', texto: 'Reconoce las alarmas nuevas', desde: { paso: 'falla_silo' },
      condicion: { y: [{ comando: { tipo: 'alarma', accion: 'reconocer' } }, { alarmasSinReconocer: 0 }] },
      pistas: [pista(45, 'El banner de arriba muestra la alarma. Usa «Reconocer» o la pantalla «8 Alarmas y eventos».', null, 'ayuda')] },
    { id: 'tendencia', tipo: 'principal', texto: 'Arma una tendencia que incluya TI-402 (pantalla «7 Tendencias»)', desde: { objetivo: 'alarma' },
      condicion: { jugador: 'tendencia', valor: 'TI-402' },
      pistas: [pista(60, 'En «7 Tendencias» elige TI-402 en uno de los selectores, o usa el grupo «Temperaturas de cocción».', null, 'ayuda')] },
    { id: 'laboratorio', tipo: 'principal', texto: 'Pide un kappa al laboratorio (pantalla «6 Calidad y laboratorio»)', desde: { objetivo: 'tendencia' },
      condicion: { comando: { tipo: 'laboratorio', analisis: 'kappa' } },
      pistas: [pista(60, 'En «6 Calidad y laboratorio», botón «Kappa de la pulpa».', null, 'ayuda')] },
    { id: 'radio', tipo: 'principal', texto: 'Llama por radio a Luis, el operador de terreno', desde: { objetivo: 'laboratorio' },
      condicion: { jugador: 'radio' },
      pistas: [pista(60, 'La radio está en el escritorio del supervisor (al fondo, a la derecha). En las pantallas, botón «Radio».', null, 'ayuda')] },
    { id: 'acelerar', tipo: 'principal', texto: 'Acelera el tiempo (×60) y espera el resultado del laboratorio', desde: { objetivo: 'radio' },
      condicion: { laboratorio: 'kappa' },
      pistas: [pista(90, 'Botones ×10, ×60 y ×300 arriba a la izquierda. El laboratorio tarda 20 a 40 minutos de planta.', null, 'ayuda')] },
  ],
  fin: { paso: 'cierre' },
  evaluacion: [
    { texto: 'Sin enclavamientos disparados', condicion: { no: { incidente: 'enclavamiento' } }, puntos: 1 },
    { texto: 'Sin aperturas de la válvula de alivio', condicion: { no: { incidente: 'apertura_alivio' } }, puntos: 1 },
  ],
  respuestaIdeal: 'Antes de mover algo, ubicar la variable en su pantalla, abrir la carátula y leer PV, SP, salida y modo. Cambiar consignas de a poco. Reconocer cada alarma leyendo qué dice. Usar tendencias para ver la historia y el laboratorio para confirmar lo que dicen los analizadores.',
}

// ---------------------------------------------------------------------------
// 1. Turno de noche: madera húmeda

const turnoNoche = {
  id: 'turno_noche',
  capitulo: 'Capítulo 1',
  titulo: 'Turno de noche',
  resumen: 'Llega astilla mojada por la lluvia. Mantener el kappa en banda hasta el cambio de turno.',
  ensena: 'El tiempo muerto entre una causa y su efecto en el kappa; la relación licor/madera y la carga de álcali; el laboratorio como confirmación.',
  inicio: { horasPrevias: 8 },
  guion: [
    { id: 'entrega', cuando: { tiempo: 0 }, acciones: [
      jefa('Buenas noches. Te dejo la planta estable, kappa 17. Desde la medianoche entra astilla de la pila 4, la que se mojó con la lluvia de la tarde. Necesito el kappa en banda, 16 a 18, hasta el cambio de turno en 8 horas.')] },
    { id: 'lluvia', cuando: { tiempo: 10 * MIN }, acciones: [{ evento: 'lluvia' }] },
    { id: 'terreno', cuando: { tiempo: 45 * MIN }, acciones: [
      radio('Sala, acá en la correa las astillas vienen chorreando. Esa pila estuvo todo el día bajo el agua.')] },
    { id: 'lab', cuando: { y: [{ tiempo: 3 * H }, { no: { comando: { tipo: 'laboratorio', analisis: 'humedad_astillas' } } }] }, acciones: [
      { mensaje: { quien: 'Andrea Ruiz, laboratorio', canal: 'telefono', texto: 'Hola, te llamo del laboratorio: ¿no quieres que te midamos la humedad de las astillas? Con esta lluvia debe estar sobre 50 %.' } }] },
    { id: 'relevo', cuando: { tiempo: 8 * H }, acciones: [
      jefa('Ya llegó el turno de la mañana. Veamos cómo quedó la noche.'), { terminar: true }] },
  ],
  objetivos: [
    { id: 'kappa_final', tipo: 'principal', final: true, texto: 'Entregar el turno con kappa del soplado entre 16 y 18', condicion: { kpi: 'kappa', entre: [16, 18] } },
    { id: 'en_banda', tipo: 'principal', final: true, texto: 'No más de 1 hora de pulpa fuera de especificación', condicion: { indicador: 'tiempoFueraEspec', op: '<=', valor: H } },
    { id: 'humedad', tipo: 'secundario', texto: 'Pedir la humedad de las astillas al laboratorio', desde: { paso: 'terreno' },
      condicion: { comando: { tipo: 'laboratorio', analisis: 'humedad_astillas' } },
      pistas: [pista(40 * MIN, 'Oye, con astilla así de mojada conviene pedirle la humedad al laboratorio.'),
        pista(80 * MIN, 'Pantalla «6 Calidad y laboratorio», botón «Humedad de astillas».', null, 'ayuda')] },
    { id: 'relacion', tipo: 'secundario', texto: 'Corregir la humedad en el bloque de relación licor/madera (FFC-117)', desde: { laboratorio: 'humedad_astillas' },
      condicion: { comando: { tipo: 'bloque', id: 'FFC-117', accion: 'parametro', campo: 'humedad' } },
      pistas: [pista(20 * MIN, 'El bloque FFC-117 calcula el licor negro con la humedad que le das. Si la humedad real subió, la relación licor/madera (LW-117) quedó alta.', 'LW-117'),
        pista(45 * MIN, 'Pantalla «6 Calidad y laboratorio», bloque FFC-117: escribe la humedad del laboratorio y «Aplicar».', null, 'ayuda')] },
  ],
  fallas: [
    { condicion: { kpi: 'kappa', op: '>', valor: 22 }, mensaje: 'El kappa pasó de 22: la pulpa no sirve para el blanqueo y hubo que desviarla.' },
    { condicion: { incidente: 'apertura_seguridad' }, mensaje: 'Abrió la válvula de seguridad del digestor.' },
  ],
  fin: { paso: 'relevo' },
  evaluacion: [
    { texto: 'Desviación estándar del kappa menor que 0,6', condicion: { indicador: 'kappaDesv', op: '<', valor: 0.6 }, puntos: 2 },
    { texto: 'Producción media de al menos 2 900 ADt/d', condicion: { indicador: 'produccionMedia', op: '>=', valor: 2900 }, puntos: 1 },
    { texto: 'Sin aperturas de la válvula de alivio', condicion: { no: { incidente: 'apertura_alivio' } }, puntos: 1 },
    { texto: 'Sin enclavamientos disparados', condicion: { no: { incidente: 'enclavamiento' } }, puntos: 1 },
  ],
  respuestaIdeal: 'La astilla húmeda trae más agua: con el mismo licor sube la relación licor/madera (LW-117 pasa de 4,0 a ≈ 4,2) y el álcali queda más diluido. El efecto en el kappa llega 3 a 5 horas después, cuando ya es tarde para corregir. La respuesta es anticiparse: pedir la humedad al laboratorio apenas llega el aviso, actualizarla en FFC-117 (que baja el licor negro y devuelve la relación a 4,0) y vigilar el álcali residual de la extracción principal (AI-504) como indicador adelantado. Subir la carga de álcali solo si, aun así, el kappa del analizador sube.',
}

// ---------------------------------------------------------------------------
// 2. Piden más toneladas

const masToneladas = {
  id: 'mas_toneladas',
  capitulo: 'Capítulo 2',
  titulo: 'Piden más toneladas',
  resumen: 'Subir del 85 % al 100 % del ritmo sin sacar el kappa de banda.',
  ensena: 'La coordinación de ritmo: madera, álcali, licores, extracciones y temperaturas se mueven juntos; a más ritmo, menos tiempo de cocción y menos factor H.',
  inicio: {
    horasPrevias: 8,
    // Se baja al 85 % y se deja asentar la planta antes de entregarla.
    preparacion: {
      comandos: [
        { tipo: 'bloque', id: 'RC-700', accion: 'parametro', campo: 'produccion', valor: 2550 },
        { tipo: 'bloque', id: 'RC-700', accion: 'parametro', campo: 'rampa', valor: 300 },
        { tipo: 'bloque', id: 'RC-700', accion: 'activar' },
        // El turno anterior bajó las temperaturas para mantener el factor H al 85 %.
        { tipo: 'bloque', id: 'HIC-703', accion: 'parametro', campo: 'objetivo', valor: 440 },
        { tipo: 'bloque', id: 'HIC-703', accion: 'activar' },
      ],
      horas: 9,
      // Al entregar, la rampa vuelve a la normal y el control de H queda apagado (las temperaturas quedan donde estaban).
      despues: [
        { tipo: 'bloque', id: 'RC-700', accion: 'parametro', campo: 'rampa', valor: 150 },
        { tipo: 'bloque', id: 'HIC-703', accion: 'desactivar' },
      ],
    },
  },
  guion: [
    { id: 'pedido', cuando: { tiempo: 0 }, acciones: [
      jefa('Estamos al 85 %, unas 2 550 toneladas por día. Ventas necesita recuperar: quiero ver 3 000 en el soplado antes de 5 horas, sin sacar el kappa de banda. El control de ritmo, RC-700, está activo en la pantalla de calidad.')] },
    { id: 'vapor', cuando: { tag: 'QI-702', op: '>=', valor: 2800 }, acciones: [
      radio('Sala, los calentadores están pidiendo más vapor. ¿Estás mirando las temperaturas de cocción?')] },
    { id: 'relevo', cuando: { tiempo: 7 * H }, acciones: [jefa('Terminó el turno. Revisemos las toneladas.'), { terminar: true }] },
  ],
  objetivos: [
    { id: 'ritmo', tipo: 'principal', texto: 'Llegar a 2 950 ADt/d o más en el soplado (QI-702) dentro de 5 horas y mantenerlo 30 minutos',
      condicion: { tag: 'QI-702', op: '>=', valor: 2950 }, durante: 30 * MIN, plazo: 5 * H,
      pistas: [pista(30 * MIN, 'En «6 Calidad y laboratorio», el bloque RC-700: sube la producción objetivo a 3 000 y aplica.'),
        pista(60 * MIN, 'RC-700 sube la madera en rampa y escala los caudales marcados. La rampa normal es de 150 ADt/d por hora.', null, 'ayuda')] },
    { id: 'kappa_final', tipo: 'principal', final: true, texto: 'Terminar el turno con kappa entre 16 y 18', condicion: { kpi: 'kappa', entre: [16, 18] } },
    { id: 'en_banda', tipo: 'principal', final: true, texto: 'No más de 3 horas de pulpa fuera de especificación', condicion: { indicador: 'tiempoFueraEspec', op: '<=', valor: 3 * H } },
    { id: 'factor_h', tipo: 'secundario', texto: 'Compensar el menor tiempo de cocción (control de factor H o temperaturas)', desde: { tag: 'QI-702', op: '>=', valor: 2700 }, anticipable: true,
      condicion: { o: [{ comando: { tipo: 'bloque', id: 'HIC-703', accion: 'activar' } }, { lazo: 'TIC-404', campo: 'sp', op: '>=', valor: 156 }] },
      pistas: [pista(30 * MIN, 'A más ritmo las astillas pasan menos tiempo en la zona de cocción: baja el factor H. Mira HI-703.', 'HI-703'),
        pista(60 * MIN, 'Puedes activar HIC-703 (control de factor H) en la pantalla de calidad, o subir 1 a 2 °C las consignas de TIC-402 y TIC-404.', null, 'ayuda')] },
  ],
  fallas: [
    { condicion: { kpi: 'kappa', op: '>', valor: 22 }, mensaje: 'El kappa pasó de 22: la pulpa no sirve para el blanqueo.' },
    { condicion: { enclavamiento: 'I-02' }, mensaje: 'El nivel de astillas del digestor llegó al enclavamiento: se cortó la alimentación.' },
    { condicion: { incidente: 'apertura_seguridad' }, mensaje: 'Abrió la válvula de seguridad del digestor.' },
  ],
  fin: { paso: 'relevo' },
  evaluacion: [
    { texto: 'Al menos 800 ADt producidas en el turno', condicion: { indicador: 'adt', op: '>=', valor: 800 }, puntos: 2 },
    { texto: 'Menos de 1,5 horas fuera de especificación', condicion: { indicador: 'tiempoFueraEspec', op: '<=', valor: 1.5 * H }, puntos: 2 },
    { texto: 'Desviación estándar del kappa menor que 1,2', condicion: { indicador: 'kappaDesv', op: '<', valor: 1.2 }, puntos: 1 },
    { texto: 'Sin aperturas de la válvula de alivio', condicion: { no: { incidente: 'apertura_alivio' } }, puntos: 1 },
    { texto: 'Sin enclavamientos disparados', condicion: { no: { incidente: 'enclavamiento' } }, puntos: 1 },
  ],
  respuestaIdeal: 'Subir el ritmo con la coordinación RC-700 (rampa de 150 a 200 ADt/d por hora) para que madera, álcali, licores y extracciones se muevan juntos. Como a más ritmo la astilla pasa menos tiempo en la cocción, el factor H baja y el kappa sube 3 a 4 horas después: activar el control de factor H (HIC-703) al empezar la rampa, o subir las temperaturas de cocción 1 a 2 °C, anticipándose. Vigilar el nivel de astillas del digestor y la presión durante la rampa.',
}

// ---------------------------------------------------------------------------
// 3. Licor débil

const licorDebil = {
  id: 'licor_debil',
  capitulo: 'Capítulo 3',
  titulo: 'Licor débil',
  resumen: 'Baja la concentración del licor blanco y después escasea. Compensar o bajar el ritmo.',
  ensena: 'La carga de álcali es una razón: si el licor es más débil hace falta más caudal; si no hay licor, la única forma de mantener la carga es bajar el ritmo.',
  inicio: { horasPrevias: 8 },
  guion: [
    { id: 'entrega', cuando: { tiempo: 0 }, acciones: [
      jefa('Turno tranquilo por ahora. Caustificación anda con problemas en el apagador, así que ojo con el licor blanco.')] },
    { id: 'debil', cuando: { tiempo: 10 * MIN }, acciones: [{ evento: 'licor_debil' }] },
    { id: 'caustificacion', cuando: { tiempo: 2 * H }, acciones: [
      { mensaje: { quien: 'Felipe Mora, caustificación', canal: 'telefono', texto: 'Hola, te habla Felipe de caustificación. Tuvimos el apagador con problemas toda la mañana; el licor puede venir más débil de lo normal.' } }] },
    { id: 'aviso_falta', cuando: { tiempo: 3 * H }, acciones: [
      { mensaje: { quien: 'Felipe Mora, caustificación', canal: 'telefono', texto: 'Malas noticias: en 15 minutos te vamos a poder mandar solo unos 220 metros cúbicos por hora de licor blanco, durante unas dos horas.' } }] },
    { id: 'falta', cuando: { tiempo: 3.25 * H }, acciones: [{ evento: 'falta_licor' }] },
    { id: 'relevo', cuando: { tiempo: 7 * H }, acciones: [jefa('Fin del turno. Veamos cómo resultó.'), { terminar: true }] },
  ],
  objetivos: [
    { id: 'kappa_final', tipo: 'principal', final: true, texto: 'Terminar el turno con kappa entre 16 y 18', condicion: { kpi: 'kappa', entre: [16, 18] } },
    { id: 'en_banda', tipo: 'principal', final: true, texto: 'No más de 1,5 horas de pulpa fuera de especificación', condicion: { indicador: 'tiempoFueraEspec', op: '<=', valor: 1.5 * H } },
    { id: 'ea', tipo: 'secundario', texto: 'Pedir el álcali efectivo del licor blanco al laboratorio', desde: { paso: 'caustificacion' }, anticipable: true,
      condicion: { comando: { tipo: 'laboratorio', analisis: 'licor_blanco_EA' } },
      pistas: [pista(30 * MIN, 'El bloque FFC-110 calcula el licor con el EA del último análisis. Si el licor se debilitó y nadie lo midió, la carga real bajó.', 'AI-504'),
        pista(60 * MIN, 'Pantalla «6 Calidad y laboratorio», botón «Álcali efectivo del licor blanco».', null, 'ayuda')] },
    { id: 'bajar_ritmo', tipo: 'secundario', texto: 'Bajar el ritmo mientras falta licor blanco', desde: { paso: 'aviso_falta' },
      condicion: { lazo: 'WIC-101', campo: 'sp', op: '<=', valor: 185 },
      pistas: [pista(15 * MIN, 'Con 220 m³/h de licor no alcanza para 18 % de carga a ritmo completo. Calcula: carga × madera / EA.'),
        pista(30 * MIN, 'Baja la producción con RC-700 (o la consigna de WIC-101) cerca de un 15 % mientras dure la falta.', 'WIC-101', 'ayuda')] },
  ],
  fallas: [
    { condicion: { kpi: 'kappa', op: '>', valor: 22 }, mensaje: 'El kappa pasó de 22: la pulpa no sirve para el blanqueo.' },
    { condicion: { incidente: 'apertura_seguridad' }, mensaje: 'Abrió la válvula de seguridad del digestor.' },
  ],
  fin: { paso: 'relevo' },
  evaluacion: [
    { texto: 'Desviación estándar del kappa menor que 0,8', condicion: { indicador: 'kappaDesv', op: '<', valor: 0.8 }, puntos: 2 },
    { texto: 'Rechazos bajo 0,5 % en promedio', condicion: { indicador: 'rechazos', op: '<', valor: 0.005 }, puntos: 1 },
    { texto: 'Sin aperturas de la válvula de alivio', condicion: { no: { incidente: 'apertura_alivio' } }, puntos: 1 },
    { texto: 'Sin enclavamientos disparados', condicion: { no: { incidente: 'enclavamiento' } }, puntos: 1 },
  ],
  respuestaIdeal: 'Un licor más débil no cambia ningún caudal: lo delata el álcali residual de las extracciones (AI-504, AI-505) que baja sin otra causa. Pedir el EA del licor blanco al laboratorio: FFC-110 usa ese valor y sube el caudal para mantener la carga. Cuando caustificación avisa que faltará licor, calcular cuánta madera alcanza a cocerse con el licor disponible (carga = caudal × EA / madera) y bajar el ritmo antes de que empiece la falta, para no entregar pulpa cruda; volver al ritmo cuando se normalice.',
}

// ---------------------------------------------------------------------------
// 4. Mallas

const mallas = {
  id: 'mallas',
  capitulo: 'Capítulo 4',
  titulo: 'Mallas',
  resumen: 'Astillas con muchos finos y la conmutación de mallas detenida tras una mantención. Que no se tapen.',
  ensena: 'Las mallas se tapan de a poco: la ΔP (PDI-52x) avisa horas antes. Conmutación, retrolavado y la causa (finos) se atienden antes de que la bomba se proteja.',
  inicio: { horasPrevias: 8 },
  guion: [
    { id: 'entrega', cuando: { tiempo: 0 }, acciones: [
      // Mantención dejó la conmutación de las mallas de circulación detenida y llegan astillas con muchos finos.
      { comando: { tipo: 'mallas', id: 'mallas_circ_sup', accion: 'conmutacion_off' } },
      { comando: { tipo: 'mallas', id: 'mallas_circ_inf', accion: 'conmutacion_off' } },
      { comando: { tipo: 'perturbar', id: 'finos', valor: 4.5 } },
      jefa('Buen día. Instrumentación estuvo trabajando en el PLC de las mallas durante la noche; quedaron de avisar cuando terminen. El patio está recuperando astillas del acopio viejo.')] },
    { id: 'patio', cuando: { tiempo: 45 * MIN }, acciones: [
      radio('Sala, pasé por la correa: las astillas vienen con harto aserrín y astilla rota. Ojo con las mallas.')] },
    { id: 'alarma', cuando: { o: [{ tag: 'PDI-524', op: '>=', valor: 0.8 }, { tag: 'PDI-526', op: '>=', valor: 0.8 }] }, acciones: [
      radio('Sala, en terreno se escucha raro la bomba de circulación. ¿Cómo ves la presión diferencial de las mallas?')] },
    { id: 'relevo', cuando: { tiempo: 5 * H }, acciones: [jefa('Fin del turno. Veamos cómo quedaron las mallas.'), { terminar: true }] },
  ],
  objetivos: [
    { id: 'conmutacion', tipo: 'principal', texto: 'Dejar la conmutación activa en las mallas de circulación superior e inferior',
      condicion: { y: [{ malla: 'mallas_circ_sup', conmutacion: true }, { malla: 'mallas_circ_inf', conmutacion: true }] },
      pistas: [pista(90 * MIN, 'Sala, ¿instrumentación te devolvió las mallas? Revisa en la pantalla de circulaciones si la conmutación está activa.'),
        pista(120 * MIN, 'En «3 Circulaciones», haz clic en las mallas de circulación superior e inferior: «Activar conmutación».', 'PDI-524', 'ayuda')] },
    { id: 'retrolavar', tipo: 'principal', texto: 'Retrolavar las mallas de circulación cuando su ΔP suba', evitable: true, desde: { o: [{ tag: 'PDI-524', op: '>=', valor: 0.7 }, { tag: 'PDI-526', op: '>=', valor: 0.7 }] },
      condicion: { o: [{ comando: { tipo: 'mallas', id: 'mallas_circ_sup', accion: 'retrolavar' } }, { comando: { tipo: 'mallas', id: 'mallas_circ_inf', accion: 'retrolavar' } }] },
      pistas: [pista(15 * MIN, 'La ΔP de las mallas sube: si llega a 0,95 bar la bomba se protege y se corta el vapor. Hay que retrolavar.', 'PDI-524'),
        pista(30 * MIN, 'En «3 Circulaciones», clic en las mallas: «Retrolavar».', 'PDI-526', 'ayuda')] },
    { id: 'finos', tipo: 'secundario', texto: 'Pedir el contenido de finos de las astillas al laboratorio', desde: { paso: 'patio' }, anticipable: true,
      condicion: { comando: { tipo: 'laboratorio', analisis: 'finos_astillas' } },
      pistas: [pista(45 * MIN, 'Si sospechas de la astilla, el laboratorio mide los finos. Pantalla «6 Calidad y laboratorio».', null, 'ayuda')] },
    { id: 'dp_final', tipo: 'principal', final: true, texto: 'Terminar el turno con la ΔP de ambas mallas de circulación bajo 0,7 bar',
      condicion: { y: [{ tag: 'PDI-524', op: '<', valor: 0.7 }, { tag: 'PDI-526', op: '<', valor: 0.7 }] } },
    { id: 'kappa_final', tipo: 'principal', final: true, texto: 'Terminar el turno con kappa entre 16 y 18', condicion: { kpi: 'kappa', entre: [16, 18] } },
  ],
  fallas: [
    { condicion: { o: [{ enclavamiento: 'I-09' }, { enclavamiento: 'I-10' }] }, mensaje: 'La ΔP de las mallas llegó al límite: la bomba de circulación se detuvo y se cortó el vapor de cocción.' },
    { condicion: { kpi: 'kappa', op: '>', valor: 22 }, mensaje: 'El kappa pasó de 22: la pulpa no sirve para el blanqueo.' },
    { condicion: { incidente: 'apertura_seguridad' }, mensaje: 'Abrió la válvula de seguridad del digestor.' },
  ],
  fin: { paso: 'relevo' },
  evaluacion: [
    { texto: 'Conmutación activa antes de que la ΔP llegara a la alarma', condicion: { y: [{ objetivo: 'conmutacion' }, { no: { paso: 'alarma' } }] }, puntos: 2 },
    { texto: 'Conmutación activa al entregar el turno', condicion: { y: [{ malla: 'mallas_circ_sup', conmutacion: true }, { malla: 'mallas_circ_inf', conmutacion: true }] }, puntos: 1 },
    { texto: 'Desviación estándar del kappa menor que 0,6', condicion: { indicador: 'kappaDesv', op: '<', valor: 0.6 }, puntos: 1 },
    { texto: 'Sin aperturas de la válvula de alivio', condicion: { no: { incidente: 'apertura_alivio' } }, puntos: 1 },
    { texto: 'Sin enclavamientos disparados', condicion: { no: { incidente: 'enclavamiento' } }, puntos: 1 },
  ],
  respuestaIdeal: 'Al recibir la planta, revisar el estado de los equipos que tocó mantención: la conmutación de mallas detenida hace que siempre extraigan las mismas ranuras y se tapen. Activarla apenas se nota. Cuando el patio avisa finos, pedir el análisis y vigilar la ΔP de todas las mallas (PDI-524 a PDI-527): sube de a poco durante horas. Retrolavar antes de 0,8 bar; si aun así sube, bajar el caudal de circulación o el ritmo. La bomba se protege a 0,95 bar y corta el vapor de cocción: eso cuesta horas de pulpa cruda.',
}

// ---------------------------------------------------------------------------
// 5. Primera presurización

const evaporadores = (texto) => ({ mensaje: { quien: 'Rodrigo Vera, evaporadores', canal: 'telefono', texto } })

const presurizacion = {
  id: 'presurizacion',
  capitulo: 'Capítulo 5',
  titulo: 'Primera presurización',
  resumen: 'Evaporadores restringe de golpe la recepción de licor. La presión del digestor sube en minutos.',
  ensena: 'El digestor está lleno de líquido: lo que entra tiene que salir. Si una salida se cierra, la presión sube rápido; la respuesta es bajar en la misma cantidad lo que entra, no esperar al control.',
  inicio: { horasPrevias: 8 },
  guion: [
    { id: 'entrega', cuando: { tiempo: 0 }, acciones: [
      jefa('Hola. Planta normal, ritmo completo. Evaporadores anda con un efecto sucio; si llaman, atiéndelos rápido.')] },
    { id: 'aviso', cuando: { tiempo: 10 * MIN }, acciones: [
      evaporadores('¡Sala! Rodrigo, de evaporadores. Se nos tapó el efecto 3: desde ya solo puedo recibir unos 600 metros cúbicos por hora de licor débil. Te aviso cuando se arregle.'),
      { evento: 'evaporadores_restringidos' }] },
    { id: 'flash', cuando: { o: [{ tag: 'LI-511', op: '>=', valor: 90 }, { tag: 'LI-510', op: '>=', valor: 90 }] }, acciones: [
      radio('Sala, los ciclones flash están llenos, y la extracción se escucha estrangulada. ¿Qué hacemos?')] },
    { id: 'sobrepresion', cuando: { tag: 'PI-301', op: '>', valor: 6.5 }, acciones: [
      radio('¡Sala, la presión del digestor está subiendo fuerte! Pasó de 6,5.')] },
    { id: 'normal', cuando: { tiempo: 75 * MIN }, acciones: [
      evaporadores('Sala, ya lavamos el efecto 3. Puedes mandar todo el licor de nuevo. Gracias por la paciencia.')] },
    { id: 'relevo', cuando: { tiempo: 150 * MIN }, acciones: [jefa('Buen trabajo. Revisemos cómo quedó la presión.'), { terminar: true }] },
  ],
  objetivos: [
    { id: 'lavado', tipo: 'principal', texto: 'Bajar el filtrado de lavado al fondo (FIC-601) a 950 m³/h o menos mientras dure la restricción', desde: { paso: 'aviso' },
      condicion: { tag: 'FI-601', op: '<=', valor: 950 },
      pistas: [pista(3 * MIN, 'Lo que entra al digestor tiene que salir. Si evaporadores recibe 330 m³/h menos, algo tiene que entrar 330 menos. El filtrado de lavado (FIC-601) es la entrada más grande.', 'FIC-601'),
        pista(6 * MIN, 'Pantalla «5 Fondo y soplado»: carátula de FIC-601, pásalo a AUTO y baja la consigna a unos 850 m³/h. FFC-503 bajará la extracción final en lo mismo.', 'FIC-601', 'ayuda')] },
    { id: 'cascada', tipo: 'secundario', texto: 'Devolver FIC-601 a cascada cuando evaporadores se normalice', desde: { paso: 'normal' },
      condicion: { lazo: 'FIC-601', modo: 'CAS' },
      pistas: [pista(15 * MIN, 'Evaporadores ya recibe todo. Vuelve FIC-601 a CAS para que el factor de dilución (FDC-607) lo maneje de nuevo.', 'FIC-601', 'ayuda')] },
    { id: 'presion_final', tipo: 'principal', final: true, texto: 'Terminar con la presión del digestor entre 5 y 6 bar', condicion: { tag: 'PI-301', entre: [5, 6] } },
    { id: 'kappa_final', tipo: 'principal', final: true, texto: 'Terminar con kappa entre 16 y 18', condicion: { kpi: 'kappa', entre: [16, 18] } },
  ],
  fallas: [
    { condicion: { incidente: 'apertura_alivio' }, mensaje: 'Abrió la válvula de alivio: el digestor descargó licor caliente al estanque de alivio.' },
    { condicion: { incidente: 'apertura_seguridad' }, mensaje: 'Abrió la válvula de seguridad del digestor.' },
    { condicion: { enclavamiento: 'I-01' }, mensaje: 'La presión del digestor llegó al enclavamiento: se cortó la alimentación.' },
  ],
  fin: { paso: 'relevo' },
  evaluacion: [
    { texto: 'Presión del digestor siempre bajo 6,5 bar', condicion: { no: { paso: 'sobrepresion' } }, puntos: 2 },
    { texto: 'Sin enclavamientos disparados', condicion: { no: { incidente: 'enclavamiento' } }, puntos: 1 },
    { texto: 'Desviación estándar del kappa menor que 0,6', condicion: { indicador: 'kappaDesv', op: '<', valor: 0.6 }, puntos: 1 },
  ],
  respuestaIdeal: 'El digestor trabaja lleno de líquido: casi no hay volumen que absorba un desbalance, por eso la presión sube en minutos. Cuando evaporadores restringe, los ciclones flash se llenan y la extracción queda estrangulada; PIC-301 abre su válvula al 100 % y ya no puede hacer nada. La respuesta es reducir en la misma cantidad lo que entra: sacar FIC-601 de cascada y bajar su consigna en lo que falta en evaporadores (≈ 300 m³/h); la extracción final la sigue por FFC-503. Bajar el ritmo también ayuda, pero es lento. Al normalizarse, devolver FIC-601 a cascada.',
}

// ---------------------------------------------------------------------------
// 6. Columna colgada

const columnaColgada = {
  id: 'columna_colgada',
  capitulo: 'Capítulo 6',
  titulo: 'Columna colgada',
  resumen: 'La columna de astillas deja de bajar en el digestor. Reconocerlo y soltarla antes de que caiga sola.',
  ensena: 'Los síntomas de un colgamiento (nivel que no baja aunque se sople, soplado aguado, presión que cae) y cómo soltar la columna: menos alimentación, menos soplado y menos extracción bajo la zona colgada; después, volver de a poco.',
  inicio: { horasPrevias: 8 },
  guion: [
    { id: 'entrega', cuando: { tiempo: 0 }, acciones: [
      jefa('Hola. Anoche hubo varias paradas cortas y la astilla viene compactada. Vigila el fondo del digestor.')] },
    { id: 'colgamiento', cuando: { tiempo: 5 * MIN }, acciones: [{ evento: 'colgamiento' }] },
    { id: 'terreno', cuando: { tiempo: 9 * MIN }, acciones: [
      radio('Sala, estoy en el soplado: la lechada sale aguada, casi pura agua. Y el raspador del digestor anda liviano. Algo raro hay en el fondo.')] },
    { id: 'soltada', cuando: { incidente: 'liberacion_columna' }, acciones: [
      radio('¡Sala, se sintió un golpe en el digestor y el raspador volvió a tomar carga! La columna bajó.'),
      jefa('Bien. Ahora vuelve a la normalidad de a poco: primero el lavado y el soplado, después la madera.', { puntoControl: true })] },
    { id: 'relevo', cuando: { tiempo: 5 * H }, acciones: [jefa('Terminó el turno. Revisemos cómo quedó.'), { terminar: true }] },
  ],
  objetivos: [
    { id: 'alimentacion', tipo: 'principal', texto: 'Bajar la alimentación de astillas (WIC-101) a 120 t/h o menos para que el nivel no llegue al enclavamiento', desde: { paso: 'terreno' },
      condicion: { lazo: 'WIC-101', campo: 'sp', op: '<=', valor: 120 },
      pistas: [pista(4 * MIN, 'Mira LI-302: el nivel de astillas sube aunque el soplado está al máximo. Si nada baja por el fondo y sigues alimentando, el nivel llega al enclavamiento.', 'LI-302'),
        pista(8 * MIN, 'Pantalla «1 Alimentación»: baja la consigna de WIC-101 a unas 100 t/h.', 'WIC-101', 'ayuda')] },
    { id: 'soltar', tipo: 'principal', texto: 'Soltar la columna antes de que caiga sola', desde: { paso: 'terreno' },
      condicion: { incidente: 'liberacion_columna' },
      pistas: [pista(6 * MIN, 'Con la columna colgada, soplar más solo agranda el hueco bajo ella. Pasa LIC-302 a manual y baja el soplado.', 'LIC-302'),
        pista(10 * MIN, 'La extracción tira el licor hacia abajo y aprieta la columna contra las mallas. Baja el filtrado de lavado (FIC-601 en AUTO, unos 750 m³/h): FFC-503 bajará la extracción final y la columna se soltará en unos minutos.', 'FIC-601', 'ayuda')] },
    { id: 'ritmo_final', tipo: 'principal', final: true, texto: 'Terminar el turno con la alimentación de vuelta a 200 t/h o más', condicion: { tag: 'WI-101', op: '>=', valor: 200 } },
    { id: 'presion_final', tipo: 'principal', final: true, texto: 'Terminar el turno con la presión del digestor entre 5 y 6 bar', condicion: { tag: 'PI-301', entre: [5, 6] } },
    { id: 'cascada', tipo: 'secundario', texto: 'Devolver FIC-601 y LIC-302 a su modo normal', desde: { paso: 'soltada' },
      condicion: { y: [{ lazo: 'FIC-601', modo: 'CAS' }, { lazo: 'LIC-302', modo: 'AUTO' }] },
      pistas: [pista(10 * MIN, 'Sube de a poco: cada 10 minutos unas 20 t/h más de madera, el filtrado de lavado y la salida de LIC-302 en la misma proporción. Mira PI-301.', 'WIC-101'),
        pista(90 * MIN, 'Con el ritmo completo y la presión estable, fija la consigna de LIC-302 en el nivel actual, pásalo a AUTO y vuelve FIC-601 a CAS.', 'LIC-302', 'ayuda')] },
  ],
  fallas: [
    { condicion: { incidente: 'caida_columna' }, mensaje: 'La columna cayó de golpe sobre el hueco: golpe de ariete en el digestor y astillas crudas al soplado.' },
    { condicion: { enclavamiento: 'I-02' }, mensaje: 'El nivel de astillas del digestor llegó al enclavamiento: se cortó la alimentación.' },
    { condicion: { incidente: 'apertura_seguridad' }, mensaje: 'Abrió la válvula de seguridad del digestor.' },
  ],
  fin: { paso: 'relevo' },
  evaluacion: [
    { texto: 'Sin aperturas de la válvula de alivio', condicion: { no: { incidente: 'apertura_alivio' } }, puntos: 2 },
    { texto: 'Kappa final entre 15 y 19', condicion: { kpi: 'kappa', entre: [15, 19] }, puntos: 1 },
    { texto: 'Producción del turno de al menos 400 ADt', condicion: { indicador: 'adt', op: '>=', valor: 400 }, puntos: 1 },
    { texto: 'Sin enclavamientos disparados', condicion: { no: { incidente: 'enclavamiento' } }, puntos: 1 },
  ],
  respuestaIdeal: 'Un colgamiento se reconoce por síntomas que no calzan entre sí: el nivel de astillas (LI-302) no baja aunque LIC-302 sople al máximo, la consistencia del soplado (CI-605) cae, el raspador anda liviano y la presión baja porque se está sacando licor del hueco. Soplar más solo agranda el hueco: si llega al límite, la columna cae de golpe. La respuesta: bajar la alimentación (para que el nivel no llegue al enclavamiento), pasar LIC-302 a manual con menos soplado y reducir la extracción bajo la columna bajando el filtrado de lavado (FIC-601 fuera de cascada; la extracción final lo sigue). Con la columna suelta, volver de a poco: dejar el soplado manual en proporción a la madera (la mitad de madera, la mitad de soplado) y subir en escalones la madera, el filtrado de lavado y el soplado juntos, vigilando la presión; recién con el ritmo completo, LIC-302 a AUTO con la consigna en el nivel actual y FIC-601 a CAS (a bajo ritmo FDC-607 cortaría el lavado). Las astillas que quedaron colgadas se cocieron de más: el kappa bajará unas horas.',
}

// ---------------------------------------------------------------------------
// 7. Parada corta

const lavado = (texto) => ({ mensaje: { quien: 'Marta Díaz, lavado', canal: 'telefono', texto } })

const paradaCorta = {
  id: 'parada_corta',
  capitulo: 'Capítulo 7',
  titulo: 'Parada corta',
  resumen: 'El lavado se detiene por dos horas y media. Parar el digestor en caliente, sin enclavamientos, y volver a partir.',
  ensena: 'Una parada corta ordenada: cortar madera y soplado antes de que lo hagan los enclavamientos, mantener lleno el impregnador y caliente (no tanto) el digestor, y partir en escalones con el lavado primero.',
  inicio: { horasPrevias: 8 },
  guion: [
    { id: 'entrega', cuando: { tiempo: 0 }, acciones: [jefa('Hola. Turno normal por ahora. El lavado tuvo problemas con un filtro en la noche.')] },
    { id: 'aviso', cuando: { tiempo: 10 * MIN }, acciones: [
      lavado('Sala, habla Marta, de lavado. Se cortó la tela del filtro 2: vamos a estar detenidos unas dos horas y media. No podemos recibir pulpa, lo siento.'),
      { evento: 'parada_lavado_larga' }] },
    { id: 'estanque', cuando: { tag: 'LI-606', op: '>=', valor: 70 }, acciones: [
      radio('Sala, el estanque de soplado va en 70 % y subiendo. A 95 se corta el soplado solo.')] },
    { id: 'vuelve', cuando: { tiempo: 160 * MIN }, acciones: [
      lavado('Sala, ya cambiamos la tela. Pueden mandar pulpa de nuevo, de a poco por favor.', ),
      jefa('Parte de a poco: primero el lavado al fondo y el soplado, después la madera en escalones. Quiero el ritmo completo antes de una hora y media.', { puntoControl: true })] },
    { id: 'relevo', cuando: { tiempo: 7 * H }, acciones: [jefa('Terminó el turno. Revisemos la parada.'), { terminar: true }] },
  ],
  objetivos: [
    { id: 'madera', tipo: 'principal', texto: 'Cortar la alimentación de astillas (WIC-101)', desde: { paso: 'aviso' },
      condicion: { lazo: 'WIC-101', campo: 'sp', op: '<=', valor: 5 },
      pistas: [pista(5 * MIN, 'Si el lavado no recibe, el estanque de soplado se llena y el soplado se corta solo; si el soplado se corta y sigues alimentando, sube el nivel del digestor. Hay que parar.'),
        pista(10 * MIN, 'Pantalla «1 Alimentación»: consigna de WIC-101 en 0.', 'WIC-101', 'ayuda')] },
    { id: 'soplado', tipo: 'principal', texto: 'Detener el soplado (LIC-302 en manual con salida 0)', desde: { paso: 'aviso' },
      condicion: { lazo: 'LIC-302', campo: 'salida', op: '<=', valor: 2 },
      pistas: [pista(10 * MIN, 'Pantalla «5 Fondo y soplado»: LIC-302 a MAN y salida 0. Así el estanque deja de subir.', 'LIC-302', 'ayuda')] },
    { id: 'impregnador', tipo: 'secundario', texto: 'Mantener lleno el impregnador (FIC-115 en automático con caudal)', desde: { paso: 'aviso' }, anticipable: true,
      condicion: { lazo: 'FIC-115', modo: 'AUTO' },
      pistas: [pista(15 * MIN, 'Sin madera, FFC-117 lleva a cero el licor negro al impregnador y la transferencia lo vacía (mira PI-201). Saca FIC-115 de cascada para que siga entrando licor.', 'FIC-115', 'radio')] },
    { id: 'temperaturas', tipo: 'secundario', texto: 'Bajar unos 10 °C las temperaturas de cocción mientras dure la parada', desde: { paso: 'aviso' }, anticipable: true,
      condicion: { y: [{ lazo: 'TIC-402', campo: 'sp', op: '<=', valor: 147 }, { lazo: 'TIC-404', campo: 'sp', op: '<=', valor: 146 }] },
      pistas: [pista(20 * MIN, 'Las astillas detenidas en la zona de cocción se siguen cociendo. Baja las consignas de TIC-402 y TIC-404 unos 10 °C.', 'TIC-402', 'ayuda')] },
    { id: 'ritmo_final', tipo: 'principal', final: true, texto: 'Terminar el turno con la alimentación de vuelta a 200 t/h o más', condicion: { tag: 'WI-101', op: '>=', valor: 200 } },
    { id: 'presion_final', tipo: 'principal', final: true, texto: 'Terminar el turno con la presión del digestor entre 5 y 6 bar', condicion: { tag: 'PI-301', entre: [5, 6] } },
    { id: 'modos', tipo: 'secundario', texto: 'Dejar LIC-302, FIC-115 y FIC-601 en su modo normal', desde: { paso: 'vuelve' },
      condicion: { y: [{ lazo: 'LIC-302', modo: 'AUTO' }, { lazo: 'FIC-115', modo: 'CAS' }, { lazo: 'FIC-601', modo: 'CAS' }] },
      pistas: [pista(90 * MIN, 'Con el ritmo completo: LIC-302 a AUTO con la consigna en el nivel actual, FIC-115 y FIC-601 a CAS.', 'LIC-302', 'ayuda')] },
  ],
  fallas: [
    { condicion: { enclavamiento: 'I-08' }, mensaje: 'El estanque de soplado se llenó: el enclavamiento cortó el soplado con el digestor alimentando.' },
    { condicion: { enclavamiento: 'I-02' }, mensaje: 'El nivel de astillas del digestor llegó al enclavamiento: se cortó la alimentación.' },
    { condicion: { enclavamiento: 'I-06' }, mensaje: 'La temperatura de soplado llegó al enclavamiento: el fondo estaba caliente al partir el soplado (faltó el filtrado de lavado frío).' },
    { condicion: { enclavamiento: 'I-01' }, mensaje: 'La presión del digestor llegó al enclavamiento.' },
    { condicion: { incidente: 'apertura_seguridad' }, mensaje: 'Abrió la válvula de seguridad del digestor.' },
  ],
  fin: { paso: 'relevo' },
  evaluacion: [
    { texto: 'Sin aperturas de la válvula de alivio', condicion: { no: { incidente: 'apertura_alivio' } }, puntos: 2 },
    { texto: 'Menos de 4 horas de pulpa fuera de especificación', condicion: { indicador: 'tiempoFueraEspec', op: '<=', valor: 4 * H }, puntos: 1 },
    { texto: 'Sin enclavamientos disparados', condicion: { no: { incidente: 'enclavamiento' } }, puntos: 1 },
  ],
  respuestaIdeal: 'Al saber que el lavado no recibirá pulpa, parar antes que los enclavamientos: WIC-101 a 0 y LIC-302 en manual con salida 0 (el estanque deja de subir). Durante la parada: FIC-115 fuera de cascada para que el impregnador siga lleno (si no, la transferencia lo vacía y al partir falta presión), las temperaturas de cocción unos 10 °C abajo y las circulaciones andando; FDC-607 queda retenido sin soplado. Para partir: primero el filtrado de lavado al fondo (FIC-601 en AUTO, unos 400 m³/h) para enfriar el fondo; después madera y soplado juntos en escalones de unas 25 t/h cada 10 minutos, con las temperaturas de vuelta a su valor. Con el ritmo completo, LIC-302 a AUTO con la consigna en el nivel actual y FIC-115 y FIC-601 a CAS. La pulpa que estuvo detenida sale sobrecocida (kappa bajo) unas horas: es el costo de la parada.',
}

// ---------------------------------------------------------------------------
// 8. Parada general

const VAPOR_CORTADO = { y: [{ lazo: 'TIC-402', campo: 'salida', op: '<=', valor: 2 }, { lazo: 'TIC-404', campo: 'salida', op: '<=', valor: 2 }, { lazo: 'TIC-212', campo: 'salida', op: '<=', valor: 2 }] }
const FRIO = { y: [{ tag: 'TI-303', op: '<', valor: 100 }, { tag: 'TI-304', op: '<', valor: 100 }, { tag: 'TI-305', op: '<', valor: 100 }] }

const paradaGeneral = {
  id: 'parada_general',
  capitulo: 'Capítulo 8',
  titulo: 'Parada general',
  resumen: 'Detención larga programada: bajar el ritmo, cortar astillas, soplado y vapor, enfriar y despresurizar en orden.',
  ensena: 'El orden de una parada larga y por qué: sin astillas ni transferencia no sube el nivel; sin soplado no se vacía el fondo; sin vapor y con filtrado frío el digestor se enfría; recién bajo 100 °C se puede bajar la presión sin que el licor hierva.',
  inicio: { horasPrevias: 8 },
  guion: [
    { id: 'entrega', cuando: { tiempo: 0 }, acciones: [
      jefa('Hoy es la parada general para la mantención anual. Quiero el digestor frío y sin presión para mañana temprano. Sigue el procedimiento del manual: ritmo al 60 % con RC-700, después astillas y transferencia, soplado, vapor, enfriar con filtrado y al final despresurizar. Sin apuro, en orden.')] },
    { id: 'frio', cuando: { y: [{ objetivo: 'vapor' }, FRIO] }, acciones: [
      radio('Sala, el digestor está bajo 100 °C en el tope y en las dos zonas de cocción. Listo para despresurizar cuando digas.')] },
    { id: 'cierre', cuando: { objetivo: 'despresurizar' }, acciones: [
      jefa('Digestor frío y sin presión. Entrego la planta a mantención. Buen trabajo.'), { terminar: true }] },
    { id: 'limite', cuando: { tiempo: 22 * H }, acciones: [jefa('Se acabó el plazo de la parada. Mantención no puede entrar.'), { terminar: true }] },
  ],
  objetivos: [
    { id: 'ritmo', tipo: 'principal', texto: 'Bajar el ritmo al 60 % (WIC-101 a 130 t/h o menos) con una rampa',
      condicion: { lazo: 'WIC-101', campo: 'sp', op: '<=', valor: 130 },
      pistas: [pista(20 * MIN, 'En «6 Calidad y laboratorio», RC-700: producción objetivo 1 750 ADt/d, rampa 600 ADt/d por hora, y actívalo.', null, 'ayuda')] },
    { id: 'astillas', tipo: 'principal', texto: 'Cortar las astillas (WIC-101 en 0) y detener la transferencia (LIC-202 en manual, salida 0)', desde: { objetivo: 'ritmo' },
      condicion: { y: [{ lazo: 'WIC-101', campo: 'sp', op: '<=', valor: 5 }, { lazo: 'LIC-202', campo: 'salida', op: '<=', valor: 2 }] },
      pistas: [pista(60 * MIN, 'Desactiva RC-700, pon WIC-101 en 0 y LIC-202 en MAN con salida 0: si la transferencia sigue, el impregnador vacía sus astillas en el digestor y el nivel sube hasta el enclavamiento.', 'LIC-202', 'ayuda')] },
    { id: 'impregnador', tipo: 'secundario', texto: 'Mantener lleno de licor el impregnador (FIC-115 en automático)', desde: { objetivo: 'ritmo' }, anticipable: true,
      condicion: { lazo: 'FIC-115', modo: 'AUTO' },
      pistas: [pista(30 * MIN, 'Sin madera, FFC-117 lleva a cero el licor negro al impregnador. Saca FIC-115 de cascada.', 'FIC-115', 'ayuda')] },
    { id: 'soplado', tipo: 'principal', texto: 'Detener el soplado (LIC-302 en manual, salida 0)', desde: { objetivo: 'astillas' },
      condicion: { lazo: 'LIC-302', campo: 'salida', op: '<=', valor: 2 },
      pistas: [pista(10 * MIN, 'Sin astillas entrando, LIC-302 vaciaría el digestor. Pásalo a MAN con salida 0.', 'LIC-302', 'ayuda')] },
    { id: 'vapor', tipo: 'principal', texto: 'Cortar el vapor de los calentadores (TIC-402, TIC-404 y TIC-212 en manual, salida 0)', desde: { objetivo: 'soplado' },
      condicion: VAPOR_CORTADO,
      pistas: [pista(10 * MIN, 'Pantalla «3 Circulaciones»: los tres TIC a MAN con salida 0. Las bombas de circulación siguen andando.', 'TIC-402', 'ayuda')] },
    { id: 'desplazar', tipo: 'secundario', texto: 'Enfriar desplazando con filtrado de lavado (FIC-601 en automático, 500 m³/h o más)', desde: { objetivo: 'soplado' }, anticipable: true,
      condicion: { y: [{ lazo: 'FIC-601', modo: 'AUTO' }, { lazo: 'FIC-601', campo: 'sp', op: '>=', valor: 500 }] },
      pistas: [pista(20 * MIN, 'El filtrado de lavado entra a unos 75 °C por el fondo y sale por las extracciones: es lo que enfría el digestor. Sin soplado, FDC-607 queda retenido; pasa FIC-601 a AUTO con unos 600 m³/h.', 'FIC-601', 'ayuda')] },
    { id: 'despresurizar', tipo: 'principal', texto: 'Con el digestor bajo 100 °C, detener el filtrado y despresurizar (venteos abiertos, PI-301 bajo 0,5 bar)', desde: { paso: 'frio' },
      condicion: { tag: 'PI-301', op: '<=', valor: 0.5 },
      pistas: [pista(10 * MIN, 'Mientras entre filtrado, el digestor lleno de líquido no puede bajar su presión. Pon FIC-601 en 0 y baja las consignas de PIC-301 y PIC-201.', 'FIC-601'),
        pista(20 * MIN, 'Después abre los venteos del digestor (pantalla «2 Digestor», sobre el tope) y del impregnador (pantalla «1 Alimentación»).', null, 'ayuda')] },
  ],
  fallas: [
    { condicion: { y: [{ tag: 'PI-301', op: '<', valor: 2 }, { o: [{ tag: 'TI-303', op: '>', valor: 110 }, { tag: 'TI-304', op: '>', valor: 110 }, { tag: 'TI-305', op: '>', valor: 110 }] }] },
      mensaje: 'Bajaste la presión con el digestor sobre 110 °C: el licor hierve dentro (vaporización súbita), golpea la columna y daña las mallas.' },
    { condicion: { enclavamiento: 'I-02' }, mensaje: 'El nivel de astillas del digestor llegó al enclavamiento.' },
    { condicion: { enclavamiento: 'I-05' }, mensaje: 'Se perdió la circulación de transferencia: el digestor quedó sin presión en el tope.' },
    { condicion: { enclavamiento: 'I-08' }, mensaje: 'El estanque de soplado se llenó.' },
    { condicion: { incidente: 'apertura_seguridad' }, mensaje: 'Abrió la válvula de seguridad del digestor.' },
  ],
  fin: { o: [{ paso: 'cierre' }, { paso: 'limite' }] },
  evaluacion: [
    { texto: 'Planta entregada en menos de 18 horas', condicion: { no: { tiempo: 18 * H } }, puntos: 1 },
    { texto: 'Sin aperturas de la válvula de alivio', condicion: { no: { incidente: 'apertura_alivio' } }, puntos: 1 },
    { texto: 'Sin enclavamientos disparados', condicion: { no: { incidente: 'enclavamiento' } }, puntos: 1 },
  ],
  respuestaIdeal: 'En orden: (1) bajar el ritmo al 60 % con RC-700 y rampa, para que el fondo y el lavado se adapten; (2) cortar astillas y transferencia juntas (WIC-101 en 0 y LIC-202 en manual con salida 0), con FIC-115 fuera de cascada para que el impregnador siga lleno de licor; (3) detener el soplado (LIC-302 en manual, salida 0); (4) cortar el vapor de los tres calentadores con las bombas andando; (5) enfriar desplazando con filtrado de lavado (FIC-601 en AUTO, ≈ 600 m³/h): el licor frío entra por el fondo y sale por las extracciones; tarda muchas horas; (6) recién con el digestor bajo 100 °C (TI-303, TI-304 y TI-305), detener el filtrado (un vaso lleno de líquido no baja su presión mientras le entra líquido), bajar las consignas de PIC-301 y PIC-201 y abrir los venteos. Despresurizar caliente hace hervir el licor dentro del digestor.',
}

// ---------------------------------------------------------------------------
// 9. Puesta en marcha

const lazo = (id, accion, valor) => ({ tipo: 'lazo', id, accion, valor })

/** La parada general del capítulo 8 como preparación: digestor lleno de astillas, frío y venteado. */
const PARADA_GENERAL = {
  etapas: [
    // (Ritmo bajado con WIC-101 y no con RC-700: los caudales escalados quedan en su valor nominal.)
    { comandos: [lazo('WIC-101', 'consigna', 130)], horas: 1.5 },
    { comandos: [
      lazo('WIC-101', 'consigna', 0), lazo('FIC-115', 'modo', 'AUTO'), lazo('FIC-601', 'modo', 'AUTO'),
      ...['LIC-202', 'LIC-302', 'TIC-402', 'TIC-404', 'TIC-212'].map((id) => lazo(id, 'modo', 'MAN'))], horas: 0 },
    { comandos: [...['LIC-202', 'LIC-302', 'TIC-402', 'TIC-404', 'TIC-212'].map((id) => lazo(id, 'salida', 0)), lazo('FIC-601', 'consigna', 600)], horas: 13.5 },
    { comandos: [lazo('FIC-601', 'consigna', 0), lazo('PIC-301', 'consigna', 1), lazo('PIC-201', 'consigna', 1.5)], horas: 0.2 },
    { comandos: [{ tipo: 'venteo', id: 'dig', accion: 'abrir' }, { tipo: 'venteo', id: 'imp', accion: 'abrir' }], horas: 2 },
  ],
}

const puestaEnMarcha = {
  id: 'puesta_en_marcha',
  capitulo: 'Capítulo 9',
  titulo: 'Puesta en marcha',
  resumen: 'Arranque después de la parada general: el digestor está lleno de astillas, frío y venteado.',
  ensena: 'El orden de una partida: cerrar venteos y llenar (el impregnador también), presurizar, calentar en rampa con las circulaciones andando, partir madera, soplado y lavado juntos en escalones y esperar el kappa: lo que estuvo detenido sale fuera de especificación por horas.',
  inicio: { horasPrevias: 8, preparacion: PARADA_GENERAL },
  guion: [
    { id: 'entrega', cuando: { tiempo: 0 }, acciones: [
      jefa('Mantención terminó. El digestor está lleno de astillas, frío y venteado. Hay que partir: cierra los venteos, llena y presuriza, calienta de a poco y después parte madera y soplado. Quiero ritmo completo y kappa en banda para mañana.')] },
    { id: 'presion', cuando: { objetivo: 'presurizar' }, acciones: [
      radio('Sala, los dos vasos con presión y sin fugas en terreno. Puedes calentar.', { puntoControl: true })] },
    { id: 'caliente', cuando: { objetivo: 'calentar' }, acciones: [
      jefa('Temperaturas de cocción arriba. Parte la madera de a poco, con el soplado y el lavado en la misma proporción.', { puntoControl: true })] },
    { id: 'relevo', cuando: { tiempo: 20 * H }, acciones: [jefa('Veinte horas de partida. Revisemos cómo quedó.'), { terminar: true }] },
  ],
  objetivos: [
    { id: 'presurizar', tipo: 'principal', texto: 'Cerrar los venteos, llenar el impregnador y presurizar ambos vasos (PI-301 y PI-201 sobre 5 bar)',
      condicion: { y: [{ tag: 'PI-301', op: '>=', valor: 5 }, { tag: 'PI-201', op: '>=', valor: 5 }] },
      pistas: [pista(15 * MIN, 'Cierra los venteos del digestor y del impregnador y vuelve las consignas de PIC-301 (5,5) y PIC-201 (6,1). Para presurizar tiene que entrar líquido: filtrado de lavado (FIC-601 unos 300 m³/h) y licor negro al impregnador (FIC-115 unos 400).', 'PIC-301', 'ayuda'),
        pista(40 * MIN, 'Si PI-201 no sube, el impregnador no está lleno: sube FIC-115 hasta que la presión suba y después vuelve a unos 260 m³/h.', 'FIC-115', 'ayuda')] },
    { id: 'calentar', tipo: 'principal', texto: 'Calentar en rampa hasta la temperatura de cocción (TI-304 sobre 148 °C)', desde: { objetivo: 'presurizar' },
      condicion: { tag: 'TI-304', op: '>=', valor: 148 },
      pistas: [pista(20 * MIN, 'TIC-402, TIC-404 y TIC-212 a AUTO con la consigna en la temperatura actual, y súbelas unos 15 °C cada media hora hasta 156, 155 y 140 °C.', 'TIC-402', 'ayuda')] },
    { id: 'ritmo', tipo: 'principal', texto: 'Llegar al ritmo nominal (WI-101 sobre 200 t/h) con soplado y lavado en proporción', desde: { objetivo: 'calentar' },
      condicion: { tag: 'WI-101', op: '>=', valor: 200 },
      pistas: [pista(20 * MIN, 'Escalones de unas 25 t/h cada 15 minutos en WIC-101; la salida de LIC-302 y la consigna de FIC-601 en la misma proporción.', 'WIC-101', 'ayuda')] },
    { id: 'modos', tipo: 'secundario', texto: 'Dejar los lazos en su modo normal (LIC-302, LIC-202 y TIC-604 en AUTO; FIC-601 y FIC-115 en CAS)', desde: { objetivo: 'ritmo' },
      condicion: { y: [{ lazo: 'LIC-302', modo: 'AUTO' }, { lazo: 'LIC-202', modo: 'AUTO' }, { lazo: 'TIC-604', modo: 'AUTO' }, { lazo: 'FIC-601', modo: 'CAS' }, { lazo: 'FIC-115', modo: 'CAS' }] },
      pistas: [pista(40 * MIN, 'Con el ritmo completo y estable, fija la consigna de LIC-302 en el nivel actual y pásalo a AUTO; FIC-601 y FIC-115 a CAS.', 'LIC-302', 'ayuda')] },
    { id: 'kappa_final', tipo: 'principal', final: true, texto: 'Terminar con kappa entre 16 y 18', condicion: { kpi: 'kappa', entre: [16, 18] } },
    { id: 'presion_final', tipo: 'principal', final: true, texto: 'Terminar con la presión del digestor entre 5 y 6 bar', condicion: { tag: 'PI-301', entre: [5, 6] } },
  ],
  fallas: [
    { condicion: { incidente: 'apertura_seguridad' }, mensaje: 'Abrió la válvula de seguridad del digestor.' },
    { condicion: { enclavamiento: 'I-02' }, mensaje: 'El nivel de astillas del digestor llegó al enclavamiento.' },
    { condicion: { enclavamiento: 'I-08' }, mensaje: 'El estanque de soplado se llenó.' },
    { condicion: { enclavamiento: 'I-11' }, mensaje: 'El impregnador se llenó de astillas: enclavamiento I-11.' },
  ],
  fin: { paso: 'relevo' },
  evaluacion: [
    { texto: 'A lo más 40 aperturas del alivio en la partida', condicion: { incidente: 'apertura_alivio', op: '<=', valor: 40 }, puntos: 1 },
    { texto: 'Menos de 10 horas de pulpa fuera de especificación', condicion: { indicador: 'tiempoFueraEspec', op: '<', valor: 10 * H }, puntos: 2 },
    { texto: 'Sin enclavamientos disparados', condicion: { no: { incidente: 'enclavamiento' } }, puntos: 1 },
  ],
  respuestaIdeal: 'Partir es el camino inverso de la parada, en orden: (1) cerrar los venteos y llenar: filtrado de lavado al fondo (FIC-601, ≈ 300 m³/h) y licor negro al impregnador (FIC-115 en AUTO, ≈ 400 m³/h hasta que PI-201 suba): un vaso que no está lleno de líquido no toma presión y su circulación de tope no anda; (2) calentar en rampa con los tres TIC en AUTO, unos 15 °C cada media hora; (3) con la zona de cocción caliente, partir la transferencia (LIC-202 en AUTO) y madera, soplado manual y lavado juntos en escalones; (4) con el ritmo completo, LIC-302 a AUTO con la consigna en el nivel actual y FIC-601 y FIC-115 a CAS. Las astillas que estuvieron detenidas salen sobrecocidas y luego crudas: el kappa entra en banda recién unas 10 horas después de partir.',
}

// ---------------------------------------------------------------------------
// 11. Récord

const record = {
  id: 'record',
  capitulo: 'Capítulo 11',
  titulo: 'Récord',
  resumen: 'Turno de 12 horas con perturbaciones encadenadas. Meta: toneladas dentro de especificación y margen.',
  ensena: 'Todo lo anterior junto: anticiparse con el laboratorio, mantener el balance del digestor y no confiar a ciegas en un analizador.',
  inicio: { horasPrevias: 8 },
  guion: [
    { id: 'entrega', cuando: { tiempo: 0 }, acciones: [
      jefa('Hoy vamos por el récord del mes: quiero 1 250 toneladas dentro de especificación en el turno de 12 horas, y sin regalar álcali ni vapor. Te advierto que viene lluvia y que caustificación anda complicada.')] },
    { id: 'lluvia', cuando: { tiempo: 30 * MIN }, acciones: [
      { evento: 'lluvia_fuerte' }, radio('Sala, se largó a llover fuerte en el patio. La pila de astillas está a la intemperie.')] },
    { id: 'licor', cuando: { tiempo: 3 * H }, acciones: [
      { evento: 'licor_debil' },
      { mensaje: { quien: 'Felipe Mora, caustificación', canal: 'telefono', texto: 'Sala, Felipe. El apagador sigue mal: el licor blanco puede venir más débil desde ahora.' } }] },
    { id: 'evaporadores', cuando: { tiempo: 6 * H }, acciones: [
      evaporadores('Sala, Rodrigo de evaporadores. Por dos horas solo puedo recibir 800 metros cúbicos por hora de licor débil.'),
      { evento: 'evaporadores_limitados' }] },
    { id: 'analizador', cuando: { tiempo: 9 * H }, acciones: [{ evento: 'analizador_kappa' }] },
    { id: 'relevo', cuando: { tiempo: 12 * H }, acciones: [jefa('Terminó el turno. Veamos si hubo récord.'), { terminar: true }] },
  ],
  objetivos: [
    { id: 'toneladas', tipo: 'principal', final: true, texto: 'Producir 1 250 ADt o más dentro de especificación', condicion: { indicador: 'adtEnEspec', op: '>=', valor: 1250 } },
    { id: 'margen', tipo: 'principal', final: true, texto: 'Margen de al menos 230 USD por ADt', condicion: { indicador: 'margenPorADt', op: '>=', valor: 230 } },
    { id: 'humedad', tipo: 'secundario', texto: 'Corregir la humedad de las astillas en FFC-117 con el dato del laboratorio', desde: { paso: 'lluvia' },
      condicion: { comando: { tipo: 'bloque', id: 'FFC-117', accion: 'parametro', campo: 'humedad' } },
      pistas: [pista(30 * MIN, 'Con lluvia, la astilla trae más agua: pide la humedad al laboratorio y corrígela en FFC-117.', 'LW-117')] },
    { id: 'ea', tipo: 'secundario', texto: 'Pedir el álcali efectivo del licor blanco', desde: { paso: 'licor' }, anticipable: true,
      condicion: { comando: { tipo: 'laboratorio', analisis: 'licor_blanco_EA' } },
      pistas: [pista(30 * MIN, 'Si el licor viene más débil, FFC-110 necesita el EA del laboratorio para mantener la carga.', 'AI-504')] },
    { id: 'balance', tipo: 'secundario', texto: 'Bajar el filtrado de lavado mientras evaporadores esté limitado', desde: { paso: 'evaporadores' },
      condicion: { tag: 'FI-601', op: '<=', valor: 1050 },
      pistas: [pista(5 * MIN, 'Lo que no reciba evaporadores tiene que dejar de entrar: FIC-601 fuera de cascada, unos 130 m³/h menos.', 'FIC-601')] },
    { id: 'kappa_lab', tipo: 'secundario', texto: 'Verificar el kappa con el laboratorio cuando el analizador falle', desde: { paso: 'analizador' },
      condicion: { comando: { tipo: 'laboratorio', analisis: 'kappa' } },
      pistas: [pista(45 * MIN, 'AI-701 lleva rato sin moverse. ¿Le crees? Pide un kappa al laboratorio.', 'AI-701')] },
  ],
  fallas: [
    { condicion: { kpi: 'kappa', op: '>', valor: 22 }, mensaje: 'El kappa pasó de 22: la pulpa no sirve para el blanqueo.' },
    { condicion: { incidente: 'apertura_seguridad' }, mensaje: 'Abrió la válvula de seguridad del digestor.' },
  ],
  fin: { paso: 'relevo' },
  evaluacion: [
    { texto: 'Desviación estándar del kappa menor que 0,7', condicion: { indicador: 'kappaDesv', op: '<', valor: 0.7 }, puntos: 2 },
    { texto: 'Sin aperturas de la válvula de alivio', condicion: { no: { incidente: 'apertura_alivio' } }, puntos: 1 },
    { texto: 'Sin enclavamientos disparados', condicion: { no: { incidente: 'enclavamiento' } }, puntos: 1 },
  ],
  respuestaIdeal: 'Cada perturbación tiene su respuesta y casi todas se anticipan: con la lluvia, humedad al laboratorio y FFC-117 corregido (y algo más de carga de álcali si el kappa del analizador sube); con el licor débil, EA al laboratorio cuando termine de bajar (una muestra temprana no ve todo el cambio) para que FFC-110 compense; con evaporadores limitado, bajar el filtrado de lavado en lo que no reciben, mirando FI-512 (con lluvia y licor débil entra más licor: unos 300 m³/h menos) y devolverlo a cascada al normalizarse; con el analizador congelado, el laboratorio manda. Las toneladas salen solas si el kappa no sale de banda.',
}

// ---------------------------------------------------------------------------
// 10. Apagón

const CIRCULACIONES = ['bomba_circ_sup', 'bomba_circ_inf', 'bomba_transferencia', 'bomba_filtrado']

const apagon = {
  id: 'apagon',
  capitulo: 'Capítulo 10',
  titulo: 'Apagón',
  resumen: 'Corte total de energía a plena carga. Asegurar el digestor y, cuando vuelva la energía, partir en orden.',
  ensena: 'Qué queda andando sin energía (el DCS con su UPS, las válvulas), qué hacer en los primeros minutos y el orden de partida de las bombas: primero llenar y presurizar, después circular, al final alimentar.',
  inicio: { horasPrevias: 8 },
  guion: [
    { id: 'entrega', cuando: { tiempo: 0 }, acciones: [jefa('Hola. La subestación está en mantención y trabajan con una sola línea. Debería ser un turno normal.')] },
    { id: 'corte', cuando: { tiempo: 20 * MIN }, acciones: [
      { mensaje: { quien: '', canal: 'mural', texto: 'Las luces parpadean y se apagan. Silencio: se detuvieron todas las bombas. Las pantallas siguen encendidas con la UPS.' } },
      { evento: 'apagon' }] },
    { id: 'terreno', cuando: { tiempo: 21 * MIN }, acciones: [
      radio('¡Sala! Se cayó todo, no hay ninguna bomba andando. Sonó la válvula de seguridad del digestor. ¿Qué cierro?')] },
    { id: 'energia', cuando: { tiempo: 51 * MIN }, acciones: [
      jefa('Volvió la energía. Parte en orden: primero el filtrado para llenar y presurizar, después las circulaciones y la transferencia, al final licores y extracciones. Rearma los enclavamientos y después parte como en una parada corta.', { puntoControl: true })] },
    { id: 'relevo', cuando: { tiempo: 7 * H }, acciones: [jefa('Terminó el turno. Revisemos cómo quedó la planta.'), { terminar: true }] },
  ],
  objetivos: [
    { id: 'asegurar', tipo: 'principal', texto: 'Cerrar el soplado (LIC-302 en manual, salida 0) y cortar la madera (WIC-101 en 0)', desde: { paso: 'corte' }, plazo: 10 * MIN,
      condicion: { y: [{ lazo: 'LIC-302', campo: 'salida', op: '<=', valor: 2 }, { lazo: 'WIC-101', campo: 'sp', op: '<=', valor: 5 }] },
      pistas: [pista(2 * MIN, 'Sin bombas, el soplado sigue sacando licor por la presión del digestor: ciérralo. Y que la madera no parta sola cuando vuelva la energía.', 'LIC-302'),
        pista(5 * MIN, 'LIC-302 a MAN con salida 0 (pantalla «5 Fondo y soplado») y WIC-101 en 0 (pantalla «1 Alimentación»).', 'LIC-302', 'ayuda')] },
    { id: 'transferencia', tipo: 'secundario', texto: 'Detener la transferencia (LIC-202 en manual, salida 0) y sacar FIC-115 de cascada', desde: { paso: 'corte' },
      condicion: { y: [{ lazo: 'LIC-202', campo: 'salida', op: '<=', valor: 2 }, { lazo: 'FIC-115', modo: 'AUTO' }] },
      pistas: [pista(8 * MIN, 'Al volver la energía, si la transferencia parte sola con el impregnador sin licor, la presión salta. Déjala en manual en 0.', 'LIC-202', 'ayuda')] },
    { id: 'bombas', tipo: 'principal', texto: 'Partir las bombas de filtrado, circulaciones y transferencia', desde: { paso: 'energia' },
      condicion: { y: CIRCULACIONES.map((b) => ({ bomba: b, marcha: true })) },
      pistas: [pista(5 * MIN, 'Las bombas se parten desde los mímicos (clic en la bomba, «Partir»). Primero la de filtrado.', null, 'ayuda')] },
    { id: 'presion', tipo: 'principal', texto: 'Llenar y presurizar el digestor (PI-301 sobre 5 bar)', desde: { paso: 'energia' },
      condicion: { tag: 'PI-301', op: '>=', valor: 5 },
      pistas: [pista(10 * MIN, 'Para presurizar tiene que entrar más de lo que sale: filtrado de lavado en AUTO (unos 400 m³/h) y la extracción final (FIC-503) en AUTO con 0 hasta que la presión vuelva.', 'FIC-503', 'ayuda')] },
    { id: 'rearme', tipo: 'principal', texto: 'Rearmar los enclavamientos I-03, I-04 e I-05 y devolver el vapor a automático', desde: { objetivo: 'bombas' },
      condicion: { y: [{ no: { enclavamiento: 'I-03' } }, { no: { enclavamiento: 'I-04' } }, { no: { enclavamiento: 'I-05' } }, { lazo: 'TIC-402', modo: 'AUTO' }, { lazo: 'TIC-404', modo: 'AUTO' }, { lazo: 'TIC-212', modo: 'AUTO' }] },
      pistas: [pista(10 * MIN, 'Pantalla «8 Alarmas y eventos»: rearma cada enclavamiento (con su circulación andando) y vuelve TIC-402, TIC-404 y TIC-212 a AUTO.', null, 'ayuda')] },
    { id: 'ritmo_final', tipo: 'principal', final: true, texto: 'Terminar el turno con la alimentación de vuelta a 200 t/h o más', condicion: { tag: 'WI-101', op: '>=', valor: 200 } },
    { id: 'presion_final', tipo: 'principal', final: true, texto: 'Terminar el turno con la presión del digestor entre 5 y 6 bar', condicion: { tag: 'PI-301', entre: [5, 6] } },
  ],
  fallas: [
    { condicion: { incidente: 'apertura_seguridad', desde: 'energia' }, mensaje: 'Abrió la válvula de seguridad durante la partida.' },
    { condicion: { enclavamiento: 'I-02' }, mensaje: 'El nivel de astillas del digestor llegó al enclavamiento.' },
    { condicion: { enclavamiento: 'I-08' }, mensaje: 'El estanque de soplado se llenó.' },
    { condicion: { enclavamiento: 'I-11' }, mensaje: 'El impregnador se llenó de astillas: enclavamiento I-11.' },
  ],
  fin: { paso: 'relevo' },
  evaluacion: [
    { texto: 'A lo más 3 aperturas del alivio después de volver la energía', condicion: { incidente: 'apertura_alivio', desde: 'energia', op: '<=', valor: 3 }, puntos: 2 },
    { texto: 'Kappa final entre 15 y 19', condicion: { kpi: 'kappa', entre: [15, 19] }, puntos: 1 },
    { texto: 'Producción del turno de al menos 450 ADt', condicion: { indicador: 'adt', op: '>=', valor: 450 }, puntos: 1 },
  ],
  respuestaIdeal: 'Durante el corte el DCS sigue en línea y las válvulas obedecen, pero ninguna bomba anda: el soplado sigue sacando licor por la presión del digestor y la transferencia y la madera partirían solas al volver la energía. Cerrar el soplado y la transferencia, cortar la madera y sacar FIC-115 de cascada. Con la energía de vuelta: partir primero la bomba de filtrado y el lavado al fondo con la extracción final (FIC-503) en AUTO y 0, para llenar y presurizar; después las circulaciones superior e inferior y la transferencia (LIC-202 con algo de salida, para que haya caudal de retorno); luego licores y extracciones. Rearmar I-03, I-04 e I-05 cuando su circulación ande, TIC a AUTO, FIC-503 a CAS al tener presión y partir como en una parada corta: madera, soplado y lavado juntos en escalones.',
}

// ---------------------------------------------------------------------------
// Turno completo (fuera de la campaña): 8 o 12 horas con eventos aleatorios
// (el generador lo activa el menú con la dificultad elegida) y meta.

function turnoCompleto(horas) {
  const meta = Math.round((2900 / 24) * horas * 0.85 / 10) * 10 // 85 % del ritmo nominal dentro de especificación
  return {
    id: `turno_${horas}`,
    capitulo: 'Turno completo',
    titulo: `Turno de ${horas} horas`,
    resumen: `${horas} horas con eventos aleatorios. Meta: ${meta} ADt dentro de especificación y margen sobre 230 USD/ADt.`,
    ensena: 'Operar un turno entero con lo aprendido: anticiparse, mantener el balance y responder a lo que venga.',
    inicio: { horasPrevias: 8 },
    guion: [
      { id: 'entrega', cuando: { tiempo: 0 }, acciones: [
        jefa(`Turno de ${horas} horas. La meta es ${meta} toneladas dentro de especificación, sin regalar álcali ni vapor. Lo que pase, lo resuelves tú; avísame si necesitas algo.`)] },
      { id: 'mitad', cuando: { tiempo: (horas / 2) * H }, acciones: [jefa('Vamos en la mitad del turno. ¿Cómo va el kappa?', { pararAceleracion: false })] },
      { id: 'relevo', cuando: { tiempo: horas * H }, acciones: [jefa('Terminó el turno. Veamos los números.'), { terminar: true }] },
    ],
    objetivos: [
      { id: 'toneladas', tipo: 'principal', final: true, texto: `Producir ${meta} ADt o más dentro de especificación`, condicion: { indicador: 'adtEnEspec', op: '>=', valor: meta } },
      { id: 'margen', tipo: 'principal', final: true, texto: 'Margen de al menos 230 USD por ADt', condicion: { indicador: 'margenPorADt', op: '>=', valor: 230 } },
    ],
    fallas: [
      { condicion: { kpi: 'kappa', op: '>', valor: 22 }, mensaje: 'El kappa pasó de 22: la pulpa no sirve para el blanqueo.' },
      { condicion: { incidente: 'apertura_seguridad' }, mensaje: 'Abrió la válvula de seguridad del digestor.' },
    ],
    fin: { paso: 'relevo' },
    evaluacion: [
      { texto: 'Desviación estándar del kappa menor que 0,8', condicion: { indicador: 'kappaDesv', op: '<', valor: 0.8 }, puntos: 2 },
      { texto: 'Sin aperturas de la válvula de alivio', condicion: { no: { incidente: 'apertura_alivio' } }, puntos: 1 },
      { texto: 'Sin enclavamientos disparados', condicion: { no: { incidente: 'enclavamiento' } }, puntos: 1 },
      { texto: 'Respuesta media a las alarmas bajo 2 minutos', condicion: { o: [{ indicador: 'respuestaMedia', op: '<', valor: 120 }, { indicador: 'alarmasPorHora', op: '==', valor: 0 }] }, puntos: 1 },
    ],
    respuestaIdeal: 'No hay una respuesta única: los eventos son aleatorios. Lo que funciona siempre: recibir el turno revisando tendencias y alarmas, pedir laboratorio ante cualquier cambio de madera o de licor, mirar el álcali residual como indicador adelantado, mantener el balance del digestor cuando una salida se limita y no confiar a ciegas en un analizador.',
  }
}

/** Modos de juego fuera de la campaña. */
export const MODOS = { turno_8: turnoCompleto(8), turno_12: turnoCompleto(12) }

export const MISIONES = {
  tutorial,
  turno_noche: turnoNoche,
  mas_toneladas: masToneladas,
  licor_debil: licorDebil,
  mallas,
  presurizacion,
  columna_colgada: columnaColgada,
  parada_corta: paradaCorta,
  parada_general: paradaGeneral,
  puesta_en_marcha: puestaEnMarcha,
  apagon,
  record,
}

// En preparación (no están en la campaña todavía).
export const BORRADORES = {}

/** Definición de una misión de la campaña o en preparación (para pruebas). */
export function buscarMision(id) {
  for (const grupo of [MISIONES, MODOS, BORRADORES]) if (Object.hasOwn(grupo, id)) return grupo[id]
  return null
}
