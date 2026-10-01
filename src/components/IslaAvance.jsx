import { memo } from 'react'
import { avanceDe, describirAvance } from '../data/avance'
import { useNumeroAnimado } from '../hooks/useNumeroAnimado'

/* La geometria sale del lado de la isla. El arco va centrado en el canto: su
   borde de fuera coincide con el de la isla, asi que el progreso no es un
   anillo dentro de un boton sino el contorno mismo del boton. */
const LADO = 52
const GROSOR = 2.75
const CENTRO = LADO / 2
const RADIO = (LADO - GROSOR) / 2
const CIRCUNFERENCIA = 2 * Math.PI * RADIO

/**
 * El avance en el telefono: una isla redonda junto a las vistas cuyo borde es
 * la barra de progreso, con el porcentaje dentro.
 *
 * Coste: un SVG de dos circulos sobre el mismo cristal que ya llevan las otras
 * islas. El arco se mueve con una transicion de CSS sobre stroke-dashoffset,
 * no con JavaScript, y solo cuando cambia el avance; el numero cuenta hasta
 * su valor durante unos cientos de milisegundos y se para. En reposo no hay
 * nada animandose.
 *
 * El numero va en HTML y no en un <text> del SVG: asi hereda la fuente y el
 * suavizado del resto de la interfaz, y el "%" pequeño se alinea por la linea
 * de base, que es como lo pone iOS ("14 %" con el signo a media altura se lee
 * como una unidad pegada, no como parte del numero).
 */
function IslaAvance({ resumen, abierta, alPulsar }) {
  const avance = Math.max(0, Math.min(100, avanceDe(resumen)))
  const numero = Math.round(useNumeroAnimado(avance))
  const detalle = describirAvance(resumen)

  return (
    <button
      type="button"
      onClick={(e) => alPulsar(e.currentTarget)}
      title={detalle}
      aria-label={detalle}
      aria-expanded={abierta}
      aria-haspopup="dialog"
      className="barra-cristal pointer-events-auto relative grid size-[52px] shrink-0 place-items-center rounded-full transition-transform duration-200 ease-out active:scale-[0.94]"
    >
      <svg
        viewBox={`0 0 ${LADO} ${LADO}`}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full"
      >
        <circle
          cx={CENTRO}
          cy={CENTRO}
          r={RADIO}
          fill="none"
          stroke="var(--isla-avance-pista)"
          strokeWidth={GROSOR}
        />
        <circle
          cx={CENTRO}
          cy={CENTRO}
          r={RADIO}
          fill="none"
          stroke="var(--estado-aprobada)"
          strokeWidth={GROSOR}
          strokeLinecap="round"
          strokeDasharray={CIRCUNFERENCIA}
          strokeDashoffset={CIRCUNFERENCIA * (1 - avance / 100)}
          transform={`rotate(-90 ${CENTRO} ${CENTRO})`}
          className="arco-avance"
        />
        {/* A cero el arco no pinta nada y la isla parece un boton mas. El
            punto marca de donde va a salir el progreso. */}
        {avance < 1 && (
          <circle cx={CENTRO} cy={GROSOR / 2} r={GROSOR / 2} fill="var(--estado-aprobada)" />
        )}
      </svg>

      <span className="relative flex items-baseline leading-none text-tinta tabular-nums">
        <span className="text-[16px] font-semibold tracking-[-0.04em]">{numero}</span>
        <span className="ml-[1px] text-[9.5px] font-semibold text-tinta-tenue">%</span>
      </span>
    </button>
  )
}

export default memo(IslaAvance)
