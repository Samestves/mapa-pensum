import { ESTADO } from './estados.js'

/**
 * Como va un semestre entero, para su casilla de marcar.
 *
 * No es un si / no / a medias. La raya de "a medias" no decia cuanto, asi que
 * llevar dos materias de seis y llevar cinco se veian igual; y un semestre
 * con todo aprobado y la electiva sin elegir salia lleno al lado de un 83 %.
 * Ahora la casilla enseña cuanto llevas (ver GlifoSemestre), y cuando solo
 * falta elegir la electiva, lo dice.
 */
export const MARCA_SEMESTRE = {
  VACIO: 'vacio',
  PARCIAL: 'parcial',
  /* Todo lo que se puede aprobar esta aprobado, y queda alguna casilla de
     electiva sin elegir: no se puede marcar lo que aun no es ninguna materia. */
  FALTA_ELEGIR: 'falta-elegir',
  COMPLETO: 'completo',
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

/** La primera casilla de electiva de un semestre que sigue sin elegir, o null */
export function casillaVaciaDe(nodos, semestre, enCasilla) {
  const vacia = nodos.find((n) => n.semestre === semestre && n.esHueco && !enCasilla(n.codigo))
  return vacia?.codigo ?? null
}

function marcaDe({ total, hechas, huecos }) {
  if (hechas === total) return MARCA_SEMESTRE.COMPLETO
  if (huecos > 0 && hechas === total - huecos) return MARCA_SEMESTRE.FALTA_ELEGIR
  return hechas > 0 ? MARCA_SEMESTRE.PARCIAL : MARCA_SEMESTRE.VACIO
}

/**
 * La casilla de cada semestre: cuantas materias tiene, cuantas llevas
 * aprobadas y en curso, cuantas casillas de electiva siguen sin elegir, y de
 * ahi su marca. Una casilla de electiva cuenta como una materia mas, elegida
 * o no: es lo mismo que cuenta el porcentaje de la cabecera, asi que la
 * casilla nunca dice otra cosa que el.
 */
export function marcasDeSemestres(nodos, enCasilla, estados) {
  const semestres = new Map()
  for (const nodo of nodos) {
    if (nodo.semestre == null) continue
    const s = semestres.get(nodo.semestre) ?? { total: 0, hechas: 0, cursando: 0, huecos: 0 }
    const materia = nodo.esHueco ? enCasilla(nodo.codigo) : nodo
    s.total += 1
    if (!materia) s.huecos += 1
    else if (estados[materia.codigo] === ESTADO.APROBADA) s.hechas += 1
    else if (estados[materia.codigo] === ESTADO.CURSANDO) s.cursando += 1
    semestres.set(nodo.semestre, s)
  }
  for (const s of semestres.values()) s.marca = marcaDe(s)
  return semestres
}

/**
 * Lo que hace pulsar la casilla de un semestre:
 *
 *  - si le falta algo por aprobar, lo aprueba;
 *  - si lo unico que le falta es una electiva sin elegir, abre su selector:
 *    no hay nada que aprobar hasta que sea una materia;
 *  - si esta completo, lo desmarca todo.
 *
 * Devuelve la accion, sin hacerla: { tipo, codigos } o { tipo, casilla }.
 */
export function accionDeSemestre(nodos, semestre, enCasilla, estados) {
  const codigos = materiasDeSemestre(nodos, semestre, enCasilla)
  const pendientes = codigos.filter((c) => estados[c] !== ESTADO.APROBADA)
  if (pendientes.length) return { tipo: 'aprobar', codigos: pendientes }

  const casilla = casillaVaciaDe(nodos, semestre, enCasilla)
  if (casilla) return { tipo: 'elegir', casilla }

  return codigos.length ? { tipo: 'desmarcar', codigos } : null
}

/* Lo mismo, dicho: lo que va a pasar al pulsar la casilla, segun su marca. La
   pista es lo que sale al apuntarle con el raton -corta, que cae en el pie de
   la cabecera-, y la etiqueta, lo que oye quien no la ve. */
const APROBAR = { pista: 'Aprobar todo', etiqueta: (n) => `Aprobar el semestre ${n} entero` }
const ACCION = {
  [MARCA_SEMESTRE.VACIO]: APROBAR,
  [MARCA_SEMESTRE.PARCIAL]: APROBAR,
  [MARCA_SEMESTRE.FALTA_ELEGIR]: {
    pista: 'Elegir la electiva',
    etiqueta: (n) => `Elegir la electiva del semestre ${n}`,
  },
  [MARCA_SEMESTRE.COMPLETO]: {
    pista: 'Desmarcar todo',
    etiqueta: (n) => `Desmarcar el semestre ${n} entero`,
  },
}

export const pistaDeCasilla = (marca) => ACCION[marca].pista
export const etiquetaDeCasilla = (marca, semestre) => ACCION[marca].etiqueta(semestre)

/** Lo que dice del semestre una casilla que no esta completa ni a medias */
export function textoFaltaElegir(huecos) {
  return huecos === 1 ? 'Falta elegir la electiva' : `Falta elegir ${huecos} electivas`
}
