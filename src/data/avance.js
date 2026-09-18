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
