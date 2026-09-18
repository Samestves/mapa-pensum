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
 * punteado. Se lee de un vistazo cual de las prelaciones ya esta y cual
 * falta, sin tener que leer ninguna etiqueta.
 */
function Fila({ asignatura, situacion, codigo }) {
  const hecha = situacion === SITUACION.HECHA
  return (
    <li className="flex items-center gap-2.5 py-[5px]">
      <IconoSituacion
        situacion={situacion}
        color={colorDe(situacion)}
        size={13}
        className="shrink-0"
      />
      <span
        className={`min-w-0 flex-1 truncate text-[13px] ${hecha ? 'text-tinta-suave' : 'text-tinta'}`}
        style={{ fontWeight: 380 }}
      >
        {asignatura.nombre}
      </span>
      <span className="shrink-0 font-dato text-[10px] font-light tracking-[0.04em] text-tinta-tenue">
        {codigo}
      </span>
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
function ListaPrelaciones({ titulo, materias, vacio, situacionDe, codigoDe }) {
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
        <ul className="mt-1 flex flex-col">
          {materias.map(({ asignatura }) => (
            <Fila
              key={asignatura.codigo}
              asignatura={asignatura}
              situacion={situacionDe(asignatura.codigo)}
              codigo={codigoDe(asignatura)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

export default ListaPrelaciones
