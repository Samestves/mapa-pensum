import test from 'node:test'
import assert from 'node:assert/strict'
import { celdaDe, colorDeFondo } from './pixelesHorario.js'

/* Una imagen pintada a mano, con los mismos campos que un ImageData */
function lienzo(ancho, alto, color) {
  const datos = new Uint8ClampedArray(ancho * alto * 4)
  const imagen = { ancho, alto, datos }
  pintar(imagen, { x0: 0, y0: 0, x1: ancho - 1, y1: alto - 1 }, color)
  return imagen
}

function pintar(imagen, { x0, y0, x1, y1 }, [r, g, b]) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * imagen.ancho + x) * 4
      imagen.datos.set([r, g, b, 255], i)
    }
  }
}

const LINEA = [73, 80, 87]
const VACIA = [33, 37, 41]
const AZUL = [59, 130, 246]
const BLANCO = [255, 255, 255]

/* Dos filas de tres celdas de 100x60 separadas por lineas de 2. En la de
   arriba, un bloque azul tapa las dos primeras celdas y otro, pegado a el, la
   tercera: es el caso dificil, dos bloques del mismo color con solo la linea
   en medio. */
function escena() {
  const imagen = lienzo(308, 126, LINEA)
  for (const y0 of [2, 64]) {
    for (const x0 of [2, 104, 206]) pintar(imagen, { x0, y0, x1: x0 + 99, y1: y0 + 59 }, VACIA)
  }
  pintar(imagen, { x0: 2, y0: 2, x1: 203, y1: 61 }, AZUL)
  pintar(imagen, { x0: 206, y0: 2, x1: 305, y1: 61 }, AZUL)

  /* El "texto" del bloque largo: tres renglones de palabras macizas, que es
     peor que cualquier letra de verdad */
  const codigo = { x0: 30, y0: 10, x1: 70, y1: 20 }
  pintar(imagen, codigo, BLANCO)
  pintar(imagen, { x0: 76, y0: 10, x1: 170, y1: 20 }, BLANCO)
  pintar(imagen, { x0: 40, y0: 27, x1: 160, y1: 37 }, BLANCO)
  pintar(imagen, { x0: 20, y0: 44, x1: 185, y1: 54 }, BLANCO)
  return { imagen, codigo }
}

test('el color de fondo de una palabra', async (t) => {
  await t.test('es el de su celda, no el de sus letras', () => {
    const { imagen, codigo } = escena()
    assert.deepEqual(colorDeFondo(imagen, codigo), AZUL)
  })
})

test('la celda de una palabra', async (t) => {
  await t.test('un bloque que tapa dos columnas mide las dos, y se para en la linea', () => {
    const { imagen, codigo } = escena()
    assert.deepEqual(celdaDe(imagen, codigo), { x0: 2, y0: 2, x1: 203, y1: 61 })
  })

  await t.test('una celda vacia con una palabra dentro', () => {
    const { imagen } = escena()
    const palabra = { x0: 130, y0: 88, x1: 170, y1: 98 }
    pintar(imagen, palabra, BLANCO)
    assert.deepEqual(celdaDe(imagen, palabra), { x0: 104, y0: 64, x1: 203, y1: 123 })
  })

  await t.test('una tilde que asoma por encima no corta el bloque', () => {
    const { imagen, codigo } = escena()
    // Por encima del renglon del codigo, a la derecha: como la tilde de una mayuscula
    pintar(imagen, { x0: 100, y0: 5, x1: 104, y1: 9 }, BLANCO)
    assert.deepEqual(celdaDe(imagen, codigo), { x0: 2, y0: 2, x1: 203, y1: 61 })
  })

  await t.test('aguanta el ruido de una imagen comprimida', () => {
    const { imagen, codigo } = escena()
    for (let i = 0; i < imagen.datos.length; i += 4) {
      // Un ruido que se repite igual en cada prueba, de hasta 10 por canal
      for (let k = 0; k < 3; k++) imagen.datos[i + k] += ((i * 7 + k * 13) % 21) - 10
    }
    assert.deepEqual(celdaDe(imagen, codigo), { x0: 2, y0: 2, x1: 203, y1: 61 })
  })

  await t.test('en tema claro, con una linea apenas mas oscura que la celda', () => {
    const imagen = lienzo(206, 64, [222, 226, 230])
    pintar(imagen, { x0: 2, y0: 2, x1: 101, y1: 61 }, [255, 255, 255])
    pintar(imagen, { x0: 104, y0: 2, x1: 203, y1: 61 }, [255, 255, 255])
    const palabra = { x0: 30, y0: 26, x1: 70, y1: 36 }
    pintar(imagen, palabra, [20, 20, 20])
    assert.deepEqual(celdaDe(imagen, palabra), { x0: 2, y0: 2, x1: 101, y1: 61 })
  })

  await t.test('una palabra pegada al borde de la imagen no revienta', () => {
    const imagen = lienzo(60, 30, AZUL)
    assert.deepEqual(celdaDe(imagen, { x0: 10, y0: 0, x1: 40, y1: 10 }), {
      x0: 0,
      y0: 0,
      x1: 59,
      y1: 29,
    })
  })
})
