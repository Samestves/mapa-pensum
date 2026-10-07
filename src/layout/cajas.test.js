import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NODO } from './constantes.js'
import { cajaDeMateria, cajaQueAbarca } from './cajas.js'

test('la caja de una materia es su posicion mas el tamaño de la tarjeta', () => {
  assert.deepEqual(cajaDeMateria({ x: 10, y: 20 }), {
    x0: 10,
    y0: 20,
    x1: 10 + NODO.ancho,
    y1: 20 + NODO.alto,
  })
})

test('una materia sin dibujar no tiene caja', () => {
  assert.equal(cajaDeMateria(undefined), null)
  assert.equal(cajaDeMateria({ x: 5 }), null)
  assert.equal(cajaDeMateria({ x: NaN, y: 3 }), null)
})

test('la caja que abarca varias materias las contiene a todas', () => {
  const caja = cajaQueAbarca([
    { x: 100, y: 300 },
    { x: 400, y: 50 },
    { x: 250, y: 200 },
  ])
  assert.deepEqual(caja, { x0: 100, y0: 50, x1: 400 + NODO.ancho, y1: 300 + NODO.alto })
})

test('las que no estan dibujadas se saltan, y si no hay ninguna no hay caja', () => {
  assert.deepEqual(cajaQueAbarca([undefined, { x: 7, y: 9 }, {}]), cajaDeMateria({ x: 7, y: 9 }))
  assert.equal(cajaQueAbarca([undefined, {}]), null)
  assert.equal(cajaQueAbarca([]), null)
})
