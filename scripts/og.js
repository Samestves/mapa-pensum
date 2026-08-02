/**
 * Genera dist/og.png: la miniatura que sale al pegar el enlace en WhatsApp,
 * Telegram, Discord, X o cualquier sitio que lea Open Graph.
 *
 * Se dibuja a mano en Node y se codifica el PNG con zlib, que ya viene en la
 * plataforma. La alternativa era traer sharp o resvg para rasterizar un SVG,
 * y son decenas de megas de binario por una imagen que no cambia nunca.
 *
 * El texto va en matriz de puntos, con una fuente de 5x7 escrita aqui mismo
 * que solo tiene las ocho letras que hacen falta. No es una limitacion que
 * haya que disimular: el proyecto entero son puntos y cables, asi que el
 * logotipo en puntos pertenece al mismo lenguaje. Y las siluetas de abajo
 * son las de las carreras de verdad, sacadas del indice, asi que la imagen
 * se actualiza sola cuando se agrega una carrera.
 */
import { deflateSync } from 'node:zlib'
import { readFileSync, writeFileSync } from 'node:fs'

const ANCHO = 1200
const ALTO = 630

/* ------------------------------------------------------------------ *
 * Codificacion PNG
 * ------------------------------------------------------------------ */

const TABLA_CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = TABLA_CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function trozo(tipo, datos) {
  const largo = Buffer.alloc(4)
  largo.writeUInt32BE(datos.length)
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(cuerpo))
  return Buffer.concat([largo, cuerpo, crc])
}

function codificarPng(ancho, alto, rgba) {
  // Cada fila lleva delante su byte de filtro; 0 = sin filtro
  const crudo = Buffer.alloc((ancho * 4 + 1) * alto)
  for (let y = 0; y < alto; y++) {
    const destino = y * (ancho * 4 + 1)
    crudo[destino] = 0
    rgba.copy(crudo, destino + 1, y * ancho * 4, (y + 1) * ancho * 4)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(ancho, 0)
  ihdr.writeUInt32BE(alto, 4)
  ihdr[8] = 8 // bits por canal
  ihdr[9] = 6 // color RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', ihdr),
    trozo('IDAT', deflateSync(crudo, { level: 9 })),
    trozo('IEND', Buffer.alloc(0)),
  ])
}

/* ------------------------------------------------------------------ *
 * Lienzo
 * ------------------------------------------------------------------ */

const lienzo = Buffer.alloc(ANCHO * ALTO * 4)

const hexARgb = (hex) => {
  const n = hex.replace('#', '')
  return [
    parseInt(n.slice(0, 2), 16),
    parseInt(n.slice(2, 4), 16),
    parseInt(n.slice(4, 6), 16),
  ]
}

function punto(x, y, [r, g, b], alfa = 1) {
  if (x < 0 || y < 0 || x >= ANCHO || y >= ALTO) return
  const i = (y * ANCHO + x) * 4
  // Mezcla sobre lo que ya hay: los circulos se suavizan por los bordes
  lienzo[i] = lienzo[i] * (1 - alfa) + r * alfa
  lienzo[i + 1] = lienzo[i + 1] * (1 - alfa) + g * alfa
  lienzo[i + 2] = lienzo[i + 2] * (1 - alfa) + b * alfa
  lienzo[i + 3] = 255
}

function rellenar(color) {
  const [r, g, b] = color
  for (let i = 0; i < ANCHO * ALTO; i++) {
    lienzo[i * 4] = r
    lienzo[i * 4 + 1] = g
    lienzo[i * 4 + 2] = b
    lienzo[i * 4 + 3] = 255
  }
}

/** Circulo con borde suavizado por cobertura del pixel */
function circulo(cx, cy, radio, color, alfa = 1) {
  const desde = Math.floor(cx - radio - 1)
  const hasta = Math.ceil(cx + radio + 1)
  const arriba = Math.floor(cy - radio - 1)
  const abajo = Math.ceil(cy + radio + 1)

  for (let y = arriba; y <= abajo; y++) {
    for (let x = desde; x <= hasta; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
      const cobertura = Math.min(1, Math.max(0, radio + 0.5 - d))
      if (cobertura > 0) punto(x, y, color, cobertura * alfa)
    }
  }
}

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

const png = codificarPng(ANCHO, ALTO, lienzo)
writeFileSync('dist/og.png', png)
console.log(`  og.png  ${ANCHO}x${ALTO}  ${(png.length / 1024).toFixed(1)} kB`)
