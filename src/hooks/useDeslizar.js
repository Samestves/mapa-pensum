import { useCallback, useRef } from 'react'

/* Cuanto hay que recorrer para que cuente como deslizamiento */
const UMBRAL = 56
/* Cuanto mas horizontal que vertical tiene que ser el gesto. Sin esta
   proporcion, desplazar el dia hacia abajo con el dedo un poco torcido
   cambiaria de dia sin querer, que es el fallo clasico de los carruseles. */
const SESGO = 1.6

/**
 * Deslizar el dedo a izquierda o derecha.
 *
 * Solo mira donde empezo y donde acabo el dedo: no sigue el movimiento ni
 * pinta nada a medio camino. Para pasar de dia eso basta, y evita tener que
 * competir con el desplazamiento vertical del navegador, que es quien mejor
 * lo hace. El contenedor declara touch-action: pan-y y el reparto queda
 * claro: lo vertical lo mueve el navegador, lo horizontal esto.
 *
 * `fueDeslizamiento()` responde si el gesto que acaba de terminar fue un
 * deslizamiento, para que el click que el navegador dispara a continuacion no
 * se interprete ademas como un toque en el hueco. Se consume al leerlo: la
 * marca vale para ESE click y no para el siguiente. Dejandola puesta hasta el
 * proximo pointerdown, cualquier click que llegara por otro camino -el
 * teclado, por ejemplo- se lo tragaba sin motivo.
 */
export function useDeslizar({ alIzquierda, alDerecha }) {
  const origen = useRef(null)
  const deslizo = useRef(false)

  const onPointerDown = useCallback((e) => {
    deslizo.current = false
    origen.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
  }, [])

  const onPointerUp = useCallback(
    (e) => {
      const desde = origen.current
      origen.current = null
      if (!desde || desde.id !== e.pointerId) return

      const dx = e.clientX - desde.x
      const dy = e.clientY - desde.y
      if (Math.abs(dx) < UMBRAL || Math.abs(dx) < Math.abs(dy) * SESGO) return

      deslizo.current = true
      if (dx < 0) alIzquierda()
      else alDerecha()
    },
    [alIzquierda, alDerecha],
  )

  const onPointerCancel = useCallback(() => {
    origen.current = null
  }, [])

  const fueDeslizamiento = useCallback(() => {
    const si = deslizo.current
    deslizo.current = false
    return si
  }, [])

  return { fueDeslizamiento, gestos: { onPointerDown, onPointerUp, onPointerCancel } }
}
