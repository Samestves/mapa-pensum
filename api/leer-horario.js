import { createHmac } from 'node:crypto'
import { leerCuota } from './_cuota.js'
import { guardarLectura, huellaDeLectura, recordarLectura } from './_memoria.js'
import {
  MOTIVO,
  TOPE_POR_HORA,
  abrirTurno,
  cerrarTurno,
  descansoPor,
  esperaDe,
  pausar,
} from './_turno.js'

/**
 * Lee un horario de una imagen. Funcion de Vercel, no del navegador.
 *
 * Existe por una sola razon, y conviene que quede escrita: la clave de Google
 * AI Studio NO puede vivir en el front. Vite sustituye las variables VITE_* en
 * el bundle en tiempo de compilacion, asi que una clave ahi es una clave
 * publicada: cualquiera abre las herramientas del navegador, la copia y quema
 * la cuota. Aqui la clave se queda en el servidor y lo unico que cruza la red
 * hacia el estudiante es el JSON con las clases.
 *
 * Lo que hace es poco y a proposito: recibe una imagen y el listado de
 * materias de LA carrera abierta, se lo pasa al modelo, y devuelve filas de
 * texto. No decide nada. Emparejar con el pensum, validar horas y detectar
 * choques ocurre en el navegador -en layout/importarHorario.js, que se prueba
 * sin red-, porque son las reglas de esta aplicacion y no tienen por que
 * depender de que un servicio de terceros este de buenas.
 *
 * El cupo es gratuito y es poco: unas veinte peticiones por minuto y por
 * modelo. Casi todo lo que hay aqui debajo existe para no gastarlo en balde.
 */

/* Una foto de un horario tarda entre cinco y veinte segundos en leerse. El
   limite por defecto de una funcion son diez, asi que sin esto la mitad de
   las lecturas buenas se cortarian a mitad. */
export const config = { maxDuration: 60 }

const GOOGLE = 'https://generativelanguage.googleapis.com/v1beta/models'

/* Los modelos a probar, EN ORDEN. Una lista y no uno solo, por tres razones:

   Que sea configurable es porque Google renombra y jubila modelos mas rapido
   de lo que se despliega esto; quedarse clavado en uno es garantizarse un 404
   dentro de unos meses.

   Que sean VARIOS es, primero, porque el mas nuevo es el que todo el mundo
   esta probando a la vez, o sea el que devuelve 503 "high demand". Y segundo,
   porque el cupo gratuito se cuenta POR MODELO: dos modelos son el doble de
   lecturas por minuto y por dia, y un tercero, el triple.

   Nombres FIJADOS y no alias. El alias '-latest' parecia lo prudente -no se
   queda obsoleto- y resulto ser lo contrario: te pone justo en el modelo mas
   nuevo, que es el mas lleno, y ademas no se sabe cual te toco cuando falla.
   El precio es que hay que actualizarlos de vez en cuando, y para eso estan
   en una variable de entorno. Ojo: en Vercel una variable cambiada no llega a
   lo ya desplegado; hay que pulsar Redeploy. */
const MODELOS_POR_DEFECTO = 'gemini-3.6-flash,gemini-3.5-flash'

/* La lista se lee en cada llamada y no al cargar el modulo: asi las pruebas
   la cambian sin reimportar nada. */
const listaDe = (variable, porDefecto) => {
  const partir = (texto) =>
    texto
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
  const lista = partir(process.env[variable] ?? '')
  return lista.length ? lista : partir(porDefecto)
}

/* Cuanto se puede tardar en total antes de devolver algo. La funcion se corta
   a los 60 s y una respuesta cortada por la plataforma no dice nada; a los 50
   se para por las buenas y se explica que pasa. */
const PRESUPUESTO = 50_000

/* Lo que se espera a un modelo. Una lectura tarda entre cinco y veinte
   segundos; uno que a los veinticinco no ha contestado esta atascado, y
   seguir esperandolo es quitarle al otro el tiempo para leer. */
const PLAZO_POR_MODELO = 25_000

const SIN_CUPO = 429

/* Los que dicen "ahora no puedo" sin que la peticion este mal: el servicio
   esta lleno, se atraganto o no se llego a el (0). */
const SATURADO = new Set([0, 500, 502, 503, 504])

/* Los que no mejoran esperando, traducidos a algo sobre lo que se pueda
   actuar: la peticion esta mal, la clave no alcanza, o el modelo no existe.

   Que el 404 tenga su propio codigo no es cosmetico: un modelo jubilado
   contestaba lo mismo que uno saturado -"intentalo de nuevo en un minuto"- y
   ese consejo es falso, porque un modelo que ya no existe no va a existir
   dentro de un minuto. Se arregla cambiando GOOGLE_AI_MODELO, y para eso
   primero hay que saber que es lo que pasa. */
const CODIGO_POR_ESTADO = {
  400: 'peticion',
  403: 'permiso',
  404: 'modelo',
}

const codigoDe = (estado) => CODIGO_POR_ESTADO[estado] ?? 'ia'

/* Base64 infla un tercio. El cuerpo de una funcion de Vercel se corta en 4,5
   MB, asi que aqui se rechaza antes de intentarlo: mejor un mensaje claro que
   un error de plataforma que no dice nada. El cliente ya reduce la imagen
   antes de subirla, esto es la red por si esa reduccion falla. */
const TOPE_BASE64 = 3 * 1024 * 1024

const TIPOS = ['image/jpeg', 'image/png', 'image/webp']

/* Lo que se le pide al modelo que devuelva. Con esquema declarado y
   responseMimeType JSON, la respuesta viene ya en forma en vez de dentro de
   un bloque de markdown que habria que despegar con expresiones regulares. */
const ESQUEMA = {
  type: 'object',
  properties: {
    clases: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          codigo: { type: 'string' },
          nombre: { type: 'string' },
          dia: { type: 'string' },
          inicio: { type: 'string' },
          fin: { type: 'string' },
          seccion: { type: 'string' },
          aula: { type: 'string' },
          profesor: { type: 'string' },
        },
        required: ['nombre', 'dia', 'inicio', 'fin'],
      },
    },
  },
  required: ['clases'],
}

/**
 * Las instrucciones.
 *
 * Dos decisiones que valen mas que el resto del texto:
 *
 * UNA FILA POR SESION. Un horario dice "Matematica I — Lunes y Miercoles,
 * 7:00 a 8:40" en un renglon, pero eso son DOS bloques en la rejilla. Si el
 * modelo devuelve el renglon tal cual, el dia llega como "Lunes y Miercoles"
 * y no se entiende ninguno de los dos.
 *
 * EL LISTADO DE MATERIAS VA EN EL PROMPT. Un horario impreso abrevia -"MAT
 * I", "PROG II"- y emparejar abreviaturas contra sesenta nombres es
 * exactamente lo que un modelo hace bien. Devolviendo el codigo del listado
 * se salta el emparejamiento por parecido, que es la parte donde se cuelan
 * los errores. Y como el codigo se valida despues contra el pensum de verdad,
 * inventarse uno no cuela nada.
 *
 * LA JORNADA de la regla 3 es la de la rejilla (ABRE y CIERRA, en
 * src/layout/horario.js). Esta funcion no importa de src/, asi que va escrita
 * aqui, y una prueba vigila que las dos coincidan.
 */
const instrucciones = (materias) => `Eres un lector de horarios universitarios.

En la imagen hay el horario de clases de un estudiante. Extrae TODAS las clases.

Reglas:
1. Devuelve UNA FILA POR SESION, no por materia. Si una materia aparece con
   varios dias ("Lunes y Miércoles", "L-M-V"), devuelve una fila por cada día,
   todas con la misma hora salvo que la imagen diga otra cosa.
2. "dia" en español y completo: Lunes, Martes, Miércoles, Jueves o Viernes.
   Si una clase cae en sábado o domingo, inclúyela igual con ese nombre.
3. "inicio" y "fin" en formato HH:MM de 24 horas. Un horario universitario va
   de las 06:00 a las 19:00: si la imagen dice "1:40" sin meridiano, son las
   13:40.
4. "codigo": elige el de la lista de abajo cuya materia sea la misma, aunque
   en la imagen esté abreviada. Fíjate en el número romano final: "I" y "II"
   son materias distintas. Si ninguna encaja con seguridad, deja "" vacío.
5. "nombre": lo que está escrito en la imagen, tal cual, sin corregir.
6. "seccion", "aula" y "profesor" solo si aparecen. Si no, cadena vacía.
7. No inventes clases. Si algo está borroso y no puedes leerlo, omítelo.

Materias de esta carrera (código — nombre):
${materias.map((m) => `${m.codigo} — ${m.nombre}`).join('\n')}`

/* Comprueba que la peticion viene de la propia web. Es un badén, no una
   cerradura: una cabecera se falsifica en una linea de curl. Pero para de
   golpe el uso casual desde otra pagina. Lo que aguanta a quien la falsifica
   es el tope por origen (ver _turno.js). */
function mismaCasa(req) {
  const host = req.headers.host || ''
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) return true

  const procedencia = req.headers.origin || req.headers.referer
  if (!procedencia) return false
  try {
    return new URL(procedencia).host === host
  } catch {
    return false
  }
}

/**
 * Quien llama, para contarle las lecturas sin guardar su IP.
 *
 * La IP pasa por un HMAC y se guarda la huella: con ella se cuenta igual, y
 * quien abra el almacen no puede volver de la huella a la IP sin el secreto.
 * El secreto es la clave del lector porque ya esta aqui, no esta en el
 * repositorio y un HMAC no la deja ver.
 */
function huellaDe(req, secreto) {
  const ip = String(req.headers['x-forwarded-for'] ?? '')
    .split(',')[0]
    .trim()
  return ip ? createHmac('sha256', secreto).update(ip).digest('hex').slice(0, 16) : null
}

/** Lo que entra, comprobado: o el fallo, o lo que se le va a mandar al modelo */
function comprobar(cuerpo) {
  const { imagen, tipo, materias } = cuerpo ?? {}

  if (typeof imagen !== 'string' || !imagen) return { estado: 400, error: 'sin-imagen' }
  if (imagen.length > TOPE_BASE64) return { estado: 413, error: 'imagen-grande' }
  if (!TIPOS.includes(tipo)) return { estado: 400, error: 'tipo' }
  if (!Array.isArray(materias) || !materias.length) return { estado: 400, error: 'sin-materias' }

  const listado = materias
    .slice(0, 200)
    .map((m) => ({ codigo: String(m.codigo ?? ''), nombre: String(m.nombre ?? '') }))
    .filter((m) => m.codigo && m.nombre)

  return { imagen, tipo, listado }
}

const peticionA = (clave, { imagen, tipo, listado }) => ({
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-goog-api-key': clave },
  body: JSON.stringify({
    contents: [
      {
        role: 'user',
        parts: [
          { text: instrucciones(listado) },
          { inline_data: { mime_type: tipo, data: imagen } },
        ],
      },
    ],
    generationConfig: {
      /* A cero. Esto es una lectura, no una redaccion: la misma foto tiene
         que dar el mismo resultado las dos veces que alguien la suba, y aqui
         la variedad solo puede empeorar. */
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: ESQUEMA,
    },
  }),
})

/** Una peticion a un modelo. Nunca lanza: lo que falle vuelve como estado. */
async function llamar(modelo, peticion, plazo) {
  let r
  try {
    r = await fetch(`${GOOGLE}/${modelo}:generateContent`, {
      ...peticion,
      signal: AbortSignal.timeout(plazo),
    })
  } catch (e) {
    // estado 0 = no hubo respuesta: la red del servidor, o se paso el plazo
    return { estado: 0, texto: String(e?.message ?? e) }
  }
  if (r.ok) return { respuesta: r }
  /* El mensaje de Google se guarda tal cual. Es lo unico que distingue "ese
     modelo ya no existe" de "se acabo la cuota de hoy", y sin el, arreglar
     esto seria adivinar. No lleva la clave: va en una cabecera, no en el
     cuerpo ni en la URL. */
  return { estado: r.status, texto: await r.text().catch(() => '') }
}

/**
 * Por que un modelo no pudo, si es de las cosas que se pasan solas: se paso
 * el cupo o esta lleno. Devuelve el descanso que le toca, o null si el fallo
 * es de los que no mejoran esperando.
 */
function descansoDe({ estado, texto }) {
  if (SATURADO.has(estado)) return descansoPor(MOTIVO.SATURADO)
  if (estado !== SIN_CUPO) return null
  const { porDia, espera } = leerCuota(texto)
  return porDia ? descansoPor(MOTIVO.DIA) : descansoPor(MOTIVO.MINUTO, espera)
}

/**
 * Pregunta a los modelos, en orden, hasta que uno conteste.
 *
 * UNA vez a cada uno. Ante un tropiezo se pasa al siguiente en vez de
 * insistir en el mismo: contesta antes, y cada modelo gasta de su propio
 * cupo. Eran tres intentos por modelo, seguidos: seis peticiones por lectura
 * en el mismo minuto contra un cupo de veinte, y cada fallo metia seis mas.
 *
 * Del modelo que no puede se avisa en el acto con `alDescansar`, para que
 * quien llegue detras ni le pregunte.
 */
async function preguntar(modelos, peticion, alDescansar) {
  const arranque = Date.now()
  const queda = () => PRESUPUESTO - (Date.now() - arranque)

  const pausas = new Map()
  let ultimo = null
  let llamadas = 0

  for (const modelo of modelos) {
    if (queda() <= 0) break

    llamadas++
    const r = await llamar(modelo, peticion, Math.min(PLAZO_POR_MODELO, queda()))
    if (r.respuesta) return { respuesta: r.respuesta, modelo, llamadas, pausas }

    ultimo = r
    const descanso = descansoDe(r)
    if (descanso) {
      pausas.set(modelo, descanso)
      alDescansar(modelo, descanso)
    } else {
      /* Un modelo que ya no existe o que la clave no alcanza. Si el otro
         contesta, la lectura sale bien y esto no se veria nunca: se estaria
         con la mitad del cupo sin saberlo. */
      console.warn(`[lector] ${modelo} respondio ${r.estado} · ${r.texto.slice(0, 300)}`)
    }
  }
  return { ultimo, llamadas, pausas }
}

/** De la respuesta de Google a las clases, o el fallo que explica por que no */
async function clasesDe(respuesta) {
  const datos = await respuesta.json().catch(() => null)
  const crudo = datos?.candidates?.[0]?.content?.parts?.[0]?.text

  if (!crudo) {
    /* Sin texto casi siempre es un filtro de seguridad o un corte por
       longitud. El motivo viene en finishReason y es lo que hay que ver. */
    return {
      error: 'vacia',
      detalle: JSON.stringify(datos?.candidates?.[0]?.finishReason ?? datos),
    }
  }
  try {
    const leido = JSON.parse(crudo)
    return { clases: Array.isArray(leido?.clases) ? leido.clases.slice(0, 60) : [] }
  } catch {
    return { error: 'json', detalle: crudo.slice(0, 300) }
  }
}

/**
 * Ningun modelo puede atender porque todos descansan. Si a alguno le falta
 * poco, hay cola y se dice cuanto: la pantalla espera sola y vuelve. Si todos
 * agotaron el dia, no hay nada que esperar.
 */
function sinSitio(pausas) {
  const espera = esperaDe(pausas)
  return {
    estado: SIN_CUPO,
    cuerpo: espera == null ? { error: 'cuota' } : { error: 'cola', espera },
  }
}

/** Lo que se contesta cuando se pregunto y nadie leyo la imagen */
function sinLectura(lectura, modelos, pausas) {
  // Con alguno descansando no es una averia: es una espera
  if (pausas.size) return sinSitio(pausas)

  /* El detalle lleva los modelos que se probaron. Sin eso, un "no existe" no
     dice CUAL no existe, que es justo lo unico que hace falta saber. */
  const texto = String(lectura.ultimo?.texto ?? '').slice(0, 600)
  return {
    estado: 502,
    cuerpo: {
      error: codigoDe(lectura.ultimo?.estado),
      detalle: `${lectura.llamadas} intento(s) · ${modelos.join(', ')} · ${texto}`,
    },
  }
}

/**
 * De la peticion ya comprobada a lo que se contesta, mas lo que hay que
 * apuntar en el turno. Aqui esta el orden de las decisiones; cada una vive en
 * su funcion.
 */
async function atender({ entrada, clave, modelos, turno }) {
  if (turno.lecturas >= TOPE_POR_HORA) {
    return { llamadas: 0, estado: SIN_CUPO, cuerpo: { error: 'muchas' } }
  }

  // A los que descansan no se les pregunta: es cupo tirado
  const libres = modelos.filter((m) => !turno.pausas.has(m))
  if (!libres.length) return { llamadas: 0, ...sinSitio(turno.pausas) }

  /* Los avisos de descanso salen en cuanto ocurren y se recogen al final: la
     funcion no puede contestar con una escritura a medias, que la plataforma
     congela lo que quede pendiente. */
  const avisos = []
  const lectura = await preguntar(libres, peticionA(clave, entrada), (modelo, descanso) =>
    avisos.push(pausar(modelo, descanso)),
  )
  await Promise.all(avisos)
  const hecho = { llamadas: lectura.llamadas }

  if (!lectura.respuesta) {
    const todas = new Map([...turno.pausas, ...lectura.pausas])
    return { ...hecho, ...sinLectura(lectura, libres, todas) }
  }

  const leido = await clasesDe(lectura.respuesta)
  if (leido.error) return { ...hecho, estado: 502, cuerpo: leido }

  return {
    ...hecho,
    modelo: lectura.modelo,
    estado: 200,
    cuerpo: {
      clases: leido.clases,
      /* Que modelo contesto y a la cuantas. Es lo unico que permite saber,
         sin instrumentar nada, si el primero de la lista esta sirviendo o si
         todo el mundo esta cayendo al de repuesto. */
      modelo: lectura.modelo,
      intentos: lectura.llamadas,
    },
  }
}

const fallo = (res, estado, error) => res.status(estado).json({ error })

export default async function handler(req, res) {
  if (req.method !== 'POST') return fallo(res, 405, 'metodo')
  if (!mismaCasa(req)) return fallo(res, 403, 'fuera')

  const clave = process.env.GOOGLE_AI_API_KEY
  if (!clave) return fallo(res, 500, 'sin-clave')

  const entrada = comprobar(req.body)
  if (entrada.error) return fallo(res, entrada.estado, entrada.error)

  /* La misma foto, ya leida: se contesta de memoria, sin Google y sin gastar
     del tope del origen. */
  const huella = huellaDeLectura(entrada)
  const recordada = await recordarLectura(huella)
  if (recordada) return res.status(200).json(recordada)

  const modelos = listaDe('GOOGLE_AI_MODELO', MODELOS_POR_DEFECTO)
  const origen = huellaDe(req, clave)

  const turno = await abrirTurno(modelos, origen)
  const { estado, cuerpo, ...apunte } = await atender({ entrada, clave, modelos, turno })
  await Promise.all([
    cerrarTurno({ ...apunte, origen, resultado: cuerpo.error ?? 'ok' }),
    guardarLectura(huella, cuerpo.clases),
  ])

  /* Las averias quedan en el registro de Vercel con el mensaje de Google: es
     donde se va a mirar cuando alguien diga "no me lee el horario". Las
     esperas no: no son averias y ya se cuentan en el turno. El detalle no
     viaja en la respuesta: lleva nombres de modelos y texto crudo de Google,
     que es informacion interna y al estudiante no le sirve. */
  const { detalle, ...publico } = cuerpo
  if (detalle) console.warn(`[lector] ${publico.error} · ${detalle}`)

  return res.status(estado).json(publico)
}
