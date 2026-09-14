import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ESTADO } from '../data/estados.js'
import { SITUACION, TRAMO, situacionDe, tramoDe } from './situacion.js'

const { APROBADA, CURSANDO, DISPONIBLE, BLOQUEADA } = ESTADO

test('las marcas y lo deducido pasan tal cual', () => {
  const estados = { a: APROBADA, b: CURSANDO, c: DISPONIBLE }
  assert.equal(situacionDe('a', [], estados), SITUACION.HECHA)
  assert.equal(situacionDe('b', ['a'], estados), SITUACION.CURSANDO)
  assert.equal(situacionDe('c', ['a'], estados), SITUACION.INSCRIBIBLE)
})

test('bloqueada que se abre al aprobar lo que cursas es la del semestre que viene', () => {
  const estados = { a: APROBADA, b: CURSANDO, x: BLOQUEADA }
  assert.equal(situacionDe('x', ['a', 'b'], estados), SITUACION.PROXIMA)
})

test('basta una prelacion sin empezar para que quede lejos', () => {
  const estados = { a: APROBADA, b: BLOQUEADA, x: BLOQUEADA }
  assert.equal(situacionDe('x', ['a', 'b'], estados), SITUACION.LEJANA)
})

test('sin prelaciones no se cuela como proxima aunque llegara bloqueada', () => {
  assert.equal(situacionDe('x', [], { x: BLOQUEADA }), SITUACION.LEJANA)
  assert.equal(situacionDe('x', undefined, { x: BLOQUEADA }), SITUACION.LEJANA)
})

test('solo lo que va de aprobada a inscribible es frontera', () => {
  assert.equal(tramoDe(SITUACION.HECHA, SITUACION.INSCRIBIBLE), TRAMO.FRONTERA)
  assert.equal(tramoDe(SITUACION.HECHA, SITUACION.HECHA), TRAMO.RECORRIDO)
  assert.equal(tramoDe(SITUACION.HECHA, SITUACION.CURSANDO), TRAMO.RECORRIDO)
  assert.equal(tramoDe(SITUACION.CURSANDO, SITUACION.PROXIMA), TRAMO.PROXIMA)
  assert.equal(tramoDe(SITUACION.HECHA, SITUACION.PROXIMA), TRAMO.PROXIMA)
  assert.equal(tramoDe(SITUACION.INSCRIBIBLE, SITUACION.LEJANA), TRAMO.LEJANA)
  assert.equal(tramoDe(SITUACION.CURSANDO, SITUACION.LEJANA), TRAMO.LEJANA)
})
