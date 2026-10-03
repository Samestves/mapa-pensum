import { useCallback, useLayoutEffect, useState } from 'react'
import { guardar, leer } from '../data/almacen'

const CLAVE = 'mapa-pensum:tema'

/* El color de la barra del navegador en cada tema: el del lienzo. Tiene que
   coincidir con --lienzo de estilos/tema.css y con el script de index.html, que lo
   pone antes del primer pintado. */
const COLOR_BARRA = { oscuro: '#0b0c0e', claro: '#f4f4f4' }

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
 * El cambio es instantaneo y de una sola vez: toda la pantalla pasa al tema
 * nuevo en el mismo fotograma del toque.
 *
 * Antes daba sensacion de retraso por dos cosas. El atributo se ponia en un
 * useEffect, que corre DESPUES de pintar: primero se veia el boton cambiar y
 * un fotograma despues el resto. Y unas piezas fundian su color en 200 ms
 * mientras otras -las tarjetas del mapa- cambiaban de golpe, asi que el tema
 * nuevo iba llegando por partes. Ahora el atributo va en un efecto de layout,
 * que corre antes de pintar, y durante el cambio data-cambiando-tema apaga
 * cualquier transicion de color.
 *
 * Se probo un fundido de pantalla entera con la View Transitions API y se
 * descarto por lo mismo que se descarto para entrar en una carrera (ver el
 * README): el navegador tiene que rasterizar la pagina entera, con el SVG de
 * mil seiscientos elementos del mapa, dos veces. Medido: de 7 a 9 fotogramas
 * perdidos por cambio en escritorio, contra ninguno con el cambio directo.
 */
export function useTema() {
  const [tema, setTema] = useState(temaInicial)

  useLayoutEffect(() => {
    document.documentElement.dataset.tema = tema
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLOR_BARRA[tema])
    guardar(CLAVE, tema)
  }, [tema])

  const alternarTema = useCallback(() => {
    const raiz = document.documentElement
    raiz.dataset.cambiandoTema = ''
    setTema((t) => (t === 'oscuro' ? 'claro' : 'oscuro'))
    // Dos fotogramas: el del cambio y el siguiente, ya pintado en el tema nuevo
    requestAnimationFrame(() => requestAnimationFrame(() => delete raiz.dataset.cambiandoTema))
  }, [])

  return { tema, alternarTema }
}
