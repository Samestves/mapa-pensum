import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { avanceGuardado } from './avance.js'

const carrera = {
  semestres: [{ numero: 1 }, { numero: 2 }],
  creditos: { titulo: 20 },
  asignaturas: [
    { codigo: 'A1', semestre: 1, uc: 4 },
    { codigo: 'A2', semestre: 1, uc: 4 },
    { codigo: 'B1', semestre: 2, uc: 4 },
    { codigo: 'H2', semestre: 2, esHueco: true },
  ],
  grupos: [
    {
      clave: 'g',
      cuota: 3,
      asignaturas: [
        { codigo: 'E1', uc: 2 },
        { codigo: 'E2', uc: 2 },
      ],
    },
  ],
}

describe('el avance guardado de la portada', () => {
  test('cuenta las aprobadas por semestre en el orden de la silueta, sin las casillas', () => {
    const a = avanceGuardado(carrera, { A1: 'aprobada', B1: 'aprobada', A2: 'cursando' })
    assert.deepEqual(a.porSemestre, [1, 1])
    assert.equal(a.aprobadas, 2)
  })

  test('el porcentaje es el del titulo: obligatorias mas electivas topadas a su cuota', () => {
    // 8 UC obligatorias + min(4, 3) de electivas = 11 de 20
    const a = avanceGuardado(carrera, {
      A1: 'aprobada',
      B1: 'aprobada',
      E1: 'aprobada',
      E2: 'aprobada',
    })
    assert.ok(Math.abs(a.porcentaje - 55) < 1e-9)
  })

  test('sin creditos oficiales cuenta materias', () => {
    const sin = { ...carrera, creditos: null }
    assert.ok(Math.abs(avanceGuardado(sin, { A1: 'aprobada' }).porcentaje - 100 / 3) < 1e-9)
  })
})
