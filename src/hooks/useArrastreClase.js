import { useCallback, useEffect, useRef, useState } from 'react'
import { imantarInicio, posicionValida } from '../layout/horario'

/* Pixeles que hay que mover el puntero para que un click pase a ser arrastre.
   Sin este margen, un pulso tembloroso moveria la clase en vez de abrirla. */
const UMBRAL = 5

/**
 * Arrastrar una clase por la semana.
 *
 * La propuesta que se pinta mientras dura el gesto es SIEMPRE una posicion
 * legal: el iman la pega a los bordes de sus vecinas y, si el puntero la lleva
 * encima de otra, salta al hueco contiguo mas cercano. Asi soltar no puede
 * fallar nunca y no hace falta un estado de error a mitad del arrastre.
 *
 * El gesto se sigue en la ventana y no en el bloque: al arrastrar rapido el
 * puntero se sale del elemento, y con manejadores locales el movimiento se
 * perderia justo cuando mas se nota. Se sale por soltar, por Escape, por
 * pointercancel y por perder el foco de la ventana; sin lo ultimo, un alt-tab
 * a mitad de gesto dejaria la clase pegada al raton para siempre.
 */
export function useArrastreClase({ puntoADiaYMinuto, porDia, alMover, alPulsar }) {
  const [gesto, setGesto] = useState(null)

  /* El gesto vive tambien en una ref. Los manejadores de la ventana leen de
     aqui y no de dentro de un updater de setState: un updater tiene que ser
     puro -React puede llamarlo mas de una vez- y guardar la clase desde
     dentro de uno es pedir que se guarde dos veces. */
  const ref = useRef(null)
  const cambiar = useCallback((g) => {
    ref.current = g
    setGesto(g)
  }, [])

  const agarrar = useCallback(
    (sesion, e) => {
      if (e.button !== 0) return
      const { minuto } = puntoADiaYMinuto(e.clientX, e.clientY)
      cambiar({
        sesion,
        elemento: e.currentTarget,
        // Por donde se agarro dentro del bloque, para que no de un salto
        pinza: minuto - sesion.inicio,
        origen: { x: e.clientX, y: e.clientY },
        movido: false,
        propuesta: sesion,
      })
    },
    [cambiar, puntoADiaYMinuto],
  )

  useEffect(() => {
    if (!gesto) return

    const alMoverPuntero = (e) => {
      const g = ref.current
      if (!g) return

      const lejos =
        Math.abs(e.clientX - g.origen.x) > UMBRAL || Math.abs(e.clientY - g.origen.y) > UMBRAL
      if (!g.movido && !lejos) return

      const { dia, minuto } = puntoADiaYMinuto(e.clientX, e.clientY)
      const duracion = g.sesion.fin - g.sesion.inicio
      const vecinas = porDia[dia].filter((s) => s.id !== g.sesion.id)

      const inicio = imantarInicio(minuto - g.pinza, duracion, vecinas)
      const legal = posicionValida(porDia[dia], {
        ...g.sesion,
        dia,
        inicio,
        fin: inicio + duracion,
      })

      // Si el dia no tiene sitio, se conserva la ultima propuesta buena
      cambiar({ ...g, movido: true, propuesta: legal ?? g.propuesta })
    }

    const alSoltar = () => {
      const g = ref.current
      cambiar(null)
      if (!g) return
      if (!g.movido) {
        alPulsar(g.sesion, g.elemento)
        return
      }
      // Soltar donde ya estaba no es un cambio: no se reescribe el horario
      const p = g.propuesta
      const igual =
        p.dia === g.sesion.dia && p.inicio === g.sesion.inicio && p.fin === g.sesion.fin
      if (!igual) alMover(p)
    }

    // Abandonar deja la clase donde estaba: no se guarda la propuesta
    const abandonar = () => cambiar(null)
    const alTeclear = (e) => e.key === 'Escape' && abandonar()

    window.addEventListener('pointermove', alMoverPuntero)
    window.addEventListener('pointerup', alSoltar)
    window.addEventListener('pointercancel', abandonar)
    window.addEventListener('blur', abandonar)
    window.addEventListener('keydown', alTeclear)
    return () => {
      window.removeEventListener('pointermove', alMoverPuntero)
      window.removeEventListener('pointerup', alSoltar)
      window.removeEventListener('pointercancel', abandonar)
      window.removeEventListener('blur', abandonar)
      window.removeEventListener('keydown', alTeclear)
    }
  }, [gesto, cambiar, porDia, puntoADiaYMinuto, alMover, alPulsar])

  return {
    agarrar,
    /* Solo cuenta como arrastre a partir del umbral: mientras no se pase, el
       gesto sigue siendo un click en potencia y nada debe moverse. */
    arrastrando: gesto?.movido ? gesto : null,
  }
}
