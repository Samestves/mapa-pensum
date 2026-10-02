import { useEffect, useState } from 'react'

/**
 * Si lo que acaba de montarse ya puede entrar: true dos fotogramas despues
 * de montarse, false mientras no este montado.
 *
 * Es para las hojas y los paneles que entran con una transicion. El primer
 * fotograma de uno recien montado es el mas caro de la app -maquetar todo
 * lo que lleva dentro, y la primera vez ademas compilar su codigo-, y en un
 * telefono modesto pasa de los cien milisegundos. Con una animacion que
 * arrancaba en ese mismo fotograma, el reloj de la animacion corria mientras
 * el telefono maquetaba, y la hoja aparecia de golpe a medio camino: el
 * "salto" que se veia al abrir el avance o una electiva.
 *
 * Asi ese fotograma se pinta con la pieza todavia fuera de la pantalla, y la
 * subida empieza en el siguiente, con todo ya hecho. Dos requestAnimationFrame
 * y no uno: el primero corre antes de pintar el fotograma del montaje; el
 * segundo, ya en el siguiente.
 */
export function useEntrada(montado) {
  const [dentro, setDentro] = useState(false)
  if (!montado && dentro) setDentro(false)

  useEffect(() => {
    if (!montado) return
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => setDentro(true))
    })
    return () => cancelAnimationFrame(id)
  }, [montado])

  return dentro
}
