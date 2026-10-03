import { memo } from 'react'
import { NODO, TEXTO } from '../layout/constantes'
import { ASPECTO, idIcono } from '../theme/situacion'
import Texto, { GrupoTexto } from './Texto'

const SUAVE =
  'fill 280ms ease, stroke 280ms ease, stroke-opacity 280ms ease, stroke-width 160ms ease'

/* El icono de estado, arriba a la derecha: su borde derecho cae en el margen
   de la tarjeta y su centro a la altura del codigo. */
const LADO_ICONO = 17.5
const X_ICONO = NODO.ancho - NODO.padDer - LADO_ICONO
const Y_ICONO = 10.5

/**
 * La cara de una tarjeta de materia. La usan la materia obligatoria y la
 * casilla de electiva ya llena, que por eso se ven exactamente iguales.
 *
 *   0713632                      [icono]  codigo | estado
 *   Teoria de Sistemas                    nombre, protagonista
 *   ● 2 UC                                area en un punto y UC
 *
 * Dos voces que no se mezclan: la que nombra, en Jost fina, y la que mide o
 * se copia -codigo y UC-, en letra de maquina. El estado es un icono (ver
 * IconoSituacion): cada situacion tiene su silueta, asi que se reconoce de
 * lejos, cuando una palabra ya no se alcanzaria a leer. Y es un texto menos
 * por tarjeta, que es lo que mas cuesta maquetar.
 *
 * Va en dos piezas porque el mapa las dibuja en dos sitios: la FORMA en el
 * SVG y el TEXTO en HTML, encima (ver Texto). El texto de un SVG se vuelve a
 * maquetar cada vez que cambia la escala a la que se ve, y la capa del mapa
 * cambia de escala en cada cuadro de un zoom.
 */

/** Lo que se dibuja de la tarjeta: fondo, borde, sombra, icono y el punto del area */
export function FormaTarjeta({ situacion, acento, seleccionado, resaltado }) {
  const a = ASPECTO[situacion]
  const { ancho, alto, radio, padIzq } = NODO

  const borde = seleccionado || resaltado ? a.fuerte : a.borde
  const grosor = seleccionado ? a.grosor + 0.75 : a.grosor

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
      <rect y={2} width={ancho} height={alto} rx={radio} style={{ fill: a.sombra }} />

      <rect
        width={ancho}
        height={alto}
        rx={radio}
        style={{ fill: a.fondo, stroke: borde, strokeWidth: grosor, transition: SUAVE }}
      />

      {/* Un <use> y no las formas del icono: el dibujo vive una vez en el
          SVG del mapa (ver DefsGrafo) y cada tarjeta solo lo señala. Lo
          calado del icono toma el color del relleno de la tarjeta. */}
      <use
        href={`#${idIcono(situacion)}`}
        x={X_ICONO}
        y={Y_ICONO}
        width={LADO_ICONO}
        height={LADO_ICONO}
        style={{ color: a.icono, '--sobre': a.fondo }}
      />

      <circle cx={padIzq + 3} cy={alto - 16} r={3} fill={acento} />
    </>
  )
}

/**
 * Lo que se lee de la tarjeta, en la capa de texto del plano. Va colocado en
 * el sitio de la tarjeta; dentro, las mismas lineas base que tenia en el SVG.
 * Memoizado: todas sus props son valores simples o vienen fijas del layout.
 */
function TextoTarjetaSinMemo({ x, y, situacion, codigo, lineasNombre, uc }) {
  const a = ASPECTO[situacion]
  const { alto, padIzq } = NODO

  // El bloque del nombre se centra: 1, 2 o 3 lineas quedan equilibradas
  const primeraLinea = TEXTO.centroNombre - ((lineasNombre.length - 1) * TEXTO.altoLinea) / 2

  return (
    <GrupoTexto x={x} y={y}>
      <Texto
        x={padIzq}
        y={TEXTO.lineaSuperior}
        className="font-dato"
        style={{
          fontSize: TEXTO.codigo,
          color: 'var(--sit-codigo)',
          fontWeight: 'var(--peso-dato)',
          letterSpacing: '0.04em',
        }}
      >
        {codigo}
      </Texto>

      {lineasNombre.map((linea, i) => (
        <Texto
          key={i}
          x={padIzq}
          y={primeraLinea + i * TEXTO.altoLinea}
          style={{
            fontSize: TEXTO.nombre,
            color: a.nombre,
            fontWeight: 'var(--peso-nombre)',
            transition: 'color 280ms ease',
          }}
        >
          {linea}
        </Texto>
      ))}

      <Texto
        x={padIzq + 12}
        y={alto - 12.5}
        className="font-dato tabular-nums"
        style={{ fontSize: TEXTO.meta, color: 'var(--sit-codigo)', fontWeight: 'var(--peso-dato)' }}
      >
        {uc} UC
      </Texto>
    </GrupoTexto>
  )
}

export const TextoTarjeta = memo(TextoTarjetaSinMemo)
