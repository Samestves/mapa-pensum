import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ESCALA_MAX,
  MARGEN,
  acotarVisor,
  escalaDeAjuste,
  estaAjustada,
  vistaDeAjuste,
  zoomEnPunto,
} from './visor.js'

const HOJA = { ancho: 794, alto: 1054 }
const PANEL = { ancho: 750, alto: 866 }
const cerca = (a, b) => Math.abs(a - b) < 1e-6

test('la hoja se ajusta por el lado que antes se queda sin sitio', () => {
  // Panel bajo: manda el alto
  assert.ok(cerca(escalaDeAjuste(PANEL, HOJA), (866 - 2 * MARGEN) / 1054))
  // Panel estrecho: manda el ancho
  assert.ok(cerca(escalaDeAjuste({ ancho: 500, alto: 2000 }, HOJA), (500 - 2 * MARGEN) / 794))
})

test('en un panel enorme no se agranda mas alla de su tamaño de papel', () => {
  assert.equal(escalaDeAjuste({ ancho: 3000, alto: 3000 }, HOJA), 1)
})

test('ajustada, la hoja queda entera y centrada', () => {
  const v = vistaDeAjuste(PANEL, HOJA)
  assert.ok(estaAjustada(v, PANEL, HOJA))
  assert.ok(cerca(v.x + (HOJA.ancho * v.escala) / 2, PANEL.ancho / 2))
  assert.ok(cerca(v.y + (HOJA.alto * v.escala) / 2, PANEL.alto / 2))
  assert.ok(v.y >= MARGEN - 1e-6)
})

test('acercar deja quieto lo que hay bajo el cursor', () => {
  const v = vistaDeAjuste(PANEL, HOJA)
  const [px, py] = [420, 500]
  // El punto de la hoja que esta bajo el cursor antes de acercar
  const enHoja = [(px - v.x) / v.escala, (py - v.y) / v.escala]
  const cercaDe = zoomEnPunto(v, 1.6, px, py, PANEL, HOJA)
  assert.ok(cerca(cercaDe.escala, v.escala * 1.6))
  assert.ok(cerca(cercaDe.x + enHoja[0] * cercaDe.escala, px))
  assert.ok(cerca(cercaDe.y + enHoja[1] * cercaDe.escala, py))
  assert.ok(!estaAjustada(cercaDe, PANEL, HOJA))
})

test('no se acerca mas del maximo ni se aleja mas del ajuste', () => {
  const v = vistaDeAjuste(PANEL, HOJA)
  assert.equal(zoomEnPunto(v, 50, 300, 300, PANEL, HOJA).escala, ESCALA_MAX)
  const lejos = zoomEnPunto(zoomEnPunto(v, 2, 300, 300, PANEL, HOJA), 0.01, 300, 300, PANEL, HOJA)
  assert.deepEqual(lejos, v)
})

test('acercada, la hoja se recorre de borde a borde y no mas alla', () => {
  const escala = 2
  const perdida = acotarVisor({ x: 5000, y: -9000, escala }, PANEL, HOJA)
  // Arrastrada hacia la derecha: su borde izquierdo se queda en el margen
  assert.equal(perdida.x, MARGEN)
  // Arrastrada hacia arriba: su borde de abajo se queda en el margen de abajo
  assert.ok(cerca(perdida.y + HOJA.alto * escala, PANEL.alto - MARGEN))
})

test('si cabe en un eje y en el otro no, se centra solo en el que cabe', () => {
  const ancho = { ancho: 2400, alto: 600 }
  const v = acotarVisor({ x: -300, y: -100, escala: 1 }, ancho, HOJA)
  assert.ok(cerca(v.x, (2400 - 794) / 2), 'cabe a lo ancho: centrada')
  assert.equal(v.y, -100, 'no cabe a lo alto: donde se dejo')
})
