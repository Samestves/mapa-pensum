/**
 * El aro del avance: una pista tenue y, encima, el arco de lo que llevas,
 * empezando a las doce y en el verde de aprobada. Ocupa la caja de quien lo
 * contiene -position absolute, inset 0-, asi que quien lo usa pone el tamaño
 * y lo que va dentro.
 *
 * Lo comparten la isla del telefono, donde el aro es el borde de la isla, y
 * la capsula de escritorio, donde es un anillo pequeño junto al texto. Dos
 * tamaños del mismo dibujo, no dos dibujos.
 *
 * El arco se mueve con una transicion de CSS sobre stroke-dashoffset
 * (.arco-avance) y solo cuando cambia el avance: en reposo no hay nada
 * animandose.
 */
export default function AroAvance({ lado, grosor, avance }) {
  const centro = lado / 2
  const radio = (lado - grosor) / 2
  const circunferencia = 2 * Math.PI * radio

  return (
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
      {/* A cero el arco no pinta nada y el aro parece un adorno. El punto
          marca de donde va a salir el progreso. */}
      {avance < 1 && (
        <circle cx={centro} cy={grosor / 2} r={grosor / 2} fill="var(--estado-aprobada)" />
      )}
    </svg>
  )
}

/**
 * La cifra que va dentro del aro: el numero y, pegado a su linea de base, un
 * "%" pequeño y apagado, que es como lo pone iOS ("14 %" con el signo a media
 * altura se lee como una unidad aparte, no como parte del numero).
 *
 * `cuerpo` es el tamaño del numero. A tres cifras -solo el 100- baja un 14 %:
 * asi "100%" cabe en el mismo hueco que "14%" y no toca el aro. El signo va
 * siempre al 60 % del numero.
 */
export function CifraAro({ numero, cuerpo }) {
  const tam = numero >= 100 ? cuerpo * 0.86 : cuerpo
  return (
    <span className="relative flex items-baseline leading-none text-tinta tabular-nums">
      <span style={{ fontSize: tam }} className="font-semibold tracking-[-0.04em]">
        {numero}
      </span>
      <span style={{ fontSize: tam * 0.6 }} className="ml-px font-semibold text-tinta-tenue">
        %
      </span>
    </span>
  )
}
