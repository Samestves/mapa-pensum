import { leer, leerJSON, guardarJSON } from './almacen.js'

const CLAVE = 'mapa-pensum:carga'
/* Donde se guardaban solo las UC, antes de que la carga pudiera darse en
   materias. Se lee una vez para no perder lo que el estudiante ya eligio. */
const CLAVE_ANTERIOR = 'mapa-pensum:uc-semestre'

/**
 * Hasta donde llega el mando de carga en cada unidad.
 *
 * Las UC empiezan en 4 y no en 0: con cero no te graduarias nunca, y por
 * debajo de 4 no entra casi ninguna materia entera. 28 es lo maximo que
 * permite inscribir la UDO. Las materias van de 1 a 8: quien solo puede con
 * una quiere saber cual, y nadie inscribe mas de ocho.
 *
 * Por defecto, dieciseis UC: lo que inscribe un estudiante regular en un
 * semestre sin sobrecarga.
 */
export const LIMITES_CARGA = {
  uc: { min: 4, max: 28, porDefecto: 16 },
  materias: { min: 1, max: 8, porDefecto: 5 },
}

const valida = (carga) => {
  const limites = LIMITES_CARGA[carga?.unidad]
  if (!limites || !Number.isInteger(carga.valor)) return null
  return { unidad: carga.unidad, valor: Math.min(limites.max, Math.max(limites.min, carga.valor)) }
}

/**
 * Cuanto quiere llevar el estudiante por semestre: { unidad, valor }, en UC
 * o en materias.
 *
 * La elige en el plan de ruta y la leen dos sitios: el propio plan y la
 * tarjeta del grado estimado, que calcula la fecha con la misma carga. Si
 * cada uno leyera el almacen por su cuenta, la fecha de la tarjeta y la del
 * plan dejarian de coincidir el dia que alguien cambie el valor por defecto
 * en uno solo.
 */
export function leerCarga() {
  const guardada = valida(leerJSON(CLAVE, null))
  if (guardada) return guardada
  const anterior = leer(CLAVE_ANTERIOR)
  const ucAntes = anterior == null ? null : valida({ unidad: 'uc', valor: Number(anterior) })
  return ucAntes ?? { unidad: 'uc', valor: LIMITES_CARGA.uc.porDefecto }
}

export const guardarCarga = (carga) => guardarJSON(CLAVE, carga)

/** "16 UC" o "2 materias", como se dice la carga en una frase. */
export const textoCarga = ({ unidad, valor }) =>
  unidad === 'uc' ? `${valor} UC` : `${valor} ${valor === 1 ? 'materia' : 'materias'}`
