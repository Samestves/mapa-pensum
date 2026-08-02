import { useCallback, useEffect, useState } from 'react'

/**
 * Enrutador de la app. Solo hay dos formas de ruta:
 *
 *   /            el selector de carreras
 *   /<slug>      el mapa de una carrera
 *
 * Escrito a mano en vez de traer react-router porque para dos rutas sin
 * parametros anidados ni rutas hijas son treinta lineas contra unos 10 KB
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
 * Lo que queda es un cambio de ruta seco. La sensacion de continuidad la pone
 * la animacion de entrada por CSS (.entrada-vista, solo opacidad) y la
 * silueta de la carrera que ocupa el sitio del mapa mientras se monta.
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

    window.history.pushState(null, '', `/${ruta}`)
    setRuta(ruta)
    // Cambiar de ruta es cambiar de pagina: la nueva empieza arriba
    window.scrollTo(0, 0)
  }, [])

  return { ruta, navegar }
}
