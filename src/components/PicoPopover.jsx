/**
 * El piquito que sale de una nubecita y apunta a lo que la abrio.
 *
 * Sin el, un panel que aparece flotando no dice de donde viene. Con dos o
 * tres cosas abiertas en la misma esquina -el avance, los avisos, el tema- el
 * unico indicio era la animacion de entrada, que dura ciento treinta
 * milisegundos y se pierde si miras un momento despues.
 *
 * Es un cuadrado girado cuarenta y cinco grados, no un triangulo dibujado con
 * bordes. El triangulo de bordes CSS no puede llevar borde propio, asi que en
 * un panel perfilado -y todos los de aqui lo estan- se veia una punta de
 * color plano pegada a una caja con contorno. El cuadrado girado hereda el
 * mismo fondo y el mismo borde que el panel y solo enseña sus dos lados de
 * fuera: los otros dos quedan tapados por el panel, que va por encima.
 *
 * Vive en su propio archivo porque lo piden tres paneles -la ficha del mapa,
 * el avance y la clase del horario- y antes cada uno lo dibujaba a mano. Eran
 * tres copias del mismo cuadrado con tres tamaños distintos: 10, 12 y ninguno.
 */

/* Cuanto asoma por fuera del panel. Es la mitad del lado menos el pixel del
   borde, para que la juntura no se vea como una linea partida. */
const SALIENTE = -5

const LADOS = {
  arriba: { borde: 'border-t border-l', eje: 'top', cruce: 'left', centrar: '-translate-x-1/2' },
  abajo: { borde: 'border-b border-r', eje: 'bottom', cruce: 'left', centrar: '-translate-x-1/2' },
  izquierda: { borde: 'border-b border-l', eje: 'left', cruce: 'top', centrar: '-translate-y-1/2' },
  derecha: { borde: 'border-t border-r', eje: 'right', cruce: 'top', centrar: '-translate-y-1/2' },
}

/**
 * @param lado      borde del panel por el que asoma: el que mira al ancla.
 * @param posicion  px desde el inicio de ese borde hasta el centro del ancla.
 */
function PicoPopover({ lado, posicion }) {
  const config = LADOS[lado]
  if (!config) return null

  return (
    <span
      aria-hidden="true"
      style={{ [config.eje]: SALIENTE, [config.cruce]: posicion }}
      /* El centrado y el giro salen como translate y rotate sueltos, no
         dentro de un transform: son las propiedades individuales, y el
         navegador las aplica siempre en ese orden. Es justo el que hace
         falta, porque asi la media flecha se corre sobre el eje del panel,
         sin girar; metidas en un transform al reves, el desplazamiento
         saldria en diagonal. */
      className={`transicion-tema absolute size-3 ${config.centrar} rotate-45 border-panel-borde bg-panel ${config.borde}`}
    />
  )
}

export default PicoPopover
