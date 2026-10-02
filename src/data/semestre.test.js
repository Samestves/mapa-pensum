import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { desbloqueadasPor, pendientesDeSemestre } from './semestre.js'
import { ESTADO } from './estados.js'

const { APROBADA, CURSANDO, DISPONIBLE, BLOQUEADA } = ESTADO

describe('pendientesDeSemestre', () => {
  const nodos = [
    { codigo: 'A', semestre: 1 },
    { codigo: 'B', semestre: 1 },
    { codigo: 'H1', semestre: 1, esHueco: true },
    { codigo: 'H2', semestre: 1, esHueco: true },
    { codigo: 'C', semestre: 2 },
  ]
  const enCasilla = (c) => (c === 'H1' ? { codigo: 'E' } : null)

  it('devuelve lo que no esta aprobado, con la electiva puesta y sin las casillas vacias', () => {
    const estados = { A: APROBADA, B: CURSANDO, E: DISPONIBLE, C: DISPONIBLE }
    assert.deepEqual(pendientesDeSemestre(nodos, 1, enCasilla, estados), ['B', 'E'])
  })

  it('vacio cuando todo el semestre esta aprobado', () => {
    const estados = { A: APROBADA, B: APROBADA, E: APROBADA }
    assert.deepEqual(pendientesDeSemestre(nodos, 1, enCasilla, estados), [])
  })
})

describe('desbloqueadasPor', () => {
  const materias = [
    { codigo: 'A' },
    { codigo: 'B' },
    { codigo: 'X', prerrequisitos: ['A', 'B'] },
    { codigo: 'Y', prerrequisitos: ['A', 'Z'] },
    { codigo: 'W', prerrequisitos: ['B'] },
    { codigo: 'Z' },
  ]
  const porCodigo = new Map(materias.map((m) => [m.codigo, m]))
  const relaciones = {
    adelante: new Map([
      ['A', ['X', 'Y']],
      ['B', ['X', 'W']],
    ]),
  }

  it('abre lo que queda con todas sus prelaciones, una sola vez', () => {
    const estados = { A: DISPONIBLE, B: DISPONIBLE, X: BLOQUEADA, Y: BLOQUEADA, W: BLOQUEADA, Z: DISPONIBLE }
    const abiertas = desbloqueadasPor(['A', 'B'], estados, relaciones, porCodigo)
    assert.deepEqual(
      abiertas.map((m) => m.codigo),
      ['X', 'W'],
    )
  })

  it('no cuenta lo que ya llevas', () => {
    const estados = { A: DISPONIBLE, B: APROBADA, X: CURSANDO, W: APROBADA }
    assert.deepEqual(desbloqueadasPor(['A'], estados, relaciones, porCodigo), [])
  })
})
