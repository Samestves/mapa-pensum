import { memo } from 'react'
import { NODO, ELECTIVAS, TEXTO } from '../layout/constantes'
import { ESTADO } from '../data/estados'
import { pielDe } from '../theme/superficie'
import { iconoDeMateria } from '../theme/iconosMateria'
import CaraNodo from './CaraNodo'
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

  const piel = pielDe(estado)
  const Icono = piel.sello ?? iconoDeMateria(nombre)

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

      {/* La misma cara que una materia obligatoria, con su alto. Que compartan
          tratamiento es el punto: una electiva que elegiste ES tu pensum -se
          aprueba, cuenta UC y se cursa igual-, asi que dibujarla con otro
          lenguaje la dejaria en un limbo visual que no corresponde a nada. */}
      <CaraNodo
        alto={ELECTIVAS.alto}
        radio={12}
        piel={piel}
        resaltado={resaltado}
        seleccionado={seleccionado}
      />

      {lineasNombre.map((linea, i) => (
        <text
          key={i}
          x={NODO.padIzq}
          y={22 + i * 12}
          fontSize={TEXTO.meta + 1.5}
          fill="var(--tinta)"
          fillOpacity={piel.texto}
          className="detalle-nodo font-bold"
        >
          {linea}
        </text>
      ))}

      <text
        x={NODO.padIzq}
        y={ELECTIVAS.alto - 10}
        fontSize={9}
        fill={colorPie}
        fillOpacity={piel.dato}
        className="detalle-nodo tabular-nums"
      >
        {pie}
      </text>

      {Icono && (
        <Icono
          className="detalle-nodo"
          x={NODO.ancho - NODO.padDer - 13}
          y={ELECTIVAS.alto - 22}
          width={13}
          height={13}
          color="var(--tinta)"
          opacity={piel.icono}
          strokeWidth={2}
        />
      )}
    </g>
  )
}

// Mismo motivo que NodoAsignatura: Sistemas trae 39 de estas.
export default memo(NodoElectiva)
