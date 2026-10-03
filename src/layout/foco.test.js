import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planoDeFoco, salidaDeFoco, sinLoDe } from './foco.js'

/* Tres materias en fila, A -> B -> C, mas D suelta, y una casilla de electiva
   que lleva dentro a E. */
const nodos = [
  { codigo: 'A' },
  { codigo: 'B' },
  { codigo: 'C' },
  { codigo: 'D' },
  { codigo: 'H1', esHueco: true },
]
const aristas = [
  { id: 'A->B', origen: 'A', destino: 'B' },
  { id: 'B->C', origen: 'B', destino: 'C' },
]
const base = {
  nodos,
  casillasFranja: [],
  aristas,
  enCasilla: (codigo) => (codigo === 'H1' ? { codigo: 'E' } : null),
}

test('sin cadena no hay foco', () => {
  assert.equal(planoDeFoco({ ...base, cadena: null }), null)
})

test('una cadena deja nitidas sus materias y los cables entre ellas', () => {
  const foco = planoDeFoco({ ...base, cadena: new Set(['A', 'B']) })
  assert.deepEqual([...foco.nodos], ['A', 'B'])
  assert.deepEqual([...foco.aristas], ['A->B'])
})

test('una casilla llena cuenta por la electiva que lleva y se dibuja con su clave', () => {
  const foco = planoDeFoco({ ...base, cadena: new Set(['E']) })
  assert.deepEqual([...foco.nodos], ['H1'])
})

test('sinLoDe resta conjuntos y trata la falta de uno como vacio', () => {
  assert.deepEqual([...sinLoDe(new Set([1, 2, 3]), new Set([2]))], [1, 3])
  assert.deepEqual([...sinLoDe(new Set([1]), null)], [1])
  assert.deepEqual([...sinLoDe(null, new Set([1]))], [])
})

const foco = (nodosEnFoco, cables = []) => ({
  nodos: new Set(nodosEnFoco),
  aristas: new Set(cables),
  cadena: new Set(nodosEnFoco),
})

test('encender el foco desde nada no deja nada saliendo', () => {
  assert.equal(salidaDeFoco(null, foco(['A'])), null)
})

test('cambiar de foco funde solo lo que sale', () => {
  const sale = salidaDeFoco(foco(['A', 'B'], ['A->B']), foco(['B', 'C'], ['B->C']))
  assert.deepEqual([...sale.nodos], ['A'])
  assert.deepEqual([...sale.aristas], ['A->B'])
  assert.equal(sale.fundir, true)
})

test('apagar el foco sostiene todo lo que habia mientras el mapa se enciende', () => {
  const sale = salidaDeFoco(foco(['A', 'B'], ['A->B']), null)
  assert.deepEqual([...sale.nodos], ['A', 'B'])
  assert.equal(sale.fundir, false)
})
