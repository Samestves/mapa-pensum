import { SITUACION } from '../layout/situacion'
import { ASPECTO } from '../theme/situacion'
import { IconoSituacion } from './IconoSituacion'

/** La frase para cuando no hay nada que pedir */
export const SIN_PRELACIONES = 'Nada: puedes verla desde el inicio.'

/* El color del icono de cada fila. La lejana no tiene color de estado -es la
   mayoria y la que menos importa-, asi que va en tinta apagada. */
const colorDe = (situacion) =>
  situacion === SITUACION.LEJANA ? 'var(--tinta-tenue)' : ASPECTO[situacion].marca.color

/**
 * Una materia dentro de la lista: el icono de su estado, su nombre y su
 * codigo en letra de maquina. El mismo icono que la tarjeta del mapa tendria
 * si la palabra no cupiera: aro lleno con check, a medias, con punto o
 * candado. Se lee de un vistazo cual de las prelaciones ya esta y cual
 * falta, sin tener que leer ninguna etiqueta.
 *
 * Si la materia esta dibujada en el mapa, la fila es un boton que lleva a
 * ella. Al pasar por encima entra desde la izquierda una raya fina, el mismo
 * resalte de los menus de la maqueta: dice "esto se elige" sin caja ni flecha.
 */
function Fila({ asignatura, situacion, codigo, alIr, holgada }) {
  const hecha = situacion === SITUACION.HECHA
  const contenido = (
    <>
      <IconoSituacion
        situacion={situacion}
        color={colorDe(situacion)}
        size={holgada ? 15 : 13}
        className="shrink-0"
      />
      <span
        className={`min-w-0 flex-1 truncate ${holgada ? 'text-[14.5px]' : 'text-[13.5px]'} ${hecha ? 'text-tinta-suave' : 'text-tinta'}`}
        style={{ fontWeight: 'var(--peso-nombre)' }}
      >
        {asignatura.nombre}
      </span>
      <span className="shrink-0 font-dato text-[10px] font-light tracking-[0.04em] text-tinta-tenue">
        {codigo}
      </span>
    </>
  )

  if (!alIr) {
    return (
      <li className={`flex items-center gap-3 ${holgada ? 'py-[10px]' : 'py-[7px]'}`}>
        {contenido}
      </li>
    )
  }
  return (
    <li>
      <button
        type="button"
        onClick={alIr}
        aria-label={`Ir a ${asignatura.nombre}`}
        className={`fila-prelacion group relative -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-[8px] px-2 text-left transition-colors hover:bg-panel-suave active:bg-panel-suave ${
          holgada ? 'py-[10px]' : 'py-[7px]'
        }`}
      >
        {contenido}
      </button>
    </li>
  )
}

/**
 * «REQUIERE · 2» o «DESBLOQUEA · 3», con su lista debajo.
 *
 * El titulo va en mayusculas espaciadas y la cuenta en letra de maquina: la
 * misma rejilla de voces que la tarjeta del mapa. No lleva margenes propios:
 * los pone quien la coloca.
 *
 * `situacionDe` viene de fuera porque el estado de cada materia relacionada
 * -en particular si una bloqueada se abre el semestre que viene o todavia no-
 * depende de sus propias prelaciones, y eso ya lo tiene calculado el mapa.
 */
function ListaPrelaciones({
  titulo,
  materias,
  vacio,
  situacionDe,
  codigoDe,
  alIrA,
  puedeIr,
  holgada,
}) {
  return (
    <div>
      <p className="flex items-baseline gap-2 font-ui text-[9.5px] font-medium tracking-[0.24em] text-tinta-tenue uppercase">
        {titulo}
        <span className="font-dato text-[10px] font-light tracking-normal">{materias.length}</span>
      </p>
      {materias.length === 0 ? (
        // Sin mensaje no se pinta nada: hay sitios donde lo que sigue ya
        // explica el hueco, como el requisito especial del Trabajo de Grado
        vacio ? (
          <p className="mt-1.5 text-[12.5px] text-tinta-tenue">{vacio}</p>
        ) : null
      ) : (
        <ul className="mt-1.5 flex flex-col">
          {materias.map(({ asignatura }) => (
            <Fila
              key={asignatura.codigo}
              asignatura={asignatura}
              situacion={situacionDe(asignatura.codigo)}
              codigo={codigoDe(asignatura)}
              holgada={holgada}
              alIr={alIrA && puedeIr?.(asignatura.codigo) ? () => alIrA(asignatura.codigo) : null}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

export default ListaPrelaciones
