import { memo } from 'react'
import { NODO, TEXTO } from '../layout/constantes'

/**
 * La casilla de "aqui va una electiva que tu eliges".
 *
 * Ambiental es la unica carrera cuyo documento reserva sitio a las electivas
 * dentro de los semestres, en vez de dejarlas todas en una lista aparte. Esas
 * casillas no son materias: no tienen codigo propio -el documento repite un
 * comodin-, no se pueden aprobar y no cuentan para el avance. La materia de
 * verdad se marca en su grupo de electivas.
 *
 * Por eso no es un NodoAsignatura con una bandera: es otra cosa. Se dibuja
 * con el borde discontinuo que el mapa ya usa para "todavia no", sin relleno,
 * sin icono de estado y sin cursor de pulsar, para que a simple vista se lea
 * como un sitio vacio y no como una tarjeta apagada.
 */
function NodoHueco({ nodo, atenuado }) {
  const { x, y, nombre } = nodo

  return (
    <g
      transform={`translate(${x}, ${y})`}
      opacity={atenuado ? 0.14 : 1}
      style={{ transition: 'opacity 320ms cubic-bezier(0.32, 0.72, 0, 1)' }}
    >
      <title>{`${nombre} — casilla libre: elígela en la zona de electivas`}</title>

      <rect
        width={NODO.ancho}
        height={NODO.alto}
        rx={NODO.radio}
        fill="none"
        stroke="var(--tinta-tenue)"
        strokeOpacity="0.45"
        strokeWidth="1.25"
        strokeDasharray="5 4"
      />

      <text
        x={NODO.ancho / 2}
        y={TEXTO.centroNombre - 4}
        textAnchor="middle"
        fontSize={TEXTO.nombre}
        fill="var(--tinta-suave)"
        className="font-semibold"
      >
        {nombre}
      </text>
      <text
        x={NODO.ancho / 2}
        y={TEXTO.centroNombre + 14}
        textAnchor="middle"
        fontSize={TEXTO.meta}
        fill="var(--tinta-tenue)"
        className="font-mono"
      >
        elige una abajo
      </text>
    </g>
  )
}

export default memo(NodoHueco)
