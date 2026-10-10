import { useMemo } from 'react'
import { marcasDeSemestres } from '../data/semestre'
import { useEstados } from './useAvance'

/**
 * La casilla de cada semestre -cuanto llevas de el y que le falta-, la misma
 * en la cabecera del mapa y en la de la lista. Cada vista la calcula por su
 * cuenta a partir de los estados: es una pasada por las materias, y asi
 * ninguna tiene que esperar a que se la entregue un padre que no la usa.
 *
 * `enCasilla` dice que electiva hay en cada casilla (ver VistaCarrera).
 */
export function useMarcasSemestre(nodos, enCasilla) {
  const estados = useEstados()
  return useMemo(() => marcasDeSemestres(nodos, enCasilla, estados), [nodos, enCasilla, estados])
}
