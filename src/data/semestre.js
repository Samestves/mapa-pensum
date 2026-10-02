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

/**
 * Las materias que se abren al aprobar `codigos`: las que salen de alguna de
 * ellas y, contando todas como aprobadas, ya tienen todas sus prelaciones.
 * Las que llevas -aprobadas o cursando- no cuentan: no se abre lo que ya
 * estaba abierto. Cada una sale una vez aunque dependa de varias.
 *
 * `relaciones.adelante` va de un codigo a los de las materias que prela.
 */
export function desbloqueadasPor(codigos, estados, relaciones, porCodigo) {
  const despues = { ...estados }
  for (const c of codigos) despues[c] = ESTADO.APROBADA
  const llevas = (c) => despues[c] === ESTADO.APROBADA || despues[c] === ESTADO.CURSANDO

  const vistas = new Set()
  const abiertas = []
  for (const c of codigos) {
    for (const siguiente of relaciones.adelante.get(c) ?? []) {
      if (vistas.has(siguiente)) continue
      vistas.add(siguiente)
      const materia = porCodigo.get(siguiente)
      if (
        materia &&
        !llevas(siguiente) &&
        (materia.prerrequisitos ?? []).every((p) => despues[p] === ESTADO.APROBADA)
      ) {
        abiertas.push(materia)
      }
    }
  }
  return abiertas
}
