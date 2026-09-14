import { Check, Lock } from 'lucide-react'
import { NODO, TEXTO } from '../layout/constantes'
import { SITUACION } from '../layout/situacion'
import { ASPECTO } from '../theme/situacion'

const SUAVE =
  'fill 280ms ease, stroke 280ms ease, stroke-opacity 280ms ease, stroke-width 160ms ease'

/**
 * La cara de una tarjeta de materia: lo que se DIBUJA, sin la interaccion.
 * La usan la materia obligatoria y la casilla de electiva ya llena, que por
 * eso se ven exactamente iguales -una electiva elegida es tu pensum, no una
 * cosa aparte-.
 *
 * Tres filas y nada mas:
 *
 *   0713463                     ✓      codigo, y a la derecha el sello
 *   Circuitos y Sistemas               nombre, protagonista
 *   ● 3 UC               Inscribible   area en un punto, UC y situacion
 *
 * Se fue la etiqueta con el nombre del area: la decia el color del punto y la
 * dice la ficha, y en la tarjeta era la cuarta cosa de colores compitiendo
 * por el mismo sitio. Se fueron tambien la barra vertical de acento, el
 * resplandor del aprobado y el borde discontinuo del bloqueado.
 */
function CaraTarjeta({ situacion, codigo, lineasNombre, uc, acento, seleccionado, resaltado }) {
  const a = ASPECTO[situacion]
  const { ancho, alto, radio } = NODO

  const opacidadBorde = seleccionado
    ? 1
    : resaltado
      ? Math.max(a.opacidadBorde, 0.62)
      : a.opacidadBorde
  const grosor = seleccionado ? a.grosor + 1 : a.grosor

  // El bloque del nombre se centra: 1, 2 o 3 lineas quedan equilibradas
  const primeraLinea =
    TEXTO.centroNombre - 2 - ((lineasNombre.length - 1) * TEXTO.altoLinea) / 2
  const lejana = situacion === SITUACION.LEJANA

  return (
    <>
      {/* Halo de la inscribible. UN rectangulo quieto, no un filtro ni una
          animacion: basta para que se despegue del resto a cualquier escala,
          incluida la del mapa entero en un telefono, donde el texto ya no se
          lee pero un contorno luminoso si. */}
      {(situacion === SITUACION.INSCRIBIBLE || seleccionado) && (
        <rect
          x={-4}
          y={-4}
          width={ancho + 8}
          height={alto + 8}
          rx={radio + 4}
          fill="none"
          style={{
            stroke: seleccionado ? a.borde : 'var(--tinta)',
            strokeOpacity: seleccionado ? 0.24 : 0.1,
            strokeWidth: 4,
            transition: SUAVE,
          }}
        />
      )}

      <rect
        width={ancho}
        height={alto}
        rx={radio}
        style={{
          fill: a.fondo,
          stroke: a.borde,
          strokeOpacity: opacidadBorde,
          strokeWidth: grosor,
          transition: SUAVE,
        }}
      />

      <text
        x={NODO.padIzq}
        y={24}
        fontSize={9.5}
        fill="var(--tinta-tenue)"
        fillOpacity={lejana ? 0.7 : 1}
        className="font-mono tracking-wide"
      >
        {codigo}
      </text>

      {situacion === SITUACION.HECHA && (
        <>
          <circle cx={ancho - 22} cy={20} r={8} fill="var(--estado-aprobada)" />
          <Check
            x={ancho - 27.5}
            y={14.5}
            width={11}
            height={11}
            color="var(--nodo)"
            strokeWidth={3.2}
          />
        </>
      )}
      {lejana && (
        <Lock
          x={ancho - 28}
          y={13}
          width={12}
          height={12}
          color="var(--tinta-tenue)"
          strokeWidth={2.2}
          opacity={0.7}
        />
      )}

      {lineasNombre.map((linea, i) => (
        <text
          key={i}
          x={NODO.padIzq}
          y={primeraLinea + i * TEXTO.altoLinea}
          fontSize={TEXTO.nombre}
          className="font-semibold"
          style={{ fill: a.nombre, transition: 'fill 280ms ease' }}
        >
          {linea}
        </text>
      ))}

      <circle
        cx={NODO.padIzq + 3}
        cy={alto - 15}
        r={3}
        fill={acento}
        fillOpacity={lejana ? 0.45 : 1}
      />
      <text
        x={NODO.padIzq + 11}
        y={alto - 11.5}
        fontSize={9.5}
        fill="var(--tinta-tenue)"
        className="font-mono tabular-nums"
      >
        {uc} UC
      </text>

      {a.etiqueta && (
        <Etiqueta {...a.etiqueta} x={ancho - 12 - a.etiqueta.ancho} y={alto - 26} />
      )}
    </>
  )
}

/** La pastilla de situacion, abajo a la derecha */
export function Etiqueta({ texto, ancho, fondo, tinta, contorno, x, y }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        width={ancho}
        height={17}
        rx={8.5}
        style={{
          fill: fondo,
          stroke: contorno ? 'var(--tinta)' : 'none',
          strokeOpacity: 0.26,
          strokeWidth: 1,
        }}
      />
      <text
        x={ancho / 2}
        y={12}
        textAnchor="middle"
        fontSize={9.5}
        className="font-semibold"
        style={{ fill: tinta }}
      >
        {texto}
      </text>
    </g>
  )
}

export default CaraTarjeta
