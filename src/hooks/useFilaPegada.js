import { useEffect, useRef, useState } from 'react'

/**
 * Si una fila con position: sticky esta pegada arriba ahora mismo.
 *
 * CSS no lo dice (los container queries de scroll-state aun no estan en todos
 * los navegadores), asi que se pregunta a un IntersectionObserver por un
 * centinela de un pixel puesto justo encima de la fila: cuando el centinela
 * sale por arriba del contenedor que se desplaza, la fila ha llegado al borde
 * y se ha pegado. El observador solo avisa al cruzar ese borde, no en cada
 * pixel de desplazamiento.
 *
 * Cuenta como pegada en cuanto entra en la franja de las islas
 * (--reserva-cabecera), no al tocar el borde: es en esa franja donde tiene que
 * hacerles sitio, y si esperara al borde pasaria por debajo del boton de
 * volver durante el trayecto.
 *
 * Devuelve la ref para el centinela y el estado. El contenedor que se
 * desplaza es el padre con overflow mas cercano: se le pasa como `refRaiz`.
 */
export function useFilaPegada(refRaiz) {
  const refCentinela = useRef(null)
  const [pegada, setPegada] = useState(false)

  useEffect(() => {
    const centinela = refCentinela.current
    const raiz = refRaiz.current
    if (!centinela || !raiz) return
    const franja = parseFloat(getComputedStyle(raiz).getPropertyValue('--reserva-cabecera')) || 0
    const observador = new IntersectionObserver(
      ([e]) => setPegada(!e.isIntersecting && e.boundingClientRect.top < e.rootBounds.top),
      { root: raiz, rootMargin: `-${franja}px 0px 0px 0px` },
    )
    observador.observe(centinela)
    return () => observador.disconnect()
  }, [refRaiz])

  return [refCentinela, pegada]
}
