import test from 'node:test'
import assert from 'node:assert/strict'
import { colocarTrazo } from './trazo.js'

test('colocar un trazo sin transform', async (t) => {
  await t.test('sin escala ni traslacion devuelve el mismo trazo', () => {
    const d = 'M6.6 10.3l2.3 2.3 4.5-4.9'
    assert.equal(colocarTrazo(d), d)
  })

  await t.test('trasladar mueve las posiciones y deja los desplazamientos', () => {
    assert.equal(colocarTrazo('M1 2l3 4L5 6', 1, 10, 20), 'M11 22l3 4L15 26')
  })

  await t.test('escalar multiplica posiciones y desplazamientos', () => {
    assert.equal(colocarTrazo('M1 2l3 4', 2), 'M2 4l6 8')
  })

  await t.test('H y V llevan un solo numero, cada uno en su eje', () => {
    assert.equal(colocarTrazo('M0 0H10V5h2v3', 2, 1, 100), 'M1 100H21V110h4v6')
  })

  await t.test('un arco escala los radios y la llegada, y no toca giro ni banderas', () => {
    assert.equal(colocarTrazo('M0 0a3 3 0 0 1 6 0', 2), 'M0 0a6 6 0 0 1 12 0')
    assert.equal(colocarTrazo('M0 0A3 3 0 1 0 6 0', 2, 10, 5), 'M10 5A6 6 0 1 0 22 5')
  })

  await t.test('entiende los numeros pegados y las ordenes repetidas', () => {
    // "4.3.35" son dos numeros, "2.3-.15" tambien, y la curva se repite sin letra
    assert.equal(
      colocarTrazo('M10 6c2.3-.15 4.3.35 6 1.6 1 1 2 2 3 3', 2),
      'M20 12c4.6 -0.3 8.6 0.7 12 3.2 2 2 4 4 6 6',
    )
  })

  await t.test('z no lleva numeros y se queda', () => {
    assert.equal(colocarTrazo('M0 0h2v2z', 2, 1, 1), 'M1 1h4v4z')
  })

  await t.test('redondea a milesimas: no deja colas de coma flotante', () => {
    assert.equal(colocarTrazo('M0.1 0.2', 0.875, 190.5, 10.5), 'M190.588 10.675')
  })
})
