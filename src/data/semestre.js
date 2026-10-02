import { ESTADO } from './estados.js'

/** Como esta un semestre entero, para su casilla de marcar: ver marcasDeSemestres. */
export const MARCA_SEMESTRE = {
  VACIO: 'vacio',
  MIXTO: 'mixto',
  MARCADO: 'marcado',
}

/**
 * Las materias que se marcan al marcar un semestre entero: sus obligatorias
 * y la electiva puesta en cada casilla. Una casilla vacia no aporta nada: no
 * hay materia que marcar, y marcar "el semestre" no puede inventarse cual
 * era.
 *
 * `enCasilla` devuelve la electiva colocada en una casilla, o null.
 */
export function materiasDeSemestre(nodos, semestre, enCasilla) {
  const codigos = []
  for (const nodo of nodos) {
    if (nodo.semestre !== semestre) continue
    const materia = nodo.esHueco ? enCasilla(nodo.codigo) : nodo
    if (materia) codigos.push(materia.codigo)
  }
  return codigos
}

/**
 * La casilla de cada semestre: marcada si todo lo que se puede marcar esta
 * aprobado, mixta si solo una parte y vacia si nada. Un semestre sin nada
 * que marcar -solo casillas sin elegir- no tiene entrada.
 */
export function marcasDeSemestres(nodos, enCasilla, estados) {
  const cuentas = new Map()
  for (const nodo of nodos) {
    const materia = nodo.esHueco ? enCasilla(nodo.codigo) : nodo
    if (!materia) continue
    const c = cuentas.get(nodo.semestre) ?? { total: 0, aprobadas: 0 }
    c.total += 1
    if (estados[materia.codigo] === ESTADO.APROBADA) c.aprobadas += 1
    cuentas.set(nodo.semestre, c)
  }

  const marcas = new Map()
  for (const [semestre, { total, aprobadas }] of cuentas) {
    marcas.set(
      semestre,
      aprobadas === total
        ? MARCA_SEMESTRE.MARCADO
        : aprobadas
          ? MARCA_SEMESTRE.MIXTO
          : MARCA_SEMESTRE.VACIO,
    )
  }
  return marcas
}
