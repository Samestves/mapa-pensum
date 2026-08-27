import { LADOS, SALIENTE, trazar } from '../layout/pico'

/**
 * El piquito que sale de una nubecita y apunta a lo que la abrio.
 *
 * Sin el, un panel que aparece flotando no dice de donde viene. Con dos o
 * tres cosas abiertas en la misma esquina -el avance, los avisos, el tema- el
 * unico indicio era la animacion de entrada, que dura ciento treinta
 * milisegundos y se pierde si miras un momento despues.
 *
 * La forma vive en layout/pico.js, que es geometria y se mide sin montar
 * nada. Aqui solo queda el DONDE, que es lo que este archivo tiene que
 * explicar bien, porque es lo que estaba mal:
 *
 * El pico va DELANTE del panel, no detras. El panel lleva contorno en los
 * cuatro lados, asi que con el pico detras esa linea recta le cruzaba entera
 * por la base: lo que se veia no era una nubecita con pico, era una caja
 * perfilada con un rombo asomando. Delante, el relleno del pico -que es del
 * color del panel- borra ese trozo de linea, y el contorno del panel entra
 * por un lado del pico y sale por el otro sin cortarse. Una sola silueta.
 *
 * De ahi salen las otras dos cosas raras de este componente, que no son
 * capricho:
 *
 *   - pointer-events-none, porque ahora hay una caja transparente flotando
 *     sobre el borde del panel y sin esto se comeria las pulsaciones de lo
 *     que quede debajo;
 *   - overflow visible, porque la punta toca justo el borde del dibujo y la
 *     mitad de fuera del trazo se saldria de la caja. Un SVG recorta por
 *     defecto, y la punta habria salido cortada en plano.
 */
function PicoPopover({ lado, posicion }) {
  const config = LADOS[lado]
  if (!config) return null

  const { w, h, eje, cruce } = config

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ [eje]: SALIENTE, [cruce]: posicion, overflow: 'visible' }}
      className={`pico-popover pointer-events-none absolute ${
        cruce === 'left' ? '-translate-x-1/2' : '-translate-y-1/2'
      }`}
    >
      {/* Relleno primero y contorno encima: asi el trazo se dibuja sobre su
          propio relleno y no se lo come por la mitad. */}
      <path d={trazar(lado, true)} fill="var(--panel)" />
      <path d={trazar(lado, false)} fill="none" stroke="var(--panel-borde)" strokeWidth="1" />
    </svg>
  )
}

export default PicoPopover
