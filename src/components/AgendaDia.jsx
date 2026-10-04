import { MoreHorizontal, Plus } from 'lucide-react'
import {
  ABRE,
  MIN_DURACION,
  agendaDe,
  duracion,
  enDoceHoras,
  franjaNueva,
  franjaPropuesta,
  partesDeHora,
  trozosDeLugar,
} from '../layout/horario'
import Trozos, { Entero } from './Trozos'

/* Lo que se propone si el dia esta lleno de punta a punta: la ficha se abre
   igual y es ella la que dice que no cabe. */
const PRIMERA_HORA = { inicio: ABRE, fin: ABRE + 60 }

const PASADA = 'pasada'
const EN_CURSO = 'curso'

/* En que punto esta una clase respecto a la hora que es. Solo tiene sentido
   en la lista de hoy: `minuto` es null en la de cualquier otro dia. */
function momentoDeFila(sesion, minuto) {
  if (minuto == null || minuto < sesion.inicio) return null
  return minuto < sesion.fin ? EN_CURSO : PASADA
}

/**
 * Una clase en la lista: de cuando a cuando, y que es.
 *
 * La hora de entrada y la de salida van una arriba y otra abajo, y entre las
 * dos el riel de la clase, que sale de un punto y llega a un anillo: lo que
 * une dos horas se dibuja como lo que es, un tramo.
 *
 * Tocarla abre su ficha. Los tres puntos son un boton aparte, y por eso no
 * van dentro del otro: un boton dentro de un boton no existe.
 */
function FilaClase({ sesion, aspecto, minuto, conAncla, menuAbierto, alEditar, alAbrirMenu }) {
  const entrada = partesDeHora(sesion.inicio)
  const salida = partesDeHora(sesion.fin)
  const momento = momentoDeFila(sesion, minuto)
  const enCurso = momento === EN_CURSO
  const lugar = trozosDeLugar(sesion)

  return (
    <article
      id={conAncla ? `clase-${sesion.id}` : undefined}
      className="fila-clase"
      data-momento={momento ?? undefined}
      style={{
        '--c': aspecto.color,
        '--avance': enCurso ? (minuto - sesion.inicio) / (sesion.fin - sesion.inicio) : undefined,
      }}
    >
      <button type="button" className="fila-toque" onClick={() => alEditar(sesion)}>
        <span className="fila-hora">
          <span className="hora-entrada font-ui">{entrada.hora}</span>
          <span className="meridiano font-ui">{entrada.meridiano}</span>
          <span className="hora-salida">{salida.hora}</span>
          <span className="meridiano font-ui">
            {salida.meridiano !== entrada.meridiano && salida.meridiano}
          </span>
        </span>

        <span className="riel" aria-hidden="true">
          <i />
        </span>

        <span className="flex min-w-0 flex-col gap-[3px] pb-px">
          <span className="fila-nombre text-[15.5px] leading-[1.3] font-medium tracking-[-0.012em] text-balance text-tinta">
            {aspecto.nombre}
          </span>
          {lugar.length > 0 && (
            <span className="text-[13px] leading-snug text-tinta-suave">
              <Trozos>
                {lugar.map((trozo) => (
                  <Entero key={trozo}>{trozo}</Entero>
                ))}
              </Trozos>
            </span>
          )}
          <span className="text-[12px] leading-snug text-tinta-tenue tabular-nums">
            {enCurso
              ? `En curso · quedan ${duracion(sesion.fin - minuto)}`
              : duracion(sesion.fin - sesion.inicio)}
          </span>
        </span>
      </button>

      <button
        type="button"
        className="fila-mas"
        aria-label={`Acciones de ${aspecto.nombre}`}
        aria-expanded={menuAbierto}
        onClick={(e) => alAbrirMenu(sesion, e.currentTarget)}
      >
        <MoreHorizontal size={17} />
      </button>
    </article>
  )
}

/**
 * Lo que queda libre entre dos clases. El riel sigue, pero en puntos: es el
 * mismo dia, solo que ahi no hay clase.
 *
 * Si en el hueco cabe una clase, el renglon entero es el boton de ponerla. Si
 * no -diez minutos entre dos aulas-, solo dice cuanto es.
 */
function TramoLibre({ libre, alAnadir }) {
  const minutos = libre.fin - libre.inicio
  const dentro = (
    <>
      <span />
      <span className="riel-libre" aria-hidden="true" />
      <span className="tabular-nums">Libre · {duracion(minutos)}</span>
    </>
  )

  if (minutos < MIN_DURACION) {
    return (
      <div className="tramo-libre" data-corto>
        {dentro}
      </div>
    )
  }

  return (
    <button
      type="button"
      className="tramo-libre"
      aria-label={`Añadir una clase a las ${enDoceHoras(libre.inicio)}, hay ${duracion(minutos)} libres`}
      onClick={(e) => alAnadir(libre.inicio, e.currentTarget)}
    >
      {dentro}
      <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
    </button>
  )
}

/**
 * Un dia del horario, leido de arriba abajo: cada clase con su tramo, lo que
 * queda libre entre una y otra y, al final, donde añadir la siguiente.
 *
 * Es una lista y no una rejilla porque en una lista la hora no se deduce de la
 * posicion: va escrita en cada renglon, grande. La rejilla dice bien cuanto
 * dura cada cosa y mal a que hora empieza; aqui es al reves, y lo que se
 * pregunta a un horario es lo segundo.
 *
 * @param {object[]} props.sesiones  las clases del dia
 * @param {number|null} props.minuto  la hora que es, si este dia es hoy
 * @param {boolean} props.conAnclas  si las filas llevan el id del que cuelga la ficha
 * @param {(sesion: object) => { nombre: string, color: string }} props.aspectoDe
 * @param {(franja: object, elemento: HTMLElement) => void} props.alAnadir
 */
function AgendaDia({
  sesiones,
  minuto = null,
  conAnclas = false,
  idMenuAbierto,
  aspectoDe,
  alEditar,
  alAbrirMenu,
  alAnadir,
}) {
  /* Añadir en un hueco propone la hora de ese hueco; añadir sin mas, detras
     de la ultima clase. Las dos reglas viven en layout/horario. */
  const anadirEn = (inicio, elemento) => alAnadir(franjaPropuesta(sesiones, inicio), elemento)
  const anadirAlFinal = (e) => alAnadir(franjaNueva(sesiones) ?? PRIMERA_HORA, e.currentTarget)

  return (
    <div>
      {agendaDe(sesiones).map(({ clase, libre }) =>
        clase ? (
          <FilaClase
            key={clase.id}
            sesion={clase}
            aspecto={aspectoDe(clase)}
            minuto={minuto}
            conAncla={conAnclas}
            menuAbierto={idMenuAbierto === clase.id}
            alEditar={alEditar}
            alAbrirMenu={alAbrirMenu}
          />
        ) : (
          <TramoLibre key={`libre-${libre.inicio}`} libre={libre} alAnadir={anadirEn} />
        ),
      )}

      <button type="button" className="anadir-clase" onClick={anadirAlFinal}>
        <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
        <span>Añadir clase</span>
      </button>
    </div>
  )
}

export default AgendaDia
