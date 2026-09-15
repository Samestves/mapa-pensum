import { memo } from 'react'
import { TRAMO } from '../layout/situacion'

/**
 * Como se ve cada clase de cable. El color no sale del area del
 * prerrequisito: con ocho colores de area cruzandose el mapa era un arcoiris
 * de curvas. El cable dice UNA cosa, la que importa para inscribir.
 */
const TRAZO = {
  [TRAMO.FRONTERA]: { color: 'var(--tinta)', opacidad: 0.32, grosor: 1.75 },
  [TRAMO.RECORRIDO]: { color: 'var(--estado-aprobada)', opacidad: 0.34, grosor: 1.5 },
  [TRAMO.PROXIMA]: { color: 'var(--tinta)', opacidad: 0.2, grosor: 1.25 },
  [TRAMO.LEJANA]: { color: 'var(--tinta)', opacidad: 0.07, grosor: 1 },
}

/**
 * Cable entre un prerrequisito y la materia que desbloquea.
 *
 * Tres animaciones, y ninguna en todos los cables a la vez:
 *
 *   flujo    solo en la frontera -de lo aprobado a lo que puedes inscribir-.
 *            Una luz corta que viaja hacia la materia. Es la unica perpetua,
 *            y en un avance normal son de dos a ocho cables, no los cuarenta
 *            y tres de Sistemas: lo que costaba era animarlos TODOS.
 *   trazar   al mirar una materia, su cadena se dibuja de origen a destino.
 *            Se relanza con cada materia nueva porque va con key={foco}.
 *   descarga la pasada de luz verde al aprobar.
 *
 * Sin vector-effect="non-scaling-stroke". Lo tuvo, y con el las animaciones
 * se veian rotas: pathLength normaliza la longitud en coordenadas del dibujo
 * y ese atributo mide el trazo en pixeles de pantalla, asi que el guion de
 * la luz salia de otro tamaño que el calculado y a saltos al hacer zoom.
 */
function Arista({ d, x2, y2, tramo, retraso, resaltada, atenuada, foco, descargando, claveDescarga }) {
  const t = TRAZO[tramo]
  const opacidad = atenuada ? 0.03 : resaltada ? 0.14 : t.opacidad
  const frontera = tramo === TRAMO.FRONTERA

  return (
    <g>
      <path
        d={d}
        fill="none"
        strokeLinecap="round"
        style={{
          stroke: resaltada ? 'var(--tinta)' : t.color,
          strokeOpacity: opacidad,
          strokeWidth: t.grosor,
          transition: 'stroke 240ms ease, stroke-opacity 240ms ease',
        }}
      />

      {/* La luz de la frontera: un halo ancho y tenue y un nucleo fino encima,
          los dos con el mismo guion y el mismo reloj. Se apaga mientras la
          cadena que se mira es otra, para no competir con ella. */}
      {frontera && !atenuada && (
        <>
          <path
            d={d}
            fill="none"
            pathLength="100"
            strokeLinecap="round"
            className="flujo"
            style={{ stroke: 'var(--tinta)', strokeWidth: 6, strokeOpacity: 0.14, animationDelay: retraso }}
          />
          <path
            d={d}
            fill="none"
            pathLength="100"
            strokeLinecap="round"
            className="flujo"
            style={{ stroke: 'var(--tinta)', strokeWidth: 2, strokeOpacity: 0.95, animationDelay: retraso }}
          />
        </>
      )}

      {/* La cadena de la materia que se mira, dibujandose */}
      {resaltada && (
        <path
          key={foco}
          d={d}
          fill="none"
          pathLength="100"
          strokeLinecap="round"
          className="trazar"
          style={{ stroke: 'var(--tinta)', strokeWidth: 2, strokeOpacity: 0.9 }}
        />
      )}

      {(frontera || resaltada) && !atenuada && (
        <circle cx={x2} cy={y2} r={3} style={{ fill: 'var(--tinta)', fillOpacity: resaltada ? 0.9 : 0.7 }} />
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
