import { memo } from 'react'
import { avanceDe, describirAvance } from '../data/avance'
import { useNumeroAnimado } from '../hooks/useNumeroAnimado'

/* La geometria sale del lado de la isla. El arco va centrado en el canto: su
   borde de fuera coincide con el de la isla, asi que el progreso no es un
   anillo dentro de un boton sino el contorno mismo del boton. El grosor y el
   numero guardan la proporcion de la isla del telefono, que mide 52: la de la
   cabecera de escritorio es la misma pieza a 44, el alto de esa fila. */
const LADO_TELEFONO = 52
const GROSOR_TELEFONO = 2.75
const NUMERO_TELEFONO = 16
const PORCIENTO_TELEFONO = 9.5

/**
 * El avance: una isla redonda cuyo borde es la barra de progreso, con el
 * porcentaje dentro. En el telefono va abajo, junto a las vistas; en
 * escritorio, sola en la esquina de la cabecera. Las dos abren el avance, y
 * en los dos el tema vive dentro de lo que abren: una sola pieza para "como
 * voy" en vez de un grupo de botones sueltos.
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
function IslaAvance({ resumen, abierta, alPulsar, lado = LADO_TELEFONO, className = '' }) {
  const escala = lado / LADO_TELEFONO
  const grosor = GROSOR_TELEFONO * escala
  const centro = lado / 2
  const radio = (lado - grosor) / 2
  const circunferencia = 2 * Math.PI * radio

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
      style={{ width: lado, height: lado }}
      className={`barra-cristal pointer-events-auto relative grid shrink-0 place-items-center rounded-full transition-transform duration-200 ease-out active:scale-[0.94] ${className}`}
    >
      <svg
        viewBox={`0 0 ${lado} ${lado}`}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full"
      >
        <circle
          cx={centro}
          cy={centro}
          r={radio}
          fill="none"
          stroke="var(--isla-avance-pista)"
          strokeWidth={grosor}
        />
        <circle
          cx={centro}
          cy={centro}
          r={radio}
          fill="none"
          stroke="var(--estado-aprobada)"
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - avance / 100)}
          transform={`rotate(-90 ${centro} ${centro})`}
          className="arco-avance"
        />
        {/* A cero el arco no pinta nada y la isla parece un boton mas. El
            punto marca de donde va a salir el progreso. */}
        {avance < 1 && (
          <circle cx={centro} cy={grosor / 2} r={grosor / 2} fill="var(--estado-aprobada)" />
        )}
      </svg>

      <span className="relative flex items-baseline leading-none text-tinta tabular-nums">
        <span
          className="font-semibold tracking-[-0.04em]"
          style={{ fontSize: NUMERO_TELEFONO * escala }}
        >
          {numero}
        </span>
        <span
          className="ml-[1px] font-semibold text-tinta-tenue"
          style={{ fontSize: PORCIENTO_TELEFONO * escala }}
        >
          %
        </span>
      </span>
    </button>
  )
}

export default memo(IslaAvance)
