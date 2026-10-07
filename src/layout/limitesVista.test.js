import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ZOOM } from './constantes.js'
import {
  LANZAMIENTO_MIN,
  MARGEN_PAN,
  acotar,
  acotarVista,
  conZoom,
  frenado,
  velocidadDeLanzamiento,
} from './limitesVista.js'

const ESCRITORIO = { ancho: 1200, alto: 800 }
const TELEFONO = { ancho: 390, alto: 844 }

test('acotar deja el valor dentro del rango', () => {
  assert.equal(acotar(5, 0, 10), 5)
  assert.equal(acotar(-3, 0, 10), 0)
  assert.equal(acotar(30, 0, 10), 10)
})

test('sin medida del contenedor la vista no se toca', () => {
  const v = { x: 9999, y: -9999, escala: 1 }
  assert.equal(acotarVista(v, { ancho: 0, alto: 0 }, 3000, 2000), v)
})

test('el mapa no se pierde: no se aleja mas de un margen del borde', () => {
  const lejos = acotarVista({ x: 5000, y: 5000, escala: 1 }, ESCRITORIO, 3000, 2000)
  assert.equal(lejos.x, MARGEN_PAN)
  assert.equal(lejos.y, MARGEN_PAN)
  const otro = acotarVista({ x: -9000, y: -9000, escala: 1 }, ESCRITORIO, 3000, 2000)
  assert.equal(otro.x, ESCRITORIO.ancho - 3000 - MARGEN_PAN)
  assert.equal(otro.y, ESCRITORIO.alto - 2000 - MARGEN_PAN)
})

test('una vista dentro de los limites se queda como esta', () => {
  const v = { x: -200, y: -100, escala: 1 }
  assert.deepEqual(acotarVista(v, ESCRITORIO, 3000, 2000), v)
})

test('con el mapa mas pequeño que la ventana los limites se leen al reves y no lo clavan', () => {
  const a = acotarVista({ x: 0, y: 0, escala: 0.2 }, ESCRITORIO, 3000, 2000)
  const b = acotarVista({ x: 300, y: 200, escala: 0.2 }, ESCRITORIO, 3000, 2000)
  assert.notEqual(a.x, b.x)
  assert.notEqual(a.y, b.y)
})

test('en el telefono el mapa se deja subir mas alla de su borde de abajo, por la ficha', () => {
  const v = { x: 0, y: -99999, escala: 1 }
  const tel = acotarVista(v, TELEFONO, 3000, 2000)
  const pc = acotarVista(v, { ancho: 1000, alto: TELEFONO.alto }, 3000, 2000)
  assert.ok(tel.y < pc.y)
})

test('el zoom deja fijo el punto que se mira', () => {
  const v = { x: -100, y: -50, escala: 1 }
  const z = conZoom(v, 1.5, 400, 300)
  // el punto del mapa bajo el cursor es el mismo antes y despues
  const antes = [(400 - v.x) / v.escala, (300 - v.y) / v.escala]
  const despues = [(400 - z.x) / z.escala, (300 - z.y) / z.escala]
  assert.ok(Math.abs(antes[0] - despues[0]) < 1e-9)
  assert.ok(Math.abs(antes[1] - despues[1]) < 1e-9)
})

test('el zoom no pasa de los limites de la escala', () => {
  const v = { x: 0, y: 0, escala: 1 }
  assert.equal(conZoom(v, 1000, 0, 0).escala, ZOOM.max)
  assert.equal(conZoom(v, 0.0001, 0, 0).escala, ZOOM.min)
})

const muestras = (...p) => p.map(([x, y, t]) => ({ x, y, t }))

test('un arrastre rapido que se suelta con el dedo en movimiento sigue solo', () => {
  const v = velocidadDeLanzamiento(muestras([0, 0, 0], [20, 10, 20], [40, 20, 40]), 50)
  assert.ok(v)
  assert.ok(Math.abs(v.vx - 1) < 1e-9)
  assert.ok(Math.abs(v.vy - 0.5) < 1e-9)
})

test('no hay lanzamiento con una sola muestra ni con el dedo quieto antes de soltar', () => {
  assert.equal(velocidadDeLanzamiento(muestras([0, 0, 0]), 10), null)
  assert.equal(velocidadDeLanzamiento(muestras([0, 0, 0], [50, 0, 20]), 200), null)
})

test('no hay lanzamiento si va mas despacio de lo que hace falta', () => {
  const lento = muestras([0, 0, 0], [LANZAMIENTO_MIN * 0.5 * 20, 0, 20])
  assert.equal(velocidadDeLanzamiento(lento, 30), null)
})

test('no hay lanzamiento con dos muestras del mismo instante', () => {
  assert.equal(velocidadDeLanzamiento(muestras([0, 0, 5], [90, 0, 5]), 6), null)
})

test('la velocidad solo mira los ultimos 80 ms', () => {
  // antes de eso iba al reves y muy rapido: no cuenta
  const v = velocidadDeLanzamiento(muestras([500, 0, 0], [0, 0, 100], [30, 0, 130]), 140)
  assert.ok(v.vx > 0)
  assert.ok(Math.abs(v.vx - 1) < 1e-9)
})

test('el frenado pierde dos tercios de la velocidad cada friccion', () => {
  assert.equal(frenado(0), 1)
  assert.ok(Math.abs(frenado(325) - Math.exp(-1)) < 1e-12)
  assert.ok(frenado(32) > frenado(64))
})
