/**
 * Convierte los trazos del logotipo en poligonos planos.
 *
 * El rasterizador de png.js sabe pintar circulos, segmentos y rectangulos,
 * que es todo lo que necesitaba la marca anterior -el icono "waypoints" de
 * Lucide, cuatro nodos y tres lineas-. La rosa de los vientos no es nada de
 * eso: son curvas cerradas que hay que RELLENAR.
 *
 * Aplanarlas aqui, en Node y sin navegador, es posible porque el calco usa
 * una gramatica minima: M, m, l, c y z. Trece subtrazos en total. No hay
 * arcos, ni curvas suaves, ni cuadraticas.
 *
 * Cada subtrazo sale como un poligono independiente, y se rellenan todos
 * juntos con regla par-impar: asi los subtrazos interiores del calco -los
 * que en el dibujo son huecos- se recortan solos en vez de taparse pintando
 * encima del color del fondo, que es lo que obligaria a que la marca solo
 * funcionase sobre un fondo liso.
 */
import { ROSA, NODOS, CAJA } from '../src/data/logoTrazos.js'

/* Cuantos segmentos por curva. El calco trae curvas cortas -son el contorno
   de una estrella, no una espiral-, asi que con dieciseis el borde ya es
   mas fino que el pixel a 512, que es el icono mas grande que generamos. */
const TRAMOS = 16

/* El grupo del calco trae su propio sistema: del reves y a un decimo. En vez
   de reescribir cuatro mil coordenadas se aplica aqui, que es una linea. */
const situar = (x, y) => [x * 0.1, 1278 - y * 0.1]

const NUMERO = /-?\d*\.?\d+(?:e[-+]?\d+)?/y
const LETRA = /[A-Za-z]/

/** Un trazo "d" a lista de poligonos, cada uno como array de [x, y] */
export function aPoligonos(d) {
  const piezas = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? []
  const poligonos = []
  let actual = null
  let orden = null
  let x = 0
  let y = 0
  let ix = 0
  let iy = 0
  let i = 0

  const n = () => parseFloat(piezas[i++])
  const meter = (px, py) => actual.push(situar(px, py))

  while (i < piezas.length) {
    if (LETRA.test(piezas[i])) orden = piezas[i++]

    switch (orden) {
      case 'M':
      case 'm': {
        if (orden === 'M') {
          x = n()
          y = n()
        } else {
          x += n()
          y += n()
        }
        ix = x
        iy = y
        actual = []
        poligonos.push(actual)
        meter(x, y)
        // Una coordenada suelta despues de un moveto es un lineto
        orden = orden === 'M' ? 'L' : 'l'
        break
      }
      case 'L':
      case 'l': {
        if (orden === 'L') {
          x = n()
          y = n()
        } else {
          x += n()
          y += n()
        }
        meter(x, y)
        break
      }
      case 'C':
      case 'c': {
        const rel = orden === 'c'
        const x1 = rel ? x + n() : n()
        const y1 = rel ? y + n() : n()
        const x2 = rel ? x + n() : n()
        const y2 = rel ? y + n() : n()
        const x3 = rel ? x + n() : n()
        const y3 = rel ? y + n() : n()
        for (let s = 1; s <= TRAMOS; s++) {
          const t = s / TRAMOS
          const u = 1 - t
          meter(
            u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
            u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
          )
        }
        x = x3
        y = y3
        break
      }
      case 'Z':
      case 'z': {
        x = ix
        y = iy
        actual = null
        orden = null
        break
      }
      default:
        i++ // basura que no deberia llegar; no bloquear el build por ella
    }
  }

  return poligonos.filter((p) => p.length > 2)
}

/** Los trece subtrazos de la marca, ya planos y en coordenadas del viewBox */
export const MARCA = [...ROSA, ...NODOS].flatMap(aPoligonos)

/** La caja del dibujo: "x y ancho alto" del viewBox */
export const VISTA = CAJA.split(' ').map(Number)
