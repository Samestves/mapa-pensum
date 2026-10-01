/**
 * Mantener el dedo en una tarjeta para fijar su ruta, en el telefono.
 *
 * En escritorio la ruta de una materia se enciende al pasar el raton por
 * encima, y ese señalado se apaga al mover el mapa. Con el dedo no hay
 * "pasar por encima": apoyarlo es tocar, y el primer dedo de un pellizco
 * caia casi siempre sobre una tarjeta y encendia su ruta por error. Asi que
 * en el telefono la ruta se pide manteniendo el dedo quieto medio segundo, y
 * una vez pedida se queda puesta aunque el mapa se mueva: se puede recorrer
 * con el dedo libre. Se quita tocando el vacio.
 *
 * Aqui solo vive la decision -cuando una pulsacion es un toque, un arrastre
 * o un mantener-, como funcion pura. El reloj, la vibracion y los eventos son
 * cosa de useMantenerRuta.
 */

/* Antes de esto no se dibuja nada y soltar es un toque: abre la ficha. Un
   toque normal dura unos 100 ms; con 180 cabe tambien quien toca despacio. */
export const ESPERA_MS = 180
/* Lo que tarda el contorno en cerrarse una vez que asoma */
export const CARGA_MS = 320
/* El total: cuando la ruta queda fijada */
export const FIJA_MS = ESPERA_MS + CARGA_MS
/* Lo que tarda el contorno en irse cuando ya cumplio, mientras la ruta se
   enciende debajo */
export const APAGADO_MS = 450

/* Lo que puede moverse un dedo apoyado sin dejar de estar quieto. Un dedo
   nunca esta quieto del todo: tiembla dos, tres, a veces cinco pixeles. Con
   menos holgura que eso, mantener seria imposible. Son los 8 de Android. */
export const HOLGURA_TACTIL_PX = 8
/* El raton y el lapiz si se quedan quietos: con ellos el arrastre empieza
   enseguida */
export const HOLGURA_PRECISA_PX = 3

/** Desde cuantos pixeles un puntero que se mueve ya esta arrastrando */
export const holguraDe = (tipoDePuntero) =>
  tipoDePuntero === 'touch' ? HOLGURA_TACTIL_PX : HOLGURA_PRECISA_PX

/**
 * Si soltar el dedo en este momento es un toque, que abre la ficha.
 *
 * Solo antes de que asome el contorno. Una vez que se ve cargar, soltar es
 * arrepentirse del mantener, y no hace nada: abrir la ficha ahi se sentiria
 * como un error -"estaba cargando la ruta y me abrio la tarjeta"-. Es lo que
 * hace el "mantén pulsado" del juego: soltar a medias no hace nada.
 */
export const esToque = (estado, t) => estado?.fase !== 'cargando' || t - estado.t < ESPERA_MS

/**
 * El estado de una pulsacion:
 *
 *   null                                     nada
 *   { fase: 'cargando', codigo, dedo, ... }  el dedo esta quieto en una tarjeta
 *   { fase: 'hecha', codigo, ... }           ya se fijo; el contorno se va
 *
 * Los eventos:
 *
 *   apoya   { dedo, x, y, t, codigo, dedos }   codigo null si no es una tarjeta
 *   mueve   { dedo, x, y }
 *   suelta  { dedo }
 *   cumple                                     paso FIJA_MS sin soltar ni moverse
 *   apaga                                      el contorno termino de irse
 *
 * Devuelve el MISMO objeto cuando el evento no cambia nada, para que React
 * no repinte por cada movimiento del dedo.
 */
export function mantenerRuta(estado, evento) {
  const cargando = estado?.fase === 'cargando'
  const suyo = cargando && evento.dedo === estado.dedo

  switch (evento.tipo) {
    case 'apoya':
      /* Un segundo dedo es un pellizco, y apoyar fuera de una tarjeta no
         carga nada. En los dos casos se suelta lo que estuviera cargando. */
      if (evento.dedos > 1 || !evento.codigo) return cargando ? null : estado
      return {
        fase: 'cargando',
        codigo: evento.codigo,
        dedo: evento.dedo,
        x: evento.x,
        y: evento.y,
        t: evento.t,
      }

    case 'mueve':
      if (!suyo) return estado
      return Math.hypot(evento.x - estado.x, evento.y - estado.y) > HOLGURA_TACTIL_PX
        ? null
        : estado

    case 'suelta':
      // Soltar antes de tiempo era un toque: lo atiende el click de siempre
      return suyo ? null : estado

    case 'cumple':
      return cargando ? { ...estado, fase: 'hecha' } : estado

    case 'apaga':
      return estado?.fase === 'hecha' ? null : estado

    default:
      return estado
  }
}
