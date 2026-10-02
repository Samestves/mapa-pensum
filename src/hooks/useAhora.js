import { useEffect, useState } from 'react'

/**
 * La fecha de ahora, al minuto. De ella salen el dia de hoy, la linea de
 * "ahora" y las fechas de la semana del horario (ver momentoEnSemana y
 * fechasDeSemana).
 *
 * Se despierta una vez por minuto y justo al cambiar de minuto, no cada
 * sesenta segundos desde que se monto: asi la linea de "ahora" avanza a la
 * vez que el reloj del sistema y no hasta un minuto tarde. Con la pestaña
 * oculta el navegador retrasa el temporizador, y al volver se recoloca sola.
 */
export function useAhora() {
  const [ahora, setAhora] = useState(() => new Date())

  useEffect(() => {
    let reloj
    const programar = () => {
      const fecha = new Date()
      reloj = setTimeout(
        () => {
          setAhora(new Date())
          programar()
        },
        60_000 - fecha.getSeconds() * 1000 - fecha.getMilliseconds(),
      )
    }
    programar()
    return () => clearTimeout(reloj)
  }, [])

  return ahora
}
