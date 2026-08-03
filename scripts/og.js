/**
 * Genera public/og.png: la miniatura que sale al pegar el enlace en WhatsApp,
 * Telegram, Discord, X o cualquier sitio que lea Open Graph.
 *
 * Se dibuja a mano con el lienzo de png.js, que no trae dependencias. La
 * alternativa era sharp o resvg para rasterizar un SVG, y son decenas de
 * megas de binario por una imagen que no cambia nunca.
 *
 * El texto va en matriz de puntos, con una fuente de 5x7 escrita aqui mismo
 * que solo tiene las ocho letras que hacen falta. No es una limitacion que
 * haya que disimular: el proyecto entero son puntos y cables, asi que el
 * logotipo en puntos pertenece al mismo lenguaje. Y las siluetas de abajo
 * son las de las carreras de verdad, sacadas del indice, asi que la imagen
 * se actualiza sola cuando se agrega una carrera.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { crearLienzo, hexARgb } from './png.js'

const ANCHO = 1200
const ALTO = 630

const lienzo = crearLienzo(ANCHO, ALTO)
const { punto, rellenar, circulo } = lienzo

/* ------------------------------------------------------------------ *
 * Fuente de 5x7, solo las letras de "MAPA DE PENSUM"
 * ------------------------------------------------------------------ */

const FUENTE = {
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  N: ['10001', '11001', '11001', '10101', '10011', '10011', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
}

function escribir(texto, x0, y0, paso, radio, color) {
  let col = 0
  for (const letra of texto.toUpperCase()) {
    const glifo = FUENTE[letra]
    if (!glifo) throw new Error(`La fuente del OG no tiene la letra "${letra}"`)
    for (let fila = 0; fila < glifo.length; fila++) {
      for (let c = 0; c < 5; c++) {
        if (glifo[fila][c] === '1') {
          circulo(x0 + (col + c) * paso, y0 + fila * paso, radio, color)
        }
      }
    }
    col += 6 // 5 de ancho + 1 de separacion
  }
  return col * paso
}

/* ------------------------------------------------------------------ *
 * Composicion
 * ------------------------------------------------------------------ */

const FONDO = hexARgb('#05080e')
const REJILLA = hexARgb('#101a28')
const TINTA = hexARgb('#eaf1fa')
const ACENTO = hexARgb('#2fe8c6')

rellenar(FONDO)

// Rejilla de fondo, la misma del mapa
for (let y = 0; y < ALTO; y += 40) for (let x = 0; x < ANCHO; x++) punto(x, y, REJILLA, 0.5)
for (let x = 0; x < ANCHO; x += 40) for (let y = 0; y < ALTO; y++) punto(x, y, REJILLA, 0.5)

// Logotipo en matriz de puntos, centrado
const PASO = 11
const anchoTexto = 'MAPA DE PENSUM'.length * 6 * PASO - PASO
escribir('MAPA DE PENSUM', (ANCHO - anchoTexto) / 2, 152, PASO, 4.2, TINTA)

// Regla de acento debajo del logotipo
for (let x = (ANCHO - anchoTexto) / 2; x < (ANCHO + anchoTexto) / 2; x++) {
  for (let y = 272; y < 275; y++) punto(Math.round(x), y, ACENTO, 0.9)
}

// Siluetas reales de las ocho carreras
const indice = JSON.parse(readFileSync('src/data/carreras/indice.json', 'utf8'))
const PASO_PUNTO = 12
const SEPARACION = 22
const anchoCarrera = (c) => c.silueta.length * PASO_PUNTO
const anchoTotal =
  indice.reduce((s, c) => s + anchoCarrera(c), 0) + (indice.length - 1) * SEPARACION

let x = (ANCHO - anchoTotal) / 2
const yBase = 372

for (const carrera of indice) {
  const color = hexARgb(carrera.color?.oscuro ?? '#8497b1')
  carrera.silueta.forEach((cantidad, columna) => {
    for (let fila = 0; fila < cantidad; fila++) {
      circulo(
        x + columna * PASO_PUNTO + PASO_PUNTO / 2,
        yBase + fila * PASO_PUNTO + PASO_PUNTO / 2,
        3.9,
        color,
        // Las de abajo se apagan: da profundidad y deja leer la columna
        0.95 - (fila / 9) * 0.45,
      )
    }
  })
  x += anchoCarrera(carrera) + SEPARACION
}

// Va en public/ y no en dist/: asi Vite la copia sola al compilar, queda
// versionada y el README puede usarla de portada sin duplicarla.
const png = lienzo.codificar()
writeFileSync('public/og.png', png)
console.log(`  og.png  ${ANCHO}x${ALTO}  ${(png.length / 1024).toFixed(1)} kB`)
