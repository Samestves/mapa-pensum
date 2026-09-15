import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AUMENTO_MAX, capaCubre, mismaVista, transformRelativo } from './vistaViva.js'

const VENTANA = { ancho: 400, alto: 300 }

/* Zoom de factor f dejando quieto el punto (px, py), como hace el pellizco */
const acercar = (v, f, px, py) => ({
  escala: v.escala * f,
  x: px - (px - v.x) * f,
  y: py - (py - v.y) * f,
})

test('el transform relativo deja cada punto del mapa donde lo pone la vista viva', () => {
  const pintada = { x: 30, y: -20, escala: 0.8 }
  const viva = acercar(pintada, 1.4, 180, 90)
  const t = transformRelativo(viva, pintada)
  for (const X of [0, 125, 900]) {
    const enPintada = pintada.x + pintada.escala * X
    assert.ok(Math.abs(t.x + t.k * enPintada - (viva.x + viva.escala * X)) < 1e-9)
  }
})

test('sin cambios no hay nada que estirar', () => {
  assert.ok(mismaVista({ x: 1, y: 2, escala: 3 }, { x: 1, y: 2, escala: 3 }))
  assert.ok(!mismaVista({ x: 1, y: 2, escala: 3 }, { x: 1, y: 2, escala: 3.01 }))
  assert.deepEqual(transformRelativo({ x: 5, y: 6, escala: 2 }, { x: 5, y: 6, escala: 2 }), {
    k: 1,
    x: 0,
    y: 0,
  })
})

test('acercar con el mapa llenando la pantalla se resuelve estirando la capa', () => {
  const pintada = { x: -300, y: -200, escala: 1 }
  const viva = acercar(pintada, 1.5, 200, 150)
  assert.ok(capaCubre(viva, pintada, VENTANA, 2000, 1500))
})

test('alejar con el mapa llenando la pantalla dejaria bordes vacios: hay que pintar', () => {
  const pintada = { x: -300, y: -200, escala: 1 }
  const viva = acercar(pintada, 0.8, 200, 150)
  assert.ok(!capaCubre(viva, pintada, VENTANA, 2000, 1500))
})

test('alejar desde el mapa entero si cabe en la capa', () => {
  const pintada = { x: 100, y: 75, escala: 1 }
  const viva = acercar(pintada, 0.5, 200, 150)
  assert.ok(capaCubre(viva, pintada, VENTANA, 200, 150))
})

test('pasado el aumento maximo se repinta aunque cubra, para que no se vea borroso', () => {
  const pintada = { x: -300, y: -200, escala: 1 }
  assert.ok(capaCubre(acercar(pintada, AUMENTO_MAX - 0.01, 200, 150), pintada, VENTANA, 2000, 1500))
  assert.ok(!capaCubre(acercar(pintada, AUMENTO_MAX + 0.01, 200, 150), pintada, VENTANA, 2000, 1500))
})

test('desplazarse mientras se pellizca destapa un borde: hay que pintar', () => {
  const pintada = { x: -300, y: -200, escala: 1 }
  const viva = { ...acercar(pintada, 1.1, 200, 150), x: -300 * 1.1 + 200 }
  assert.ok(!capaCubre(viva, pintada, VENTANA, 2000, 1500))
})
