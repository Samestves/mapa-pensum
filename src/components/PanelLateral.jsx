import { useEffect, useRef, useState } from 'react'
import { useCerrarConEscape } from '../hooks/useCerrarConEscape'

/* Lo que tarda en irse. Tiene que coincidir con la transicion de
   .panel-lateral en index.css: el tiempo que sigue montado despues de pedir
   cerrarse, para que se lo vea salir. */
const SALIDA_MS = 320

/**
 * Lo que se abre en ESCRITORIO: un panel que entra por la derecha y se queda
 * flotando de la cabecera al pie, separado de los bordes, como el inspector
 * de una app de Mac. Es la pareja de HojaInferior, que es lo mismo en el
 * telefono.
 *
 * No tapa nada mas que su franja: el mapa sigue a la vista y se puede usar
 * detras -aislar un area desde el avance, ver donde cae la casilla que se
 * esta eligiendo-, por eso no lleva velo ni se cierra al pulsar fuera. Se
 * cierra con su X, con Escape o con el mismo boton que lo abrio.
 *
 * Alto fijo, de la cabecera al pie, en vez de crecer con lo que lleva: un
 * panel que cambia de tamaño segun el contenido es lo que hacia que el
 * avance pareciera una nubecita. Si no cabe se desplaza por dentro, sin
 * barra a la vista y con el borde de abajo desvaneciendose.
 *
 * Va dentro de la vista de la carrera y no en un portal: de ahi toma lo que
 * mide la cabecera (--reserva-cabecera) para empezar justo debajo.
 *
 * Solo se mueve con transform y opacity. El montaje es el de HojaInferior:
 * si llega abierto se monta en el mismo render, y al cerrarse se queda
 * SALIDA_MS mas, con data-saliendo, para la animacion de salida.
 */
function PanelLateral({ abierto, alCerrar, etiqueta, ancho = 380, cabecera, children }) {
  const [montado, setMontado] = useState(abierto)
  if (abierto && !montado) setMontado(true)
  const saliendo = montado && !abierto
  const ref = useRef(null)

  useCerrarConEscape(alCerrar, abierto)

  useEffect(() => {
    if (!saliendo) return
    const t = setTimeout(() => setMontado(false), SALIDA_MS)
    return () => clearTimeout(t)
  }, [saliendo])

  /* El foco entra al abrirse, para que Tab y el lector de pantalla empiecen
     por aqui, y vuelve a lo que lo abrio al cerrarse. */
  useEffect(() => {
    if (!montado) return
    const previo = document.activeElement
    ref.current?.focus({ preventScroll: true })
    return () => previo?.focus?.({ preventScroll: true })
  }, [montado])

  if (!montado) return null

  return (
    <section
      ref={ref}
      role="dialog"
      aria-label={etiqueta}
      tabIndex={-1}
      data-saliendo={saliendo}
      style={{ width: ancho }}
      className="panel-lateral absolute top-[calc(var(--reserva-cabecera)+0.5rem)] right-5 bottom-5 z-30 flex max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-[28px] border border-panel-borde bg-panel outline-none"
    >
      <div className="shrink-0">{cabecera}</div>
      <div className="desplazable-limpio min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>
    </section>
  )
}

export default PanelLateral
