import { useCallback, useEffect, useRef, useState } from 'react'

/* Cuanto tiene que pararse el raton en una tarjeta para encender su ruta.
   Encenderla monta el plano de foco y el de lo que sale (ver PlanosFoco):
   hacerlo en cada tarjeta que el raton cruza de pasada eran cuadros de
   hasta 90 ms al barrer el mapa. Parado, 80 ms no se notan. */
const INTENCION_MS = 80

/**
 * La materia que señala el raton en el mapa, con la intencion que hace falta
 * para encenderla y el retardo con que se suelta.
 *
 * `refEnGesto` es la ref de useVistaGrafo que dice si el mapa se esta
 * moviendo, y `enGesto` el mismo dato como estado. Devuelve el señalado y las
 * dos funciones que les pasan las tarjetas; son estables, que es lo unico que
 * mantiene vivo su memo.
 */
export function useSenalado(refEnGesto, enGesto) {
  /* La materia que señala el raton. Vive aqui y no mas arriba a proposito:
     cambia cada vez que el raton cruza una tarjeta, y en VistaCarrera cada
     cambio repintaba la pantalla entera -cabecera, paneles, paleta- para
     algo que solo le importa al mapa. */
  const [senalado, alSenalar] = useState(null)

  /* Señalar se ignora mientras el mapa se mueve: quien arrastra el mapa lo
     esta moviendo, no inspeccionando lo que le pasa por debajo, y cada
     tarjeta cruzada encenderia y apagaria su cadena.
     Se consulta una ref y no el estado para no cambiar de identidad, que es
     lo unico que mantiene vivo el memo. */
  /* Soltar el señalado espera un poco; cambiarlo, no.

     Entre dos tarjetas hay hueco, asi que al pasar de una a otra el puntero
     SALE de la primera antes de ENTRAR en la segunda. Con el soltado
     inmediato habia un instante sin nada señalado: el mapa entero volvia a
     encenderse y enseguida se apagaba otra vez para la segunda, y como las
     opacidades llevan transicion, ese ida y vuelta se veia como un destello
     de todas las tarjetas antes del resaltado bueno.

     Ahora salir solo PROGRAMA soltar, y entrar en otra tarjeta lo cancela y
     cambia directamente de una cadena a otra. Si de verdad te fuiste al
     lienzo vacio, a los 160 ms se suelta igual. Cruzar la fila de 26 px entre
     dos tarjetas lleva bastante menos que eso a cualquier velocidad normal. */
  const relojSoltar = useRef(null)
  const relojSenalar = useRef(null)

  /* Entrar en una tarjeta PROGRAMA encenderla (ver INTENCION_MS): si el
     raton sigue de largo, salir lo cancela y no se monta nada. Lo que
     estuviera encendido se queda hasta que la nueva se encienda, asi que
     pasar despacio de una tarjeta a la de al lado no apaga el mapa entre
     medias. */
  const senalar = useCallback(
    (codigo) => {
      if (refEnGesto.current) return
      clearTimeout(relojSoltar.current)
      clearTimeout(relojSenalar.current)
      relojSenalar.current = setTimeout(() => alSenalar(codigo), INTENCION_MS)
    },
    [alSenalar, refEnGesto],
  )
  const dejarDeSenalar = useCallback(() => {
    clearTimeout(relojSenalar.current)
    clearTimeout(relojSoltar.current)
    relojSoltar.current = setTimeout(() => alSenalar(null), 160)
  }, [alSenalar])

  useEffect(
    () => () => {
      clearTimeout(relojSoltar.current)
      clearTimeout(relojSenalar.current)
    },
    [],
  )

  /* Y al empezar a mover, lo que hubiera resaltado se apaga. Arrastrar el
     mapa con media pantalla atenuada estorba para ver a donde se va, y de
     paso deja el gesto con el arbol en su estado mas barato. */
  useEffect(() => {
    if (!enGesto) return
    clearTimeout(relojSenalar.current)
    clearTimeout(relojSoltar.current)
    alSenalar(null)
  }, [enGesto, alSenalar])

  return { senalado, senalar, dejarDeSenalar }
}
