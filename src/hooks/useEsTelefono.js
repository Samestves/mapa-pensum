import { useEffect, useState } from 'react'

/* El corte esta donde deja de caber una semana de cinco columnas: por debajo
   de esto el horario cambia de forma, no solo de tamaño. */
const CONSULTA = '(max-width: 767px)'

/**
 * True mientras la ventana sea de telefono. Se re-evalua al girar.
 *
 * Vivia copiado dentro de PopoverClase. Ahora que el horario tiene dos formas
 * -semana en escritorio, un dia en telefono- la pregunta la hacen varios
 * sitios, y dos copias del mismo corte es como acaban desincronizadas.
 */
export function useEsTelefono() {
  const [es, setEs] = useState(() => window.matchMedia(CONSULTA).matches)

  useEffect(() => {
    const mq = window.matchMedia(CONSULTA)
    const alCambiar = (e) => setEs(e.matches)
    mq.addEventListener('change', alCambiar)
    return () => mq.removeEventListener('change', alCambiar)
  }, [])

  return es
}
