/* Datos y medidas de la rejilla del horario. Aqui no hay React ni JSX: son
   los numeros que describen la semana y las reglas que dicen si dos clases
   pueden convivir. Todo lo de este archivo es funcion pura, asi que se puede
   razonar -y mas adelante testear- sin montar nada. */

export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
export const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie']

/* La jornada: de siete de la mañana a siete de la tarde. Doce filas y doce
   etiquetas, una por fila, la ultima de las cuales dice 6:00 PM y ocupa su
   propio cuadro. La linea de las siete cierra la rejilla y no lleva etiqueta:
   una hora suelta bajo la ultima fila rompe el ritmo de una en una y se lee
   como que el horario sigue.

   Esto es lo unico que define el final, para dibujar Y para validar. Antes
   habia dos numeros -uno para pintar y otro para aceptar- y esa diferencia
   era la que hacia el horario infinito: arrastrar una clase al fondo la
   dejaba mas alla de lo dibujado, la rejilla crecia para cubrirla, y con la
   rejilla mas larga se podia volver a arrastrar mas abajo. Un solo cierre
   corta el bucle de raiz. */
export const ABRE = 7 * 60
export const CIERRA = 19 * 60

/* Alto de una fila de hora en escritorio, por tramo de ancho.

   Antes esto no era una medida sino un reparto: se cogia el alto de la
   ventana y se dividia entre las doce horas para que la jornada entera
   cupiese sin desplazarse. Cabia, si, pero a costa de todo lo demas. En una
   ventana normal salian filas de 66 px contra columnas de 180: rectangulos
   aplastados donde una clase de una hora no tiene sitio ni para su nombre y
   su horario. Y encima el reparto dejaba un hueco muerto abajo, porque
   floor(alto/12) tira hasta once pixeles que ya no los recuperaba nadie.

   La regla se invierte: la fila mide lo que tiene que medir para respirar y
   si la jornada no cabe, se desplaza. Meter doce horas en una pantalla no es
   un requisito de nadie; verlas bien, si.

   Los cortes son los de Tailwind -md, lg, xl- para que la rejilla cambie de
   escala en los mismos anchos que el resto de la app. Por debajo de md no
   hay tramo porque ahi no llega esta vista: manda HorarioMovil, que tiene su
   propio alto.

   Es una tabla y no tres constantes sueltas para que anadir un tramo sea
   anadir una linea, y para que la funcion de abajo pueda probarse sola. */
export const ALTO_HORA_ESCRITORIO = [
  { desde: 1280, alto: 144 }, // xl
  { desde: 1024, alto: 124 }, // lg
  { desde: 0, alto: 100 }, // md
]

/** El alto de fila que toca a un ancho de rejilla. Funcion pura. */
export const altoHoraPara = (ancho) =>
  ALTO_HORA_ESCRITORIO.find((tramo) => ancho >= tramo.desde).alto

/** Ancho de la columna de las horas. Cabe "11:00 AM" sin apretarse. */
export const ANCHO_HORAS_PX = 88

/* Una clase no puede durar menos de media hora ni crearse mas corta que una:
   pulsar un hueco propone una hora, que es lo que dura casi todo. */
export const MIN_DURACION = 30
export const DURACION_POR_DEFECTO = 60

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

/** La hora en punto, para la columna de la izquierda */
export const etiquetaHora = (min) => enDoceHoras(min)

/**
 * La hora para la marca del telefono: el meridiano solo cuando cambia.
 *
 * "7:00 AM, 8:00 AM, 9:00 AM..." repite doce veces algo que en una jornada
 * cambia una sola vez, y los ceros no dicen nada porque todas las marcas caen
 * en punto por definicion. Ese ruido se paga en tamaño de letra: es lo que
 * obligaba a reservarle a la hora un carril de sesenta y dos pixeles.
 *
 * Queda "7 AM", luego solo el numero, y el meridiano vuelve a salir cuando de
 * verdad aporta: "12 PM". Doce marcas, dos con meridiano.
 */
export const etiquetaHoraMovil = (min, previa) => {
  const h = Math.floor(min / 60)
  const hora = ((h + 11) % 12) + 1
  const cambiaElDia = previa == null || Math.floor(previa / 60) < 12 !== h < 12
  return cambiaElDia ? `${hora} ${h < 12 ? 'AM' : 'PM'}` : `${hora}`
}

/* Cuantas filas tiene la rejilla */
export const FILAS = (CIERRA - ABRE) / 60

/**
 * El fondo con las lineas de hora de una columna de dia.
 *
 * Una rejilla de doce filas tiene TRECE lineas, y cada una tiene que tener un
 * solo dueño. Aqui se repartian mal: la cabecera de dias dibujaba su borde
 * inferior y el degradado dibujaba ademas una linea en su pixel cero, o sea
 * que la de las siete la pintaban los dos. Pegadas y del mismo color se
 * sumaban en una linea de dos pixeles, y solo se notaba con el
 * desplazamiento arriba del todo: en cuanto se bajaba un poco, la del
 * degradado se metia debajo de la cabecera -que es opaca y va por encima- y
 * la linea volvia a su grosor. De ahi que se viera mas oscura solo a veces.
 *
 * El reparto ahora no se solapa:
 *   - la de las 7:00 es el borde inferior de la cabecera, que es el limite de
 *     arriba de la rejilla;
 *   - las once de dentro -8:00 a 6:00 PM- las pinta este degradado, con la
 *     linea al FINAL de cada hora y no al principio;
 *   - la de las 7:00 PM es el borde inferior de la rejilla, que cruza tambien
 *     la columna de las horas y cierra la esquina.
 *
 * El area pintada se limita a once horas -no doce- justamente para que el
 * degradado no llegue a dibujar la ultima: si llegara, volveria a chocar con
 * ese borde de abajo y habriamos movido el problema en vez de resolverlo.
 *
 * Vive aqui y no en cada vista porque la rejilla de escritorio y la del
 * telefono dibujan las mismas lineas con distinto alto de fila, y dos copias
 * de esta cuenta es como una de las dos se queda con el error.
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
export const horasEnPunto = () =>
  Array.from({ length: FILAS }, (_, i) => ABRE + i * 60)

export const acotar = (v, min, max) => Math.max(min, Math.min(max, v))

/* Al arrastrar, las horas se redondean al cuarto: nadie inscribe una clase a
   las 08:07, pero si a las 08:15. */
export const PASO = 15
export const imantar = (min) => Math.round(min / PASO) * PASO

/* Minutos alrededor del borde de otra clase donde el iman agarra */
export const TOLERANCIA_IMAN = 9

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
export const solapan = (a, b) =>
  a.dia === b.dia && a.inicio < b.fin && b.inicio < a.fin

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
