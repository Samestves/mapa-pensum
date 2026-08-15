import { useCallback, useEffect, useState } from 'react'
import { guardar, leer } from '../data/almacen'

const CLAVE = 'mapa-pensum:instalar-descartado'

const yaInstalada = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

const esIOS = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent)

const descartado = () => leer(CLAVE) === 'si'

/**
 * Decide si ofrecer instalar la aplicacion, y como.
 *
 * Hay dos caminos porque los navegadores no se ponen de acuerdo. Chrome y
 * Edge disparan beforeinstallprompt y dejan abrir el dialogo del sistema.
 * Safari en iPhone no tiene nada de eso: ahi solo se puede explicar el gesto,
 * que es Compartir y luego "Añadir a inicio".
 *
 * El aviso tarda unos segundos en aparecer a proposito. Saltar encima de
 * alguien que acaba de abrir la web, antes de que vea que es, es como se
 * consigue que lo cierren sin leerlo.
 */
export function useInstalable(retraso = 2600) {
  const [evento, setEvento] = useState(null)
  const [modo, setModo] = useState(null)

  useEffect(() => {
    if (yaInstalada() || descartado()) return

    let vigente = true
    let reloj

    const alPoderInstalar = (e) => {
      // Sin esto Chrome enseña su propia barra y salen dos avisos
      e.preventDefault()
      setEvento(e)
      reloj = setTimeout(() => vigente && setModo('dialogo'), retraso)
    }

    window.addEventListener('beforeinstallprompt', alPoderInstalar)

    // En iPhone el evento no existe, asi que se ofrece el camino manual
    if (esIOS()) reloj = setTimeout(() => vigente && setModo('ios'), retraso)

    // Si la instalan, el aviso sobra desde ese mismo instante
    const alInstalar = () => {
      setModo(null)
      setEvento(null)
    }
    window.addEventListener('appinstalled', alInstalar)

    return () => {
      vigente = false
      clearTimeout(reloj)
      window.removeEventListener('beforeinstallprompt', alPoderInstalar)
      window.removeEventListener('appinstalled', alInstalar)
    }
  }, [retraso])

  const instalar = useCallback(async () => {
    if (!evento) return
    evento.prompt()
    await evento.userChoice
    // El evento no se puede reutilizar: se dispara otro si vuelve a aplicar
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
