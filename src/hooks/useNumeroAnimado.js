import { useEffect, useRef, useState } from 'react'

/**
 * Lleva un numero hasta su valor destino con una interpolacion suave.
 * Se usa para que el porcentaje de avance suba contando en vez de saltar.
 */
export function useNumeroAnimado(destino, duracion = 600) {
  const [valor, setValor] = useState(destino)
  const desde = useRef(destino)
  const cuadro = useRef(0)

  useEffect(() => {
    // Si el usuario pidio menos animacion, se salta directo al valor
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValor(destino)
      desde.current = destino
      return
    }

    const inicio = performance.now()
    const origen = desde.current

    const paso = (ahora) => {
      const t = Math.min((ahora - inicio) / duracion, 1)
      // easeOutCubic: arranca rapido y frena al final
      const suave = 1 - Math.pow(1 - t, 3)
      setValor(origen + (destino - origen) * suave)
      if (t < 1) {
        cuadro.current = requestAnimationFrame(paso)
      } else {
        desde.current = destino
      }
    }

    cuadro.current = requestAnimationFrame(paso)

    // Red de seguridad: si requestAnimationFrame no corre (pestana en
    // segundo plano, por ejemplo) el numero se quedaria congelado en un
    // valor viejo. Pasado el tiempo de la animacion se fuerza el destino.
    const red = setTimeout(() => {
      setValor(destino)
      desde.current = destino
    }, duracion + 250)

    return () => {
      cancelAnimationFrame(cuadro.current)
      clearTimeout(red)
    }
  }, [destino, duracion])

  return valor
}
