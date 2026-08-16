import { memo } from 'react'
import { NODO, ELECTIVAS, TEXTO } from '../layout/constantes'
import { ESTADO } from '../data/estados'
import { colorNodo } from '../theme/areas'
import { ICONO_ESTADO, colorBordeEstado } from '../theme/estados'
import { codigoVisible } from '../data/codigoVisible'

/**
 * Tarjeta compacta de la zona de electivas. Mas baja que la de una materia
 * obligatoria a proposito: son opcionales y no deben competir con la malla.
 */
// Recorta un nombre para la linea de requisito de la tarjeta compacta
const corto = (texto, max = 26) =>
  texto.length > max ? `${texto.slice(0, max - 1)}…` : texto

function NodoElectiva({
  nodo,
  estado,
  requisito,
  resaltado,
  atenuado,
  seleccionado,
  alHacerClick,
  alSenalar,
  alDejarDeSenalar,
}) {
  const { x, y, nombre, uc, lineasNombre } = nodo
  const acento = colorNodo(nodo)
  const aprobada = estado === ESTADO.APROBADA
  const cursando = estado === ESTADO.CURSANDO
  const bloqueada = estado === ESTADO.BLOQUEADA

  // La zona de electivas no lleva cables, asi que la dependencia se dice
  // con palabras: que te falta si esta bloqueada, o que es de libre acceso.
  const pie = bloqueada
    ? `Requiere ${corto(requisito ?? '…')}`
    : (nodo.prerrequisitos ?? []).length === 0
      ? 'Libre · sin requisitos'
      : aprobada || cursando
        ? `${codigoVisible(nodo)} · ${uc} UC`
        : 'Disponible · requisitos cumplidos'
  const colorPie = bloqueada
    ? 'var(--tinta-tenue)'
    : (nodo.prerrequisitos ?? []).length === 0 && !aprobada && !cursando
      ? 'var(--estado-aprobada)'
      : 'var(--tinta-tenue)'

  const colorBorde = colorBordeEstado(estado, acento)

  const Icono = ICONO_ESTADO[estado]

  return (
    <g
      transform={`translate(${x}, ${y})`}
      opacity={atenuado ? 0.14 : 1}
      onClick={() => alHacerClick(nodo.codigo)}
      onPointerEnter={() => alSenalar(nodo.codigo)}
      onPointerLeave={alDejarDeSenalar}
      className="grupo-nodo cursor-pointer"
      style={{ transition: 'opacity 320ms cubic-bezier(0.32, 0.72, 0, 1)' }}
    >
      <title>{`${codigoVisible(nodo)} — ${nombre} · ${uc} UC · ${estado}`}</title>

      <rect width={NODO.ancho} height={ELECTIVAS.alto} rx={10} fill="var(--nodo)" />
      <rect
        width={NODO.ancho}
        height={ELECTIVAS.alto}
        rx={10}
        fill={aprobada ? 'var(--estado-aprobada)' : acento}
        fillOpacity={aprobada ? 0.14 : resaltado ? 0.07 : 0}
        style={{ transition: 'fill-opacity 320ms cubic-bezier(0.32, 0.72, 0, 1)' }}
      />
      <rect
        width={NODO.ancho}
        height={ELECTIVAS.alto}
        rx={10}
        fill="none"
        stroke={colorBorde}
        strokeOpacity={bloqueada ? 0.35 : aprobada || cursando ? 1 : 0.6}
        strokeWidth={seleccionado ? 2.4 : aprobada || cursando ? 1.8 : 1.2}
        strokeDasharray={bloqueada ? '5 4' : undefined}
        style={{ transition: 'stroke 320ms ease, stroke-opacity 320ms ease' }}
      />

      <rect
        x={8}
        y={12}
        width={3}
        height={ELECTIVAS.alto - 24}
        rx={1.5}
        fill={acento}
        fillOpacity={bloqueada ? 0.45 : 1}
      />

      {lineasNombre.map((linea, i) => (
        <text
          key={i}
          x={NODO.padIzq}
          y={22 + i * 12}
          fontSize={TEXTO.meta + 1.5}
          fill="var(--tinta)"
          className="font-semibold"
        >
          {linea}
        </text>
      ))}

      <text
        x={NODO.padIzq}
        y={ELECTIVAS.alto - 10}
        fontSize={8.5}
        fill={colorPie}
        className="font-mono"
      >
        {pie}
      </text>

      {Icono && (
        <Icono
          x={NODO.ancho - NODO.padDer - 13}
          y={ELECTIVAS.alto - 22}
          width={13}
          height={13}
          color={bloqueada ? 'var(--tinta-tenue)' : colorBorde}
          strokeWidth={2.6}
        />
      )}
    </g>
  )
}

// Mismo motivo que NodoAsignatura: Sistemas trae 39 de estas.
export default memo(NodoElectiva)
