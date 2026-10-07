/**
 * Ponerle a la capa del mapa el transform que la estira. Es lo unico que se
 * hace en cada cuadro de un gesto, asi que de como se haga depende cuanto le
 * queda al telefono para todo lo demas.
 *
 * Lo evidente es escribirlo en su estilo, y con eso Chrome, en cada cuadro,
 * vuelve a resolver el estilo del elemento contra toda la hoja y a decidir
 * que va en cada capa de la GPU: no sabe que solo ha cambiado un transform.
 *
 * Si el transform lo pone una animacion, si lo sabe: reaprovecha el estilo
 * que ya tenia y le pasa la matriz nueva al compositor sin repartir capas.
 * Asi que la capa lleva una animacion en pausa -no avanza, no gasta- y mover
 * la capa es cambiarle el fotograma. En pantalla es exactamente lo mismo.
 *
 * Medido en un telefono emulado a CPU x4. Moviendo la capa sin nada mas, 150
 * cuadros: 6,6 ms de hilo principal por cuadro con el estilo en linea y 4,3
 * con la animacion. En un gesto de verdad, con los eventos del dedo de por
 * medio, se queda en un 10-15 % menos por cuadro: cambiar el fotograma cuesta
 * algo mas de JavaScript que escribir un estilo.
 *
 * Solo en los navegadores de Chromium, que es donde se pudo medir. En los
 * demas el estilo en linea, que es lo que se sabe que va bien.
 */
const CON_ANIMACION =
  typeof navigator !== 'undefined' &&
  'userAgentData' in navigator &&
  typeof Element.prototype.animate === 'function'

const QUIETA = 'none'

// La animacion de cada capa. Se va con ella: no hay nada que limpiar.
const animaciones = new WeakMap()

function animacionDe(capa) {
  let animacion = animaciones.get(capa)
  /* Si alguien la reanudo o la cancelo -un getAnimations() que no sabia de
     ella-, ya no mueve nada y el mapa se queda quieto bajo el dedo: se hace
     otra. */
  if (!animacion || animacion.playState !== 'paused') {
    animacion?.cancel()
    // La duracion da igual: en pausa se queda en su primer instante
    animacion = capa.animate({ transform: [QUIETA, QUIETA] }, { duration: 1000 })
    animacion.pause()
    animaciones.set(capa, animacion)
  }
  return animacion
}

/** Estira `capa` con `transform`, o la deja como esta pintada si es null */
export function moverCapa(capa, transform) {
  if (!CON_ANIMACION) {
    capa.style.transform = transform ?? ''
    return
  }
  // Sin nada que estirar y sin animacion todavia, no hace falta crearla
  if (transform == null && !animaciones.has(capa)) return
  const valor = transform ?? QUIETA
  animacionDe(capa).effect.setKeyframes({ transform: [valor, valor] })
}
