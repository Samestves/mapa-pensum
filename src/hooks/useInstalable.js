import { useCallback, useEffect, useState } from 'react'
import { guardar, leer } from '../data/almacen'

const CLAVE = 'mapa-pensum:instalar-descartado'

const yaInstalada = () =>
  window.__instalada === true ||
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true

const esIOS = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
  // iPadOS 13+ miente y dice ser un Mac; se delata por el tactil
  (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)

/**
 * Telefono o tableta contra ordenador.
 *
 * userAgentData.mobile es la respuesta buena y viene de serie justo donde
 * hace falta: beforeinstallprompt solo existe en navegadores Chromium, que
 * son los mismos que traen userAgentData. El puntero grueso queda de reserva
 * para los que aun no lo exponen.
 *
 * No vale mirar el ancho de la ventana. Una ventana estrecha en un portatil
 * es un portatil, y ofrecerle "guardala en tu telefono" a alguien que esta
 * en un PC con el navegador a media pantalla es delatar que se esta
 * adivinando.
 */
const esMovil = () => {
  if (window.navigator.userAgentData) return window.navigator.userAgentData.mobile === true
  return window.matchMedia('(pointer: coarse)').matches
}

const descartado = () => leer(CLAVE) === 'si'

/**
 * Decide si ofrecer instalar la aplicacion, a quien, y como.
 *
 * Hay tres caminos porque ni los navegadores ni los aparatos se parecen:
 *
 *   movil       Chromium en telefono. Hay dialogo del sistema, y el
 *               argumento que importa es abrir sin datos.
 *   escritorio  Chromium en PC. Tambien hay dialogo, pero el argumento es
 *               otro: una ventana propia sin barra de navegador. Prometerle
 *               a alguien en un PC que "no gastara datos" no dice nada.
 *   ios         Safari no tiene beforeinstallprompt ni lo va a tener, asi
 *               que ahi solo se puede explicar el gesto manual.
 *
 * El evento NO se escucha aqui. Llega antes de que React monte, asi que lo
 * recoge un script del head y lo deja en window; esto solo lo consulta. Ver
 * el comentario de index.html, que es donde esta el porque.
 */
export function useInstalable() {
  const [evento, setEvento] = useState(null)
  const [modo, setModo] = useState(null)

  useEffect(() => {
    if (yaInstalada() || descartado()) return

    let vigente = true
    let reloj

    /* En el PC espera mas. En el telefono guardar la aplicacion resuelve un
       problema real -abrirla sin datos-, asi que a los pocos segundos ya es
       util. En un PC es una comodidad, y una comodidad que interrumpe a los
       tres segundos de llegar molesta mas de lo que ofrece. */
    const revisar = () => {
      if (!vigente) return
      if (yaInstalada()) {
        setEvento(null)
        setModo(null)
        return
      }
      const guardado = window.__instalable
      if (guardado) {
        setEvento(guardado)
        const movil = esMovil()
        clearTimeout(reloj)
        reloj = setTimeout(
          () => vigente && setModo(movil ? 'movil' : 'escritorio'),
          movil ? 2600 : 7000,
        )
      }
    }

    // Lo que ya estuviera esperando desde antes de que montaramos
    revisar()
    // Y lo que llegue despues, si Chrome tardo mas que nosotros
    window.addEventListener('instalable', revisar)

    // En iPhone el evento no existe: se ofrece el camino manual
    if (!window.__instalable && esIOS()) {
      reloj = setTimeout(() => vigente && setModo('ios'), 2600)
    }

    return () => {
      vigente = false
      clearTimeout(reloj)
      window.removeEventListener('instalable', revisar)
    }
  }, [])

  const instalar = useCallback(async () => {
    if (!evento) return
    evento.prompt()
    await evento.userChoice
    /* El evento no se puede reutilizar. Se suelta tambien de window: si
       alguien cancela el dialogo, Chrome disparara otro cuando vuelva a
       tocar, y el viejo ya no sirve para nada. */
    window.__instalable = null
    setEvento(null)
    setModo(null)
  }, [evento])

  const descartar = useCallback(() => {
    // Si no se puede recordar, al menos se cierra ahora
    guardar(CLAVE, 'si')
    setModo(null)
  }, [])

  return { modo, instalar, descartar }
}
