/**
 * Genera los iconos de la aplicacion instalable.
 *
 * El favicon que habia era un rayo morado con dieciseis filtros de desenfoque,
 * resto de una plantilla, y pesaba 9,5 kB. No tenia nada que ver con el
 * proyecto. La marca de verdad es la misma que preside el selector: el icono
 * "waypoints" de Lucide, tres nodos y sus enlaces, que es literalmente de lo
 * que va la aplicacion.
 *
 * Se dibuja con el lienzo de png.js, el mismo que hace la miniatura de Open
 * Graph. La geometria esta copiada del propio Lucide para que el icono de la
 * pestaña y el logotipo de la cabecera sean el mismo dibujo y no dos parecidos.
 */
import { writeFileSync } from 'node:fs'
import { crearLienzo, hexARgb } from './png.js'

const FONDO = hexARgb('#05080e')
const ACENTO = hexARgb('#2fe8c6')

/* Geometria de lucide/waypoints, en su caja de 24x24 */
const ENLACES = [
  [10.586, 5.414, 5.414, 10.586],
  [18.586, 13.414, 13.414, 18.586],
  [6, 12, 18, 12],
]
const NODOS = [
  [12, 20],
  [12, 4],
  [20, 12],
  [4, 12],
]
const GROSOR = 2 // el stroke-width original
const RADIO_NODO = 2

/**
 * @param tamano  lado del PNG en pixeles
 * @param ocupa   fraccion del lado que ocupa la marca. Baja en el icono
 *                enmascarable: Android recorta hasta un circulo inscrito y
 *                todo lo que se salga de la zona segura se pierde.
 * @param sangra  true para fondo a sangre (enmascarable y Apple, que ya
 *                redondean ellos), false para cuadrado redondeado propio.
 */
function icono(tamano, ocupa, sangra) {
  const lienzo = crearLienzo(tamano, tamano)

  if (sangra) lienzo.rellenar(FONDO)
  else lienzo.rectangulo(0, 0, tamano, tamano, tamano * 0.22, FONDO)

  // Una unidad del viewBox de 24 en pixeles, y el desplazamiento que centra
  const u = (tamano * ocupa) / 24
  const off = (tamano - 24 * u) / 2
  const X = (v) => off + v * u

  for (const [x1, y1, x2, y2] of ENLACES) {
    lienzo.segmento(X(x1), X(y1), X(x2), X(y2), GROSOR * u, ACENTO)
  }

  // Los nodos son anillos, no discos. Se pintan llenos y se les vacia el
  // centro con el color del fondo: ninguna linea llega al centro de un nodo,
  // asi que el hueco no se come nada.
  for (const [cx, cy] of NODOS) {
    lienzo.circulo(X(cx), X(cy), (RADIO_NODO + GROSOR / 2) * u, ACENTO)
    lienzo.circulo(X(cx), X(cy), (RADIO_NODO - GROSOR / 2) * u, FONDO)
  }

  return lienzo.codificar()
}

const SALIDA = [
  ['public/icon-192.png', icono(192, 0.62, false)],
  ['public/icon-512.png', icono(512, 0.62, false)],
  // Zona segura de Android: la marca cabe en el 80% central
  ['public/icon-maskable-512.png', icono(512, 0.5, true)],
  ['public/apple-touch-icon.png', icono(180, 0.62, true)],
]

for (const [ruta, png] of SALIDA) {
  writeFileSync(ruta, png)
  console.log(`  ${ruta.replace('public/', '').padEnd(24)} ${(png.length / 1024).toFixed(1)} kB`)
}
