/**
 * El alto que se le reserva a una seccion de la lista mientras el navegador
 * no la pinta (content-visibility: auto, ver .seccion-lista en
 * estilos/hojas.css).
 *
 * Medido en la lista: la cabecera de un semestre son 50 px, la de un grupo de
 * electivas 44 y su riel 15; cada fila, 49,8 con su separador, y la caja de
 * las filas lleva 2 px de borde. Es el alto sin el aire de abajo, que va
 * aparte en el padding. Con un valor fijo para todas (520) la lista reservaba
 * el doble de lo que media, y la barra de desplazamiento encogia a saltos al
 * ir bajando.
 */
export const ALTO = { cabecera: 50, cabeceraGrupo: 44, riel: 15, fila: 49.8, caja: 2 }

/** Lo que miden `n` filas juntas, con su caja; nada si no hay ninguna */
export const altoDeFilas = (n) => (n ? n * ALTO.fila + ALTO.caja : 0)

/** Un semestre: su cabecera y, si no esta plegado, sus filas */
export const altoDeSemestre = ({ plegado, filas }) =>
  ALTO.cabecera + (plegado ? 0 : altoDeFilas(filas))

/** Un grupo de electivas: su cabecera, su riel si lleva meta y sus filas */
export const altoDeGrupo = ({ conRiel, filas }) =>
  ALTO.cabeceraGrupo + (conRiel ? ALTO.riel : 0) + altoDeFilas(filas)

/** El estilo que reserva `alto` px */
export const reserva = (alto) => ({ containIntrinsicSize: `auto ${Math.round(alto)}px` })
