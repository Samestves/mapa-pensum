import { memo } from 'react'
import { TRAMO } from '../layout/situacion'

/**
 * Como se ve cada clase de cable. El color ya no sale del area del
 * prerrequisito: con ocho colores de area cruzandose, el mapa era un arcoiris
 * de curvas y no se podia seguir ninguna. Ahora el cable dice UNA cosa, la que
 * importa para inscribir.
 */
const TRAZO = {
  // Por aqui sigue tu carrera: lo unico encendido del mapa
  [TRAMO.FRONTERA]: { color: 'var(--tinta)', opacidad: 0.85, grosor: 1.75 },
  // Camino ya hecho: presente, pero de fondo
  [TRAMO.RECORRIDO]: { color: 'var(--estado-aprobada)', opacidad: 0.4, grosor: 1.5 },
  // Lo que se abre el semestre que viene
  [TRAMO.PROXIMA]: { color: 'var(--tinta)', opacidad: 0.3, grosor: 1.25 },
  // Todo lo demas, casi transparente: se intuye la estructura, no estorba
  [TRAMO.LEJANA]: { color: 'var(--tinta)', opacidad: 0.09, grosor: 1 },
}

/**
 * Cable entre un prerrequisito y la materia que desbloquea.
 *
 * Era cada uno nueve elementos -tres trazos de resplandor, el cable, tres
 * capas de estela, dos perlas y un punto de soldadura- con cinco animaciones
 * que no paraban nunca. En Sistemas, 215 animaciones perpetuas que ni
 * stroke-dashoffset ni offset-distance dejan pasar a la GPU: cada fotograma
 * se volvian a rasterizar en el hilo principal. Medido con el mapa QUIETO,
 * 22 de cada 150 fotogramas se pasaban de 16,7 ms en un PC; con esas
 * animaciones pausadas, cero.
 *
 * Ahora es un trazo. Lo que decia la corriente -"de aqui se llega alli"- lo
 * dice el color, y lo dice sin gastar nada mientras nadie toca el mapa.
 *
 * vector-effect="non-scaling-stroke" deja el grosor en pixeles de pantalla.
 * Sin el, un cable de 1,5 se dibujaba a 0,49 px con el mapa encajado -o sea
 * que la diferencia entre encendido y apagado no se veia- y a 3,7 px con el
 * mapa acercado, gordo como un tubo.
 */
function Arista({ d, x2, y2, tramo, resaltada, atenuada, descargando, claveDescarga }) {
  const t = TRAZO[tramo]
  const opacidad = atenuada ? 0.03 : resaltada ? Math.max(t.opacidad, 0.9) : t.opacidad
  const color = resaltada && tramo === TRAMO.LEJANA ? 'var(--tinta)' : t.color
  const grosor = resaltada ? Math.max(t.grosor, 2) : t.grosor
  const conPunto = tramo === TRAMO.FRONTERA || resaltada

  return (
    <g>
      <path
        d={d}
        fill="none"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        style={{
          stroke: color,
          strokeOpacity: opacidad,
          strokeWidth: grosor,
          transition: 'stroke 240ms ease, stroke-opacity 240ms ease, stroke-width 240ms ease',
        }}
      />

      {/* Punto de llegada, solo donde se sigue un camino: en la frontera y en
          la cadena que se esta mirando. En los cuarenta y tantos cables a la
          vez eran cuarenta y tantos puntos que no apuntaban a nada. */}
      {conPunto && !atenuada && (
        <circle cx={x2} cy={y2} r={3} style={{ fill: color, fillOpacity: opacidad }} />
      )}

      {/* La descarga al aprobar: una sola pasada de luz por el cable, montada
          lo que dura y desmontada despues. Es la unica animacion de los
          cables, y solo existe cuando acabas de hacer algo. */}
      {descargando && (
        <path
          key={claveDescarga}
          d={d}
          fill="none"
          pathLength="100"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          className="descarga"
          style={{ stroke: 'var(--estado-aprobada)', strokeWidth: 3 }}
        />
      )}
    </g>
  )
}

// Todas sus props son valores simples, asi que el memo compara barato
export default memo(Arista)
