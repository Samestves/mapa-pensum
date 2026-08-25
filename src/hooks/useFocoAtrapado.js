import { useEffect } from 'react'

/* Lo que se puede enfocar con Tab. Los disabled quedan fuera porque el
   navegador ya los salta, y tabindex="-1" tambien: ese valor significa
   "enfocable a mano pero no con Tab". */
const FOCALIZABLES = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * Encierra el foco dentro de una capa que se abre encima de todo.
 *
 * Hace tres cosas que hay que hacer juntas o no sirve ninguna: mete el foco
 * dentro al abrir, impide que Tab se escape mientras esta abierta, y lo
 * devuelve exactamente a donde estaba al cerrarse.
 *
 * Sin esto, abrir el planificador con el teclado dejaba el foco en el boton
 * que hay DEBAJO del velo: la primera pulsacion de Tab llevaba a la barra
 * superior, que esta tapada y difuminada, y desde ahi se recorria una pagina
 * que no se ve. Medido en el navegador antes de arreglarlo: con el modal
 * abierto seguia habiendo siete botones de la cabecera alcanzables con Tab.
 *
 * Solo para lo que de verdad es modal -tapa la pantalla y no se puede usar
 * nada de detras-. Una nubecita anclada a un boton NO lleva esto: ahi el
 * foco se queda en el boton que la abrio, que es lo correcto, y el contenido
 * queda a un Tab de distancia porque va despues en el arbol.
 *
 * `enfocarLoPrimero` separa dos cosas que parecen una sola: encerrar el foco
 * y METERLO en el primer control. Casi siempre se quieren juntas, pero en la
 * hoja de una clase en telefono no: su primer control es un campo de texto, y
 * enfocarlo levanta el teclado del sistema, que tapa la mitad de abajo de la
 * hoja que acaba de subir -justo donde estan las materias ya desbloqueadas,
 * que es como se elige casi siempre-. Ahi el foco va a la capa misma: Tab
 * sigue sin poder escaparse y el lector de pantalla anuncia donde esta, pero
 * el teclado sale cuando alguien decide escribir, no antes.
 */
export function useFocoAtrapado(ref, activo = true, enfocarLoPrimero = true) {
  useEffect(() => {
    const capa = ref.current
    if (!activo || !capa) return

    const veniaDe = document.activeElement

    /* Se recalcula en cada Tab en vez de guardarse una lista al abrir: el
       contenido de estas capas cambia solo -el buscador de materias sustituye
       sus resultados segun escribes, los ajustes se pliegan-, y una lista
       vieja mandaria el foco a botones que ya no existen. */
    const dentro = () =>
      [...capa.querySelectorAll(FOCALIZABLES)].filter((e) => e.getClientRects().length > 0)

    const primeros = dentro()
    if (enfocarLoPrimero && primeros.length) {
      primeros[0].focus()
    } else {
      // A la capa misma: el lector de pantalla anuncia donde esta y Tab
      // arranca desde dentro, sin enfocar ningun control todavia
      capa.setAttribute('tabindex', '-1')
      capa.focus()
    }

    const alTabular = (e) => {
      if (e.key !== 'Tab') return
      const lista = dentro()
      if (!lista.length) return e.preventDefault()

      const primero = lista[0]
      const ultimo = lista[lista.length - 1]

      if (!capa.contains(document.activeElement)) {
        e.preventDefault()
        primero.focus()
      } else if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primero.focus()
      }
    }

    // En captura: asi se adelanta a cualquier manejador de Tab del contenido
    document.addEventListener('keydown', alTabular, true)

    return () => {
      document.removeEventListener('keydown', alTabular, true)
      /* Y de vuelta a donde estaba. Se comprueba que siga en el documento
         porque el boton que abrio la capa puede haber desaparecido mientras
         tanto -cambiar de vista, por ejemplo-, y enfocar un nodo suelto deja
         el foco en el <body>, que es peor que no tocarlo. */
      if (veniaDe instanceof HTMLElement && document.contains(veniaDe)) veniaDe.focus()
    }
  }, [ref, activo, enfocarLoPrimero])
}
