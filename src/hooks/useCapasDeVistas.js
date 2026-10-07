import { useLayoutEffect, useRef } from 'react'

/**
 * Las vistas de una carrera, apiladas en capas: la que se deja se oculta con
 * content-visibility: hidden y no con display:none.
 *
 * Por que. Cada vista vive en un <Activity> (ver VistaCarrera): oculta, React
 * no trabaja en ella -desconecta sus efectos y deja sus renders para cuando
 * sobre tiempo- y volver es enseñarla, no montarla. Pero Activity la oculta
 * con display:none, y display:none tira el maquetado: volver a la lista o al
 * mapa era maquetarlos enteros otra vez, 1 300 y 2 000 objetos, ~0,4 s con un
 * telefono modesto. content-visibility: hidden tampoco la pinta ni la deja
 * tocar, ni la enseña al lector de pantalla, pero guarda el maquetado: medido,
 * volver cuesta 40-80 objetos y se ve en ~35 ms. La memoria no cambia (mismas
 * capas de la GPU y el mismo heap con las tres vistas vivas).
 *
 * Como. React pone el display:none en linea, con !important, sobre lo primero
 * que hay dentro del Activity, y ningun CSS le gana. Asi que cada Activity va
 * dentro de una capa (.capa-vista, fuera del Activity, que React actualiza en
 * el acto) que es la que se oculta, y este hook le quita a lo de dentro el
 * display:none en cuanto React lo pone. Lo vigila con un MutationObserver y
 * no con un efecto de la vista elegida, porque React no siempre oculta en el
 * mismo commit: un Suspense que vuelve a enseñar lo suyo lo hace en otro. Y
 * el observador corre antes del siguiente pintado, asi que el navegador nunca
 * llega a tirar el maquetado. Cuando la capa se enseña, React quita el
 * display:none por su cuenta, que ya no esta.
 *
 * Lo que display:none hacia sin pedirlo y aqui se hace a mano: al volver a
 * verse, las animaciones de CSS de la vista empiezan de nuevo (la vista entra
 * fundiendose, las secciones de la lista suben). Se rebobinan solo las de la
 * capa que se acaba de enseñar, y solo las de CSS: las que crea el codigo con
 * element.animate() display:none no las tocaba, y hay una que no se puede
 * tocar, la que mueve el mapa en los gestos (layout/moverCapa.js), que vive
 * en pausa. Se rebobinan sin play(): play() deja la animacion fuera de lo que
 * diga el CSS para siempre, y el mapa pausa las luces de los cables con CSS
 * mientras se arrastra. Reanudar aquella animacion, que dura un segundo, la
 * terminaba, y el mapa dejaba de moverse con el dedo al volver a el.
 *
 * `enPantalla` es la vista que se ve. Devuelve la ref del contenedor de las
 * capas; cada capa lleva data-vista con su id y data-oculta.
 */
// Safari anterior a la 13.1 no la tiene; ahi no se rebobina nada
const CON_CSS = typeof CSSAnimation !== 'undefined'

export function useCapasDeVistas(enPantalla) {
  const raiz = useRef(null)
  const vista = useRef(enPantalla)

  useLayoutEffect(() => {
    const contenedor = raiz.current
    if (!contenedor) return
    const quitarDisplay = () => {
      for (const capa of contenedor.querySelectorAll(':scope > [data-oculta="true"]')) {
        const dentro = capa.firstElementChild
        if (dentro?.style.display === 'none') dentro.style.removeProperty('display')
      }
    }
    /* Se vigila solo lo que React toca para ocultar: que capas hay, si estan
       ocultas y el style de lo primero de cada una. No el style de todo lo de
       dentro: el mapa lo cambia en cada cuadro de un gesto en Safari. */
    const vigia = new MutationObserver((cambios) => {
      if (cambios.some((c) => c.type === 'childList')) enlazar()
      else quitarDisplay()
    })
    const enlazar = () => {
      vigia.disconnect()
      vigia.observe(contenedor, { childList: true })
      for (const capa of contenedor.querySelectorAll(':scope > [data-vista]')) {
        vigia.observe(capa, { childList: true, attributes: true, attributeFilter: ['data-oculta'] })
        if (capa.firstElementChild)
          vigia.observe(capa.firstElementChild, { attributes: true, attributeFilter: ['style'] })
      }
      quitarDisplay()
    }
    enlazar()
    return () => vigia.disconnect()
  }, [])

  useLayoutEffect(() => {
    const antes = vista.current
    vista.current = enPantalla
    if (antes === enPantalla || !raiz.current) return
    const capa = raiz.current.querySelector(`:scope > [data-vista="${enPantalla}"]`)
    for (const animacion of capa?.firstElementChild?.getAnimations({ subtree: true }) ?? []) {
      if (CON_CSS && animacion instanceof CSSAnimation) animacion.currentTime = 0
    }
  }, [enPantalla])

  return raiz
}
