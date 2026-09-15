import { SITUACION } from '../layout/situacion'

/**
 * Los iconos de estado del mapa. Dibujados aqui y no sacados de Lucide porque
 * lo que hace falta no es un icono por estado sino un SISTEMA: cinco formas
 * que se leen como familia, con el mismo circulo de base y el mismo grosor,
 * donde lo que cambia es cuanto esta lleno.
 *
 *   ✓  hecha        circulo lleno con check          terminado
 *   ◐  cursando     anillo con media luna llena      a medias
 *   ◉  inscribible  anillo con un punto en el centro listo, apunta aqui
 *   ◌  proxima      anillo punteado                  todavia no, pero viene
 *   🔒  lejana       candado                          cerrado
 *
 * Es el mismo recurso que usan las herramientas de gestion de tareas para el
 * avance de un ticket, y funciona por lo mismo: el relleno progresivo se
 * entiende sin leyenda. Lucide tiene circulos, puntos y candados, pero cada
 * uno con su propio trazo y su propia caja, y juntos no parecen parientes.
 *
 * Todo vive en una caja de 14 x 14. `FormaSituacion` devuelve solo las formas,
 * para meterlas dentro del SVG del mapa con un transform; `IconoSituacion` las
 * envuelve en su propio <svg> para usarlas en HTML, como en los botones de la
 * ficha.
 */
export function FormaSituacion({ situacion, color }) {
  switch (situacion) {
    case SITUACION.HECHA:
      return (
        <>
          <circle cx={7} cy={7} r={6} style={{ fill: color }} />
          <path
            d="M4.3 7.2 6.2 9.1 9.8 5.2"
            fill="none"
            stroke="var(--nodo)"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )
    case SITUACION.CURSANDO:
      return (
        <>
          <circle cx={7} cy={7} r={5.6} fill="none" strokeWidth={1.5} style={{ stroke: color }} />
          {/* La mitad derecha: medio camino, el mismo gesto que un reloj a las seis */}
          <path d="M7 7V3.4A3.6 3.6 0 0 1 7 10.6Z" style={{ fill: color }} />
        </>
      )
    case SITUACION.INSCRIBIBLE:
      return (
        <>
          <circle cx={7} cy={7} r={5.6} fill="none" strokeWidth={1.5} style={{ stroke: color }} />
          <circle cx={7} cy={7} r={2.3} style={{ fill: color }} />
        </>
      )
    case SITUACION.PROXIMA:
      return (
        /* pathLength 24 y guiones de 1,5 + 1,5: ocho guiones exactos, sin
           que el ultimo se monte sobre el primero donde el circulo cierra. */
        <circle
          cx={7}
          cy={7}
          r={5.6}
          fill="none"
          strokeWidth={1.5}
          pathLength={24}
          strokeDasharray="1.5 1.5"
          strokeLinecap="round"
          style={{ stroke: color }}
        />
      )
    case SITUACION.LEJANA:
      return (
        <>
          <rect
            x={3.4}
            y={6.2}
            width={7.2}
            height={5.4}
            rx={1.4}
            fill="none"
            strokeWidth={1.4}
            style={{ stroke: color }}
          />
          <path
            d="M5.1 6.2V5a1.9 1.9 0 0 1 3.8 0v1.2"
            fill="none"
            strokeWidth={1.4}
            strokeLinecap="round"
            style={{ stroke: color }}
          />
        </>
      )
    default:
      return null
  }
}

/** El mismo icono como elemento HTML suelto */
export function IconoSituacion({ situacion, color = 'currentColor', size = 14, className }) {
  return (
    <svg
      viewBox="0 0 14 14"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <FormaSituacion situacion={situacion} color={color} />
    </svg>
  )
}
