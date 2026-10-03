import { hayAlmacen, pedir } from './_almacen.js'
import { PREFIJO, fechaDe } from './latido.js'

/**
 * El turno: lo que el lector de horarios recuerda entre una peticion y la
 * siguiente.
 *
 * Una funcion sin servidor no tiene memoria. Cada peticion arranca sin saber
 * que la anterior acaba de chocar con el limite de Google, asi que cuando un
 * modelo se llenaba, todas las siguientes iban a preguntarle igual, se
 * llevaban su 429 y gastaban cupo para nada. Y ese cupo era justo el que
 * faltaba: con 20 peticiones por minuto, el panel de Google llego a marcar 39.
 *
 * Se guardan tres cosas:
 *   lector:pausa:<modelo>   que modelo descansa y por que. Caduca sola:
 *                           cuando vence, el modelo vuelve.
 *   lector:de:<origen>      cuantas lecturas lleva un mismo origen esta hora.
 *                           El origen es una huella, no una IP.
 *   lector:dia:<fecha>      como acabaron las lecturas del dia y contra que
 *                           choco cada modelo. Es la unica forma de saber si
 *                           el cupo gratuito alcanza.
 *
 * Sin almacen nada de esto existe y el lector funciona igual, solo que sin
 * memoria: lo mismo que si Upstash se cae.
 */

const k = (...partes) => [PREFIJO, 'lector', ...partes].join(':')

/* Lecturas por hora desde un mismo origen. Un estudiante lee su horario una
   vez, dos si la foto salio torcida. Treinta deja pasar a una residencia
   entera detras de la misma conexion y para a quien llama desde un script. */
export const TOPE_POR_HORA = 30
const HORA = 3600

/* Por que descansa un modelo */
export const MOTIVO = {
  /* Se paso el limite por minuto: vuelve en lo que diga Google */
  MINUTO: 'minuto',
  /* Agoto el cupo del dia */
  DIA: 'dia',
  /* Google esta lleno o no contesto: no es cosa del cupo, y se pasa pronto */
  SATURADO: 'saturado',
}

/* Lo que descansa un modelo cuando el plazo no lo pone Google.

   El que agoto el DIA descansa una hora y se vuelve a probar. El cupo vuelve
   a la medianoche del Pacifico, pero fiarse de esa hora seria apostar a que
   Google no la cambia: una peticion de prueba por hora cuesta menos que un
   lector apagado de mas.

   El saturado, diez segundos: lo justo para que quien llegue mientras tanto
   vaya directo al otro modelo en vez de tropezar en el mismo sitio. */
const DESCANSO = { [MOTIVO.DIA]: HORA, [MOTIVO.SATURADO]: 10 }

/**
 * El descanso que le toca a un modelo: por que, y cuantos segundos.
 *
 * @param {string} motivo  uno de MOTIVO
 * @param {number} [espera]  lo que dijo Google, cuando el limite es por minuto
 */
export const descansoPor = (motivo, espera) => ({ motivo, espera: DESCANSO[motivo] ?? espera })

/** Lo que se le pregunta al almacen antes de llamar a Google */
export function comandosDeEntrada(modelos, origen) {
  const comandos = modelos.flatMap((m) => [
    ['GET', k('pausa', m)],
    ['TTL', k('pausa', m)],
  ])
  if (origen) comandos.push(['GET', k('de', origen)])
  return comandos
}

/**
 * De la respuesta del almacen a algo con lo que decidir.
 *
 * @returns {{ pausas: Map<string, { motivo: string, espera: number }>, lecturas: number }}
 *   `espera` son los segundos que le quedan de descanso a cada modelo
 */
export function leerEntrada(modelos, origen, resultados) {
  const pausas = new Map()
  modelos.forEach((modelo, i) => {
    const motivo = resultados[i * 2]
    const quedan = Number(resultados[i * 2 + 1])
    // TTL devuelve -2 si la llave no existe y -1 si no caduca
    if (motivo && quedan > 0) pausas.set(modelo, { motivo, espera: quedan })
  })
  const lecturas = origen ? Number(resultados[modelos.length * 2]) || 0 : 0
  return { pausas, lecturas }
}

/** Deja descansando a un modelo, y cuenta contra que choco */
export function comandosDePausa(modelo, { motivo, espera }, fecha) {
  return [
    ['SET', k('pausa', modelo), motivo, 'EX', String(espera)],
    ['HINCRBY', k('dia', fecha), `${motivo}:${modelo}`, '1'],
  ]
}

/**
 * Lo que se apunta al terminar.
 *
 * @param {object} turno
 * @param {string} turno.resultado  'ok' o el codigo del fallo
 * @param {number} turno.llamadas   cuantas peticiones se le hicieron a Google
 */
export function comandosDeSalida({ origen, resultado, modelo, llamadas, fecha }) {
  const comandos = []
  /* Solo cuenta lo que llego a Google. Quien espera su turno en la cola
     vuelve a llamar varias veces sin gastar nada, y contarle esas llamadas
     seria echarlo por haber esperado. */
  if (origen && llamadas > 0) {
    comandos.push(
      ['SET', k('de', origen), '0', 'EX', String(HORA), 'NX'],
      ['INCR', k('de', origen)],
    )
  }
  comandos.push(['HINCRBY', k('dia', fecha), resultado, '1'])
  if (llamadas > 0) comandos.push(['HINCRBY', k('dia', fecha), 'llamadas', String(llamadas)])
  if (modelo) comandos.push(['HINCRBY', k('dia', fecha), `con:${modelo}`, '1'])
  return comandos
}

/**
 * Cuanto esperar cuando ningun modelo puede atender, en segundos.
 *
 * Mientras a alguno le falte poco, hay cola: se espera lo que le quede al que
 * antes vuelva. Si todos agotaron el dia no hay nada que esperar, y devuelve
 * null.
 */
export function esperaDe(pausas) {
  const pasajeras = [...pausas.values()].filter((p) => p.motivo !== MOTIVO.DIA)
  if (!pasajeras.length) return null
  // Un segundo de mas: volver justo cuando caduca es llegar antes que el cupo
  return Math.min(...pasajeras.map((p) => p.espera)) + 1
}

const sinMemoria = () => ({ pausas: new Map(), lecturas: 0 })

/** Antes de llamar a Google: quien descansa y cuanto lleva este origen */
export async function abrirTurno(modelos, origen) {
  if (!hayAlmacen()) return sinMemoria()
  try {
    return leerEntrada(modelos, origen, await pedir(comandosDeEntrada(modelos, origen)))
  } catch {
    // El almacen caido no puede dejar a nadie sin leer su horario
    return sinMemoria()
  }
}

/**
 * En cuanto un modelo no puede, y no al terminar la peticion: la lectura
 * sigue con el otro modelo y tarda sus diez o veinte segundos, y todo el que
 * llegue en ese rato tiene que saberlo ya.
 */
export async function pausar(modelo, descanso) {
  if (!hayAlmacen()) return
  try {
    await pedir(comandosDePausa(modelo, descanso, fechaDe()))
  } catch {
    // Sin apuntarlo, la siguiente peticion tropezara tambien: se pierde cupo, no la lectura
  }
}

/** Al terminar: se apunta como acabo */
export async function cerrarTurno(turno) {
  if (!hayAlmacen()) return
  try {
    await pedir(comandosDeSalida({ ...turno, fecha: fechaDe() }))
  } catch {
    // Lo mismo: apuntar es lo de menos
  }
}
