import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Dice si el usuario lleva un rato sin tocar algo.
 *
 * Lo usa el dock del lienzo para apagarse cuando no hace falta. Devuelve
 * tambien 'despertar', para que quien mueve el mapa pueda avisar sin que
 * este hook tenga que escuchar eventos del documento entero: quien sabe que
 * cuenta como actividad es el lienzo, no un temporizador global.
 *
 * Con `activo` en false no arranca el reloj: donde no hay dock que apagar
 * -el telefono- no hay por que repintar el mapa cada dos segundos.
 */
export function useInactividad(espera = 2000, activo = true) {
  const [quieto, setQuieto] = useState(false)
  const reloj = useRef(null)

  const despertar = useCallback(() => {
    setQuieto(false)
    clearTimeout(reloj.current)
    reloj.current = setTimeout(() => setQuieto(true), espera)
  }, [espera])

  // Arranca contando: si nadie toca nada, el dock se apaga solo
  useEffect(() => {
    if (!activo) return
    despertar()
    return () => clearTimeout(reloj.current)
  }, [despertar, activo])

  return { quieto, despertar }
}
