import { Check } from 'lucide-react'
import { ESTADO } from '../data/estados'
import { colorNodo } from '../theme/areas'
import { ETIQUETA_ESTADO } from '../theme/estados'

/** La misma frase la usan la ficha y la lista: vive aqui para que no deriven */
export const SIN_PRELACIONES = 'Nada: puedes verla desde el inicio.'

/**
 * Una materia dentro de una lista de prelaciones: su punto de color, su
 * nombre y en que estado la tienes.
 */
function Fila({ asignatura, estado }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: colorNodo(asignatura) }}
      />
      <span className="min-w-0 flex-1 truncate text-[11px] text-tinta-suave">
        {asignatura.nombre}
      </span>
      {estado === ESTADO.APROBADA ? (
        <Check size={12} className="shrink-0 text-aprobada" aria-label="Aprobada" />
      ) : (
        <span className="shrink-0 text-[9px] text-tinta-tenue">{ETIQUETA_ESTADO[estado]}</span>
      )}
    </li>
  )
}

/**
 * "Requiere (3)" o "Desbloquea (5)", con su lista debajo.
 *
 * Estaba escrito dos veces, en la ficha flotante del mapa y en la fila
 * desplegable de la lista, con el mismo punto de color, el mismo truncado y
 * hasta la misma frase para cuando no hay nada. Dos copias que habia que
 * acordarse de cambiar a la vez.
 *
 * Las dos diferian en el indicador de la derecha: la ficha recortaba el
 * estado a cuatro letras ("Curs", "Disp") y la lista ponia siempre
 * "pendiente", que no distingue entre estarla cursando y tenerla bloqueada.
 * Al unificar se queda la etiqueta completa, que cabe de sobra a 9px y dice
 * mas que las otras dos.
 *
 * No lleva margenes propios: los pone quien la coloca, porque la ficha y la
 * lista tienen ritmos distintos.
 */
function ListaPrelaciones({ titulo, materias, vacio }) {
  return (
    <>
      <p className="text-[10px] font-bold tracking-wider text-tinta-tenue uppercase">
        {titulo} ({materias.length})
      </p>
      {materias.length === 0 ? (
        // Sin mensaje no se pinta nada: hay sitios donde lo que sigue ya
        // explica el hueco, como el requisito especial del Trabajo de Grado
        vacio ? <p className="text-[11px] text-tinta-tenue">{vacio}</p> : null
      ) : (
        <ul className="mt-1 flex flex-col gap-1">
          {materias.map(({ asignatura, estado }) => (
            <Fila key={asignatura.codigo} asignatura={asignatura} estado={estado} />
          ))}
        </ul>
      )}
    </>
  )
}

export default ListaPrelaciones
