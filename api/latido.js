import { leerAparato } from './_aparato.js'

/**
 * Recoge los latidos y los suma. Es la mitad servidor de src/data/latido.js:
 * ahi se explica QUE se manda y por que; aqui, donde se guarda.
 *
 * Se guardan dos cosas:
 *   - los totales, sumados: contadores por dia y conjuntos de cardinalidad
 *     (HyperLogLog) que saben cuantos identificadores distintos han pasado
 *     pero no cuales. De ahi salen los activos, el reloj y las carreras;
 *   - una ficha por aparato: que telefono o computadora es, desde que ciudad
 *     entra, cuando fue la primera y la ultima vez y que carreras abrio. La
 *     llave es el identificador aleatorio del navegador, no un nombre. No se
 *     guarda la IP, ni las marcas del estudiante, ni su horario.
 *
 * El almacen es Redis en Upstash, por su API REST y no por un cliente: una
 * dependencia menos y una sola peticion por latido gracias al pipeline. El
 * plan gratuito da 500.000 comandos al mes; un latido gasta cinco o seis y
 * un cierre uno por cosa vista, con topes puestos desde el navegador.
 *
 * Sin las variables de entorno del almacen esto no falla: responde 204 y no
 * hace nada. Asi el despliegue sigue funcionando igual antes de crear la
 * base de datos, y si algun dia se cae Upstash no se lleva por delante la
 * aplicacion, que no depende de esto para nada.
 */

/* Las dos parejas de nombres que puede haber: la que pone la integracion de
   Vercel con Upstash y la que da Upstash directamente. */
const URL_REDIS = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const TOKEN_REDIS = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

/* Monagas. Las fechas se cortan a la medianoche de aqui y no a la del
   servidor, que esta en cualquier sitio: si no, las visitas de la noche
   contarian en el dia siguiente. */
const ZONA = 'America/Caracas'

export const PREFIJO = 'mp'

/** La hora de Monagas, 0 a 23 */
export function horaDe(instante = new Date()) {
  return Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: ZONA, hour: '2-digit', hour12: false }).format(
      instante,
    ),
  )
}

/** La fecha de Monagas en ISO corto, YYYY-MM-DD */
export function fechaDe(instante = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instante)
}

/**
 * Semana ISO de una fecha: 2026-W38. Es la forma estandar de nombrar una
 * semana sin ambiguedad -empieza en lunes y la primera del año es la del
 * primer jueves-, y asi el panel puede pedirla sin recalcular nada.
 */
export function semanaDe(fecha) {
  const [a, m, d] = fecha.split('-').map(Number)
  const dia = new Date(Date.UTC(a, m - 1, d))
  // Al jueves de esa semana: el año de ese jueves es el año ISO
  dia.setUTCDate(dia.getUTCDate() + 4 - (dia.getUTCDay() || 7))
  const primero = new Date(Date.UTC(dia.getUTCFullYear(), 0, 1))
  const semana = Math.ceil(((dia - primero) / 86400000 + 1) / 7)
  return `${dia.getUTCFullYear()}-W${String(semana).padStart(2, '0')}`
}

const mesDe = (fecha) => fecha.slice(0, 7)

/* Lo que se acepta. Cualquier cosa que no encaje se descarta en silencio en
   vez de responder un error: esto lo llama un navegador que ya se esta
   yendo, y a nadie le sirve un 400 que nadie va a leer. */
const ID = /^[a-zA-Z0-9]{8,32}$/
const SLUG = /^[a-z0-9-]{3,48}$/
const VISTA = /^(mapa|lista|horario)$/
const MATERIA = /^[a-z0-9-]{3,48}\/[A-Za-z0-9-]{3,24}$/

const lista = (valor, patron, tope) =>
  Array.isArray(valor)
    ? valor.filter((v) => typeof v === 'string' && patron.test(v)).slice(0, tope)
    : []

/** Deja el cuerpo en lo que se puede guardar, o null si no hay nada que guardar */
export function validarLatido(cuerpo) {
  if (!cuerpo || typeof cuerpo !== 'object') return null
  const { tipo, id } = cuerpo
  if (typeof id !== 'string' || !ID.test(id)) return null

  const yo = cuerpo.yo === true

  if (tipo === 'inicio') {
    const latido = {
      tipo,
      id,
      nuevo: cuerpo.nuevo === true,
      pwa: cuerpo.pwa === true,
      movil: cuerpo.movil === true,
    }
    /* Lo que el navegador cuenta de si mismo. Se deja pasar tal cual y lo
       limpia leerAparato, que es quien sabe que forma tiene cada campo. Las
       versiones viejas de la aplicacion no lo mandan: sus aparatos salen
       igual en el panel, con lo que diga el User-Agent. */
    if (cuerpo.ficha && typeof cuerpo.ficha === 'object' && !Array.isArray(cuerpo.ficha)) {
      latido.ficha = cuerpo.ficha
    }
    if (yo) latido.yo = true
    return latido
  }
  if (tipo === 'cierre') {
    const carreras = lista(cuerpo.carreras, SLUG, 4)
    const vistas = lista(cuerpo.vistas, VISTA, 3)
    const materias = lista(cuerpo.materias, MATERIA, 12)
    /* Las marcas se cuentan, no se guardan: lo que interesa es si la gente
       usa la aplicacion para llevar su avance o solo para mirar. Con tope,
       porque un numero enorme aqui solo puede venir de un error o de alguien
       jugando con la consola. */
    const acotar = (n) => Math.min(Math.max(Number(n) || 0, 0), 200)
    /* Las marcas llegan por carrera -{ sistemas: 3 }-; las versiones viejas
       mandaban solo el numero, y ese se sigue aceptando. */
    const marcasPor = {}
    if (cuerpo.marcas && typeof cuerpo.marcas === 'object') {
      for (const [carrera, n] of Object.entries(cuerpo.marcas).slice(0, 4)) {
        if (SLUG.test(carrera) && acotar(n)) marcasPor[carrera] = acotar(n)
      }
    }
    const marcas = Math.min(
      typeof cuerpo.marcas === 'object' && cuerpo.marcas
        ? Object.values(marcasPor).reduce((s, n) => s + n, 0)
        : acotar(cuerpo.marcas),
      200,
    )
    /* Cuanto duro la visita, en minutos enteros y topada a dos horas: es una
       señal de si la aplicacion se usa de paso o sentado a planificar. */
    const minutos = Math.min(Math.max(Number(cuerpo.minutos) || 0, 0), 120)
    if (!carreras.length && !vistas.length && !materias.length && !marcas) return null
    const latido = { tipo, id, carreras, vistas, materias, marcas, minutos }
    if (Object.keys(marcasPor).length) latido.marcasPor = marcasPor
    if (yo) latido.yo = true
    return latido
  }
  return null
}

/**
 * Los comandos de Redis de un latido. Funcion pura -mismo latido y misma
 * fecha, mismos comandos-, que es lo que permite probar esto sin almacen.
 *
 * Las claves, y por que cada una:
 *   u:<dia>, u:s:<semana>, u:m:<mes>   HyperLogLog de identificadores. Da
 *     activos por dia, semana y mes y ocupa unos kilobytes por mucha gente
 *     que pase.
 *   visitas:<dia>, nuevos:<dia>, pwa:<dia>   contadores sueltos.
 *   dias                              indice de dias con datos, para que el
 *                                     panel sepa desde cuando hay historia.
 *   carreras:<mes>, vistas:<mes>      que se usa, por mes.
 *   calor:<carrera>                   cuantas veces se ha mirado cada
 *                                     materia: el mapa de calor.
 *   ca:<carrera>:<dia>                aperturas de una carrera ese dia.
 *   cu:<carrera>:<dia>                HyperLogLog de quien la abrio ese dia:
 *                                     aparatos distintos por carrera.
 *   cm:<mes>                          marcas por carrera.
 *   ap                                la ficha de cada aparato, en un solo
 *     hash -campo el id, valor un JSON- para que el panel lea cientos con un
 *     comando. Sus contadores van en hashes hermanos por la misma razon:
 *     ap:primera, ap:visitas, ap:minutos, ap:marcas y ap:carreras, este
 *     ultimo con campos "<id>|<carrera>".
 *   ap:vistos                         orden por ultima visita: el panel pide
 *                                     "los de los ultimos 30 dias" de aqui.
 *
 * Lo que manda un aparato marcado como "no contar" -los del dueño- solo
 * actualiza su ficha: no entra en ningun total.
 */
export function comandosDe(latido, fecha, hora = horaDe(), ahora = Date.now()) {
  const k = (...partes) => [PREFIJO, ...partes].join(':')
  const { id } = latido
  const cuenta = !latido.yo

  if (latido.tipo === 'inicio') {
    const comandos = []
    if (cuenta) {
      comandos.push(
        ['PFADD', k('u', fecha), id],
        ['PFADD', k('u', 's', semanaDe(fecha)), id],
        ['PFADD', k('u', 'm', mesDe(fecha)), id],
        ['INCR', k('visitas', fecha)],
        ['ZADD', k('dias'), '0', fecha],
        /* A que hora se usa. Por dia, para poder leerlo como "los martes por
           la noche". */
        ['HINCRBY', k('horas', fecha), String(hora), '1'],
        ['HINCRBY', k('aparato', mesDe(fecha)), latido.movil ? 'movil' : 'escritorio', '1'],
      )
      if (latido.nuevo) comandos.push(['INCR', k('nuevos', fecha)])
      if (latido.pwa) comandos.push(['INCR', k('pwa', fecha)])
    }

    const instante = new Date(ahora).toISOString()
    const ficha = { ...latido.aparato, pwa: latido.pwa, ultima: instante }
    if (latido.yo) ficha.yo = true
    comandos.push(
      ['HSET', k('ap'), id, JSON.stringify(ficha)],
      /* La primera vez. Un aparato que ya tenia identificador cuando
         empezaron las fichas no es nuevo: llega con "~" delante, que el panel
         lee como "desde antes de esta fecha". */
      ['HSETNX', k('ap', 'primera'), id, latido.nuevo ? instante : `~${instante}`],
      ['HINCRBY', k('ap', 'visitas'), id, '1'],
      ['ZADD', k('ap', 'vistos'), String(ahora), id],
    )
    return comandos
  }

  const comandos = []
  if (cuenta) {
    for (const carrera of latido.carreras) {
      comandos.push(
        ['HINCRBY', k('carreras', mesDe(fecha)), carrera, '1'],
        ['INCR', k('ca', carrera, fecha)],
        ['PFADD', k('cu', carrera, fecha), id],
      )
    }
    for (const vista of latido.vistas)
      comandos.push(['HINCRBY', k('vistas', mesDe(fecha)), vista, '1'])
    for (const materia of latido.materias) {
      const corte = materia.indexOf('/')
      comandos.push(['ZINCRBY', k('calor', materia.slice(0, corte)), '1', materia.slice(corte + 1)])
    }
    if (latido.marcas) {
      comandos.push(['HINCRBY', k('acciones', mesDe(fecha)), 'marcas', String(latido.marcas)])
      comandos.push(['HINCRBY', k('acciones', mesDe(fecha)), 'visitas-con-marcas', '1'])
    }
    for (const [carrera, n] of Object.entries(latido.marcasPor ?? {})) {
      comandos.push(['HINCRBY', k('cm', mesDe(fecha)), carrera, String(n)])
    }
    /* Las visitas se reparten en tramos de duracion en vez de guardar cada
       numero: un histograma de cinco cajones dice lo mismo y ocupa cinco
       campos para siempre. */
    if (latido.minutos >= 0) {
      const tramo =
        latido.minutos < 1
          ? '0-1'
          : latido.minutos < 3
            ? '1-3'
            : latido.minutos < 10
              ? '3-10'
              : '10+'
      comandos.push(['HINCRBY', k('duracion', mesDe(fecha)), tramo, '1'])
    }
  }

  // La ficha del aparato suma siempre, tambien la del dueño
  for (const carrera of latido.carreras)
    comandos.push(['HINCRBY', k('ap', 'carreras'), `${id}|${carrera}`, '1'])
  if (latido.minutos > 0) comandos.push(['HINCRBY', k('ap', 'minutos'), id, String(latido.minutos)])
  if (latido.marcas > 0) comandos.push(['HINCRBY', k('ap', 'marcas'), id, String(latido.marcas)])
  return comandos
}

/** Manda los comandos a Upstash en una sola peticion */
export async function ejecutar(comandos) {
  if (!URL_REDIS || !TOKEN_REDIS || !comandos.length) return false
  const respuesta = await fetch(`${URL_REDIS}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN_REDIS}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(comandos),
  })
  return respuesta.ok
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  /* El cuerpo puede llegar ya leido -Vercel lo parsea cuando el tipo es
     json- o como texto crudo, que es lo que manda sendBeacon con un Blob. */
  let cuerpo = req.body
  if (typeof cuerpo === 'string') {
    try {
      cuerpo = JSON.parse(cuerpo)
    } catch {
      cuerpo = null
    }
  }

  const latido = validarLatido(cuerpo)
  // Siempre 204: quien envia esto no espera respuesta ni puede hacer nada
  // con un error, y contestarle con detalle solo serviria para que alguien
  // averigue por prueba y error que forma tiene lo que aceptamos.
  if (!latido) return res.status(204).end()

  /* La ficha del aparato se arma aqui y no en el navegador: las cabeceras
     -User-Agent y la geolocalizacion de Vercel- solo existen en el servidor. */
  if (latido.tipo === 'inicio') latido.aparato = leerAparato(latido.ficha, req.headers)

  try {
    await ejecutar(comandosDe(latido, fechaDe()))
  } catch {
    // Que el almacen falle no es asunto de quien esta usando la aplicacion
  }
  return res.status(204).end()
}
