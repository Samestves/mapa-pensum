import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useCerrarConEscape } from '../hooks/useCerrarConEscape'

/* Lo que tarda en irse. Tiene que coincidir con la transicion de
   .hoja-inferior en index.css: es el tiempo que la hoja sigue montada despues
   de pedir cerrarse, para que se la vea bajar. */
const SALIDA_MS = 380

/* Cuanto hay que arrastrarla hacia abajo para que se cierre, o a que
   velocidad (px/ms) si el gesto es un tiron corto. */
const UMBRAL_PX = 110
const UMBRAL_VELOCIDAD = 0.5

/**
 * Una hoja que sube desde abajo, flotando separada de los bordes como las de
 * iOS. Es la forma de abrir algo en el telefono: nace donde esta el pulgar y
 * se cierra tirando de ella hacia abajo, tocando fuera o con Escape.
 *
 * Solo se mueve con transform y opacity, que el navegador anima en la GPU sin
 * repintar nada. La superficie es opaca, sin desenfoque de fondo: un cristal
 * del tamaño de media pantalla habria que recalcularlo en cada fotograma de la
 * subida, y en un telefono modesto eso se nota.
 *
 * El montaje se resuelve sin efectos para abrir: si llega abierta y no estaba
 * montada, se monta en el mismo render. Al cerrarse se queda montada
 * SALIDA_MS mas, con data-saliendo, para que la animacion de bajada se vea.
 *
 * El arrastre escribe el transform directamente en el elemento, sin pasar por
 * React: son decenas de movimientos por segundo y ninguno cambia nada mas que
 * la posicion. Se tira del asa y de la `cabecera`, no del contenido: el
 * contenido se desplaza, y un mismo gesto no puede significar las dos cosas.
 */
function HojaInferior({ abierta, alCerrar, etiqueta, cabecera, children }) {
  const [montada, setMontada] = useState(abierta)
  if (abierta && !montada) setMontada(true)
  const saliendo = montada && !abierta

  const refHoja = useRef(null)
  const arrastre = useRef(null)

  useCerrarConEscape(alCerrar, abierta)

  useEffect(() => {
    if (!saliendo) return
    const t = setTimeout(() => setMontada(false), SALIDA_MS)
    return () => clearTimeout(t)
  }, [saliendo])

  /* Si se vuelve a abrir mientras bajaba, la posicion que dejo el arrastre ya
     no vale: la hoja vuelve a su sitio con su transicion. */
  useLayoutEffect(() => {
    if (!saliendo && refHoja.current) refHoja.current.style.transform = ''
  }, [saliendo])

  /* El foco entra en la hoja al abrirse y vuelve a lo que la abrio al
     cerrarse: con teclado o lector de pantalla no se pierde el sitio. */
  useEffect(() => {
    if (!montada) return
    const previo = document.activeElement
    refHoja.current?.focus({ preventScroll: true })
    return () => previo?.focus?.({ preventScroll: true })
  }, [montada])

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
        data-saliendo={saliendo}
        className="velo-hoja absolute inset-0 cursor-default"
      />

      <section
        ref={refHoja}
        role="dialog"
        aria-modal="true"
        aria-label={etiqueta}
        tabIndex={-1}
        data-saliendo={saliendo}
        className="hoja-inferior transicion-tema absolute inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] flex max-h-[calc(100dvh-4.5rem)] flex-col overflow-hidden rounded-[30px] border border-panel-borde bg-panel outline-none"
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

        <div className="min-h-0 overflow-y-auto overscroll-contain">{children}</div>
      </section>
    </div>,
    document.body,
  )
}

export default HojaInferior
