import { afterEach, beforeEach, mock, test } from 'node:test'
import assert from 'node:assert/strict'
import { relojAplazable } from './relojAplazable.js'

/* El tiempo de la prueba: los temporizadores de mentira de node y una hora
   que avanza con ellos. */
let hora = 0
const ahora = () => hora
const pasar = (ms) => {
  hora += ms
  mock.timers.tick(ms)
}

beforeEach(() => {
  hora = 0
  mock.timers.enable({ apis: ['setTimeout'] })
})
afterEach(() => mock.timers.reset())

test('vence una vez, cuando pasa el plazo desde el ultimo aplazamiento', () => {
  let veces = 0
  const reloj = relojAplazable(150, () => veces++, ahora)

  reloj.aplazar()
  pasar(100)
  reloj.aplazar()
  pasar(100)
  assert.equal(veces, 0, 'a los 200 ms del primero, pero a 100 del ultimo')
  pasar(60)
  assert.equal(veces, 1)
  pasar(500)
  assert.equal(veces, 1, 'y no vuelve a vencer solo')
})

test('aplazarlo muchas veces no pone un temporizador cada vez', () => {
  const puestos = mock.method(globalThis, 'setTimeout')
  const reloj = relojAplazable(150, () => {}, ahora)

  for (let i = 0; i < 50; i++) {
    reloj.aplazar()
    pasar(2)
  }
  assert.equal(puestos.mock.callCount(), 1)
  puestos.mock.restore()
})

test('asegurar deja uno pendiente sin correr la hora del que ya habia', () => {
  let veces = 0
  const reloj = relojAplazable(150, () => veces++, ahora)

  reloj.aplazar()
  pasar(100)
  reloj.asegurar()
  pasar(60)
  assert.equal(veces, 1, 'vencio a los 150 ms del aplazamiento')

  reloj.asegurar()
  pasar(149)
  assert.equal(veces, 1)
  pasar(2)
  assert.equal(veces, 2, 'sin ninguno pendiente, asegurar pone uno')
})

test('cancelado no vence, y se puede volver a usar', () => {
  let veces = 0
  const reloj = relojAplazable(150, () => veces++, ahora)

  reloj.aplazar()
  pasar(100)
  reloj.cancelar()
  pasar(500)
  assert.equal(veces, 0)

  reloj.aplazar()
  pasar(151)
  assert.equal(veces, 1)
})
