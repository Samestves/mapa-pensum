/**
 * Leer un 429 de Google: que limite se paso y cuanto hay que esperar.
 *
 * El plan gratuito de Gemini tiene dos limites por modelo, y hay que
 * distinguirlos porque piden cosas opuestas:
 *
 *   - por MINUTO (peticiones o tokens): se arregla solo en segundos. Google
 *     dice cuantos en RetryInfo.retryDelay.
 *   - por DIA: no vuelve hasta la medianoche del Pacifico. Insistir no sirve.
 *
 * Los dos llegan con el mismo estado y casi el mismo mensaje. Lo que los
 * separa es el identificador de la cuota, que viene en los detalles:
 * "GenerateRequestsPerMinutePerProjectPerModel-FreeTier" frente a
 * "GenerateRequestsPerDayPerProjectPerModel-FreeTier".
 *
 * Funcion pura: recibe el texto de la respuesta y no llama a nadie.
 */

/* Si Google no dice cuanto esperar. Medio minuto es lo que tarda en vaciarse
   la mitad de una ventana de un minuto: suficiente para que vuelva a haber
   sitio sin tener a nadie esperando de mas. */
const ESPERA_SIN_DATO = 30

/* Entre que y que se acepta lo que diga Google. Menos de cinco segundos es
   volver a chocar con el mismo limite; mas de un minuto no es un limite por
   minuto, y a alguien mirando una cuenta atras no se le puede pedir mas. */
const ESPERA_MINIMA = 5
const ESPERA_MAXIMA = 60

const acotar = (v, min, max) => Math.min(Math.max(v, min), max)

/* "37s" o "37.48s" */
const aSegundos = (texto) => {
  const n = Number.parseFloat(texto)
  return Number.isFinite(n) ? n : null
}

function detalles(texto) {
  try {
    const cuerpo = JSON.parse(texto)
    return { lista: cuerpo?.error?.details ?? [], mensaje: String(cuerpo?.error?.message ?? '') }
  } catch {
    // No vino JSON: se busca en el texto tal cual
    return { lista: [], mensaje: String(texto ?? '') }
  }
}

/**
 * @param {string} texto  el cuerpo del 429, tal cual lo mando Google
 * @returns {{ porDia: boolean, espera: number }}  `espera` en segundos
 */
export function leerCuota(texto) {
  const { lista, mensaje } = detalles(texto)

  const cuotas = lista
    .flatMap((d) => d?.violations ?? [])
    .map((v) => String(v?.quotaId ?? ''))
    .filter(Boolean)
  /* Sin detalles se mira el mensaje, que nombra la cuota igual. Y si tampoco,
     se supone por minuto: es el que se arregla solo, y equivocarse hacia ese
     lado cuesta una peticion de prueba, no un dia sin lector. */
  const porDia = cuotas.length ? cuotas.some((c) => /PerDay/i.test(c)) : /PerDay/i.test(mensaje)

  const aviso = lista.find((d) => d?.retryDelay)?.retryDelay
  const enMensaje = /retry in ([\d.]+)\s*s/i.exec(mensaje)?.[1]
  const dicho = aSegundos(aviso) ?? aSegundos(enMensaje) ?? ESPERA_SIN_DATO

  return { porDia, espera: acotar(Math.ceil(dicho), ESPERA_MINIMA, ESPERA_MAXIMA) }
}
