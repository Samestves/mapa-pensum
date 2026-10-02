import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cabecerasDe } from './cabeceras.js'
import { NODO } from './constantes.js'
import { SITUACION } from './situacion.js'

const columnas = [{ x: 0, semestre: 1 }]
const nodos = [
  { codigo: 'A', semestre: 1, uc: 4 },
  { codigo: 'B', semestre: 1, uc: 3 },
  { codigo: 'C', semestre: 1, uc: 2 },
  { codigo: 'H', semestre: 1, esHueco: true },
]
const situaciones = new Map([
  ['A', SITUACION.HECHA],
  ['B', SITUACION.CURSANDO],
  ['C', SITUACION.INSCRIBIBLE],
])

test('la cabecera cuenta las materias del semestre y lo que llevas de ellas', () => {
  const [c] = cabecerasDe(columnas, nodos, () => null, situaciones)
  assert.equal(c.total, 4)
  assert.equal(c.hechas, 1)
  assert.equal(c.porcentaje, 25)
  assert.equal(c.completo, false)
  // Aprobar el semestre marcaria B y C: la casilla vacia no tiene materia
  assert.equal(c.pendientes, 2)
  // La casilla vacia cuenta como materia del semestre pero no suma UC
  assert.equal(c.uc, 9)
  assert.equal(c.anchoHechas, NODO.ancho / 4)
  assert.equal(c.anchoCursando, NODO.ancho / 4)
})

test('una casilla llena suma la electiva que lleva', () => {
  const electiva = { codigo: 'E', uc: 3 }
  const conE = new Map([...situaciones, ['E', SITUACION.HECHA]])
  const [c] = cabecerasDe(columnas, nodos, (codigo) => (codigo === 'H' ? electiva : null), conE)
  assert.equal(c.uc, 12)
  assert.equal(c.hechas, 2)
  assert.equal(c.pendientes, 2)
})

test('los estados se anclan al borde derecho y solo salen los que tienen materias', () => {
  const [c] = cabecerasDe(columnas, nodos, () => null, situaciones)
  assert.deepEqual(
    c.estados.map((e) => e.situacion),
    [SITUACION.INSCRIBIBLE, SITUACION.CURSANDO],
  )
  assert.ok(c.estados[0].x > c.estados[1].x)
  assert.ok(c.estados[0].x < c.x + NODO.ancho)
})
