import { useEffect, useRef, useState } from 'react'
import { Undo2 } from 'lucide-react'
import { useEsTelefono } from '../hooks/useEsTelefono'

/* Lo que se queda en pantalla despues de entrar. Lo mide la linea de tiempo
   de abajo, que se vacia en ese rato: al acabarse, el aviso se va. */
const DURACION = 5600
/* Lo que tarda en irse: mas corto que la entrada, como todo lo que sale */
const SALIDA = 260
/* Cuantas materias se nombran; el resto se cuenta */
const TOPE_FILAS = 3
/* Cuando termina de entrar: la espera hasta que llega la luz del cable
   (ver .aviso-recogida) mas lo que dura la entrada */
const ENTRADA = 1150 + 520

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

/* Cuanto hay que deslizar el aviso hacia arriba o hacia un lado para quitarlo */
const QUITAR_ARRIBA = 32
const QUITAR_LADO = 72

/**
 * El aviso en el telefono, arriba del mapa, justo debajo de la cabecera.
 *
 * Estuvo abajo, encima de la barra, y abajo en el telefono vive todo lo
 * demas: la ficha que se abre, sus marcas al pie, los botones de zoom y la
 * propia barra. El aviso se montaba encima de cualquiera de ellos, y con
 * una ficha abierta tapaba justo Aprobada-Cursando-Sin cursar. Arriba no
 * hay nada que pulsar, y es donde un telefono pone sus notificaciones.
 *
 * Tampoco es una capsula: la barra ya lo es, y dos pildoras juntas parecian
 * la misma pieza. Es el cartel de un juego al recoger algo: una linea de luz
 * verde a la izquierda, "APROBADA" en pequeño con su check dibujandose, el
 * nombre en grande, lo que se abre con su candado y Deshacer con su
 * palabra. El tiempo que le queda es la linea del pie.
 *
 * Se quita como una notificacion, deslizandola hacia arriba o a un lado, y
 * con el dedo encima el tiempo se para.
 */
function AvisoTelefono({ aviso, saliendo, alDeshacer, alIrse }) {
  const inicio = useRef(null)
  const [arrastre, setArrastre] = useState({ x: 0, y: 0 })
  const [tocando, setTocando] = useState(false)
  const [huida, setHuida] = useState(null)

  const abiertas = aviso.desbloqueadas
  const cuantas = abiertas.length

  const empezar = (e) => {
    if (e.target.closest('button')) return
    inicio.current = { x: e.clientX, y: e.clientY, t: performance.now() }
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setTocando(true)
  }
  const mover = (e) => {
    if (!inicio.current) return
    const x = e.clientX - inicio.current.x
    // Hacia abajo no se arrastra: ahi no hay adonde irse
    const y = Math.min(0, e.clientY - inicio.current.y)
    setArrastre(Math.abs(x) > Math.abs(y) ? { x, y: 0 } : { x: 0, y })
  }
  const soltar = () => {
    if (!inicio.current) return
    const t = Math.max(1, performance.now() - inicio.current.t)
    const { x, y } = arrastre
    inicio.current = null
    setTocando(false)
    const rapido = Math.hypot(x, y) / t > 0.6
    if (-y > QUITAR_ARRIBA || (y < 0 && rapido)) {
      setHuida('0 -140%')
      alIrse()
    } else if (Math.abs(x) > QUITAR_LADO || (x !== 0 && rapido)) {
      setHuida(`${Math.sign(x) * 115}% 0`)
      alIrse()
    } else setArrastre({ x: 0, y: 0 })
  }

  const movido = arrastre.x || arrastre.y
  return (
    <div
      role="status"
      className={`aviso-arriba transicion-tema absolute inset-x-3 z-20 overflow-hidden rounded-[14px] border border-panel-borde shadow-2xl ${
        saliendo && !huida ? 'aviso-arriba-saliendo pointer-events-none' : ''
      } ${tocando ? 'tocando' : ''}`}
      style={{
        touchAction: 'none',
        translate: huida ?? (movido ? `${arrastre.x}px ${arrastre.y}px` : undefined),
        opacity: huida
          ? 0
          : movido
            ? Math.max(0.35, 1 - Math.hypot(arrastre.x, arrastre.y) / 220)
            : undefined,
        transition: tocando
          ? 'none'
          : 'translate 260ms cubic-bezier(0.32, 0.72, 0, 1), opacity 260ms ease',
      }}
      onPointerDown={empezar}
      onPointerMove={mover}
      onPointerUp={soltar}
      onPointerCancel={soltar}
    >
      {/* La linea de luz del borde izquierdo, que se traza de arriba abajo */}
      <span aria-hidden="true" className="aviso-arriba-filo" />

      <div className="flex items-center gap-2 py-3 pr-1.5 pl-5">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[var(--estado-aprobada)]">
            <CheckQueSeDibuja tam={15} />
            <span className="font-ui text-[9px] font-medium tracking-[0.28em] uppercase">
              Aprobada
            </span>
          </p>
          <p
            className="mt-1 truncate font-ui text-[18px] leading-tight text-tinta"
            style={{ fontWeight: 400 }}
          >
            {aviso.nombre}
          </p>
          <p
            className="recogida-fila mt-2 flex min-w-0 items-center gap-1.5 text-[12px] leading-none"
            style={{ '--retraso': '1450ms' }}
          >
            {cuantas > 0 ? (
              <>
                <span className="shrink-0 text-[var(--sit-inscribible-luz)]">
                  <CandadoQueSeAbre retraso={1700} tam={12} />
                </span>
                <span
                  className="shrink-0 font-dato text-[11.5px] text-tinta"
                  style={{ fontWeight: 'var(--peso-dato)' }}
                >
                  +{cuantas}
                </span>
                <span className="min-w-0 truncate text-tinta-suave">{abiertas.join(' · ')}</span>
              </>
            ) : (
              <span className="truncate text-tinta-tenue">No abre nada nuevo todavía</span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={alDeshacer}
          className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 font-ui text-[9px] font-medium tracking-[0.2em] text-tinta-suave uppercase transition-colors active:bg-panel-suave"
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
        onAnimationEnd={alIrse}
      />
    </div>
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
    salida.current = setTimeout(alCerrar, SALIDA)
  }
  useEffect(() => () => clearTimeout(salida.current), [])

  /* Retirado desde fuera: porque llego otro aviso -aprobaste otra materia
     con este todavia en pantalla- o porque se abrio otra ficha y ya estas
     en otra cosa. Si aun no habia terminado de entrar se quita sin mas: una
     salida animada lo enseñaria un instante solo para irse. */
  useEffect(() => {
    if (!retirar) return
    if (performance.now() - montado.current < ENTRADA) alCerrar()
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
