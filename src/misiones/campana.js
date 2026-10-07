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
    { id: 'factor_h', tipo: 'secundario', texto: 'Compensar el menor tiempo de cocción (control de factor H o temperaturas)', desde: { tag: 'QI-702', op: '>=', valor: 2700 },
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
    { id: 'ea', tipo: 'secundario', texto: 'Pedir el álcali efectivo del licor blanco al laboratorio', desde: { paso: 'caustificacion' },
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

export const MISIONES = {
  tutorial,
  turno_noche: turnoNoche,
  mas_toneladas: masToneladas,
  licor_debil: licorDebil,
}
