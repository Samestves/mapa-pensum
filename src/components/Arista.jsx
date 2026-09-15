import { memo } from 'react'
import { TRAMO } from '../layout/situacion'
import { colorNodo } from '../theme/areas'

/**
 * Cuanto se enciende un cable segun lo que dice. El COLOR lo pone el area de
 * la materia de la que sale; esto solo decide su fuerza.
 *
 * Estuvieron un tiempo en blanco y gris, para que no hubiera un arcoiris de
 * curvas. Pero sin color no se puede seguir una rama con la vista: dos cables
 * que se cruzan son iguales, y no hay forma de saber cual es cual al salir
 * del cruce. Con el color de su area vuelven a distinguirse, y el desorden lo
 * evita la jerarquia: lo lejano apenas se ve, y lo que dice algo se enciende.
 */
const FUERZA = {
  [TRAMO.FRONTERA]: { opacidad: 0.6, grosor: 1.75 },
  [TRAMO.RECORRIDO]: { opacidad: 0.5, grosor: 1.5 },
  [TRAMO.PROXIMA]: { opacidad: 0.32, grosor: 1.25 },
  [TRAMO.LEJANA]: { opacidad: 0.12, grosor: 1 },
}

/**
 * Cable entre un prerrequisito y la materia que desbloquea.
 *
 * El color se fija una vez en el <g> como `color` y todo lo de dentro lo usa
 * como currentColor: el trazo, la luz, el punto de llegada y el trazado de la
 * cadena. Asi la luz de un cable sale del mismo tono que el cable, aclarado
 * hacia el blanco en oscuro y profundizado en claro -ver .flujo-nucleo-.
 *
 * Tres animaciones, y ninguna en todos los cables a la vez:
 *
 *   flujo    solo en la frontera -de lo aprobado a lo que puedes inscribir-.
 *            Una luz corta que viaja hacia la materia.
 *   trazar   al mirar una materia, su cadena se dibuja de origen a destino.
 *   descarga la pasada de luz verde al aprobar.
 *
 * Sin vector-effect="non-scaling-stroke": con el, el guion se medía en pixeles
 * de pantalla mientras pathLength lo normaliza en coordenadas del dibujo, y la
 * luz salia de otro tamaño y a saltos.
 */
function Arista({
  d,
  x2,
  y2,
  area,
  codigoOrigen,
  tramo,
  retraso,
  resaltada,
  atenuada,
  foco,
  descargando,
  claveDescarga,
}) {
  const f = FUERZA[tramo]
  const opacidad = atenuada ? 0.04 : resaltada ? 0.2 : f.opacidad
  const frontera = tramo === TRAMO.FRONTERA

  return (
    <g color={colorNodo({ area, codigo: codigoOrigen })}>
      <path
        d={d}
        fill="none"
        strokeLinecap="round"
        stroke="currentColor"
        style={{
          strokeOpacity: opacidad,
          strokeWidth: f.grosor,
          transition: 'stroke-opacity 240ms ease',
        }}
      />

      {/* La luz de la frontera: un halo ancho y tenue y un nucleo fino encima,
          los dos con el mismo guion y el mismo reloj. Se apaga mientras se
          mira otra cadena, para no competir con ella. */}
      {frontera && !atenuada && (
        <>
          <path
            d={d}
            fill="none"
            pathLength="100"
            strokeLinecap="round"
            stroke="currentColor"
            className="flujo"
            style={{ strokeWidth: 6, strokeOpacity: 0.22, animationDelay: retraso }}
          />
          <path
            d={d}
            fill="none"
            pathLength="100"
            strokeLinecap="round"
            className="flujo flujo-nucleo"
            style={{ strokeWidth: 2.25, animationDelay: retraso }}
          />
        </>
      )}

      {/* La cadena de la materia que se mira, dibujandose en su color */}
      {resaltada && (
        <path
          key={foco}
          d={d}
          fill="none"
          pathLength="100"
          strokeLinecap="round"
          stroke="currentColor"
          className="trazar"
          style={{ strokeWidth: 2.25, strokeOpacity: 0.95 }}
        />
      )}

      {(frontera || resaltada) && !atenuada && (
        <circle cx={x2} cy={y2} r={3} fill="currentColor" fillOpacity={resaltada ? 1 : 0.85} />
      )}

      {descargando && (
        <path
          key={claveDescarga}
          d={d}
          fill="none"
          pathLength="100"
          strokeLinecap="round"
          className="descarga"
          style={{ stroke: 'var(--estado-aprobada)', strokeWidth: 3 }}
        />
      )}
    </g>
  )
}

// Todas sus props son valores simples, asi que el memo compara barato
export default memo(Arista)
