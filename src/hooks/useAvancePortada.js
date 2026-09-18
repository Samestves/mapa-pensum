import { useEffect, useState } from 'react'
import { cargarCarrera } from '../data/carreras'
import { avanceGuardado } from '../data/avance'
import { marcasGuardadasDe } from './usePensum'

/**
 * Cuanto llevas en cada carrera, para la portada.
 *
 * El indice que ya esta en la portada no trae las materias -son lo pesado de
 * cada carrera-, asi que para saber cuantas aprobaste de cada semestre hay
 * que bajar el pensum. Se baja SOLO el de las carreras donde tienes marcas,
 * que casi siempre es una, y despues de pintar: la portada sale en el acto y
 * la silueta de tu carrera se enciende un instante despues. De paso ese
 * pensum queda en memoria, y entrar a tu carrera es inmediato.
 */
export function useAvancePortada(carreras) {
  const [avances, setAvances] = useState({})

  useEffect(() => {
    let vigente = true
    for (const carrera of carreras) {
      const marcas = marcasGuardadasDe(carrera.slug)
      if (!marcas || !Object.keys(marcas).length) continue
      cargarCarrera(carrera.slug)
        .then((datos) => {
          if (!vigente) return
          setAvances((previos) => ({ ...previos, [carrera.slug]: avanceGuardado(datos, marcas) }))
        })
        .catch(() => {
          // Sin el pensum no hay avance que enseñar; la portada sigue igual
        })
    }
    return () => {
      vigente = false
    }
  }, [carreras])

  return avances
}
