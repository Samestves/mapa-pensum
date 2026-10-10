import { memo, useState } from 'react'
import { Lock, LockOpen } from 'lucide-react'
import { ESTADO } from '../../data/estados'
import { bloqueada } from '../../layout/filtrosLista'
import { useEstados } from '../../hooks/useAvance'
import { SITUACION } from '../../layout/situacion'
import { IconoSituacion } from '../IconoSituacion'
import Camino from './Camino'
import Selector from './Selector'
import { colorSituacion } from './aspecto'

/**
 * Lo que el desplegable de una fila cuenta del camino: lo que le falta si esta
 * cerrada, o lo que desbloquea. Es lo unico de la fila que mira los estados de
 * todas las demas, y por eso vive aparte: la fila no los lee, y este se monta
 * la primera vez que se abre (ver FilaMateria).
 */
function CaminoDeLaFila({ cerrada, aprobada, desbloquea, previas, alIr }) {
  const estados = useEstados()
  const faltan = previas.filter((a) => estados[a.codigo] !== ESTADO.APROBADA)

  if (cerrada && faltan.length > 0) {
    return (
      <Camino
        icono={Lock}
        rotulo="Le falta"
        color="var(--estado-cursando)"
        materias={faltan}
        alIr={alIr}
      />
    )
  }
  if (desbloquea.length > 0) {
    return (
      <Camino
        icono={LockOpen}
        rotulo={aprobada ? 'Desbloqueó' : 'Desbloquea'}
        color="var(--sit-inscribible-luz)"
        materias={desbloquea}
        alIr={alIr}
      />
    )
  }
  return null
}

/**
 * Una materia: su icono de estado -que es tambien el boton de aprobarla de un
 * toque- y su nombre. Nada mas en reposo.
 *
 * Lo demas lo cuenta la forma y no el texto. A la derecha, si abre algo, una
 * flecha con cuantas: es el dato que decide que inscribir primero. Y cuando
 * miras una materia, la lista entera se ordena alrededor de ella: lo que
 * desbloquea se marca con una linea de luz, lo que le falta con una ambar, y
 * el resto se apaga. Es la cadena del mapa, contada en vertical.
 */
export default memo(function FilaMateria({
  nodo,
  estado,
  situacion,
  relaciones,
  porCodigo,
  abierta,
  enfoque,
  tocada,
  claveToque,
  recienAbierta,
  claveDescarga,
  alMarcar,
  alAlternar,
  alIr,
}) {
  const aprobada = estado === ESTADO.APROBADA

  const desbloquea = (relaciones.adelante.get(nodo.codigo) ?? [])
    .map((c) => porCodigo.get(c))
    .filter(Boolean)
  const previas = (relaciones.atras.get(nodo.codigo) ?? [])
    .map((c) => porCodigo.get(c))
    .filter(Boolean)
  const cerrada = bloqueada(situacion)

  /* El camino se monta la primera vez que se abre la fila y ya no se quita:
     sesenta filas cerradas no tienen por que mirar los estados de las demas,
     y al plegarse el panel necesita seguir teniendo contenido. */
  const [yaAbierta, setYaAbierta] = useState(abierta)
  if (abierta && !yaAbierta) setYaAbierta(true)

  const colorNombre = aprobada
    ? 'var(--tinta-suave)'
    : situacion === SITUACION.LEJANA
      ? 'var(--tinta-tenue)'
      : 'var(--tinta)'

  return (
    <li
      id={`fila-${nodo.codigo}`}
      data-enfoque={enfoque ?? undefined}
      className="fila-lista relative scroll-mt-[var(--margen-seccion)]"
    >
      {/* La linea de la cadena: luz en lo que abre la materia que miras,
          ambar en lo que le falta. Crece desde el centro al aparecer. */}
      {(enfoque === 'abre' || enfoque === 'requiere') && (
        <span
          aria-hidden="true"
          className="marca-cadena absolute inset-y-2.5 left-0 w-[2.5px] rounded-full"
          style={{
            backgroundColor:
              enfoque === 'abre' ? 'var(--sit-inscribible-luz)' : 'var(--estado-cursando)',
          }}
        />
      )}
      {recienAbierta && (
        <span
          key={claveDescarga}
          aria-hidden="true"
          className="fila-destello pointer-events-none absolute inset-0"
        />
      )}

      <div className="relative flex items-center pr-4">
        <button
          type="button"
          onClick={() => alMarcar(nodo.codigo, aprobada ? null : ESTADO.APROBADA)}
          aria-label={aprobada ? `Desmarcar ${nodo.nombre}` : `Marcar ${nodo.nombre} como aprobada`}
          className="grid size-12 shrink-0 place-items-center"
        >
          <span
            key={tocada ? claveToque : 'quieto'}
            className={tocada ? 'marca-pulso grid' : 'grid'}
          >
            <IconoSituacion situacion={situacion} color={colorSituacion(situacion)} size={18} />
          </span>
        </button>

        <button
          type="button"
          onClick={() => alAlternar(nodo.codigo)}
          aria-expanded={abierta}
          className="flex min-w-0 flex-1 items-center gap-3 py-3.5 text-left"
        >
          <span
            className="min-w-0 flex-1 truncate text-[15px] leading-snug tracking-[-0.01em] transition-colors duration-300"
            style={{ color: colorNombre }}
          >
            {nodo.nombre}
          </span>
          {!aprobada && desbloquea.length > 0 && (
            <span
              className="flex shrink-0 items-center gap-0.5 text-[12px] text-tinta-tenue tabular-nums"
              title={`Desbloquea ${desbloquea.length}`}
              aria-label={`desbloquea ${desbloquea.length}`}
            >
              <LockOpen size={11} strokeWidth={1.75} className="mr-0.5" />
              {desbloquea.length}
            </span>
          )}
        </button>
      </div>

      <div className="plegable" data-abierto={abierta}>
        <div>
          <div className="flex flex-col gap-3 pr-4 pb-4 pl-12">
            <Selector estado={estado} alElegir={(marca) => alMarcar(nodo.codigo, marca)} />
            {/* La key rearranca la entrada de las pastillas cada vez que se
                abre la fila: el panel esta siempre montado para plegarse
                suave, y sin esto solo animarian la primera vez. */}
            <div key={abierta ? 'abierta' : 'cerrada'}>
              {yaAbierta && (
                <CaminoDeLaFila
                  cerrada={cerrada}
                  aprobada={aprobada}
                  desbloquea={desbloquea}
                  previas={previas}
                  alIr={alIr}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  )
})
