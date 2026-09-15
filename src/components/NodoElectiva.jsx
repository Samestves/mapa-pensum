import { memo } from 'react'
import { Check } from 'lucide-react'
import { NODO, ELECTIVAS, TEXTO } from '../layout/constantes'
import { SITUACION } from '../layout/situacion'
import { colorNodo } from '../theme/areas'
import { ASPECTO, ETIQUETA_SITUACION } from '../theme/situacion'
import { codigoVisible } from '../data/codigoVisible'
import { Etiqueta } from './CaraTarjeta'

// Recorta un nombre para la linea de requisito de la tarjeta compacta
const corto = (texto, max = 24) => (texto.length > max ? `${texto.slice(0, max - 1)}…` : texto)

/**
 * Tarjeta compacta de la zona de electivas. Mas baja que la de una materia
 * obligatoria a proposito: son opcionales y no deben competir con la malla.
 *
 * Habla el mismo idioma que la tarjeta grande -mismo fondo, mismo borde y
 * misma pastilla por situacion-, porque es la misma pregunta: puedo meterla o
 * no. Lo unico propio es el pie. Esta zona no lleva cables, asi que lo que te
 * falta se dice con palabras.
 */
function NodoElectiva({
  nodo,
  situacion,
  requisito,
  resaltado,
  atenuado,
  seleccionado,
  alHacerClick,
  alSenalar,
  alDejarDeSenalar,
}) {
  const { x, y, nombre, uc, lineasNombre } = nodo
  const a = ASPECTO[situacion]
  const alto = ELECTIVAS.alto
  const libre = (nodo.prerrequisitos ?? []).length === 0

  const pie =
    situacion === SITUACION.LEJANA || situacion === SITUACION.PROXIMA
      ? `Requiere ${corto(requisito ?? '…')}`
      : libre
        ? `${uc} UC · sin requisitos`
        : `${uc} UC`

  const opacidadBorde = seleccionado ? 1 : resaltado ? Math.max(a.opacidadBorde, 0.62) : a.opacidadBorde

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
      <title>{`${codigoVisible(nodo)} — ${nombre} · ${uc} UC · ${ETIQUETA_SITUACION[situacion]}`}</title>

      {a.brilla && (
        <rect
          x={-3}
          y={-3}
          width={NODO.ancho + 6}
          height={alto + 6}
          rx={14}
          fill="none"
          style={{ stroke: a.borde, strokeOpacity: 0.14, strokeWidth: 3 }}
        />
      )}
      <rect
        width={NODO.ancho}
        height={alto}
        rx={11}
        style={{
          fill: a.fondo,
          stroke: a.borde,
          strokeOpacity: opacidadBorde,
          strokeWidth: seleccionado ? a.grosor + 1 : a.grosor,
          transition: 'fill 280ms ease, stroke 280ms ease, stroke-opacity 280ms ease',
        }}
      />

      {lineasNombre.map((linea, i) => (
        <text
          key={i}
          x={14}
          y={21 + i * 12}
          fontSize={TEXTO.meta + 1.5}
          className="font-semibold"
          style={{ fill: a.nombre }}
        >
          {linea}
        </text>
      ))}

      <circle cx={17} cy={alto - 13} r={2.5} fill={colorNodo(nodo)} />
      <text x={24} y={alto - 10} fontSize={8.5} fill="var(--tinta-tenue)" className="font-mono">
        {pie}
      </text>

      {situacion === SITUACION.HECHA && (
        <Check
          x={NODO.ancho - 24}
          y={alto - 23}
          width={12}
          height={12}
          color="var(--estado-aprobada)"
          strokeWidth={2.8}
        />
      )}
      {a.etiqueta && situacion !== SITUACION.PROXIMA && (
        <Etiqueta {...a.etiqueta} x={NODO.ancho - 10 - a.etiqueta.ancho} y={alto - 25} />
      )}
    </g>
  )
}

// Mismo motivo que NodoAsignatura: Sistemas trae 39 de estas.
export default memo(NodoElectiva)
