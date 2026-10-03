import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  MARCA_SEMESTRE,
  accionDeSemestre,
  casillaVaciaDe,
  etiquetaDeCasilla,
  marcasDeSemestres,
  materiasDeSemestre,
  pistaDeCasilla,
  textoFaltaElegir,
} from './semestre.js'
import { ESTADO } from './estados.js'

const { APROBADA, CURSANDO } = ESTADO
const { VACIO, PARCIAL, FALTA_ELEGIR, COMPLETO } = MARCA_SEMESTRE

describe('semestre entero', () => {
  const nodos = [
    { codigo: 'A', semestre: 1 },
    { codigo: 'B', semestre: 1 },
    { codigo: 'H1', semestre: 1, esHueco: true },
    { codigo: 'H2', semestre: 1, esHueco: true },
    { codigo: 'C', semestre: 2 },
    { codigo: 'H3', semestre: 3, esHueco: true },
    // Una casilla de la franja: no es de ningun semestre
    { codigo: 'F1', esHueco: true },
  ]
  const enCasilla = (c) => (c === 'H1' ? { codigo: 'E' } : null)
  const marca = (estados, semestre = 1) =>
    marcasDeSemestres(nodos, enCasilla, estados).get(semestre).marca

  it('marca sus obligatorias y la electiva puesta, sin las casillas vacias', () => {
    assert.deepEqual(materiasDeSemestre(nodos, 1, enCasilla), ['A', 'B', 'E'])
  })

  it('cuenta lo que lleva: aprobadas, en curso y casillas sin elegir', () => {
    const s = marcasDeSemestres(nodos, enCasilla, { A: APROBADA, B: CURSANDO }).get(1)
    assert.deepEqual(
      { total: s.total, hechas: s.hechas, cursando: s.cursando, huecos: s.huecos },
      { total: 4, hechas: 1, cursando: 1, huecos: 1 },
    )
  })

  it('vacio sin nada aprobado, parcial con algo', () => {
    assert.equal(marca({}), VACIO)
    assert.equal(marca({ B: CURSANDO }), VACIO)
    assert.equal(marca({ A: APROBADA }), PARCIAL)
    assert.equal(marca({ A: APROBADA, B: APROBADA }), PARCIAL)
  })

  it('con todo aprobado y una casilla sin elegir no esta completo: falta elegir', () => {
    assert.equal(marca({ A: APROBADA, B: APROBADA, E: APROBADA }), FALTA_ELEGIR)
    // Solo casillas sin elegir: lo unico que se puede hacer es elegir
    assert.equal(marca({}, 3), FALTA_ELEGIR)
  })

  it('completo solo cuando no queda nada, tampoco por elegir', () => {
    const lleno = (c) => (c === 'H1' ? { codigo: 'E' } : c === 'H2' ? { codigo: 'G' } : null)
    const todo = { A: APROBADA, B: APROBADA, E: APROBADA, G: APROBADA }
    assert.equal(marcasDeSemestres(nodos, lleno, todo).get(1).marca, COMPLETO)
    assert.equal(marca({ C: APROBADA }, 2), COMPLETO)
  })

  it('las casillas de la franja no son de ningun semestre', () => {
    assert.deepEqual([...marcasDeSemestres(nodos, enCasilla, {}).keys()], [1, 2, 3])
  })

  it('encuentra la primera casilla sin elegir de un semestre', () => {
    assert.equal(casillaVaciaDe(nodos, 1, enCasilla), 'H2')
    assert.equal(casillaVaciaDe(nodos, 2, enCasilla), null)
  })

  describe('lo que hace pulsar su casilla', () => {
    const accion = (estados, semestre = 1) => accionDeSemestre(nodos, semestre, enCasilla, estados)

    it('si falta algo por aprobar, aprueba lo que falta', () => {
      assert.deepEqual(accion({ A: APROBADA, B: CURSANDO }), {
        tipo: 'aprobar',
        codigos: ['B', 'E'],
      })
    })

    it('si solo falta elegir una electiva, abre su casilla en vez de desmarcar', () => {
      assert.deepEqual(accion({ A: APROBADA, B: APROBADA, E: APROBADA }), {
        tipo: 'elegir',
        casilla: 'H2',
      })
      assert.deepEqual(accion({}, 3), { tipo: 'elegir', casilla: 'H3' })
    })

    it('si esta completo, lo desmarca todo', () => {
      assert.deepEqual(accion({ C: APROBADA }, 2), { tipo: 'desmarcar', codigos: ['C'] })
    })
  })

  it('dice lo que va a hacer la casilla, que es lo mismo que hace', () => {
    assert.equal(pistaDeCasilla(VACIO), 'Aprobar todo')
    assert.equal(pistaDeCasilla(PARCIAL), 'Aprobar todo')
    assert.equal(pistaDeCasilla(FALTA_ELEGIR), 'Elegir la electiva')
    assert.equal(pistaDeCasilla(COMPLETO), 'Desmarcar todo')
    assert.equal(etiquetaDeCasilla(PARCIAL, 4), 'Aprobar el semestre 4 entero')
    assert.equal(etiquetaDeCasilla(FALTA_ELEGIR, 4), 'Elegir la electiva del semestre 4')
    assert.equal(etiquetaDeCasilla(COMPLETO, 4), 'Desmarcar el semestre 4 entero')
  })

  it('dice cuantas electivas faltan por elegir', () => {
    assert.equal(textoFaltaElegir(1), 'Falta elegir la electiva')
    assert.equal(textoFaltaElegir(2), 'Falta elegir 2 electivas')
  })
})
