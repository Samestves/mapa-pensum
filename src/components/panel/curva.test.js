import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { curvaSuave, escalaRedonda } from './curva.js'

/* Las coordenadas Y de los puntos de control de cada tramo C del trazado */
const controles = (d) =>
  [...d.matchAll(/C([\d.-]+),([\d.-]+) ([\d.-]+),([\d.-]+) /g)].flatMap((m) => [
    Number(m[2]),
    Number(m[4]),
  ])

describe('la curva suave', () => {
  test('sin puntos no dibuja nada, y con uno solo se queda en el', () => {
    assert.equal(curvaSuave([]), '')
    assert.equal(curvaSuave([[10, 20]]), 'M10,20')
  })

  test('empieza en el primer punto y acaba en el ultimo', () => {
    const d = curvaSuave([
      [0, 50],
      [10, 20],
      [20, 40],
    ])
    assert.ok(d.startsWith('M0,50'))
    assert.ok(d.endsWith(' 20,40'))
  })

  test('no se pasa de los extremos: no inventa picos ni valles', () => {
    // Y crece hacia abajo, como en un SVG: 0 es el maximo, 100 el minimo
    const puntos = [
      [0, 100],
      [10, 0],
      [20, 100],
      [30, 40],
      [40, 60],
    ]
    for (const y of controles(curvaSuave(puntos))) {
      assert.ok(y >= 0 && y <= 100, `un control se salio a ${y}`)
    }
  })

  test('en una recta los controles caen sobre la recta', () => {
    const d = curvaSuave([
      [0, 0],
      [10, 10],
      [20, 20],
    ])
    assert.deepEqual(controles(d), [3.3, 6.7, 13.3, 16.7])
  })
})

describe('la escala del eje', () => {
  test('redondea el tope hacia arriba en pasos limpios', () => {
    assert.deepEqual(escalaRedonda(47), { tope: 50, marcas: [0, 25, 50] })
    assert.deepEqual(escalaRedonda(130), { tope: 140, marcas: [0, 70, 140] })
  })

  test('una serie de ceros tiene un eje, no una division por cero', () => {
    assert.equal(escalaRedonda(0).tope, 5)
  })
})
