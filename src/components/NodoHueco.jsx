import { memo } from 'react'
import { Plus } from 'lucide-react'
import { NODO, TEXTO } from '../layout/constantes'
import { ESTADO } from '../data/estados'
import { colorNodo } from '../theme/areas'
import { ICONO_ESTADO, colorBordeEstado } from '../theme/estados'
import { codigoVisible } from '../data/codigoVisible'

/**
 * La casilla de electiva: el sitio que el pensum reserva para una materia que
 * eliges tu.
 *
 * El diagrama oficial de la UDO no deja las electivas en una lista al final.
 * Les reserva hueco dentro de semestres concretos -en Sistemas, tres
 * sociohumanisticas en el 2, 3 y 4, y cinco tecnicas en el 7, 8 y 9-, porque
 * esa es la ruta que la universidad considera optima. Un mapa que las amontona
 * todas abajo pierde ese dato, que es de los pocos que el estudiante no puede
 * deducir por su cuenta.
 *
 * Tiene dos estados, y son dos cosas distintas de leer:
 *
 *   VACIA   un sitio que te falta por decidir. Borde discontinuo, un mas bien
 *           visible y el nombre del grupo. Invita a pulsar.
 *   LLENA   la electiva que pusiste, dibujada como cualquier otra materia:
 *           codigo, nombre, UC y estado. Deja de ser un hueco.
 *
 * Que la llena se parezca a una tarjeta normal es el punto. Una vez elegida,
 * esa materia ES tu pensum: se aprueba, cuenta UC y se cursa igual que las
 * obligatorias, asi que dibujarla distinta la dejaria en un limbo visual que
 * no corresponde a nada real.
 */
function NodoHueco({ nodo, electiva, estado, atenuado, seleccionado, alAbrir }) {
  const { x, y, nombre } = nodo
  const vacia = electiva == null

  const acento = electiva ? colorNodo(electiva) : 'var(--tinta-tenue)'
  const colorBorde = electiva ? colorBordeEstado(estado, acento) : acento
  const Icono = electiva ? ICONO_ESTADO[estado] : null
  const aprobada = estado === ESTADO.APROBADA
  const bloqueada = estado === ESTADO.BLOQUEADA

  const primeraLinea = electiva
    ? TEXTO.centroNombre - ((electiva.lineasNombre.length - 1) * TEXTO.altoLinea) / 2
    : 0

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={() => alAbrir(nodo.codigo)}
      className="grupo-casilla cursor-pointer"
      opacity={atenuado ? 0.14 : 1}
      style={{ transition: 'opacity 320ms cubic-bezier(0.32, 0.72, 0, 1)' }}
    >
      <title>
        {vacia
          ? `${nombre} — casilla libre: pulsa para elegir una`
          : `${codigoVisible(electiva)} — ${electiva.nombre} · ${electiva.uc} UC · ${estado}`}
      </title>

      <rect width={NODO.ancho} height={NODO.alto} rx={NODO.radio} fill="var(--nodo)" />

      {!vacia && (
        <rect
          width={NODO.ancho}
          height={NODO.alto}
          rx={NODO.radio}
          fill={aprobada ? 'var(--estado-aprobada)' : acento}
          fillOpacity={aprobada ? 0.2 : bloqueada ? 0 : 0.08}
          style={{ transition: 'fill-opacity 300ms ease' }}
        />
      )}

      {/* El borde. Discontinuo mientras esta vacia -es el unico sitio del mapa
          donde ese trazo significa "aqui todavia no hay nada"- y entero en
          cuanto tiene materia, que es cuando deja de ser un hueco. */}
      <rect
        width={NODO.ancho}
        height={NODO.alto}
        rx={NODO.radio}
        fill="none"
        stroke={colorBorde}
        strokeOpacity={vacia ? 0.5 : bloqueada ? 0.4 : 1}
        strokeWidth={seleccionado ? 2.6 : vacia ? 1.5 : bloqueada ? 1.25 : 1.8}
        strokeDasharray={vacia ? '5 4' : undefined}
        style={{ transition: 'stroke 300ms ease, stroke-width 160ms ease' }}
      />

      {vacia ? (
        <>
          {/* El mas, dentro de un circulo, centrado. Es el gesto universal de
              "aqui se agrega algo" y se reconoce sin leer, que es lo que hace
              falta a la escala en la que se ve el mapa entero. */}
          <circle
            className="mas-casilla"
            cx={NODO.ancho / 2}
            cy={38}
            r={13}
            fill={acento}
            fillOpacity={0.1}
            stroke={acento}
            strokeOpacity={0.35}
            strokeWidth={1.25}
          />
          <Plus
            x={NODO.ancho / 2 - 7}
            y={31}
            width={14}
            height={14}
            color="var(--tinta-suave)"
            strokeWidth={2.4}
            aria-hidden="true"
          />
          <text
            x={NODO.ancho / 2}
            y={68}
            textAnchor="middle"
            fontSize={TEXTO.nombre}
            fill="var(--tinta-suave)"
            className="font-semibold"
          >
            {nombre}
          </text>
          <text
            x={NODO.ancho / 2}
            y={83}
            textAnchor="middle"
            fontSize={TEXTO.meta}
            fill="var(--tinta-tenue)"
            className="font-mono"
          >
            elige una
          </text>
        </>
      ) : (
        <>
          <rect
            x={NODO.barra.x}
            y={NODO.barra.y}
            width={NODO.barra.ancho}
            height={NODO.barra.alto}
            rx={NODO.barra.ancho / 2}
            fill={acento}
            fillOpacity={bloqueada ? 0.4 : 1}
          />

          <text
            x={NODO.padIzq}
            y={26}
            fontSize={TEXTO.codigo}
            fill="var(--tinta-tenue)"
            className="font-mono tracking-wider"
          >
            {codigoVisible(electiva)}
          </text>

          {electiva.lineasNombre.map((linea, i) => (
            <text
              key={i}
              x={NODO.padIzq}
              y={primeraLinea + i * TEXTO.altoLinea}
              fontSize={TEXTO.nombre}
              fill="var(--tinta)"
              className="font-semibold"
            >
              {linea}
            </text>
          ))}

          <text
            x={NODO.padIzq}
            y={86}
            fontSize={TEXTO.meta}
            fill="var(--tinta-tenue)"
            className="font-mono"
          >
            {electiva.uc} UC
          </text>

          {Icono && (
            <Icono
              x={NODO.ancho - NODO.padDer - 15}
              y={13}
              width={15}
              height={15}
              color={bloqueada ? 'var(--tinta-tenue)' : colorBorde}
              strokeWidth={2.6}
            />
          )}
        </>
      )}
    </g>
  )
}

export default memo(NodoHueco)
