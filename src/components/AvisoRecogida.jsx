import { useEffect, useRef, useState } from 'react'
import { Undo2 } from 'lucide-react'
import { useEsTelefono } from '../hooks/useEsTelefono'

/* Lo que se queda en pantalla despues de entrar. Lo mide la linea de tiempo
   de abajo, que se vacia en ese rato: al acabarse, el aviso se va. */
const DURACION = 5600
/* Lo que tarda en irse: mas corto que la entrada, como todo lo que sale. En
   el telefono sale pieza a pieza, y la cascada entera dura mas. */
const SALIDA = 260
const SALIDA_TELEFONO = 820
/* Cuantas materias se nombran; el resto se cuenta */
const TOPE_FILAS = 3
/* Cuando ya se ve: la espera hasta que llega la luz del cable (ver
   .aviso-recogida) mas lo que tarda en asomar. Retirado antes de eso se
   quita sin animar nada. */
const ENTRADA = 1150 + 520
const ENTRADA_TELEFONO = 1150 + 400

const reducido = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

/**
 * El aro con check del encabezado. Se dibuja solo al entrar: primero el aro,
 * despues el trazo del check, como una marca hecha a mano.
 */
function CheckQueSeDibuja({ tam = 20 }) {
  return (
    <svg viewBox="0 0 20 20" width={tam} height={tam} aria-hidden="true" focusable="false">
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
function CandadoQueSeAbre({ retraso, tam = 15 }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={tam}
      height={tam}
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

/* Cuanto hay que deslizar el aviso hacia la izquierda para quitarlo */
const QUITAR = 64

/**
 * El aviso en el telefono: el de recoger algo en The Last of Us Parte II.
 *
 * Abajo a la izquierda, sobre la barra, y sin caja: el texto va sobre un
 * velo que oscurece esa esquina del mapa y se difumina hacia arriba y hacia
 * la derecha, antes de llegar a los botones de zoom. Primero "APROBADA" con
 * su check dibujandose, el nombre en grande y, debajo, cada materia que se
 * abre entrando detras de la anterior con su candado. El tiempo que le
 * queda es la raya fina bajo el nombre, que se va acortando; al acabarse,
 * todo sale en cascada, pieza a pieza.
 *
 * Probamos antes una capsula de cristal -la barra ya es una pildora, y dos
 * juntas parecian la misma pieza- y un cartel arriba con borde: los dos
 * eran cajas, y en el juego nada de esto lleva caja.
 *
 * Se quita deslizandolo hacia la izquierda, y con el dedo encima el tiempo
 * se para. Va por debajo de la ficha y de los botones de zoom: si alguna vez
 * coinciden, gana lo que se pulsa.
 */
function AvisoTelefono({ aviso, saliendo, alDeshacer, alIrse }) {
  const inicio = useRef(null)
  const [dx, setDx] = useState(0)
  const [tocando, setTocando] = useState(false)
  const [huido, setHuido] = useState(false)

  const abiertas = aviso.desbloqueadas
  const cuantas = abiertas.length
  const nombradas = abiertas.slice(0, TOPE_FILAS)
  const resto = cuantas - nombradas.length

  const empezar = (e) => {
    if (e.target.closest('button')) return
    inicio.current = { x: e.clientX, t: performance.now() }
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setTocando(true)
  }
  const mover = (e) => {
    if (!inicio.current) return
    // Solo hacia la izquierda, que es de donde vino
    setDx(Math.min(0, e.clientX - inicio.current.x))
  }
  const soltar = () => {
    if (!inicio.current) return
    const rapido = -dx / Math.max(1, performance.now() - inicio.current.t) > 0.5
    inicio.current = null
    setTocando(false)
    if (-dx > QUITAR || (dx < 0 && rapido)) {
      setHuido(true)
      alIrse()
    } else setDx(0)
  }

  /* Cada pieza entra con su retraso (--e) y sale con el suyo (--s): las de
     abajo salen primero, como si el aviso se recogiera hacia arriba. */
  const pieza = (e, s) => ({ '--e': `${e}ms`, '--s': `${s}ms` })
  const filas = nombradas.length + (resto > 0 ? 1 : 0)

  return (
    <>
      <div
        aria-hidden="true"
        className={`recogida-velo ${saliendo ? 'recogida-velo-saliendo' : ''}`}
      />
      <div
        role="status"
        className={`recogida-movil ${saliendo && !huido ? 'recogida-movil-saliendo' : ''} ${
          tocando ? 'tocando' : ''
        }`}
        style={{
          touchAction: 'none',
          translate: huido ? '-120% 0' : dx ? `${dx}px 0` : undefined,
          opacity: huido ? 0 : dx ? Math.max(0.3, 1 + dx / 200) : undefined,
          transition: tocando
            ? 'none'
            : 'translate 300ms cubic-bezier(0.32, 0.72, 0, 1), opacity 300ms ease',
        }}
        onPointerDown={empezar}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={soltar}
      >
        <p
          className="movil-pieza flex items-center gap-2.5 text-[var(--estado-aprobada)]"
          style={pieza(0, (filas + 2) * 70)}
        >
          <CheckQueSeDibuja tam={15} />
          <span className="font-ui text-[9.5px] font-medium tracking-[0.32em] uppercase">
            Aprobada
          </span>
        </p>
        <p
          className="movil-pieza mt-1.5 line-clamp-2 font-ui text-[22px] leading-[1.15] tracking-[-0.005em] text-balance text-tinta"
          style={{ ...pieza(120, (filas + 1) * 70), fontWeight: 300 }}
        >
          {aviso.nombre}
        </p>

        {/* El tiempo que le queda. Al acabarse, el aviso se va solo. */}
        <span
          aria-hidden="true"
          className="movil-tiempo mt-3 block h-px"
          style={{ '--duracion': `${DURACION}ms` }}
          onAnimationEnd={(e) => e.animationName === 'vaciar-raya' && alIrse()}
        />

        {cuantas > 0 ? (
          <ul className="mt-3 flex flex-col gap-[9px]">
            {nombradas.map((nombre, i) => (
              <li
                key={nombre}
                className="movil-pieza flex min-w-0 items-center gap-2.5 text-[14px] text-tinta"
                style={pieza(500 + i * 140, (filas - i) * 70)}
              >
                <span className="w-2.5 shrink-0 font-dato text-[13px] text-tinta-suave">+</span>
                <span className="shrink-0 text-[var(--sit-inscribible-luz)]">
                  <CandadoQueSeAbre retraso={1150 + 750 + i * 140} tam={12} />
                </span>
                <span className="min-w-0 truncate" style={{ fontWeight: 'var(--peso-nombre)' }}>
                  {nombre}
                </span>
              </li>
            ))}
            {resto > 0 && (
              <li
                className="movil-pieza pl-5 text-[13px] text-tinta-tenue"
                style={pieza(500 + nombradas.length * 140, 70)}
              >
                y {resto} más
              </li>
            )}
          </ul>
        ) : (
          <p className="movil-pieza mt-3 text-[13px] text-tinta-tenue" style={pieza(500, 70)}>
            No abre nada nuevo todavía
          </p>
        )}

        <button
          type="button"
          onClick={alDeshacer}
          className="movil-pieza mt-3 -ml-1.5 flex min-h-11 items-center gap-2.5 rounded-full pr-3 pl-1.5 font-ui text-[9.5px] font-medium tracking-[0.26em] text-tinta uppercase"
          style={pieza(900, 0)}
        >
          <span className="boton-aro grid size-6 place-items-center rounded-full">
            <Undo2 size={12} strokeWidth={1.7} />
          </span>
          Deshacer
        </button>
      </div>
    </>
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
function AvisoRecogida({ aviso, retirar = false, alDeshacer, alCerrar }) {
  const esTelefono = useEsTelefono()
  const [saliendo, setSaliendo] = useState(false)
  const salida = useRef(null)
  const montado = useRef(performance.now())

  const irse = () => {
    if (salida.current) return
    setSaliendo(true)
    salida.current = setTimeout(alCerrar, esTelefono ? SALIDA_TELEFONO : SALIDA)
  }
  useEffect(() => () => clearTimeout(salida.current), [])

  /* Retirado desde fuera: porque llego otro aviso -aprobaste otra materia
     con este todavia en pantalla- o porque se abrio otra ficha y ya estas
     en otra cosa. Si aun no habia terminado de entrar se quita sin mas: una
     salida animada lo enseñaria un instante solo para irse. */
  useEffect(() => {
    if (!retirar) return
    if (performance.now() - montado.current < (esTelefono ? ENTRADA_TELEFONO : ENTRADA)) alCerrar()
    else irse()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retirar])

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

  if (esTelefono) {
    return <AvisoTelefono aviso={aviso} saliendo={saliendo} alDeshacer={deshacer} alIrse={irse} />
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
