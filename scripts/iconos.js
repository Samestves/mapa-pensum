/**
 * Genera los iconos de la aplicacion instalable.
 *
 * Dibujan la marca de verdad -la rosa de los vientos del logotipo- sobre
 * fondo oscuro. Antes llevaban el icono "waypoints" de Lucide, que era un
 * generico de relleno; y antes de eso, un rayo morado de una plantilla con
 * dieciseis filtros de desenfoque que pesaba 9,5 kB y no tenia nada que ver
 * con el proyecto.
 *
 * La rosa no se puede componer con circulos y segmentos como se componia el
 * waypoints: son curvas cerradas que hay que rellenar. De ahi el aplanador
 * de trazoLogo.js y el relleno par-impar de png.js, que son las dos piezas
 * que hubo que añadir para poder dibujar esto sin navegador ni dependencias.
 *
 * Se pinta a plena tinta clara y no a dos tonos como en la web. En la web la
 * rosa lleva medias puntas al 42 % para darle relieve; a 192 px eso todavia
 * se lee, pero el icono tambien acaba de favicon a 32 y ahi un 42 % sobre
 * fondo casi negro se convierte en un gris que no se distingue del fondo. Un
 * icono tiene que aguantar su tamaño mas pequeño.
 */
import { writeFileSync } from 'node:fs'
import { crearLienzo, hexARgb } from './png.js'
import { MARCA, VISTA } from './trazoLogo.js'
import { ROSA, NODOS, TRANSFORMA, CAJA } from '../src/data/logoTrazos.js'

const FONDO = hexARgb('#05080e')
const TINTA = hexARgb('#eaf1fa')

const [VX, VY, VANCHO, VALTO] = VISTA

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

  // Del viewBox del logotipo a pixeles, centrado y sin deformar
  const escala = (tamano * ocupa) / Math.max(VANCHO, VALTO)
  const offX = (tamano - VANCHO * escala) / 2
  const offY = (tamano - VALTO * escala) / 2
  const situar = ([x, y]) => [offX + (x - VX) * escala, offY + (y - VY) * escala]

  lienzo.poligonos(
    MARCA.map((poli) => poli.map(situar)),
    TINTA,
  )

  return lienzo.codificar()
}

const SALIDA = [
  ['public/icon-192.png', icono(192, 0.66, false)],
  ['public/icon-512.png', icono(512, 0.66, false)],
  // Zona segura de Android: la marca cabe en el 80% central
  ['public/icon-maskable-512.png', icono(512, 0.52, true)],
  ['public/apple-touch-icon.png', icono(180, 0.66, true)],
]

for (const [ruta, png] of SALIDA) {
  writeFileSync(ruta, png)
  console.log(`  ${ruta.replace('public/', '').padEnd(24)} ${(png.length / 1024).toFixed(1)} kB`)
}

/* El favicon se escribe aqui y no a mano, por la misma razon que los PNG:
   sale de los mismos trazos, asi que no puede quedarse atras cuando la marca
   cambie. Va en SVG porque el navegador lo usa a 16, a 32 y a 64 segun donde
   lo enseñe -pestaña, marcador, historial- y un vectorial los sirve los tres
   nitidos con un solo archivo.

   Lleva su propio fondo oscuro en vez de ser transparente: la rosa se pinta
   en tinta clara, y sobre la barra de pestañas de un navegador en tema claro
   una rosa casi blanca sin fondo no se veria. */
const SALTO = String.fromCharCode(10)
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#05080e"/>
  <svg x="3.4" y="3.4" width="25.2" height="25.2" viewBox="${CAJA}">
    <g transform="${TRANSFORMA}" fill="#eaf1fa">
${[...ROSA, ...NODOS].map((d) => `      <path d="${d}"/>`).join(SALTO)}
    </g>
  </svg>
</svg>
`
writeFileSync('public/favicon.svg', favicon)
console.log(`  favicon.svg              ${(Buffer.byteLength(favicon) / 1024).toFixed(1)} kB`)
