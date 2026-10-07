import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ambos } from './manejadores.js'

test('lo que solo tiene uno de los juegos se queda como esta', () => {
  const a = { onPointerDown: () => 'a' }
  const b = { onPointerUp: () => 'b' }
  const juntos = ambos(a, b)
  assert.equal(juntos.onPointerDown, a.onPointerDown)
  assert.equal(juntos.onPointerUp, b.onPointerUp)
})

test('lo que tienen los dos se llama en orden, primero el del arrastre', () => {
  const llamadas = []
  const a = { onPointerMove: (e) => llamadas.push(['a', e]) }
  const b = { onPointerMove: (e) => llamadas.push(['b', e]) }
  ambos(a, b).onPointerMove('evento')
  assert.deepEqual(llamadas, [
    ['a', 'evento'],
    ['b', 'evento'],
  ])
})

test('no modifica los juegos que recibe', () => {
  const a = { onPointerMove: () => {} }
  const b = { onPointerMove: () => {} }
  const antes = a.onPointerMove
  ambos(a, b)
  assert.equal(a.onPointerMove, antes)
})
