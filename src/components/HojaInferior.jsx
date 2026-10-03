import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useCerrarConEscape } from '../hooks/useCerrarConEscape'
import { useEntrada } from '../hooks/useEntrada'

/* Lo que tarda en irse. Tiene que coincidir con la transicion de
   .hoja-inferior en estilos/hojas.css: es el tiempo que la hoja sigue montada despues
   de pedir cerrarse, para que se la vea bajar. */
const SALIDA_MS = 400

/* Cuanto hay que arrastrarla hacia abajo para que se cierre, o a que
   velocidad (px/ms) si el gesto es un tiron corto. */
const UMBRAL_PX = 110
const UMBRAL_VELOCIDAD = 0.5

/**
 * Una hoja que sube desde abajo, de borde a borde y pegada al fondo, con las
 * esquinas de arriba redondeadas, como las de iOS. Es la forma de abrir algo
 * en el telefono: nace donde esta el pulgar y se cierra tirando de ella hacia
 * abajo, tocando fuera o con Escape. Todo el ancho es para el contenido, y
 * el fondo de la hoja llega hasta el borde de la pantalla: lo que respeta la
 * barra de gestos es el relleno de abajo, no un hueco.
 *
 * Solo se mueve con transform y opacity, que el navegador anima en la GPU sin
 * repintar nada. Sube y baja con la misma transicion: entra un par de
 * fotogramas despues de montarse (ver useEntrada) y sale con data-fase de
 * vuelta a "fuera". La superficie es opaca, sin desenfoque de fondo: un cristal
 * del tamaño de media pantalla habria que recalcularlo en cada fotograma de la
 * subida, y en un telefono modesto eso se nota.
 *
 * El montaje se resuelve sin efectos para abrir: si llega abierta y no estaba
 * montada, se monta en el mismo render. Al cerrarse se queda montada
 * SALIDA_MS mas, para que la bajada se vea.
 *
 * El arrastre escribe el transform directamente en el elemento, sin pasar por
 * React: son decenas de movimientos por segundo y ninguno cambia nada mas que
 * la posicion. Se tira del asa y de la `cabecera`, no del contenido: el
 * contenido se desplaza, y un mismo gesto no puede significar las dos cosas.
 *
 * `pie` es lo que se queda abajo, a la vista, mientras el contenido se
 * desplaza: los botones de una lista larga. `alIrse` avisa cuando la hoja ha
 * terminado de bajar, para quien tiene que esperar a eso antes de desmontarla.
 */
function HojaInferior({ abierta, alCerrar, alIrse, etiqueta, cabecera, pie, children }) {
  const [montada, setMontada] = useState(abierta)
  if (abierta && !montada) setMontada(true)
  const saliendo = montada && !abierta
  const fase = useEntrada(montada) && !saliendo ? 'dentro' : 'fuera'

  const refHoja = useRef(null)
  const arrastre = useRef(null)

  useCerrarConEscape(alCerrar, abierta)

  useEffect(() => {
    if (!saliendo) return
    const t = setTimeout(() => {
      setMontada(false)
      alIrse?.()
    }, SALIDA_MS)
    return () => clearTimeout(t)
  }, [saliendo, alIrse])

  /* Si se vuelve a abrir mientras bajaba, la posicion que dejo el arrastre ya
     no vale: la hoja vuelve a su sitio con su transicion. */
  useLayoutEffect(() => {
    if (!saliendo && refHoja.current) refHoja.current.style.transform = ''
  }, [saliendo])

  /* Mientras haya una hoja, la luz de los cables del mapa se congela (ver
     .flujo en estilos/mapa.css). Detras del velo apenas se ve, y es la unica
     animacion que repinta en el hilo principal: le quitaba cuadros a la
     subida de la hoja justo cuando el telefono mas trabajo tiene. */
  useLayoutEffect(() => {
    if (!montada) return
    const raiz = document.documentElement
    raiz.dataset.hoja = ''
    return () => delete raiz.dataset.hoja
  }, [montada])

  /* El foco entra en la hoja cuando empieza a subir y vuelve a lo que la
     abrio al cerrarse: con teclado o lector de pantalla no se pierde el
     sitio. No al montarse: ahi enfocar obligaba a maquetar la hoja entera en
     ese instante, antes de poder pintar nada. */
  useEffect(() => {
    if (!montada) return
    const previo = document.activeElement
    return () => previo?.focus?.({ preventScroll: true })
  }, [montada])

  useEffect(() => {
    if (fase === 'dentro') refHoja.current?.focus({ preventScroll: true })
  }, [fase])

  if (!montada) return null

  const empezar = (e) => {
    // Los botones de la cabecera -cerrar- se pulsan, no se arrastran
    if (e.button !== 0 || saliendo || e.target.closest('button')) return
    arrastre.current = { y: e.clientY, dy: 0, t: e.timeStamp, velocidad: 0 }
    e.currentTarget.setPointerCapture(e.pointerId)
    refHoja.current.style.transition = 'none'
  }

  const mover = (e) => {
    const a = arrastre.current
    if (!a) return
    // Hacia arriba no se mueve: no hay nada que enseñar por encima
    const dy = Math.max(0, e.clientY - a.y)
    const dt = e.timeStamp - a.t
    if (dt > 0) a.velocidad = (dy - a.dy) / dt
    a.dy = dy
    a.t = e.timeStamp
    refHoja.current.style.transform = `translateY(${dy}px)`
  }

  const soltar = () => {
    const a = arrastre.current
    if (!a) return
    arrastre.current = null
    const hoja = refHoja.current
    hoja.style.transition = ''
    if (a.dy > UMBRAL_PX || (a.dy > 24 && a.velocidad > UMBRAL_VELOCIDAD)) {
      /* Se queda donde la solto el dedo y desde ahi baja: si se limpiara el
         transform volveria a subir un fotograma antes de irse. */
      hoja.style.transform = 'translateY(calc(100% + 24px))'
      alCerrar()
    } else {
      hoja.style.transform = ''
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Cerrar"
        tabIndex={-1}
        onClick={alCerrar}
        data-fase={fase}
        className="velo-hoja absolute inset-0 cursor-default"
      />

      <section
        ref={refHoja}
        role="dialog"
        aria-modal="true"
        aria-label={etiqueta}
        tabIndex={-1}
        data-fase={fase}
        className="hoja-inferior absolute inset-x-0 bottom-0 flex max-h-[calc(100dvh-4rem)] flex-col overflow-hidden rounded-t-[28px] border-t border-panel-borde bg-panel outline-none"
      >
        {/* La zona de la que se tira: el asa y la cabecera. Una franja entera
            y no solo la rayita, que a cinco pixeles de alto no hay dedo que la
            acierte. */}
        <div
          onPointerDown={empezar}
          onPointerMove={mover}
          onPointerUp={soltar}
          onPointerCancel={soltar}
          className="shrink-0 cursor-grab touch-none active:cursor-grabbing"
        >
          <div className="flex justify-center pt-2.5 pb-1">
            <span aria-hidden="true" className="h-[5px] w-9 rounded-full bg-tinta/20" />
          </div>
          {cabecera}
        </div>

        {/* Lo que respeta la barra de gestos es lo ultimo de la hoja: el
            contenido, o el pie si lo hay. */}
        <div
          className={`min-h-0 overflow-y-auto overscroll-contain ${
            pie ? '' : 'pb-[env(safe-area-inset-bottom)]'
          }`}
        >
          {children}
        </div>
        {pie && <div className="shrink-0 pb-[env(safe-area-inset-bottom)]">{pie}</div>}
      </section>
    </div>,
    document.body,
  )
}

export default HojaInferior
