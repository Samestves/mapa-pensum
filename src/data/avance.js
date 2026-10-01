import { ESTADO } from './estados.js'

/**
 * El avance hacia el titulo, de 0 a 100.
 *
 * Donde el pensum trae creditos oficiales es el de UC, que es el que cuenta
 * para graduarse; donde no, el de materias, que es lo unico que se puede
 * saber. Lo usan la capsula de la cabecera de escritorio y la isla del
 * telefono.
 */
export function avanceDe(resumen) {
  if (resumen.porcentaje != null) return resumen.porcentaje
  return resumen.total ? (resumen.aprobadas / resumen.total) * 100 : 0
}

/**
 * Cuanto llevas, en la misma unidad que el porcentaje: UC del titulo donde
 * hay creditos oficiales, materias donde no. Es lo que la capsula de avance
 * de escritorio escribe al lado del anillo.
 */
export function cuantoLlevas(resumen) {
  return resumen.porcentaje != null
    ? `${resumen.ucAprobadas + resumen.ucElectivas} de ${resumen.ucTitulo} UC`
    : `${resumen.aprobadas} de ${resumen.total} materias`
}

/**
 * La frase que acompaña al anillo -su title y su etiqueta accesible-. Dice de
 * cual de los dos porcentajes se trata, para que el numero no signifique dos
 * cosas distintas sin avisar.
 */
export function describirAvance(resumen) {
  const redondeado = Math.round(avanceDe(resumen))
  return `Tu avance: ${redondeado}% · ${cuantoLlevas(resumen)}. Pulsa para ver el detalle.`
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
