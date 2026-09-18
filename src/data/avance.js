/**
 * El avance hacia el titulo, de 0 a 100.
 *
 * Donde el pensum trae creditos oficiales es el de UC, que es el que cuenta
 * para graduarse; donde no, el de materias, que es lo unico que se puede
 * saber. Lo usan el anillo de la cabecera y el del boton de planificar, y
 * tienen que decir exactamente lo mismo.
 */
export function avanceDe(resumen) {
  if (resumen.porcentaje != null) return resumen.porcentaje
  return resumen.total ? (resumen.aprobadas / resumen.total) * 100 : 0
}
