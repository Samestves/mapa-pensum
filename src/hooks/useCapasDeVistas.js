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
 * verse, las animaciones de la vista empiezan de nuevo (la vista entra
 * fundiendose, las secciones de la lista suben). Se reinician solo las de la
 * capa que se acaba de enseñar.
 *
 * `enPantalla` es la vista que se ve. Devuelve la ref del contenedor de las
 * capas; cada capa lleva data-vista con su id y data-oculta.
 */
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
    quitarDisplay()
    const vigia = new MutationObserver(quitarDisplay)
    vigia.observe(contenedor, {
      attributes: true,
      subtree: true,
      attributeFilter: ['style', 'data-oculta'],
    })
    return () => vigia.disconnect()
  }, [])

  useLayoutEffect(() => {
    const antes = vista.current
    vista.current = enPantalla
    if (antes === enPantalla || !raiz.current) return
    const capa = raiz.current.querySelector(`:scope > [data-vista="${enPantalla}"]`)
    for (const animacion of capa?.firstElementChild?.getAnimations({ subtree: true }) ?? []) {
      animacion.currentTime = 0
      animacion.play()
    }
  }, [enPantalla])

  return raiz
}
