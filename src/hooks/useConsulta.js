import { useEffect, useState } from 'react'

/**
 * True mientras la ventana cumpla una consulta de medios. Se re-evalua sola
 * cuando deja de cumplirla: al girar el telefono o al estirar la ventana.
 *
 * Es para lo que cambia de FORMA con el tamaño, no de medida: lo que solo
 * encoge o crece lo resuelve CSS en el primer fotograma y no necesita esto.
 */
export function useConsulta(consulta) {
  const [cumple, setCumple] = useState(() => window.matchMedia(consulta).matches)

  useEffect(() => {
    const mq = window.matchMedia(consulta)
    const alCambiar = (e) => setCumple(e.matches)
    mq.addEventListener('change', alCambiar)
    return () => mq.removeEventListener('change', alCambiar)
  }, [consulta])

  return cumple
}
