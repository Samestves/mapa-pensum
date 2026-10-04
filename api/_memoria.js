import { createHash } from 'node:crypto'
import { hayAlmacen, pedir } from './_almacen.js'
import { PREFIJO, fechaDe } from './latido.js'

/**
 * La memoria del lector: lo que ya se leyo de una foto no se vuelve a leer.
 *
 * El cupo gratuito de Google son unas veinte lecturas al dia por modelo, y
 * quien reintenta con la misma foto -porque cerro la pestana, porque no vio el
 * resultado- gastaba otra. Aqui se guarda el resultado, y solo el resultado,
 * bajo la huella de la foto: la imagen nunca se guarda.
 *
 *   lector:leida:<huella>   las clases leidas, en JSON. Caduca a los 7 dias.
 *
 * La huella lleva tambien las materias de la carrera. Las clases traen el
 * codigo del pensum, y la misma foto leida contra otra carrera daria codigos
 * de otra carrera: reintentar tras abrir el pensum equivocado devolveria lo
 * equivocado.
 *
 * Solo se guardan lecturas buenas, con clases. Un error guardado seria
 * condenar a esa foto a fallar siete dias; una lectura vacia tampoco dice
 * nada que no se pueda volver a intentar. Sin almacen, o con el almacen
 * caido, todo sigue como si esta memoria no existiera.
 */

const k = (...partes) => [PREFIJO, 'lector', ...partes].join(':')

const SIETE_DIAS = 7 * 24 * 3600

/* Lo que dice la respuesta cuando sale de aqui y no de Google */
export const MODELO_MEMORIA = 'memoria'

/** Huella de lo que se pregunta: la foto y el listado de materias */
export function huellaDeLectura({ imagen, listado }) {
  return createHash('sha256')
    .update(imagen)
    .update('\n')
    .update(listado.map((m) => m.codigo).join(','))
    .digest('hex')
}

/** Lo guardado, o null si no hay nada que sirva */
function clasesGuardadas(texto) {
  if (typeof texto !== 'string') return null
  try {
    const clases = JSON.parse(texto)
    return Array.isArray(clases) && clases.length ? clases : null
  } catch {
    return null
  }
}

/**
 * La respuesta ya lista si esta foto se leyo antes, o null. Cuenta el acierto
 * en el hash del dia.
 */
export async function recordarLectura(huella) {
  if (!hayAlmacen()) return null
  try {
    const [guardado] = await pedir([['GET', k('leida', huella)]])
    const clases = clasesGuardadas(guardado)
    if (!clases) return null
    await pedir([['HINCRBY', k('dia', fechaDe()), 'memoria', '1']])
    return { clases, modelo: MODELO_MEMORIA, intentos: 0 }
  } catch {
    // Sin memoria se lee de nuevo: se gasta cupo, no se pierde la lectura
    return null
  }
}

/** Guarda lo leido. Sin clases no se guarda nada. */
export async function guardarLectura(huella, clases) {
  if (!hayAlmacen() || !clases?.length) return
  try {
    await pedir([['SET', k('leida', huella), JSON.stringify(clases), 'EX', String(SIETE_DIAS)]])
  } catch {
    // La proxima vez se leera otra vez: lo de menos
  }
}
