import { useCallback, useRef } from 'react'

/* Cuanto hay que arrastrar para pasar de dia, o a que velocidad (px/ms) si es
   un tiron corto. */
const UMBRAL = 56
const VELOCIDAD = 0.45
/* Cuanto mas horizontal que vertical tiene que ser el gesto. Sin esta
   proporcion, desplazar el dia hacia abajo con el dedo un poco torcido
   cambiaria de dia sin querer, que es el fallo clasico de los carruseles. */
const SESGO = 1.6
/* Lo que se espera antes de decidir si el gesto es horizontal o vertical:
   con menos, un temblor del dedo al empezar a bajar ya contaria como lateral. */
const DECIDIR = 10
/* En el primer y en el ultimo dia no hay a donde ir: el contenido sigue al
   dedo con resistencia, como el borde de cualquier lista de iOS, y vuelve. */
const RESISTENCIA = 0.28
const VUELTA = 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)'

/**
 * Deslizar el dedo a izquierda o derecha para pasar de dia, con el contenido
 * siguiendo al dedo.
 *
 * Antes solo se miraba donde empezaba y donde acababa el dedo, y nada se
 * movia a medio camino. Funcionaba, pero no se entendia: el dia cambiaba de
 * golpe al soltar, sin decir hacia donde, y en el lunes o el viernes el gesto
 * hacia el lado vacio no respondia nada. Ahora la capa del dia se arrastra con
 * el dedo -con resistencia si no hay dia a ese lado- y al soltar o pasa al
 * siguiente o vuelve a su sitio.
 *
 * El arrastre escribe el transform directamente en la capa (`refCapa`), sin
 * pasar por React: son decenas de movimientos por segundo y ninguno cambia
 * nada mas que su posicion.
 *
 * El contenedor declara touch-action: pan-y y el reparto queda claro: lo
 * vertical lo mueve el navegador, que es quien mejor lo hace -y si lo coge el,
 * llega un pointercancel y la capa vuelve-, lo horizontal esto.
 *
 * `fueDeslizamiento()` responde si el gesto que acaba de terminar fue lateral,
 * para que el click que el navegador dispara a continuacion no se interprete
 * ademas como un toque en el hueco. Se consume al leerlo: la marca vale para
 * ESE click y no para el siguiente.
 */
export function useDeslizar({ refCapa, hayAnterior, haySiguiente, alAnterior, alSiguiente }) {
  const gesto = useRef(null)
  const deslizo = useRef(false)

  const colocar = (dx, transicion) => {
    const capa = refCapa.current
    if (!capa) return
    capa.style.transition = transicion
    capa.style.transform = dx ? `translateX(${dx}px)` : ''
  }

  const devolver = () => {
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    colocar(0, sinMovimiento ? 'none' : VUELTA)
  }

  const onPointerDown = (e) => {
    deslizo.current = false
    gesto.current = { x: e.clientX, y: e.clientY, id: e.pointerId, t: e.timeStamp, dx: 0, v: 0 }
  }

  const onPointerMove = (e) => {
    const g = gesto.current
    if (!g || g.id !== e.pointerId) return
    const dx = e.clientX - g.x
    const dy = e.clientY - g.y

    if (!g.eje) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < DECIDIR) return
      g.eje = Math.abs(dx) > Math.abs(dy) * SESGO ? 'x' : 'y'
    }
    if (g.eje !== 'x') return

    const dt = e.timeStamp - g.t
    if (dt > 0) g.v = (dx - g.dx) / dt
    g.dx = dx
    g.t = e.timeStamp

    const hayDia = dx < 0 ? haySiguiente : hayAnterior
    colocar(hayDia ? dx : dx * RESISTENCIA, 'none')
  }

  const onPointerUp = (e) => {
    const g = gesto.current
    gesto.current = null
    if (!g || g.id !== e.pointerId || g.eje !== 'x') return
    deslizo.current = true

    const haciaSiguiente = g.dx < 0
    const hayDia = haciaSiguiente ? haySiguiente : hayAnterior
    const tiron = Math.abs(g.v) > VELOCIDAD && Math.sign(g.v) === Math.sign(g.dx)
    if (hayDia && (Math.abs(g.dx) > UMBRAL || tiron)) {
      // La capa de este dia se desmonta al cambiar: entra la del siguiente
      if (haciaSiguiente) alSiguiente()
      else alAnterior()
    } else {
      devolver()
    }
  }

  const onPointerCancel = () => {
    if (gesto.current?.eje === 'x') devolver()
    gesto.current = null
  }

  const fueDeslizamiento = useCallback(() => {
    const si = deslizo.current
    deslizo.current = false
    return si
  }, [])

  return {
    fueDeslizamiento,
    gestos: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  }
}
