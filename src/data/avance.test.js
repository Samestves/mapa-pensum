import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  aprobadasPorSemestre,
  avanceDe,
  avanceDeGrupos,
  conMarcas,
  cuantoLlevas,
  depurarMarcas,
  describirAvance,
  estadosDe,
  progresoDe,
} from './avance.js'
import { ESTADO } from './estados.js'

const carrera = {
  semestres: [{ numero: 1 }, { numero: 2 }, { numero: 3 }],
  asignaturas: [
    { codigo: 'A1', semestre: 1 },
    { codigo: 'A2', semestre: 1 },
    { codigo: 'B1', semestre: 2 },
    { codigo: 'H2', semestre: 2, esHueco: true },
  ],
}

describe('la silueta de la portada', () => {
  test('cuenta las aprobadas de cada semestre en el orden de la silueta', () => {
    assert.deepEqual(aprobadasPorSemestre(carrera, { A1: 'aprobada', B1: 'aprobada' }), [1, 1, 0])
  })

  test('cursando no enciende nada, y las casillas de electiva no son un punto', () => {
    assert.deepEqual(aprobadasPorSemestre(carrera, { A2: 'cursando', H2: 'aprobada' }), [0, 0, 0])
  })
})

describe('el avance del anillo', () => {
  test('cuanto llevas va en la misma unidad que el porcentaje', () => {
    const conUc = {
      porcentaje: 11,
      ucAprobadas: 15,
      ucElectivas: 2,
      ucTitulo: 153,
      aprobadas: 6,
      total: 49,
    }
    assert.equal(cuantoLlevas(conUc), '17 de 153 UC')
    assert.equal(cuantoLlevas({ ...conUc, porcentaje: null }), '6 de 49 materias')
  })

  test('con creditos oficiales es el de UC; sin ellos, el de materias', () => {
    assert.equal(avanceDe({ porcentaje: 28, aprobadas: 1, total: 4 }), 28)
    assert.equal(avanceDe({ porcentaje: null, aprobadas: 1, total: 4 }), 25)
    assert.equal(avanceDe({ porcentaje: null, aprobadas: 0, total: 0 }), 0)
  })
})

describe('la frase del anillo', () => {
  test('dice si el porcentaje es de UC o de materias', () => {
    const conCreditos = { porcentaje: 28.4, ucAprobadas: 40, ucElectivas: 3, ucTitulo: 153 }
    assert.equal(
      describirAvance(conCreditos),
      'Tu avance: 28% · 43 de 153 UC. Pulsa para ver el detalle.',
    )
    assert.equal(
      describirAvance({ porcentaje: null, aprobadas: 1, total: 4 }),
      'Tu avance: 25% · 1 de 4 materias. Pulsa para ver el detalle.',
    )
  })
})

describe('estadosDe: que le pasa a cada materia segun lo que marco el estudiante', () => {
  test('una materia sin prerrequisitos y sin marcar esta disponible', () => {
    const todas = [{ codigo: 'A', nombre: 'Alfa', uc: 3, semestre: 1, prerrequisitos: [] }]
    assert.equal(estadosDe(todas, {}).A, ESTADO.DISPONIBLE)
  })

  test('una materia sin campo de prerrequisitos tambien nace disponible', () => {
    const todas = [{ codigo: 'A', nombre: 'Alfa', uc: 3, semestre: 1 }]
    assert.equal(estadosDe(todas, {}).A, ESTADO.DISPONIBLE)
  })

  test('una materia con un prerrequisito sin aprobar esta bloqueada', () => {
    const todas = [
      { codigo: 'A', nombre: 'Alfa', uc: 3, semestre: 1, prerrequisitos: [] },
      { codigo: 'B', nombre: 'Beta', uc: 3, semestre: 2, prerrequisitos: ['A'] },
    ]
    assert.equal(estadosDe(todas, {}).B, ESTADO.BLOQUEADA)
  })

  test('al aprobar el prerrequisito, la materia que sigue pasa a disponible', () => {
    const todas = [
      { codigo: 'A', nombre: 'Alfa', uc: 3, semestre: 1, prerrequisitos: [] },
      { codigo: 'B', nombre: 'Beta', uc: 3, semestre: 2, prerrequisitos: ['A'] },
    ]
    assert.equal(estadosDe(todas, { A: ESTADO.APROBADA }).B, ESTADO.DISPONIBLE)
  })

  test('cursar el prerrequisito no basta: la materia que sigue sigue bloqueada', () => {
    const todas = [
      { codigo: 'A', nombre: 'Alfa', uc: 3, semestre: 1, prerrequisitos: [] },
      { codigo: 'B', nombre: 'Beta', uc: 3, semestre: 2, prerrequisitos: ['A'] },
    ]
    assert.equal(estadosDe(todas, { A: ESTADO.CURSANDO }).B, ESTADO.BLOQUEADA)
  })

  test('una materia marcada conserva su marca aunque le falten prerrequisitos', () => {
    const todas = [
      { codigo: 'A', nombre: 'Alfa', uc: 3, semestre: 1, prerrequisitos: [] },
      { codigo: 'B', nombre: 'Beta', uc: 3, semestre: 2, prerrequisitos: ['A'] },
    ]
    assert.equal(estadosDe(todas, { B: ESTADO.CURSANDO }).B, ESTADO.CURSANDO)
    assert.equal(estadosDe(todas, { B: ESTADO.APROBADA }).B, ESTADO.APROBADA)
  })
})

describe('depurarMarcas: lo guardado que ya no cuadra con el pensum se descarta', () => {
  test('descarta codigos que no estan en el pensum', () => {
    const guardadas = { A: ESTADO.APROBADA, X: ESTADO.APROBADA }
    assert.deepEqual(depurarMarcas(guardadas, new Set(['A'])), { A: ESTADO.APROBADA })
  })

  test('descarta marcas que no son aprobada ni cursando', () => {
    const guardadas = {
      A: ESTADO.DISPONIBLE,
      B: ESTADO.BLOQUEADA,
      C: ESTADO.APROBADA,
      D: ESTADO.CURSANDO,
    }
    const codigos = new Set(['A', 'B', 'C', 'D'])
    assert.deepEqual(depurarMarcas(guardadas, codigos), {
      C: ESTADO.APROBADA,
      D: ESTADO.CURSANDO,
    })
  })

  test('con datos que no son un objeto de marcas, devuelve vacio', () => {
    const codigos = new Set(['A'])
    assert.deepEqual(depurarMarcas(null, codigos), {})
    assert.deepEqual(depurarMarcas('hola', codigos), {})
    assert.deepEqual(depurarMarcas(42, codigos), {})
  })
})

describe('conMarcas: cambia una copia de las marcas, nunca las originales', () => {
  test('añade, cambia y borra marcas a la vez', () => {
    const marcas = { A: ESTADO.APROBADA, B: ESTADO.CURSANDO }
    const nuevas = conMarcas(marcas, {
      A: ESTADO.CURSANDO,
      B: null,
      C: ESTADO.APROBADA,
    })
    assert.deepEqual(nuevas, { A: ESTADO.CURSANDO, C: ESTADO.APROBADA })
  })

  test('no muta el objeto de entrada', () => {
    const marcas = { A: ESTADO.APROBADA }
    const antes = { ...marcas }
    const nuevas = conMarcas(marcas, { A: null, B: ESTADO.CURSANDO })
    assert.deepEqual(marcas, antes)
    assert.notEqual(nuevas, marcas)
  })
})

describe('avanceDeGrupos: las electivas cuentan en UC, no en materias', () => {
  const electivas = {
    clave: 'electivas',
    titulo: 'Electivas',
    tipo: 'electiva',
    cuota: 6,
    asignaturas: [
      { codigo: 'E1', nombre: 'Tecnica 1', uc: 3 },
      { codigo: 'E2', nombre: 'Tecnica 2', uc: 2 },
      { codigo: 'E3', nombre: 'Tecnica 3', uc: 3 },
    ],
  }

  test('suma las UC de las electivas aprobadas y no las que estan cursando', () => {
    const marcas = { E1: ESTADO.APROBADA, E2: ESTADO.CURSANDO, E3: ESTADO.APROBADA }
    const g = avanceDeGrupos([electivas], marcas).electivas
    assert.equal(g.uc, 6)
    assert.deepEqual(
      g.elegidas.map((e) => e.codigo),
      ['E1', 'E3'],
    )
  })

  test('el grupo esta completo al llegar exactamente a la cuota', () => {
    const marcas = { E1: ESTADO.APROBADA, E3: ESTADO.APROBADA }
    const g = avanceDeGrupos([electivas], marcas).electivas
    assert.equal(g.completa, true)
    assert.equal(g.excedente, 0)
  })

  test('lo que pasa de la cuota es el excedente, y no quita que el grupo este completo', () => {
    const marcas = {
      E1: ESTADO.APROBADA,
      E2: ESTADO.APROBADA,
      E3: ESTADO.APROBADA,
    }
    const g = avanceDeGrupos([electivas], marcas).electivas
    assert.equal(g.uc, 8)
    assert.equal(g.completa, true)
    assert.equal(g.excedente, 2)
  })

  test('por debajo de la cuota el grupo no esta completo', () => {
    const marcas = { E2: ESTADO.APROBADA }
    const g = avanceDeGrupos([electivas], marcas).electivas
    assert.equal(g.completa, false)
    assert.equal(g.excedente, 0)
  })

  test('un grupo sin cuota no esta completo ni tiene excedente, aunque tenga UC', () => {
    for (const cuota of [null, undefined]) {
      const sinCuota = { ...electivas, cuota }
      const marcas = { E1: ESTADO.APROBADA, E2: ESTADO.APROBADA }
      const g = avanceDeGrupos([sinCuota], marcas).electivas
      assert.equal(g.uc, 5)
      assert.equal(g.completa, false)
      assert.equal(g.excedente, 0)
    }
  })
})

describe('progresoDe: los totales que ve el estudiante', () => {
  const asignaturas = [
    { codigo: 'A', nombre: 'Alfa', uc: 4, semestre: 1, prerrequisitos: [] },
    { codigo: 'B', nombre: 'Beta', uc: 3, semestre: 1, prerrequisitos: [] },
    { codigo: 'C', nombre: 'Gamma', uc: 3, semestre: 2, prerrequisitos: ['A'] },
    { codigo: 'D', nombre: 'Delta', uc: 2, semestre: 2, prerrequisitos: ['B'] },
  ]
  const estados = {
    A: ESTADO.APROBADA,
    B: ESTADO.CURSANDO,
    C: ESTADO.DISPONIBLE,
    D: ESTADO.BLOQUEADA,
  }

  test('cuenta aprobadas, cursando, disponibles y bloqueadas, y suman el total', () => {
    const p = progresoDe(asignaturas, estados, { titulo: 20 }, {})
    assert.equal(p.aprobadas, 1)
    assert.equal(p.cursando, 1)
    assert.equal(p.disponibles, 1)
    assert.equal(p.bloqueadas, 1)
    assert.equal(p.total, 4)
    assert.equal(p.aprobadas + p.cursando + p.disponibles + p.bloqueadas, p.total)
    assert.equal(p.ucAprobadas, 4)
  })

  test('el porcentaje es null si el pensum no trae creditos del titulo', () => {
    assert.equal(progresoDe(asignaturas, estados, {}, {}).porcentaje, null)
    assert.equal(progresoDe(asignaturas, estados, null, {}).porcentaje, null)
  })

  test('el porcentaje es lo aprobado sobre los creditos del titulo', () => {
    assert.equal(progresoDe(asignaturas, estados, { titulo: 20 }, {}).porcentaje, 20)
  })

  test('las UC electivas solo cuentan hasta la cuota de su grupo', () => {
    const avanceGrupos = {
      electivas: { clave: 'electivas', uc: 9, meta: 6 },
      // Sin cuota no hay meta, asi que no suma nada al avance
      informativo: { clave: 'informativo', uc: 2, meta: null },
    }
    const p = progresoDe(asignaturas, estados, { titulo: 20 }, avanceGrupos)
    assert.equal(p.ucElectivas, 6)
    assert.equal(p.porcentaje, 50)
  })

  test('las disponibles para inscribir salen por semestre y luego por nombre', () => {
    const materias = [
      { codigo: 'X', nombre: 'Zeta', uc: 3, semestre: 2, prerrequisitos: [] },
      { codigo: 'Y', nombre: 'Alfa', uc: 3, semestre: 2, prerrequisitos: [] },
      { codigo: 'Z', nombre: 'Mu', uc: 3, semestre: 1, prerrequisitos: [] },
    ]
    const todas = {
      X: ESTADO.DISPONIBLE,
      Y: ESTADO.DISPONIBLE,
      Z: ESTADO.DISPONIBLE,
    }
    const p = progresoDe(materias, todas, {}, {})
    assert.deepEqual(
      p.paraInscribir.map((a) => a.nombre),
      ['Mu', 'Alfa', 'Zeta'],
    )
    assert.equal(p.disponibles, 3)
  })
})
