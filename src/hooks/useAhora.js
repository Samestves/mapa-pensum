import { useEffect, useState } from 'react'

const MINUTO = 60_000

/* Lunes es 0 y domingo 6, igual que los dias del horario */
function leer() {
  const fecha = new Date()
  return { dia: (fecha.getDay() + 6) % 7, minuto: fecha.getHours() * 60 + fecha.getMinutes() }
}

/**
 * El dia y el minuto de ahora mismo. Se pone al dia solo.
 *
 * No es un intervalo de sesenta segundos contados desde que se monta: asi el
 * horario diria las 8:40 hasta las 8:40:59, y una clase que acaba a las 8:40
 * seguiria "en curso" casi un minuto de mas. El reloj se arma para saltar
 * justo cuando cambia el minuto, y se vuelve a armar cada vez.
 *
 * Al volver a la pestaña se lee de nuevo: los navegadores duermen los relojes
 * de lo que no se ve, y un telefono que se desbloquea a las diez no puede
 * seguir enseñando la clase de las ocho.
 *
 * El estado solo cambia cuando cambia el minuto, asi que quien lo usa se
 * repinta una vez por minuto y no mas.
 */
export function useAhora() {
  const [ahora, setAhora] = useState(leer)

  useEffect(() => {
    let reloj

    const ponerAlDia = () =>
      setAhora((previo) => {
        const nuevo = leer()
        return nuevo.dia === previo.dia && nuevo.minuto === previo.minuto ? previo : nuevo
      })

    const armar = () => {
      reloj = setTimeout(
        () => {
          ponerAlDia()
          armar()
        },
        MINUTO - (Date.now() % MINUTO) + 40,
      )
    }

    const alVolver = () => {
      if (!document.hidden) ponerAlDia()
    }

    armar()
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      clearTimeout(reloj)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [])

  return ahora
}
