/* Datos y medidas de la rejilla del horario. Aqui no hay React ni JSX: son
   los numeros que describen la semana y las reglas que dicen si dos clases
   pueden convivir. Todo lo de este archivo es funcion pura, asi que se puede
   razonar -y mas adelante testear- sin montar nada. */

export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
export const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie']

/* La jornada que se dibuja: de siete de la mañana a seis de la tarde. Once
   filas y doce etiquetas, la ultima de las cuales cierra la rejilla. No hay
   una hora de mas por debajo: una etiqueta suelta bajo la ultima fila rompe
   el ritmo de una en una y se lee como que el horario sigue, y no sigue. */
export const ABRE = 7 * 60
export const CIERRA = 18 * 60

/* Hasta donde se ACEPTA una clase, que no es lo mismo que hasta donde se
   dibuja por defecto. Alguien puede tener laboratorio a las siete y media de
   la tarde, y bajar el cierre no puede significar que su clase deje de ser
   valida y se pierda al leer el horario guardado. */
export const LIMITE = 21 * 60

/* Alto de una fila de hora. No es constante: se reparte la altura disponible
   entre las horas de la jornada.

   Aqui hay un limite que conviene tener escrito, porque se intento al reves y
   no sale: celda cuadrada, ancho completo y jornada entera a la vista son
   tres cosas que no caben juntas. En un monitor de 1440 la columna mide 270
   px; con la fila igual de alta, la jornada se va a miles de pixeles de
   desplazamiento. Manda el ancho completo -la semana es lo que se viene a
   mirar- y la fila se queda con todo el alto que le deje la pantalla.

   No hay tope por arriba a proposito: la fila se queda con TODO lo que
   sobre, que es lo mas alta -y por tanto lo mas cuadrada- que puede ser sin
   obligar a desplazarse. Recortar once filas en vez de catorce sube el alto
   util un veintisiete por ciento por el mismo motivo.

   El minimo protege el caso contrario: en una ventana baja la fila no se
   aplasta por debajo de donde deja de caber el nombre de una materia; ahi si
   se desplaza.

   El numero de horas es fijo, asi que este alto solo cambia si cambia la
   ventana: agregar una clase no reescala nunca la rejilla. */
export const ALTO_MIN = 64

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
 * Hasta que hora se dibuja.
 *
 * Las seis de la tarde salvo que alguien tenga algo mas tarde; entonces la
 * rejilla crece hasta cubrirlo. Una clase guardada que no se ve seria peor
 * que una fila de mas.
 */
export const finVisible = (sesiones) => {
  const ultima = sesiones.reduce((max, s) => Math.max(max, s.fin), CIERRA)
  return Math.min(LIMITE, Math.ceil(ultima / 60) * 60)
}

/** Las horas en punto dibujadas, de la apertura al final inclusive */
export const horasEnPunto = (hasta = CIERRA) =>
  Array.from({ length: (hasta - ABRE) / 60 + 1 }, (_, i) => ABRE + i * 60)

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
  const bordes = [ABRE, LIMITE - duracion]
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
    inicio + duracion <= LIMITE &&
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
      .reduce((min, s) => Math.min(min, s.inicio), LIMITE),
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
