/* Datos y medidas de la rejilla del horario. Aqui no hay React ni JSX: son
   los numeros que describen la semana y las reglas que dicen si dos clases
   pueden convivir. Todo lo de este archivo es funcion pura, asi que se puede
   razonar -y mas adelante testear- sin montar nada. */

export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
export const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie']

/* La jornada: de seis de la mañana a siete de la tarde. Trece filas y trece
   etiquetas, una por fila, la ultima de las cuales dice 6:00 PM y ocupa su
   propio cuadro. La linea de las siete de la tarde cierra la rejilla y no
   lleva etiqueta: una hora suelta bajo la ultima fila rompe el ritmo de una
   en una y se lee como que el horario sigue.

   Hay clases desde las seis, asi que la jornada abre ahi. Todo lo demas -la
   rejilla, la validacion, lo que acepta el lector de fotos- sale de ABRE y
   de CIERRA: ninguna otra parte escribe la hora de apertura a mano.

   Esto es lo unico que define el final, para dibujar Y para validar. Antes
   habia dos numeros -uno para pintar y otro para aceptar- y esa diferencia
   era la que hacia el horario infinito: arrastrar una clase al fondo la
   dejaba mas alla de lo dibujado, la rejilla crecia para cubrirla, y con la
   rejilla mas larga se podia volver a arrastrar mas abajo. Un solo cierre
   corta el bucle de raiz. */
export const ABRE = 6 * 60
export const CIERRA = 19 * 60

/* Alto de una fila de hora en escritorio.

   Ha tenido dos reglas y las dos fallaban por un lado. La primera repartia el
   alto de la ventana entre las horas de la jornada: cabia, pero el bloque
   de entonces -hora, nombre, aula, seccion y profesor- no cabia en filas de
   66 px. La segunda fijo la fila por tramos de ancho, de 100 a 144 px: los
   bloques respiraban y la jornada dejo de caber. Para saber a que hora era
   una clase habia que desplazarse hasta dar con su marca, y la semana no se
   veia nunca entera.

   Lo que cambio es el bloque: ahora dice el nombre y su tramo, y eso cabe en
   una hora de cincuenta pixeles. Asi que vuelve el reparto, con suelo y
   techo: la jornada entera cabe en una pantalla normal, en una baja se
   desplaza un poco en vez de aplastarse, y en una muy alta no se estira
   hasta dejar bloques vacios. */
const ALTO_HORA = { minimo: 52, maximo: 84 }

/** El alto de fila que toca al alto que le queda libre a la rejilla. Funcion pura. */
export const altoHoraPara = (altoLibre) =>
  acotar(Math.floor(altoLibre / FILAS), ALTO_HORA.minimo, ALTO_HORA.maximo)

/** Ancho del carril de las horas. Cabe "12 PM" y la hora de ahora, "12:45". */
export const ANCHO_HORAS_PX = 56

/* El hueco entre dos clases seguidas, y el que deja una clase con el borde
   de su hora: una de 8 a 9 y otra de 9 a 10 se leen como dos, no como un
   bloque doble. */
export const HUECO_CELDA = 4

/* Una clase no puede durar menos de media hora ni crearse mas corta que una:
   pulsar un hueco propone una hora, que es lo que dura casi todo. */
export const MIN_DURACION = 30
const DURACION_POR_DEFECTO = 60

/* El tiempo se guarda en minutos desde medianoche y no como "08:40". Con un
   numero se compara, se resta y se posiciona en la rejilla sin parsear nada;
   el texto es solo para enseñarlo y para los <input type="time">. */
export const aMinutos = (texto) => {
  const [h, m] = String(texto).split(':').map(Number)
  return h * 60 + (m || 0)
}

/** Formato de veinticuatro horas, el que entienden los <input type="time"> */
export const aTexto = (min) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

/**
 * Formato de doce horas para enseñar.
 *
 * El resto de la aplicacion habla en veinticuatro, pero un horario se lee de
 * reojo y aqui el de doce es el que se reconoce sin pensar.
 */
export const enDoceHoras = (min) => {
  const h = Math.floor(min / 60)
  const m = min % 60
  const sufijo = h < 12 ? 'AM' : 'PM'
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${sufijo}`
}

/**
 * Un tramo de horas en corto, para una tarjeta donde el largo no cabe: sin
 * los ":00" y con el meridiano una sola vez si es el mismo. "7 – 9 AM",
 * "8:15 – 9:50 AM", "11 AM – 1 PM". Es lo que hace un calendario de Apple, y
 * deja sitio al nombre de la materia, que es lo que se lee.
 */
export function tramoCorto(inicio, fin) {
  const meridiano = (min) => (min < 12 * 60 ? 'AM' : 'PM')
  const hora = (min) => {
    const h = ((Math.floor(min / 60) + 11) % 12) + 1
    const m = min % 60
    return m ? `${h}:${String(m).padStart(2, '0')}` : String(h)
  }
  return meridiano(inicio) === meridiano(fin)
    ? `${hora(inicio)} – ${hora(fin)} ${meridiano(fin)}`
    : `${hora(inicio)} ${meridiano(inicio)} – ${hora(fin)} ${meridiano(fin)}`
}

const meridianoDe = (min) => (min < 12 * 60 ? 'AM' : 'PM')

/**
 * La hora y su meridiano por separado: "7:00" y "AM".
 *
 * Donde la hora es lo que se lee -la agenda, el momento- el numero va grande
 * y el meridiano pequeño a su lado. Escritos del mismo tamaño, "AM" pesa lo
 * mismo que "7:00" y no dice ni la mitad.
 */
export const partesDeHora = (min) => {
  const [hora, meridiano] = enDoceHoras(min).split(' ')
  return { hora, meridiano }
}

/** Lo mismo para una hora en punto, sin los ceros: "7" y "AM" */
export const horaEnPunto = (min) => ({
  hora: String(((Math.floor(min / 60) + 11) % 12) + 1),
  meridiano: meridianoDe(min),
})

/** Cuanto dura algo, dicho corto: "1 h 40 min", "2 h", "30 min" */
export function duracion(min) {
  const horas = Math.floor(min / 60)
  const resto = min % 60
  if (horas && resto) return `${horas} h ${resto} min`
  return horas ? `${horas} h` : `${resto} min`
}

/* Cuantas filas tiene la rejilla */
export const FILAS = (CIERRA - ABRE) / 60

/**
 * El fondo con las lineas de hora de una columna de dia.
 *
 * Una rejilla de N filas tiene N + 1 lineas, y cada una tiene que tener un
 * solo dueño. Aqui se repartian mal: la cabecera de dias dibujaba su borde
 * inferior y el degradado dibujaba ademas una linea en su pixel cero, o sea
 * que la de la apertura la pintaban los dos. Pegadas y del mismo color se
 * sumaban en una linea de dos pixeles, y solo se notaba con el
 * desplazamiento arriba del todo: en cuanto se bajaba un poco, la del
 * degradado se metia debajo de la cabecera -que es opaca y va por encima- y
 * la linea volvia a su grosor. De ahi que se viera mas oscura solo a veces.
 *
 * El reparto ahora no se solapa:
 *   - la de la apertura es el borde inferior de la cabecera, que es el limite
 *     de arriba de la rejilla;
 *   - las de dentro -de la segunda hora a las 6:00 PM- las pinta este
 *     degradado, con la linea al FINAL de cada hora y no al principio;
 *   - la del cierre, las 7:00 PM, es el borde inferior de la rejilla, que
 *     cruza tambien la columna de las horas y cierra la esquina.
 *
 * El area pintada se limita a FILAS - 1 horas -no a todas- justamente para que el
 * degradado no llegue a dibujar la ultima: si llegara, volveria a chocar con
 * ese borde de abajo y habriamos movido el problema en vez de resolverlo.
 */
export function lineasDeHora(altoHora) {
  return {
    backgroundImage:
      `repeating-linear-gradient(to bottom, transparent 0 ${altoHora - 1}px, ` +
      `var(--horario-linea) ${altoHora - 1}px ${altoHora}px)`,
    backgroundSize: `100% ${(FILAS - 1) * altoHora}px`,
    backgroundRepeat: 'no-repeat',
  }
}

/**
 * La hora con la que EMPIEZA cada fila.
 *
 * Una etiqueta por fila y ninguna suelta: la linea del cierre no se rotula,
 * porque no abre ninguna fila y ponerla ahi metia dos horas en el mismo
 * cuadro.
 */
export const horasEnPunto = () => Array.from({ length: FILAS }, (_, i) => ABRE + i * 60)

export const acotar = (v, min, max) => Math.max(min, Math.min(max, v))

/* Al arrastrar, las horas se redondean al cuarto: nadie inscribe una clase a
   las 08:07, pero si a las 08:15. */
const PASO = 15
export const imantar = (min) => Math.round(min / PASO) * PASO

/* Minutos alrededor del borde de otra clase donde el iman agarra */
const TOLERANCIA_IMAN = 9

/**
 * A donde va el inicio de una clase que se esta arrastrando.
 *
 * Ademas de la rejilla de quince minutos, atrae a los bordes de las clases
 * que ya hay en ese dia: al final de cada una -para quedar pegada debajo- y a
 * su inicio menos la duracion -para acabar justo donde la otra empieza-. Los
 * extremos de la jornada iman igual.
 *
 * Los bordes GANAN a la rejilla dentro de la tolerancia, aunque la rejilla
 * caiga mas cerca. Comparando solo por distancia, junto a una clase que acaba
 * a las 09:50 el multiplo de las 09:45 ganaria por cinco minutos y encajar
 * las dos seguidas seria imposible, que es justo el gesto que se busca.
 */
export function imantarInicio(minuto, duracion, sesionesDelDia) {
  const bordes = [ABRE, CIERRA - duracion]
  for (const s of sesionesDelDia) {
    bordes.push(s.fin) // pegarse justo debajo
    bordes.push(s.inicio - duracion) // acabar justo donde empieza
  }

  const cerca = bordes.filter((b) => Math.abs(b - minuto) <= TOLERANCIA_IMAN)
  if (cerca.length) {
    return cerca.reduce((a, b) => (Math.abs(b - minuto) < Math.abs(a - minuto) ? b : a))
  }
  return imantar(minuto)
}

/**
 * La posicion legal mas cercana a la que se pide, o null si el dia esta lleno.
 *
 * Se usa mientras se arrastra, para que la vista previa NUNCA enseñe un sitio
 * invalido: si el puntero lleva la clase encima de otra, la propuesta salta al
 * hueco pegado -por arriba o por abajo, el que quede mas cerca- en vez de
 * pintarse en rojo. Con eso soltar no puede fallar nunca y no hace falta un
 * estado de error durante el gesto.
 */
export function posicionValida(sesionesDelDia, candidata) {
  const duracion = candidata.fin - candidata.inicio
  const otras = sesionesDelDia.filter((s) => s.id !== candidata.id)

  const cabe = (inicio) =>
    inicio >= ABRE &&
    inicio + duracion <= CIERRA &&
    !otras.some((o) => inicio < o.fin && o.inicio < inicio + duracion)

  if (cabe(candidata.inicio)) return candidata

  // Pegada al borde de alguna vecina: son los unicos sitios que ganan algo
  const opciones = []
  for (const o of otras) {
    if (cabe(o.fin)) opciones.push(o.fin)
    if (cabe(o.inicio - duracion)) opciones.push(o.inicio - duracion)
  }
  if (!opciones.length) return null

  const inicio = opciones.reduce((a, b) =>
    Math.abs(b - candidata.inicio) < Math.abs(a - candidata.inicio) ? b : a,
  )
  return { ...candidata, inicio, fin: inicio + duracion }
}

/* ---- Convivencia de clases -------------------------------------------- */

/** Dos clases chocan si comparten dia y sus franjas se pisan */
export const solapan = (a, b) => a.dia === b.dia && a.inicio < b.fin && b.inicio < a.fin

/**
 * La primera clase con la que choca una candidata, o null si no choca.
 *
 * Se ignora a si misma por id, para que editar una clase sin moverla no se
 * detecte como un choque contra su propia version anterior.
 */
export const choqueCon = (sesiones, candidata) =>
  sesiones.find((s) => s.id !== candidata.id && solapan(s, candidata)) ?? null

/**
 * Reparte en carriles las clases de un dia que se pisan.
 *
 * Es una red, no una funcion de uso diario: el formulario ya impide guardar
 * un solape. Pero un horario guardado de una version anterior, o dos pestañas
 * escribiendo a la vez, pueden dejar dos clases encima. Antes que dibujar una
 * sobre otra -y perder una entera-, se parten la columna.
 */
export function repartirEnCarriles(sesionesDelDia) {
  const orden = [...sesionesDelDia].sort((a, b) => a.inicio - b.inicio || a.fin - b.fin)
  const puestas = []

  for (const s of orden) {
    let carril = 0
    while (puestas.some((p) => p.carril === carril && solapan(p, s))) carril++
    puestas.push({ ...s, carril })
  }

  return puestas.map((s) => {
    const racimo = puestas.filter((o) => o.id === s.id || solapan(o, s))
    return { ...s, carriles: Math.max(...racimo.map((o) => o.carril)) + 1 }
  })
}

/**
 * El tramo libre que contiene a un minuto, o null si ese minuto esta ocupado.
 *
 * Devuelve donde acaba la clase anterior y donde empieza la siguiente, que es
 * lo que hace falta para no pisar a ninguna de las dos.
 */
export function huecoEn(sesionesDelDia, minuto) {
  if (sesionesDelDia.some((s) => minuto >= s.inicio && minuto < s.fin)) return null
  return {
    desde: sesionesDelDia
      .filter((s) => s.fin <= minuto)
      .reduce((max, s) => Math.max(max, s.fin), ABRE),
    hasta: sesionesDelDia
      .filter((s) => s.inicio >= minuto)
      .reduce((min, s) => Math.min(min, s.inicio), CIERRA),
  }
}

/**
 * La franja que se propone al señalar un punto del dia.
 *
 * Parte de la hora en punto, porque es la unidad de la rejilla y lo que
 * espera cualquiera al pulsar en la fila de las diez. Pero se recorta contra
 * las clases vecinas por los dos lados: si la anterior acaba a las 11:40, la
 * propuesta empieza a las 11:40 y no a las 11:00 -queda encadenada, que es
 * justo lo que se quiere ver-, y si la siguiente empieza a las 12:00, acaba
 * ahi. Con eso, señalar y confirmar no puede producir un choque nunca.
 *
 * Devuelve null si el punto cae dentro de una clase o si lo que queda libre
 * es mas corto que la duracion minima: ofrecer un hueco de diez minutos seria
 * ofrecer algo que el formulario va a rechazar.
 */
export function franjaPropuesta(sesionesDelDia, minuto) {
  const libre = huecoEn(sesionesDelDia, minuto)
  if (!libre) return null

  const inicio = Math.max(libre.desde, Math.floor(minuto / 60) * 60)
  const fin = Math.min(inicio + DURACION_POR_DEFECTO, libre.hasta)
  return fin - inicio >= MIN_DURACION ? { inicio, fin } : null
}

/* ---- La semana leida como agenda -------------------------------------- */

const porInicio = (a, b) => a.inicio - b.inicio || a.fin - b.fin

/**
 * De que hora a que hora van unas clases, en horas enteras: de la primera a
 * la ultima. No la jornada entera -de seis a siete-, que en un dibujo pequeño
 * dejaria media tarde vacia y las clases apretadas arriba.
 *
 * `minimo` es lo menos que abarca: con una sola clase de hora y media, sin el
 * su bloque ocuparia todo el alto y no diria nada de cuando es.
 */
export function rangoDeClases(sesiones, minimo = 4 * 60) {
  if (!sesiones.length) return [ABRE, ABRE + minimo]
  const desde = Math.floor(Math.min(...sesiones.map((s) => s.inicio)) / 60) * 60
  const hasta = Math.ceil(Math.max(...sesiones.map((s) => s.fin)) / 60) * 60
  return [desde, Math.max(hasta, desde + minimo)]
}

/**
 * Un dia como se lee en una agenda: sus clases en orden y, entre una y la
 * siguiente, lo que queda libre.
 *
 * Dos clases pegadas no dejan renglon entre ellas, y dos que se pisan
 * tampoco: el tramo libre empieza donde acaba la que acaba mas tarde.
 */
export function agendaDe(sesionesDelDia) {
  const renglones = []
  let ocupadoHasta = null

  for (const clase of [...sesionesDelDia].sort(porInicio)) {
    if (ocupadoHasta != null && clase.inicio > ocupadoHasta) {
      renglones.push({ libre: { inicio: ocupadoHasta, fin: clase.inicio } })
    }
    renglones.push({ clase })
    ocupadoHasta = Math.max(ocupadoHasta ?? clase.fin, clase.fin)
  }
  return renglones
}

/**
 * Donde proponer una clase nueva cuando no se señala ninguna hora.
 *
 * Primero detras de la ultima del dia, que es como se arma un horario: una
 * clase y luego la siguiente. Si ahi ya no cabe -el dia llega al cierre-, el
 * primer hueco que haya, mirando las horas en punto y el final de cada clase.
 * Devuelve null con el dia lleno.
 */
export function franjaNueva(sesionesDelDia) {
  const finales = sesionesDelDia.map((s) => s.fin)
  const enOrden = [...horasEnPunto(), ...finales].sort((a, b) => a - b)
  const candidatos = finales.length ? [Math.max(...finales), ...enOrden] : enOrden

  for (const inicio of candidatos) {
    if (inicio >= CIERRA) continue
    const franja = franjaPropuesta(sesionesDelDia, inicio)
    if (franja?.inicio === inicio) return franja
  }
  return null
}

/** La semana en tres numeros: cuantas materias, cuantas clases y cuantos minutos de clase */
export const resumenDe = (sesiones) => ({
  materias: new Set(sesiones.map((s) => s.codigo)).size,
  clases: sesiones.length,
  minutos: sesiones.reduce((total, s) => total + s.fin - s.inicio, 0),
})

/* ---- Ahora y despues --------------------------------------------------- */

export const MOMENTO = {
  /* Hay una clase a esta hora */
  EN_CURSO: 'en-curso',
  /* No hay clase ahora, pero hoy queda alguna */
  LUEGO: 'luego',
  /* Hoy ya no queda ninguna: se acabaron, o no habia */
  LIBRE: 'libre',
  /* El horario no tiene ninguna clase */
  VACIO: 'vacio',
}

/* La primera clase de los dias que vienen, y cuantos dias faltan. Da la
   vuelta a la semana: un viernes por la tarde, la proxima es la del lunes. Si
   solo hay clase el mismo dia de hoy, es la de dentro de siete dias. */
function proximaDe(porDia, dia) {
  for (let dentroDe = 1; dentroDe <= 7; dentroDe++) {
    const delDia = porDia[(dia + dentroDe) % 7] ?? []
    if (delDia.length) return { clase: [...delDia].sort(porInicio)[0], dentroDe }
  }
  return null
}

/**
 * Que toca ahora y que viene despues.
 *
 * Es lo primero que dice el horario al abrirlo, y sale entero de dos datos:
 * las clases y la hora. Aqui no se formatea nada; se decide en cual de los
 * cuatro momentos se esta y se devuelve lo que hace falta para contarlo.
 *
 * @param {object[][]} porDia  las clases de cada dia, de lunes a viernes
 * @param {{ dia: number, minuto: number }} ahora  dia 0 es lunes y 6 domingo
 */
export function momentoDe(porDia, ahora) {
  if (!porDia.some((delDia) => delDia.length)) return { tipo: MOMENTO.VACIO }

  const hoy = [...(porDia[ahora.dia] ?? [])].sort(porInicio)
  const porVenir = hoy.filter((s) => s.inicio > ahora.minuto)
  const actual = hoy.find((s) => s.inicio <= ahora.minuto && ahora.minuto < s.fin)

  if (actual) {
    return {
      tipo: MOMENTO.EN_CURSO,
      clase: actual,
      avance: (ahora.minuto - actual.inicio) / (actual.fin - actual.inicio),
      quedan: actual.fin - ahora.minuto,
      despues: porVenir[0] ?? null,
    }
  }

  if (porVenir.length) {
    return {
      tipo: MOMENTO.LUEGO,
      clase: porVenir[0],
      faltan: porVenir[0].inicio - ahora.minuto,
      despues: porVenir[1] ?? null,
    }
  }

  return {
    tipo: MOMENTO.LIBRE,
    /* Si hoy hubo clases y ya pasaron, o si no habia ninguna: no se dice igual */
    terminado: hoy.length > 0,
    proxima: proximaDe(porDia, ahora.dia),
  }
}

/**
 * Donde es una clase y con quien, en trozos: ["A-12", "Sec. 01", "Pérez"].
 *
 * Los que no se saben no estan. Se da por trozos y no ya unido para que quien
 * lo pinte pueda impedir que un renglon corto se parta DENTRO de uno -"A-" y
 * debajo "12"- y solo lo haga entre uno y otro.
 */
export const trozosDeLugar = (sesion) =>
  [sesion.aula, sesion.seccion && `Sec. ${sesion.seccion}`, sesion.profesor].filter(Boolean)

/** Donde es una clase y con quien, en un renglon: "A-12 · Sec. 01 · Pérez" */
export const lugarDe = (sesion) => trozosDeLugar(sesion).join(' · ')

/** El nombre de cualquier dia de la semana, tambien de los que no tienen clase */
export const nombreDelDia = (dia) => [...DIAS, 'Sábado', 'Domingo'][dia]
