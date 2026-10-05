/**
 * El presupuesto de peso. Corre al final de cada build y lo tumba si algo de
 * lo que se descarga para arrancar pesa mas de su tope.
 *
 * Por que en el build y no en el banco de rendimiento: el peso no necesita
 * Chrome ni un equipo en reposo para medirse, sale igual siempre. Y es lo que
 * mas despacio se nota crecer: cada pantalla nueva añade un par de kB a la
 * entrada, ninguno importa, y un año despues la portada tarda el doble en un
 * telefono con datos lentos sin que nadie haya hecho nada mal.
 *
 * Los topes son lo que pesa hoy mas un 3 %. Si un cambio se pasa hay dos
 * salidas honestas: hacer que eso no viaje en el arranque (un import
 * diferido, una fuente recortada) o subir el tope aqui, a sabiendas y con el
 * motivo en el commit. Al cerrar una fase de docs/plan-rendimiento.md que
 * aligere algo, su tope baja a lo nuevo medido para que no se vuelva a ganar.
 *
 * Mide comprimido con gzip, que es lo que viaja (Vercel usa brotli, un 15 %
 * menor; gzip es igual en todas partes y sirve para comparar). Las fuentes ya
 * van comprimidas en su formato y se cuentan tal cual.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const DIST = join(dirname(fileURLToPath(import.meta.url)), '../dist')
const ACTIVOS = join(DIST, 'assets')

const kB = (bytes) => bytes / 1024
const crudo = (archivo) => kB(readFileSync(join(ACTIVOS, archivo)).length)
const comprimido = (archivo) => kB(gzipSync(readFileSync(join(ACTIVOS, archivo))).length)

/** Los archivos de /assets que cita un HTML en las etiquetas que casan con `patron`. */
function citados(html, patron) {
  return [...html.matchAll(patron)].map(([etiqueta]) => etiqueta.match(/\/assets\/([^"]+)"/)[1])
}

/* Las carreras son las carpetas del build que traen su propia pagina, y el
   pensum de cada una es el trozo que lleva su nombre. */
const carreras = readdirSync(DIST, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(DIST, d.name, 'index.html')))
  .map((d) => d.name)
const activos = readdirSync(ACTIVOS)
const pensums = activos.filter((a) => carreras.some((slug) => a.startsWith(`${slug}-`)))

const portada = readFileSync(join(DIST, 'index.html'), 'utf8')
const carrera = readFileSync(join(DIST, carreras[0], 'index.html'), 'utf8')

const sumar = (archivos, medida) => archivos.reduce((suma, a) => suma + medida(a), 0)

/**
 * Lo que se vigila, en el orden en que se descarga. `tope` en kB.
 *
 * La portada son las cuatro primeras filas; entrar a una carrera añade las
 * dos siguientes. El lector de horarios va aparte: solo lo baja quien sube una
 * foto, pero tiene que seguir siendo algo que se pueda bajar con datos. Su
 * motor de OCR (4 MB) no se cuenta: tiene su propia cache y no crece con
 * nuestro codigo.
 */
const PARTIDAS = [
  {
    nombre: 'portada · JS de entrada',
    kB: sumar(citados(portada, /<script type="module"[^>]+>/g), comprimido),
    tope: 78.5,
  },
  {
    nombre: 'portada · CSS',
    kB: sumar(citados(portada, /<link rel="stylesheet"[^>]+>/g), comprimido),
    tope: 26.5,
  },
  {
    // Las que pinta cualquier pantalla: las unicas que se piden sin condicion
    nombre: 'portada · fuentes',
    kB: sumar(citados(portada, /<link rel="preload"(?![^>]*media=)[^>]+as="font"[^>]*>/g), crudo),
    tope: 62,
  },
  {
    // La letra del mapa en un telefono: llega detras, con prioridad baja
    nombre: 'portada · fuentes en segundo plano',
    kB: sumar(citados(portada, /<link rel="preload"[^>]+fetchpriority="low"[^>]*>/g), crudo),
    tope: 17.5,
  },
  {
    nombre: 'carrera · JS de la vista',
    kB: sumar(citados(carrera, /<link rel="modulepreload"[^>]+VistaCarrera-[^>]+>/g), comprimido),
    tope: 78,
  },
  {
    nombre: 'carrera · pensum mas pesado',
    kB: Math.max(...pensums.map(comprimido)),
    tope: 3,
  },
  {
    nombre: 'lector de horarios, sin el motor',
    kB: sumar(
      activos.filter((a) => a.startsWith('lectorLocal-')),
      comprimido,
    ),
    tope: 18,
  },
]

const pasadas = PARTIDAS.filter((p) => p.kB > p.tope)

console.log('\nPeso de lo que se descarga (kB comprimidos):')
for (const { nombre, kB: pesa, tope } of PARTIDAS) {
  const marca = pesa > tope ? '✗' : '✓'
  console.log(`  ${marca} ${nombre.padEnd(34)} ${pesa.toFixed(1).padStart(6)}  de ${tope}`)
}
const deLaPortada = sumar(PARTIDAS.slice(0, 4), (p) => p.kB)
const deLaCarrera = sumar(PARTIDAS.slice(0, 6), (p) => p.kB)
console.log(
  `  portada ${deLaPortada.toFixed(0)} kB · entrar a una carrera ${deLaCarrera.toFixed(0)} kB`,
)

if (pasadas.length) {
  console.error(
    `\n${pasadas.length} partida(s) por encima de su tope. Aligera lo que viaja en el arranque,\n` +
      'o sube el tope en scripts/peso.js a sabiendas y cuenta por que en el commit.',
  )
  process.exit(1)
}
