import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Dice si el usuario lleva un rato sin tocar algo.
 *
 * Lo usa el dock del lienzo para apagarse cuando no hace falta. Devuelve
 * tambien 'despertar', para que quien mueve el mapa pueda avisar sin que
 * este hook tenga que escuchar eventos del documento entero: quien sabe que
 * cuenta como actividad es el lienzo, no un temporizador global.
 */
export function useInactividad(espera = 2000) {
  const [quieto, setQuieto] = useState(false)
  const reloj = useRef(null)

  const despertar = useCallback(() => {
    setQuieto(false)
    clearTimeout(reloj.current)
    reloj.current = setTimeout(() => setQuieto(true), espera)
  }, [espera])

  // Arranca contando: si nadie toca nada, el dock se apaga solo
  useEffect(() => {
    despertar()
    return () => clearTimeout(reloj.current)
  }, [despertar])

  return { quieto, despertar }
}
