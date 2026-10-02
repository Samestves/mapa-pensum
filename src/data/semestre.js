import { ESTADO } from './estados.js'

/**
 * Lo que falta por aprobar de un semestre: sus obligatorias y la electiva
 * puesta en cada casilla. Una casilla vacia no aporta nada: no hay materia
 * que marcar, y aprobar "el semestre" no puede inventarse cual era.
 *
 * `enCasilla` devuelve la electiva colocada en una casilla, o null.
 */
export function pendientesDeSemestre(nodos, semestre, enCasilla, estados) {
  const pendientes = []
  for (const nodo of nodos) {
    if (nodo.semestre !== semestre) continue
    const materia = nodo.esHueco ? enCasilla(nodo.codigo) : nodo
    if (materia && estados[materia.codigo] !== ESTADO.APROBADA) pendientes.push(materia.codigo)
  }
  return pendientes
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
