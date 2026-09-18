import { useEffect, useRef, useState } from 'react'
import { Undo2 } from 'lucide-react'

/* Lo que se queda en pantalla despues de entrar. Lo mide la linea de tiempo
   de abajo, que se vacia en ese rato: al acabarse, el aviso se va. */
const DURACION = 5600
/* Lo que tarda en irse: mas corto que la entrada, como todo lo que sale */
const SALIDA = 260
/* Cuantas materias se nombran; el resto se cuenta */
const TOPE_FILAS = 3

const reducido = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

/**
 * El aro con check del encabezado. Se dibuja solo al entrar: primero el aro,
 * despues el trazo del check, como una marca hecha a mano.
 */
function CheckQueSeDibuja() {
  return (
    <svg viewBox="0 0 20 20" width={20} height={20} aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="8.25" pathLength="1" className="recogida-aro" />
      <path d="M6.3 10.4 8.8 12.9 13.8 7.5" pathLength="1" className="recogida-tilde" />
    </svg>
  )
}

/**
 * El candado de cada materia que se abre. Entra cerrado y, un instante
 * despues de su fila, el arco gira sobre su pata derecha y sale del cuerpo:
 * lo que estaba bloqueado se acaba de abrir, dicho con un gesto y no con una
 * palabra.
 */
function CandadoQueSeAbre({ retraso }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={15}
      height={15}
      aria-hidden="true"
      focusable="false"
      className="recogida-candado"
      style={{ '--retraso': `${retraso}ms` }}
    >
      <rect x="3" y="7.2" width="10" height="6.8" rx="1.6" />
      <path className="recogida-arco" d="M5.3 7.2V5.3a2.7 2.7 0 0 1 5.4 0v1.9" />
    </svg>
  )
}

/**
 * El aviso de lo que acabas de conseguir al aprobar una materia.
 *
 * Es el gesto del juego al recoger algo: una tira discreta en la esquina que
 * entra, se lee y se va sola. Arriba, lo que aprobaste; debajo, una fila por
 * cada materia que se abrio, entrando una detras de otra con su candado
 * abriendose; abajo, cuantas son y Deshacer.
 *
 * La linea fina del borde inferior es el tiempo que le queda: se vacia y,
 * cuando se acaba, el aviso se va. Pasar el cursor por encima la detiene,
 * para poder leer con calma o llegar a Deshacer.
 *
 * Entra con retraso a proposito, cuando la luz del cable ya llego a su
 * destino: primero se ve lo que paso y despues se lee.
 */
function AvisoRecogida({ aviso, alDeshacer, alCerrar }) {
  const [saliendo, setSaliendo] = useState(false)
  const salida = useRef(null)

  const irse = () => {
    if (salida.current) return
    setSaliendo(true)
    salida.current = setTimeout(alCerrar, SALIDA)
  }
  useEffect(() => () => clearTimeout(salida.current), [])

  /* Con movimiento reducido no hay linea que se vacie, asi que el tiempo lo
     lleva un reloj normal. */
  useEffect(() => {
    if (!reducido()) return
    const reloj = setTimeout(irse, DURACION)
    return () => clearTimeout(reloj)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const deshacer = () => {
    alDeshacer()
    irse()
  }

  const abiertas = aviso.desbloqueadas
  const cuantas = abiertas.length
  const nombradas = abiertas.slice(0, TOPE_FILAS)
  const resto = cuantas - nombradas.length

  return (
    <div
      role="status"
      className={`aviso-recogida transicion-tema absolute z-30 overflow-hidden rounded-[12px] border border-panel-borde bg-panel shadow-2xl ${
        saliendo ? 'recogida-saliendo pointer-events-none' : ''
      }`}
    >
      {/* El filo de luz del borde de arriba, en el verde de aprobada */}
      <span
        aria-hidden="true"
        className="recogida-filo pointer-events-none absolute inset-x-6 top-0 h-px"
      />

      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-3">
        <span className="shrink-0 text-[var(--estado-aprobada)]">
          <CheckQueSeDibuja />
        </span>
        <span className="shrink-0 font-ui text-[9.5px] font-medium tracking-[0.26em] text-[var(--estado-aprobada)] uppercase">
          Aprobada
        </span>
        <span
          className="min-w-0 truncate text-[13px] text-tinta"
          style={{ fontWeight: 'var(--peso-nombre)' }}
        >
          {aviso.nombre}
        </span>
      </div>

      {cuantas > 0 ? (
        <ul className="flex flex-col border-t border-panel-borde px-4 py-2">
          {nombradas.map((nombre, i) => (
            <li
              key={nombre}
              className="recogida-fila flex items-center gap-2.5 py-[5px]"
              style={{ '--retraso': `${1350 + i * 110}ms` }}
            >
              <span className="shrink-0 text-[var(--sit-inscribible-luz)]">
                <CandadoQueSeAbre retraso={1600 + i * 110} />
              </span>
              <span
                className="min-w-0 flex-1 truncate text-[13px] text-tinta"
                style={{ fontWeight: 'var(--peso-nombre)' }}
              >
                {nombre}
              </span>
            </li>
          ))}
          {resto > 0 && (
            <li
              className="recogida-fila py-[5px] pl-[25px] text-[12px] text-tinta-tenue"
              style={{ '--retraso': `${1350 + nombradas.length * 110}ms` }}
            >
              y {resto} más
            </li>
          )}
        </ul>
      ) : (
        <p className="border-t border-panel-borde px-4 py-2.5 text-[12.5px] text-tinta-suave">
          No abre nada nuevo todavía.
        </p>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-panel-borde py-1.5 pr-1.5 pl-4">
        <p className="flex items-baseline gap-2 text-tinta-tenue">
          <span
            className="font-dato text-[12px] text-tinta"
            style={{ fontWeight: 'var(--peso-dato)' }}
          >
            +{cuantas}
          </span>
          <span className="font-ui text-[9.5px] font-medium tracking-[0.24em] uppercase">
            {cuantas === 1 ? 'Desbloqueada' : 'Desbloqueadas'}
          </span>
        </p>
        <button
          type="button"
          onClick={deshacer}
          className="flex items-center gap-2 rounded-full px-3 py-2 font-ui text-[9.5px] font-medium tracking-[0.22em] text-tinta-suave uppercase transition-colors hover:bg-panel-suave hover:text-tinta"
        >
          <Undo2 size={13} strokeWidth={1.6} />
          Deshacer
        </button>
      </div>

      {/* El tiempo que le queda. Al vaciarse, el aviso se va solo. */}
      <span
        aria-hidden="true"
        className="recogida-tiempo absolute inset-x-0 bottom-0 h-[2px]"
        style={{ '--duracion': `${DURACION}ms` }}
        onAnimationEnd={irse}
      />
    </div>
  )
}

export default AvisoRecogida
