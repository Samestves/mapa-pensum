import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  adoptarMarcadas,
  calcularFranja,
  casillaLibre,
  casillasLibres,
  esCasillaLibre,
  nombreCasilla,
} from './franjaElectivas.js'
import { ESTADO } from '../data/estados.js'

const grupo = (clave, titulo, n) => ({
  clave,
  titulo,
  tipo: 'electiva',
  cuota: null,
  asignaturas: Array.from({ length: n }, (_, i) => ({ codigo: `${clave}${i + 1}`, uc: 2 })),
})

const TECNICAS = grupo('tecnica', 'Electivas Técnicas', 3)
const AREAS = grupo('areas-de-grado', 'Areas de Grado', 2)
const COLUMNAS = [0, 100, 200]

test('hay una casilla libre posible por opcion, y se reconocen como libres', () => {
  const mapa = casillasLibres([TECNICAS, AREAS])
  assert.equal(mapa.size, 5)
  assert.equal(mapa.get('libre-areas-de-grado-2'), 'areas-de-grado')
  assert.ok(esCasillaLibre(casillaLibre('tecnica', 1)))
  assert.ok(!esCasillaLibre('casilla-tecnica-1'))
})

test('la casilla vacia se nombra en singular', () => {
  assert.equal(nombreCasilla(TECNICAS), 'Electiva Técnica')
  assert.equal(nombreCasilla(AREAS), 'Área de Grado')
})

test('sin nada elegido, cada grupo es una casilla vacia y van en la misma fila', () => {
  const { nodos, filas } = calcularFranja([TECNICAS, AREAS], {}, COLUMNAS, 1000)
  assert.deepEqual(
    nodos.map((n) => [n.codigo, n.x]),
    [
      ['libre-tecnica-1', 0],
      ['libre-areas-de-grado-1', 100],
    ],
  )
  assert.equal(nodos[0].y, nodos[1].y)
  assert.equal(filas[1].x, 100, 'el rotulo va encima de la primera casilla de su grupo')
  assert.equal(filas[0].elegidas, 0)
  assert.equal(filas[0].opciones, 3)
})

test('las elegidas van primero, por su numero, y detras la primera libre', () => {
  const elegidas = { 'libre-tecnica-3': 'tecnica3', 'libre-tecnica-1': 'tecnica1' }
  const { nodos, filas } = calcularFranja([TECNICAS], elegidas, COLUMNAS, 0)
  assert.deepEqual(
    nodos.map((n) => [n.codigo, n.x]),
    [
      ['libre-tecnica-1', 0],
      ['libre-tecnica-3', 100],
      ['libre-tecnica-2', 200],
    ],
  )
  assert.equal(filas[0].elegidas, 2)
})

test('con todas elegidas no queda casilla vacia, y lo que no cabe baja de fila', () => {
  const elegidas = {
    'libre-tecnica-1': 'tecnica1',
    'libre-tecnica-2': 'tecnica2',
    'libre-tecnica-3': 'tecnica3',
  }
  const { nodos, filas } = calcularFranja([TECNICAS, AREAS], elegidas, [0, 100], 0)
  assert.deepEqual(
    nodos.map((n) => n.codigo),
    ['libre-tecnica-1', 'libre-tecnica-2', 'libre-tecnica-3', 'libre-areas-de-grado-1'],
  )
  assert.equal(nodos[2].x, 0)
  assert.ok(nodos[2].y > nodos[0].y)
  assert.equal(filas[1].y, filas[0].y + (nodos[2].y - nodos[0].y), 'el grupo siguiente arranca en su fila')
})

test('las electivas con marca entran solas en la franja, sin pisar lo elegido', () => {
  const elegidas = { 'libre-tecnica-1': 'tecnica2' }
  const marcas = { tecnica3: ESTADO.APROBADA, tecnica2: ESTADO.CURSANDO, 'areas-de-grado1': ESTADO.CURSANDO }
  const resultado = adoptarMarcadas(elegidas, [TECNICAS, AREAS], marcas)
  assert.deepEqual(resultado, {
    'libre-tecnica-1': 'tecnica2',
    'libre-tecnica-2': 'tecnica3',
    'libre-areas-de-grado-1': 'areas-de-grado1',
  })
})

test('si no hay nada que adoptar devuelve el mismo objeto', () => {
  const elegidas = { 'libre-tecnica-1': 'tecnica1' }
  assert.equal(adoptarMarcadas(elegidas, [TECNICAS], { tecnica1: ESTADO.APROBADA }), elegidas)
})
