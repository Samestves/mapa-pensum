import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  MARCA_SEMESTRE,
  marcasDeSemestres,
  materiasDeSemestre,
} from './semestre.js'
import { ESTADO } from './estados.js'

const { APROBADA, CURSANDO } = ESTADO

describe('semestre entero', () => {
  const nodos = [
    { codigo: 'A', semestre: 1 },
    { codigo: 'B', semestre: 1 },
    { codigo: 'H1', semestre: 1, esHueco: true },
    { codigo: 'H2', semestre: 1, esHueco: true },
    { codigo: 'C', semestre: 2 },
    { codigo: 'H3', semestre: 3, esHueco: true },
  ]
  const enCasilla = (c) => (c === 'H1' ? { codigo: 'E' } : null)

  it('marca sus obligatorias y la electiva puesta, sin las casillas vacias', () => {
    assert.deepEqual(materiasDeSemestre(nodos, 1, enCasilla), ['A', 'B', 'E'])
  })

  it('su casilla esta marcada, mixta o vacia segun lo aprobado', () => {
    const marcas = marcasDeSemestres(nodos, enCasilla, { A: APROBADA, B: CURSANDO, E: APROBADA })
    assert.equal(marcas.get(1), MARCA_SEMESTRE.MIXTO)
    assert.equal(marcas.get(2), MARCA_SEMESTRE.VACIO)
    // Solo casillas sin elegir: nada que marcar
    assert.equal(marcas.has(3), false)
    const todo = marcasDeSemestres(nodos, enCasilla, { A: APROBADA, B: APROBADA, E: APROBADA })
    assert.equal(todo.get(1), MARCA_SEMESTRE.MARCADO)
  })
})
