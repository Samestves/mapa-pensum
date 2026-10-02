import { test } from 'node:test'
import assert from 'node:assert/strict'
import { esAparatoModesto } from './ligero.js'

test('todo lo tactil va ligero, tenga la memoria que tenga', () => {
  assert.equal(esAparatoModesto({ tactil: true, memoria: 8, nucleos: 8 }), true)
})

test('un equipo de 4 GB o menos va ligero', () => {
  assert.equal(esAparatoModesto({ memoria: 4, nucleos: 8 }), true)
  assert.equal(esAparatoModesto({ memoria: 2, nucleos: 8 }), true)
})

test('pocos nucleos, ahorro de datos o menos movimiento tambien', () => {
  assert.equal(esAparatoModesto({ memoria: 8, nucleos: 4 }), true)
  assert.equal(esAparatoModesto({ memoria: 8, nucleos: 8, ahorroDatos: true }), true)
  assert.equal(esAparatoModesto({ memoria: 8, nucleos: 8, menosMovimiento: true }), true)
})

test('un aparato bueno, o uno que no dice nada, va completo', () => {
  assert.equal(esAparatoModesto({ memoria: 8, nucleos: 8 }), false)
  assert.equal(esAparatoModesto({}), false)
})
