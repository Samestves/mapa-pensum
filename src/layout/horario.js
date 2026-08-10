/* Datos y medidas de la rejilla del horario. Aqui no hay React ni JSX: son
   los numeros que describen la semana y las reglas que dicen si dos clases
   pueden convivir. Todo lo de este archivo es funcion pura, asi que se puede
   razonar -y mas adelante testear- sin montar nada. */

export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
export const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie']

/* La UDO dicta de siete de la mañana a nueve de la noche. */
export const ABRE = 7 * 60
export const CIERRA = 21 * 60

/* Alto de una fila de hora, en pixeles. Es lo que decide si la rejilla
   respira o se apelmaza, asi que es una constante con nombre y no un numero
   suelto perdido en una clase de Tailwind. */
export const ALTO_HORA = 112
export const PX_POR_MINUTO = ALTO_HORA / 60

/** Ancho de la columna de las horas. Cabe "11:00 AM" sin apretarse. */
export const ANCHO_HORAS = '5.5rem'

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

/** Solo la hora en punto, para la columna de la izquierda */
export const etiquetaHora = (min) => enDoceHoras(min).replace(':00', ':00')

/** Las horas en punto dibujadas, de la apertura al cierre inclusive */
export const horasEnPunto = () =>
  Array.from({ length: (CIERRA - ABRE) / 60 + 1 }, (_, i) => ABRE + i * 60)

export const acotar = (v, min, max) => Math.max(min, Math.min(max, v))

/* Al arrastrar el puntero por la rejilla las horas se redondean al cuarto:
   nadie inscribe una clase a las 08:07, pero si a las 08:15. */
export const PASO = 15
export const imantar = (min) => Math.round(min / PASO) * PASO

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
