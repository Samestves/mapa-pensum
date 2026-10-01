import { ESTADO } from '../data/estados'

/**
 * Como se llama cada estado de cara al usuario. Vivia dentro de la ficha
 * flotante, pero en cuanto una segunda vista tuvo que nombrar estados dejo
 * de ser asunto de un componente.
 *
 * El color y el icono de cada estado ya no viven aqui: los pinta la
 * situacion de la materia (theme/situacion.js), que distingue mas casos que
 * los cuatro estados guardados.
 */
export const ETIQUETA_ESTADO = {
  [ESTADO.APROBADA]: 'Aprobada',
  [ESTADO.CURSANDO]: 'Cursando',
  [ESTADO.DISPONIBLE]: 'Disponible',
  [ESTADO.BLOQUEADA]: 'Bloqueada',
}
