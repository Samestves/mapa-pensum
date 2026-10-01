import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sinTildes } from './texto.js'

test('quita tildes y diéresis y baja a minúsculas', () => {
  assert.equal(sinTildes('Matemáticas I'), 'matematicas i')
  assert.equal(sinTildes('Lingüística'), 'linguistica')
  assert.equal(sinTildes('Ñandú'), 'nandu')
})

test('acepta lo que no es texto sin romperse', () => {
  assert.equal(sinTildes(null), '')
  assert.equal(sinTildes(undefined), '')
  assert.equal(sinTildes(42), '42')
})
