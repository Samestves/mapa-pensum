import { useEffect, useState } from 'react'
import { cargarCarrera } from '../data/carreras'
import { resumenParaPortada } from '../data/avance'
import { marcasGuardadasDe } from './usePensum'

/**
 * Lo que llevas de cada carrera donde tienes marcas: los puntos encendidos de
 * su silueta, el porcentaje y cuantas puedes inscribir (ver
 * resumenParaPortada).
 *
 * El indice que ya esta en la portada no trae las materias -son lo pesado de
 * cada carrera-, asi que hay que bajar el pensum. Se baja SOLO el de las
 * carreras donde tienes marcas, que casi siempre es una, y despues de pintar:
 * la portada sale en el acto y tu avance llega un instante despues. De paso
 * ese pensum queda en memoria, y entrar a tu carrera es inmediato.
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
          setAvances((previos) => ({
            ...previos,
            [carrera.slug]: resumenParaPortada(datos, marcas),
          }))
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

/** Si una carrera tiene alguna materia marcada, sin bajar su pensum */
export const tieneMarcas = (slug) => {
  const marcas = marcasGuardadasDe(slug)
  return Boolean(marcas && Object.keys(marcas).length)
}
