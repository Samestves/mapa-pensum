/**
 * Un lienzo de pixeles y un codificador PNG, sin dependencias.
 *
 * Lo usan la miniatura de Open Graph (og.js) y los iconos de la aplicacion
 * instalable (iconos.js). La alternativa era traer sharp o resvg para
 * rasterizar un SVG, y son decenas de megas de binario por unas imagenes que
 * solo se generan en el build.
 *
 * El PNG se comprime con zlib, que ya viene en la plataforma.
 */
import { deflateSync } from 'node:zlib'

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

export function codificarPng(ancho, alto, rgba) {
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

export const hexARgb = (hex) => {
  const n = hex.replace('#', '')
  return [
    parseInt(n.slice(0, 2), 16),
    parseInt(n.slice(2, 4), 16),
    parseInt(n.slice(4, 6), 16),
  ]
}

export function crearLienzo(ANCHO, ALTO) {
  const pixeles = Buffer.alloc(ANCHO * ALTO * 4)

  function punto(x, y, [r, g, b], alfa = 1) {
    if (x < 0 || y < 0 || x >= ANCHO || y >= ALTO) return
    const i = (y * ANCHO + x) * 4
    // Mezcla sobre lo que ya hay: los bordes curvos se suavizan solos
    pixeles[i] = pixeles[i] * (1 - alfa) + r * alfa
    pixeles[i + 1] = pixeles[i + 1] * (1 - alfa) + g * alfa
    pixeles[i + 2] = pixeles[i + 2] * (1 - alfa) + b * alfa
    pixeles[i + 3] = 255
  }

  function rellenar([r, g, b]) {
    for (let i = 0; i < ANCHO * ALTO; i++) {
      pixeles[i * 4] = r
      pixeles[i * 4 + 1] = g
      pixeles[i * 4 + 2] = b
      pixeles[i * 4 + 3] = 255
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

  /**
   * Segmento de grosor constante y puntas redondeadas. Se pinta midiendo la
   * distancia de cada pixel al segmento, igual que el circulo mide al centro:
   * misma matematica, mismo suavizado, y las puntas salen redondas gratis.
   */
  function segmento(x1, y1, x2, y2, grosor, color, alfa = 1) {
    const radio = grosor / 2
    const dx = x2 - x1
    const dy = y2 - y1
    const largo2 = dx * dx + dy * dy

    const desde = Math.floor(Math.min(x1, x2) - radio - 1)
    const hasta = Math.ceil(Math.max(x1, x2) + radio + 1)
    const arriba = Math.floor(Math.min(y1, y2) - radio - 1)
    const abajo = Math.ceil(Math.max(y1, y2) + radio + 1)

    for (let y = arriba; y <= abajo; y++) {
      for (let x = desde; x <= hasta; x++) {
        const px = x + 0.5 - x1
        const py = y + 0.5 - y1
        // Proyeccion sobre el segmento, recortada a sus extremos
        const t = largo2 ? Math.min(1, Math.max(0, (px * dx + py * dy) / largo2)) : 0
        const d = Math.hypot(px - t * dx, py - t * dy)
        const cobertura = Math.min(1, Math.max(0, radio + 0.5 - d))
        if (cobertura > 0) punto(x, y, color, cobertura * alfa)
      }
    }
  }

  /** Rectangulo de esquinas redondeadas, para el fondo de los iconos */
  function rectangulo(x0, y0, ancho, alto, radio, color) {
    for (let y = Math.floor(y0); y < Math.ceil(y0 + alto); y++) {
      for (let x = Math.floor(x0); x < Math.ceil(x0 + ancho); x++) {
        // Distancia a la caja interior: negativa dentro, positiva en la esquina
        const dx = Math.max(x0 + radio - (x + 0.5), x + 0.5 - (x0 + ancho - radio), 0)
        const dy = Math.max(y0 + radio - (y + 0.5), y + 0.5 - (y0 + alto - radio), 0)
        const cobertura = Math.min(1, Math.max(0, radio + 0.5 - Math.hypot(dx, dy)))
        if (cobertura > 0) punto(x, y, color, cobertura)
      }
    }
  }

  return {
    punto,
    rellenar,
    circulo,
    segmento,
    rectangulo,
    codificar: () => codificarPng(ANCHO, ALTO, pixeles),
  }
}
