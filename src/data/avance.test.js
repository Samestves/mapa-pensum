import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { aprobadasPorSemestre, avanceDe } from './avance.js'

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
  test('con creditos oficiales es el de UC; sin ellos, el de materias', () => {
    assert.equal(avanceDe({ porcentaje: 28, aprobadas: 1, total: 4 }), 28)
    assert.equal(avanceDe({ porcentaje: null, aprobadas: 1, total: 4 }), 25)
    assert.equal(avanceDe({ porcentaje: null, aprobadas: 0, total: 0 }), 0)
  })
})
