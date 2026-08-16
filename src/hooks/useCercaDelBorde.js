import { useEffect, useState } from 'react'

/**
 * Si el puntero anda cerca del borde de arriba de la ventana.
 *
 * Existe para un caso concreto: con la barra plegada no queda nada sobre lo
 * que hacer hover, asi que el boton que la devuelve no tiene de donde
 * aparecer. La alternativa era plantar una franja invisible que capture el
 * puntero, pero eso roba los clicks de esa franja a lo que haya debajo -en
 * el horario, la primera hora de la manana-, y un control que estorba a lo
 * que controla no sirve.
 *
 * Escuchar el puntero en la ventana no ocupa ni un pixel de pantalla. Solo se
 * engancha cuando hace falta, y solo cambia el estado al cruzar el umbral, no
 * en cada movimiento.
 */
export function useCercaDelBorde(activo, umbral = 64) {
  const [cerca, setCerca] = useState(false)

  useEffect(() => {
    if (!activo) {
      setCerca(false)
      return
    }
    const alMover = (e) => setCerca(e.clientY <= umbral)
    // Salir de la ventana por abajo no dispara ningun movimiento mas
    const alSalir = () => setCerca(false)

    window.addEventListener('pointermove', alMover)
    document.addEventListener('pointerleave', alSalir)
    return () => {
      window.removeEventListener('pointermove', alMover)
      document.removeEventListener('pointerleave', alSalir)
    }
  }, [activo, umbral])

  return cerca
}
