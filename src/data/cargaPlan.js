import { guardar, leer } from './almacen.js'

const CLAVE = 'mapa-pensum:uc-semestre'

/* La carga por defecto: dieciseis UC, lo que inscribe un estudiante regular
   de la UDO en un semestre sin sobrecarga. */
const UC_POR_DEFECTO = 16

/**
 * Cuantas UC por semestre quiere llevar el estudiante.
 *
 * La elige en el plan de ruta y la leen dos sitios: el propio plan y la hoja
 * de avance del telefono, que estima la fecha de grado con la misma carga.
 * Si cada uno leyera la clave por su cuenta, la fecha de la hoja y la del plan
 * dejarian de coincidir el dia que alguien cambie el valor por defecto en uno
 * solo.
 */
export const leerUcPorSemestre = () => Number(leer(CLAVE)) || UC_POR_DEFECTO

export const guardarUcPorSemestre = (uc) => guardar(CLAVE, String(uc))
