import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tramosDeSemestre } from './tramos.js'

const arcos = (d) => (d.match(/A/g) ?? []).length
const puntos = (d) => [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)(?=A|$)/g)].map((m) => [+m[1], +m[2]])

test('un tramo por materia, repartidos por lo que le pasa a cada una', () => {
  const aro = tramosDeSemestre({ total: 6, hechas: 2, cursando: 1, huecos: 1 })
  assert.equal(arcos(aro.hechas), 2)
  assert.equal(arcos(aro.cursando), 1)
  assert.equal(arcos(aro.pendientes), 2)
  assert.equal(arcos(aro.huecos), 1)
})

test('lo que no tiene materias no dibuja nada', () => {
  const aro = tramosDeSemestre({ total: 5, hechas: 0, cursando: 0, huecos: 0 })
  assert.equal(aro.hechas, '')
  assert.equal(aro.cursando, '')
  assert.equal(aro.huecos, '')
  assert.equal(arcos(aro.pendientes), 5)
})

test('el primer tramo arranca arriba y todos caen sobre el aro', () => {
  const aro = tramosDeSemestre({ total: 4, hechas: 1, cursando: 0, huecos: 0 })
  const [[x, y]] = puntos(aro.hechas)
  // Arriba del todo, corrido medio hueco hacia la derecha
  assert.ok(x > 7 && x < 8.5 && y < 1.4)
  for (const d of [aro.hechas, aro.pendientes]) {
    for (const [px, py] of puntos(d)) {
      assert.ok(Math.abs(Math.hypot(px - 7, py - 7) - 5.9) < 0.02)
    }
  }
})

test('un semestre de una sola materia es el aro entero, en dos arcos', () => {
  const aro = tramosDeSemestre({ total: 1, hechas: 0, cursando: 0, huecos: 0 })
  assert.equal(arcos(aro.pendientes), 2)
})

test('la misma cuenta devuelve el mismo aro, sin volver a calcularlo', () => {
  const cuenta = { total: 7, hechas: 3, cursando: 2, huecos: 0 }
  assert.equal(tramosDeSemestre(cuenta), tramosDeSemestre({ ...cuenta }))
})
