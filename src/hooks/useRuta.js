import { useCallback, useEffect, useState } from 'react'

/**
 * Enrutador de la app. Solo hay dos formas de ruta:
 *
 *   /            el selector de carreras
 *   /<slug>      el mapa de una carrera
 *
 * Escrito a mano en vez de traer react-router porque para dos rutas sin
 * parametros anidados ni rutas hijas son cuarenta lineas contra unos 10 KB
 * comprimidos. En un proyecto cuyo publico paga los datos, y que ya dibuja su
 * propio grafo sin libreria, la coherencia es no meter la libreria.
 *
 * La navegacion usa la View Transitions API cuando existe: el navegador saca
 * una foto del antes y del despues y los interpola, que es lo que permite que
 * la tarjeta del selector se convierta en el mapa. Donde no existe (Firefox
 * hoy) el cambio es instantaneo y no se rompe nada.
 */
const rutaActual = () => decodeURIComponent(window.location.pathname).replace(/^\/+|\/+$/g, '')

export function useRuta() {
  const [ruta, setRuta] = useState(rutaActual)

  useEffect(() => {
    // Atras y adelante del navegador
    const alVolver = () => setRuta(rutaActual())
    window.addEventListener('popstate', alVolver)
    return () => window.removeEventListener('popstate', alVolver)
  }, [])

  const navegar = useCallback((destino) => {
    const ruta = destino ?? ''
    if (ruta === rutaActual()) return

    const aplicar = () => {
      window.history.pushState(null, '', `/${ruta}`)
      setRuta(ruta)
    }

    // startViewTransition necesita que el DOM cambie DENTRO del callback, y
    // React actualiza de forma asincrona. flushSync lo forzaria, pero cuesta
    // un render sincrono del mapa entero; en su lugar se deja que React
    // pinte y el navegador interpole lo que haya cambiado al terminar.
    if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.startViewTransition(() => {
        aplicar()
        return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      })
    } else {
      aplicar()
    }
  }, [])

  return { ruta, navegar }
}
