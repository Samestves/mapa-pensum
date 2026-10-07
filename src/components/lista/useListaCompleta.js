import { startTransition, useEffect, useState } from 'react'

/* Las secciones que se pintan al entrar: las que caben en la primera
   pantalla, y alguna de sobra. */
export const PRIMERAS_SECCIONES = 3

/**
 * Si ya toca pintar la lista entera. Entrar a la lista eran dos mil y pico
 * nodos de una vez, y en un telefono modesto el toque en "Lista" se quedaba
 * colgado hasta que estaban todos. Asi se pinta primero lo que se ve, y el
 * resto en el fotograma siguiente, como transicion: si entretanto llega un
 * toque, el toque va primero. Para cuando alguien baja, ya esta.
 */
export function useListaCompleta() {
  const [completa, setCompleta] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => startTransition(() => setCompleta(true)))
    return () => cancelAnimationFrame(id)
  }, [])
  return completa
}
