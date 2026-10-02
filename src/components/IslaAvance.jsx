import { memo } from 'react'
import { avanceDe, describirAvance } from '../data/avance'
import { useNumeroAnimado } from '../hooks/useNumeroAnimado'
import AroAvance, { CifraAro } from './AroAvance'

/* El aro va centrado en el canto: su borde de fuera coincide con el de la
   isla, asi que el progreso no es un anillo dentro de un boton sino el
   contorno mismo del boton. */
const LADO = 52
const GROSOR = 2.75

/**
 * El avance en el telefono: una isla redonda junto a las vistas cuyo borde es
 * la barra de progreso, con el porcentaje dentro. Abre la hoja de avance,
 * donde vive tambien el tema. En escritorio la misma idea es una capsula,
 * con sitio para decir cuanto llevas (CapsulaAvance).
 *
 * Coste: un SVG de dos circulos sobre el mismo cristal que ya llevan las otras
 * islas. El numero cuenta hasta su valor durante unos cientos de
 * milisegundos y se para. En reposo no hay nada animandose.
 *
 * El numero va en HTML y no en un <text> del SVG: asi hereda la fuente y el
 * suavizado del resto de la interfaz (ver CifraAro).
 */
function IslaAvance({ resumen, abierta, alPulsar }) {
  const avance = Math.max(0, Math.min(100, avanceDe(resumen)))
  const numero = Math.round(useNumeroAnimado(avance))
  const detalle = describirAvance(resumen)

  return (
    <button
      type="button"
      onClick={() => alPulsar()}
      title={detalle}
      aria-label={detalle}
      aria-expanded={abierta}
      aria-haspopup="dialog"
      className="barra-cristal pointer-events-auto relative grid size-[52px] shrink-0 place-items-center rounded-full transition-transform duration-200 ease-out active:scale-[0.94]"
    >
      <AroAvance lado={LADO} grosor={GROSOR} avance={avance} />

      <CifraAro numero={numero} cuerpo={16} />
    </button>
  )
}

export default memo(IslaAvance)
