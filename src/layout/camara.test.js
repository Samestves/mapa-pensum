import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  escalaDeLectura,
  guardarCamara,
  leerCamara,
  semestreFrente,
  vistaDeColumna,
} from './camara.js'
import { SITUACION } from './situacion.js'

const nodo = (codigo, semestre, extra = {}) => ({ codigo, semestre, ...extra })
const NODOS = [
  nodo('a', 1),
  nodo('b', 1),
  nodo('c', 2),
  nodo('d', 3),
  nodo('h', 2, { esHueco: true }),
]

describe('donde abre la camara', () => {
  test('sin nada marcado abre en el primer semestre, que ya esta disponible', () => {
    const s = new Map([
      ['a', SITUACION.INSCRIBIBLE],
      ['b', SITUACION.INSCRIBIBLE],
      ['c', SITUACION.LEJANA],
      ['d', SITUACION.LEJANA],
    ])
    assert.equal(semestreFrente(NODOS, s), 1)
  })

  test('abre en el primer semestre con algo que inscribir o que estas cursando', () => {
    const s = new Map([
      ['a', SITUACION.HECHA],
      ['b', SITUACION.HECHA],
      ['c', SITUACION.CURSANDO],
      ['d', SITUACION.INSCRIBIBLE],
    ])
    assert.equal(semestreFrente(NODOS, s), 2)
  })

  test('las casillas de electiva no cuentan, y con todo aprobado abre en el ultimo', () => {
    const s = new Map([
      ['a', SITUACION.HECHA],
      ['b', SITUACION.HECHA],
      ['c', SITUACION.HECHA],
      ['d', SITUACION.HECHA],
      ['h', SITUACION.INSCRIBIBLE],
    ])
    assert.equal(semestreFrente(NODOS, s), 3)
  })

  test('la escala de lectura cabe la columna y algo mas, y no pasa de 0,8', () => {
    const e = escalaDeLectura(390)
    assert.ok(e > 0.65 && e < 0.8)
    assert.equal(escalaDeLectura(900), 0.8)
  })

  test('la columna queda a la izquierda con su cabecera arriba', () => {
    const v = vistaDeColumna({ x: 422 }, { ancho: 390, alto: 700 })
    assert.ok(Math.abs(v.x + 422 * v.escala - 16) < 1e-9)
    // La cabecera del semestre, que empieza en MARGEN.top, queda a 12 px del borde
    assert.ok(Math.abs(v.y + 24 * v.escala - 12) < 1e-9)
  })
})

describe('donde la dejaste', () => {
  const almacen = () => {
    const m = new Map()
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }
  }

  test('se recupera tal cual en la misma pantalla', () => {
    const a = almacen()
    guardarCamara('sistemas', { x: -120, y: 30, escala: 0.7 }, { ancho: 390, alto: 700 }, a)
    assert.deepEqual(leerCamara('sistemas', { ancho: 390, alto: 700 }, a), {
      x: -120,
      y: 30,
      escala: 0.7,
    })
  })

  test('plegar la barra no la invalida, girar el telefono si', () => {
    const a = almacen()
    guardarCamara('sistemas', { x: 0, y: 0, escala: 0.5 }, { ancho: 390, alto: 700 }, a)
    assert.ok(leerCamara('sistemas', { ancho: 390, alto: 760 }, a))
    assert.equal(leerCamara('sistemas', { ancho: 844, alto: 330 }, a), null)
  })

  test('sin almacen o con basura no rompe nada', () => {
    assert.equal(leerCamara('x', { ancho: 390, alto: 700 }, undefined), null)
    const roto = { getItem: () => '{nope', setItem: () => {} }
    assert.equal(leerCamara('x', { ancho: 390, alto: 700 }, roto), null)
    guardarCamara(
      'x',
      { x: 0, y: 0, escala: 1 },
      { ancho: 1, alto: 1 },
      {
        setItem: () => {
          throw new Error('lleno')
        },
      },
    )
  })
})
