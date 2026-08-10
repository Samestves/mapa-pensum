import { memo } from 'react'
import { useNumeroAnimado } from '../hooks/useNumeroAnimado'

/* El anillo se dibuja con un solo circulo y stroke-dasharray: el tramo
   pintado es el avance y el resto deja ver la pista de debajo. Se gira
   noventa grados porque, sin eso, un circulo SVG empieza a las tres en
   punto, y nadie espera que un progreso arranque por la derecha.

   El radio va en unidades del viewBox, no en pixeles: el componente se
   escala cambiando solo el ancho y el alto, y el trazo escala con el. */
const RADIO = 15
const CIRCUNFERENCIA = 2 * Math.PI * RADIO

/**
 * Anillo de avance con el porcentaje dentro.
 *
 * Sustituye a la barra horizontal de la cabecera. La barra necesitaba ochenta
 * pixeles de ancho para decir lo mismo que aqui dice el propio hueco del
 * anillo, y encima repetia el numero que tenia al lado. Un anillo cerrandose
 * se lee de reojo, sin tener que comparar longitudes contra un extremo que
 * esta lejos.
 */
function AnilloAvance({ valor, tamano = 34, grosor = 3.5, activo }) {
  // El numero sube contando en vez de saltar. El hook ya respeta
  // prefers-reduced-motion y tiene red por si la pestaña esta de fondo.
  const animado = useNumeroAnimado(valor)
  const pct = Math.max(0, Math.min(100, animado))

  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 36 36"
      aria-hidden="true"
      className="shrink-0 overflow-visible"
    >
      <circle
        cx="18"
        cy="18"
        r={RADIO}
        fill="none"
        stroke="var(--panel-borde)"
        strokeWidth={grosor}
      />
      <circle
        cx="18"
        cy="18"
        r={RADIO}
        fill="none"
        stroke="var(--estado-aprobada)"
        strokeWidth={grosor}
        strokeLinecap="round"
        strokeDasharray={CIRCUNFERENCIA}
        strokeDashoffset={CIRCUNFERENCIA * (1 - pct / 100)}
        transform="rotate(-90 18 18)"
      />
      {/* A cero el anillo no dibuja nada y el circulo entero parece apagado.
          El punto marca de donde va a salir, que es lo que convierte una
          pista vacia en algo que se puede llenar. */}
      {pct < 1 && <circle cx="18" cy={18 - RADIO} r={grosor / 2} fill="var(--estado-aprobada)" />}
      <text
        x="18"
        y="18"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="13"
        fill={activo ? 'var(--tinta)' : 'var(--tinta-suave)'}
        className="font-extrabold tabular-nums"
      >
        {Math.round(pct)}
      </text>
    </svg>
  )
}

export default memo(AnilloAvance)
