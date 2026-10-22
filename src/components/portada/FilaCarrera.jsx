import { ChevronRight } from 'lucide-react'
import MiniMapa from '../MiniMapa'

/**
 * Una carrera en la lista: su silueta, su nombre y de que tamaño es.
 *
 * Un solo nombre, el oficial. Antes iban el corto y debajo el largo en
 * mayusculas, que era decir lo mismo dos veces, y el largo se cortaba. La
 * flecha es la de "seguir", no la de "abrir otra pagina": se entra aqui.
 *
 * Al tocarla abre su ficha (ver FichaCarrera); el pensum se empieza a bajar
 * en cuanto el dedo la toca, asi que al pulsar "Abrir el mapa" ya esta.
 */
function FilaCarrera({ carrera, color, hechas, alElegir, alPrecargar }) {
  return (
    <button
      type="button"
      onClick={() => alElegir(carrera.slug)}
      onPointerDown={() => alPrecargar(carrera.slug)}
      onFocus={() => alPrecargar(carrera.slug)}
      className="fila-carrera"
      style={{ '--acento': color }}
    >
      <span className="fila-silueta">
        <MiniMapa silueta={carrera.silueta} color={color} hechas={hechas} className="size-full" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-ui text-[17px] leading-tight text-tinta">{carrera.nombre}</span>
        <span className="mt-1 block text-[13px] text-tinta-tenue">
          {carrera.semestres} semestres · {carrera.asignaturas} materias
        </span>
      </span>
      <ChevronRight size={18} strokeWidth={1.75} className="shrink-0 text-tinta-tenue" />
    </button>
  )
}

export default FilaCarrera
