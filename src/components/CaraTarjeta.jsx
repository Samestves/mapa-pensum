import { ICONO, NODO, TEXTO } from '../layout/constantes'
import { ASPECTO } from '../theme/situacion'

const SUAVE =
  'fill 280ms ease, stroke 280ms ease, stroke-opacity 280ms ease, stroke-width 160ms ease'

/**
 * La cara de una tarjeta de materia: lo que se DIBUJA, sin la interaccion.
 * La usan la materia obligatoria y la casilla de electiva ya llena, que por
 * eso se ven exactamente iguales.
 *
 *   0713632                DISPONIBLE     codigo | estado
 *   Teoria de Sistemas                    nombre, protagonista
 *   ● 2 UC                                area en un punto y UC
 *
 * Dos voces que no se mezclan: la que nombra, en Jost fina, y la que mide o
 * se copia -codigo y UC-, en letra de maquina. El estado es una sola palabra
 * en mayusculas muy espaciadas, sin icono ni pastilla: a ese tamaño y con ese
 * aire se lee como un rotulo, y el color del borde ya dice lo mismo desde
 * lejos, cuando la palabra ya no se alcanza a leer.
 *
 * El filo con degradado de la disponible y su halo quieto se fueron. Eran luz
 * puesta encima; ahora la disponible es simplemente la de borde mas claro, y
 * lo unico que brilla en el mapa es lo que acaba de cambiar.
 */
function CaraTarjeta({
  situacion,
  codigo,
  lineasNombre,
  uc,
  acento,
  icono,
  seleccionado,
  resaltado,
}) {
  const a = ASPECTO[situacion]
  const { ancho, alto, radio, padIzq, padDer } = NODO

  const borde = seleccionado || resaltado ? a.fuerte : a.borde
  const grosor = seleccionado ? a.grosor + 0.75 : a.grosor

  // El bloque del nombre se centra: 1, 2 o 3 lineas quedan equilibradas
  const primeraLinea = TEXTO.centroNombre - ((lineasNombre.length - 1) * TEXTO.altoLinea) / 2

  /* El espaciado de las mayusculas se añade tambien detras de la ultima
     letra: sin esta correccion la palabra quedaba despegada del borde
     derecho, mas adentro que el codigo del izquierdo. */
  const espaciadoRotulo = 0.22
  const xRotulo = ancho - padDer + TEXTO.rotulo * espaciadoRotulo

  return (
    <>
      {/* Solo la seleccionada lleva aura: es la unica que necesita
          separarse del resto. */}
      {seleccionado && (
        <rect
          x={-4}
          y={-4}
          width={ancho + 8}
          height={alto + 8}
          rx={radio + 4}
          fill="none"
          style={{ stroke: a.fuerte, strokeOpacity: 0.3, strokeWidth: 2, transition: SUAVE }}
        />
      )}

      {/* Sombra de papel, solo en claro: en oscuro la variable es
          transparente. Un rectangulo corrido y no un filtro, que costaria un
          repintado por cuadro al mover el mapa. */}
      <rect
        y={2}
        width={ancho}
        height={alto}
        rx={radio}
        style={{ fill: 'var(--sombra-tarjeta)' }}
      />

      <rect
        width={ancho}
        height={alto}
        rx={radio}
        style={{ fill: a.fondo, stroke: borde, strokeWidth: grosor, transition: SUAVE }}
      />

      {/* El icono de la materia, en el color de su area y muy tenue, debajo
          de todo el texto. Lo corta su propia caja, que acaba en el borde de
          la tarjeta (ver IconosMaterias). */}
      {icono && (
        <use
          href={`#icono-${icono}`}
          x={ancho - ICONO.ancho}
          y={alto - ICONO.alto}
          width={ICONO.ancho}
          height={ICONO.alto}
          className="icono-materia"
          style={{ color: acento, opacity: a.icono }}
        />
      )}

      <text
        x={padIzq}
        y={TEXTO.lineaSuperior}
        fontSize={TEXTO.codigo}
        fill="var(--sit-codigo)"
        className="font-dato"
        style={{ fontWeight: 'var(--peso-dato)', letterSpacing: '0.04em' }}
      >
        {codigo}
      </text>

      {a.marca.texto && (
        <text
          x={xRotulo}
          y={TEXTO.lineaSuperior}
          textAnchor="end"
          fontSize={TEXTO.rotulo}
          style={{
            fill: a.marca.color,
            fontWeight: 'var(--peso-rotulo)',
            letterSpacing: `${espaciadoRotulo}em`,
            transition: 'fill 280ms ease',
          }}
        >
          {a.marca.texto.toUpperCase()}
        </text>
      )}

      {lineasNombre.map((linea, i) => (
        <text
          key={i}
          x={padIzq}
          y={primeraLinea + i * TEXTO.altoLinea}
          fontSize={TEXTO.nombre}
          style={{
            fill: a.nombre,
            fontWeight: 'var(--peso-nombre)',
            transition: 'fill 280ms ease',
          }}
        >
          {linea}
        </text>
      ))}

      <circle cx={padIzq + 3} cy={alto - 16} r={3} fill={acento} />
      <text
        x={padIzq + 12}
        y={alto - 12.5}
        fontSize={TEXTO.meta}
        fill="var(--sit-codigo)"
        className="font-dato tabular-nums"
        style={{ fontWeight: 'var(--peso-dato)' }}
      >
        {uc} UC
      </text>
    </>
  )
}

export default CaraTarjeta
