import { createElement, lazy, useEffect } from 'react'
import { enReposo } from '../data/reposo'
import { precalentarLector } from '../data/subirHorario'
import { adelantar, conRecarga } from '../data/versionNueva'
import { vistaInicial } from '../data/vistaInicial'

/* Lo de dentro de una carrera, por trozos.

   VistaCarrera era un solo trozo con las tres vistas, el plan y la paleta:
   quien entraba por la lista bajaba y compilaba tambien el mapa y el horario
   antes de ver nada. Ahora con el cascaron -el estado y las barras- llega
   solo la vista que se va a pintar, y lo demas se pide detras.

   Un solo sitio sabe donde se parte, como en vistaDiferida.js y por lo mismo:
   cada trozo se pide para pintarlo y para adelantar su bajada, y tiene que
   ser el mismo pedido. */

/**
 * Un trozo: como pedirlo y el componente que lo pinta cuando llega.
 *
 * Es React.lazy con una diferencia. lazy no se entera de que el codigo llego
 * hasta que intenta pintarlo, asi que la primera vez SIEMPRE espera un
 * momento, aunque el trozo lleve un rato bajado: se empieza a preparar la
 * vista, se tira lo hecho y se vuelve a empezar. Aqui, si ya bajo, se pinta
 * en ese mismo intento: a lazy se le puede dar cualquier cosa que tenga
 * `then`, y uno que contesta en el acto no hace esperar a nadie.
 *
 * Y lazy guarda para siempre el fallo de su primera descarga: una vez
 * rechazado, no vuelve a llamar a la funcion. Por eso, si la descarga falla,
 * el lazy se cambia por uno nuevo, y el siguiente render -al volver a entrar
 * en la vista, tras el boton de la pantalla de error- vuelve a descargar. La
 * envoltura exportada es estable: quien la usa no nota el cambio.
 */
function trozo(importar) {
  const traer = conRecarga(importar)
  let modulo = null
  let enCamino = null
  const pedir = () =>
    (enCamino ??= traer().then(
      (llegado) => (modulo = llegado),
      (fallo) => {
        // Lo que falla no se queda: la proxima peticion vuelve a descargar
        enCamino = null
        throw fallo
      },
    ))
  const yaEsta = { then: (cumplir) => cumplir(modulo) }
  const nuevo = () =>
    lazy(() =>
      modulo
        ? yaEsta
        : pedir().catch((fallo) => {
            Componente = nuevo()
            throw fallo
          }),
    )
  let Componente = nuevo()
  const Envuelto = (props) => createElement(Componente, props)
  return { pedir, Componente: Envuelto }
}

const VISTAS = {
  mapa: trozo(() => import('./GrafoPensum')),
  lista: trozo(() => import('./VistaLista')),
  horario: trozo(() => import('./Horario')),
}
const plan = trozo(() => import('./PlanRuta'))
const paleta = trozo(() => import('./PaletaComandos'))
/* La hoja que lee la foto de un horario, con sus pantallas y sus mensajes:
   se usa una vez por semestre y era un tercio del trozo del horario. */
const lector = trozo(() => import('./ImportarHorario'))

export const GrafoPensum = VISTAS.mapa.Componente
export const VistaLista = VISTAS.lista.Componente
export const Horario = VISTAS.horario.Componente
export const PlanRuta = plan.Componente
export const PaletaComandos = paleta.Componente
export const ImportarHorario = lector.Componente

/**
 * Empieza a bajar una vista, y avisa cuando esta.
 *
 * La primera se pide a la vez que el cascaron (ver vistaDiferida.js): si
 * esperara a que VistaCarrera se pintase para descubrir que vista le toca,
 * serian dos bajadas en fila donde cabe una.
 */
export const pedirVista = (id) => VISTAS[id]?.pedir()
/* Sin esperar la respuesta: si falla, lo dira quien la pinte al volver a pedirla */
export const precargarVistaInicial = () => void pedirVista(vistaInicial())?.catch(() => {})

/**
 * Al tocar "Subir una foto": mientras se busca la captura en la galeria, que
 * son unos segundos, van llegando la hoja que la lee y el lector del aparato.
 */
export function prepararLector() {
  adelantar(lector.pedir)
  precalentarLector()
}

/**
 * Pide lo que falta -las otras vistas, el plan, la paleta- cuando el aparato
 * queda en reposo, para que la primera vez que se abre cada cosa no enseñe
 * una espera. No pinta nada.
 *
 * Va DENTRO del Suspense de las vistas, y por eso es un componente y no un
 * efecto de VistaCarrera: lo que cuelga de un Suspense no corre sus efectos
 * hasta que todo lo de dentro esta en pantalla. Asi lo demas no empieza a
 * bajar hasta que la primera vista ha llegado y se ve, y no le quita red.
 *
 * Con `adelantar`: si la red falla aqui no se recarga nada, que esto no lo ha
 * pedido nadie todavia.
 */
export function PedirElResto() {
  useEffect(
    () =>
      enReposo(() => {
        for (const { pedir } of [...Object.values(VISTAS), plan, paleta]) adelantar(pedir)
      }),
    [],
  )
  return null
}
