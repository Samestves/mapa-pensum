import { ESTADO } from './estados.js'

/**
 * El avance hacia el titulo, de 0 a 100.
 *
 * Donde el pensum trae creditos oficiales es el de UC, que es el que cuenta
 * para graduarse; donde no, el de materias, que es lo unico que se puede
 * saber. Lo usa el anillo de la cabecera.
 */
export function avanceDe(resumen) {
  if (resumen.porcentaje != null) return resumen.porcentaje
  return resumen.total ? (resumen.aprobadas / resumen.total) * 100 : 0
}

/**
 * Cuantas obligatorias aprobaste de cada semestre, a partir de las marcas
 * guardadas y sin montar nada de la vista: son los puntos que la portada
 * enciende en la silueta de cada carrera.
 *
 * Va en el mismo orden que la silueta del indice, que tambien sale de
 * `carrera.semestres`, y cuenta solo obligatorias, que es lo que la silueta
 * dibuja: las casillas de electiva no son un punto.
 */
export function aprobadasPorSemestre(carrera, marcas) {
  const obligatorias = carrera.asignaturas.filter((a) => !a.esHueco)
  return carrera.semestres.map(
    (s) =>
      obligatorias.filter((a) => a.semestre === s.numero && marcas?.[a.codigo] === ESTADO.APROBADA)
        .length,
  )
}
