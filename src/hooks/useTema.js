import { useCallback, useLayoutEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { guardar, leer } from '../data/almacen'

const CLAVE = 'mapa-pensum:tema'

/* El color de la barra del navegador en cada tema: el del lienzo. Tiene que
   coincidir con --lienzo de index.css y con el script de index.html, que lo
   pone antes del primer pintado. */
const COLOR_BARRA = { oscuro: '#070b13', claro: '#eff2f8' }

function temaInicial() {
  const guardado = leer(CLAVE)
  if (guardado === 'claro' || guardado === 'oscuro') return guardado
  /* Oscuro siempre, sin preguntarle al sistema. Antes se respetaba
     prefers-color-scheme, y el resultado era que a quien lleva Windows en
     claro -o sea, casi todo el mundo- la aplicacion se le abria en claro sin
     haberlo pedido. El mapa esta pensado en oscuro: los ocho colores de area
     estan calibrados sobre lienzo negro y es ahi donde se distinguen mejor.
     Quien prefiera claro lo elige una vez y se le recuerda. */
  return 'oscuro'
}

/**
 * El tema de la aplicacion y como cambiarlo.
 *
 * El cambio es UN fundido de la pantalla entera, con la View Transitions API:
 * el navegador fotografia la pagina antes y despues y funde las dos fotos en
 * la GPU. Antes cada elemento con .transicion-tema fundia su propio color en
 * 200 ms y el resto -las tarjetas del mapa, el cristal- cambiaba de golpe;
 * unos llegaban antes que otros y el cambio se leia como un retraso, no como
 * una transicion. Durante el fundido data-cambiando-tema apaga esas
 * transiciones sueltas, para que la foto de "despues" sea el estado final.
 *
 * Donde la API no existe, o si el sistema pide menos movimiento, el tema
 * cambia como antes: cada pieza con su transicion corta.
 *
 * El atributo se pone en un efecto de layout y el estado se cambia con
 * flushSync: los dos tienen que haber ocurrido cuando el navegador saca la
 * foto de "despues", que es en cuanto vuelve la funcion que se le pasa.
 */
export function useTema() {
  const [tema, setTema] = useState(temaInicial)

  useLayoutEffect(() => {
    document.documentElement.dataset.tema = tema
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLOR_BARRA[tema])
    guardar(CLAVE, tema)
  }, [tema])

  const alternarTema = useCallback(() => {
    const cambiar = () =>
      flushSync(() => setTema((t) => (t === 'oscuro' ? 'claro' : 'oscuro')))

    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!document.startViewTransition || sinMovimiento) {
      cambiar()
      return
    }

    const raiz = document.documentElement
    raiz.dataset.cambiandoTema = ''
    document
      .startViewTransition(cambiar)
      .finished.finally(() => delete raiz.dataset.cambiandoTema)
  }, [])

  return { tema, alternarTema }
}
