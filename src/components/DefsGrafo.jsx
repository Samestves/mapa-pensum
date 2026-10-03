import { SITUACION } from '../layout/situacion'
import { idIcono } from '../theme/situacion'
import { FormaSituacion, LADO_ICONO } from './IconoSituacion'

/**
 * Definiciones reutilizables del SVG del mapa: la rejilla de fondo y los
 * iconos de estado.
 *
 * Cada icono se define UNA vez aqui, como <symbol>, y cada tarjeta lo señala
 * con un <use> (ver FormaTarjeta): un elemento por tarjeta en vez de las tres
 * o cuatro formas del dibujo repetidas en las ciento y pico del mapa. El
 * color y lo calado los pone quien lo usa, y el simbolo los hereda.
 */
function DefsGrafo() {
  return (
    <defs>
      <pattern id="rejilla" width="34" height="34" patternUnits="userSpaceOnUse">
        <path d="M34 0H0V34" fill="none" stroke="var(--rejilla)" strokeWidth="1" />
      </pattern>

      {Object.values(SITUACION).map((situacion) => (
        <symbol key={situacion} id={idIcono(situacion)} viewBox={`0 0 ${LADO_ICONO} ${LADO_ICONO}`}>
          <FormaSituacion situacion={situacion} />
        </symbol>
      ))}
    </defs>
  )
}

export default DefsGrafo
