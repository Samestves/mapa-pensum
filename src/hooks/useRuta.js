import { useCallback, useEffect, useRef, useState } from 'react'

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
 * Aqui vivia una View Transition y se quito. La idea era que la tarjeta del
 * selector se desplegara hasta convertirse en el mapa, y el efecto es bonito,
 * pero para interpolar el navegador tiene que rasterizar en una textura el
 * antes y el despues de la pagina. El "despues" es un SVG de mil seiscientos
 * elementos a pantalla completa, y mientras lo rasteriza la pagina esta
 * congelada de verdad: no responde a nada. Eran tres o cuatro segundos, y en
 * los dos sentidos, porque al volver el que hay que fotografiar es el mapa.
 * Que volver al selector se sintiera igual de lento que entrar fue la pista:
 * React ahi no tiene nada que hacer, se mide en cero milisegundos.
 *
 * Lo que hay ahora es un cambio en dos tiempos hecho con CSS: la vista actual
 * se despide y la nueva entra. Cuesta un setTimeout y dos animaciones de
 * opacidad, que el compositor resuelve sin repintar nada.
 */

/* Lo que dura la despedida antes de cambiar de ruta. No es tiempo muerto: se
   ve a la vista actual irse, que es justo lo que faltaba para que el cambio
   no se leyera como un corte. Mas de esto ya se siente como esperar. */
const SALIDA = 170

const rutaActual = () => decodeURIComponent(window.location.pathname).replace(/^\/+|\/+$/g, '')

const sinMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function useRuta() {
  const [ruta, setRuta] = useState(rutaActual)
  const [saliendo, setSaliendo] = useState(false)
  const pendiente = useRef(null)

  useEffect(() => {
    // Atras y adelante del navegador. Aqui no hay despedida posible: la URL
    // ya cambio, asi que se corta cualquier salida en curso y se salta a la
    // ruta nueva, que entrara con su animacion igual.
    const alNavegarElNavegador = () => {
      clearTimeout(pendiente.current)
      setSaliendo(false)
      setRuta(rutaActual())
    }
    window.addEventListener('popstate', alNavegarElNavegador)
    return () => {
      window.removeEventListener('popstate', alNavegarElNavegador)
      clearTimeout(pendiente.current)
    }
  }, [])

  const navegar = useCallback((destino) => {
    const nueva = destino ?? ''
    if (nueva === rutaActual()) return

    const aplicar = () => {
      window.history.pushState(null, '', `/${nueva}`)
      setRuta(nueva)
      setSaliendo(false)
      // Cambiar de ruta es cambiar de pagina: la nueva empieza arriba
      window.scrollTo(0, 0)
    }

    if (sinMovimiento()) {
      aplicar()
      return
    }

    // Si ya habia una salida en curso (doble click, o cambio de idea a mitad)
    // se descarta y manda la ultima
    clearTimeout(pendiente.current)
    setSaliendo(true)
    pendiente.current = setTimeout(aplicar, SALIDA)
  }, [])

  return { ruta, saliendo, navegar }
}
