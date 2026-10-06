/**
 * El presupuesto de peso. Corre al final de cada build y lo tumba si algo de
 * lo que se descarga pesa mas de su tope.
 *
 * Por que en el build y no en el banco de rendimiento: el peso no necesita
 * Chrome ni un equipo en reposo para medirse, sale igual siempre. Y es lo que
 * mas despacio se nota crecer: cada pantalla nueva añade un par de kB a la
 * entrada, ninguno importa, y un año despues la portada tarda el doble en un
 * telefono con datos lentos sin que nadie haya hecho nada mal.
 *
 * Los topes son lo que pesa hoy mas un 3 %. Si un cambio se pasa hay dos
 * salidas honestas: hacer que eso no viaje ahi (un import diferido, una
 * fuente recortada) o subir el tope aqui, a sabiendas y con el motivo en el
 * commit. Al cerrar una fase de docs/plan-rendimiento.md que aligere algo, su
 * tope baja a lo nuevo medido para que no se vuelva a ganar.
 *
 * Mide comprimido con gzip, que es lo que viaja (Vercel usa brotli, un 15 %
 * menor; gzip es igual en todas partes y sirve para comparar). Las fuentes ya
 * van comprimidas en su formato y se cuentan tal cual.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import {
  CASCARON,
  ENTRADA,
  HOJA_DEL_LECTOR,
  LECTOR,
  PALETA,
  PLAN,
  VISTAS,
  archivosDe,
  juntar,
  pensumDe,
} from './trozos.js'

const DIST = join(dirname(fileURLToPath(import.meta.url)), '../dist')

const kB = (bytes) => bytes / 1024
const crudo = (archivo) => kB(readFileSync(join(DIST, archivo)).length)
const comprimido = (archivo) => kB(gzipSync(readFileSync(join(DIST, archivo))).length)
const sumar = (archivos, medida) => archivos.reduce((suma, a) => suma + medida(a), 0)

/** Las fuentes que pide la portada desde las etiquetas que casan con `patron`. */
const portada = readFileSync(join(DIST, 'index.html'), 'utf8')
const fuentes = (patron) =>
  [...portada.matchAll(patron)].map(([etiqueta]) => etiqueta.match(/href="\/([^"]+)"/)[1])

/* Las carreras son las carpetas del build que traen su propia pagina */
const carreras = readdirSync(DIST, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(DIST, d.name, 'index.html')))
  .map((d) => d.name)

/* Que hay que bajar para cada cosa, contando lo que ya se bajo antes: la
   entrada primero, el cascaron de la carrera encima, y sobre los dos cada
   vista y lo que se abre a mano (ver trozos.js). */
const entrada = archivosDe(ENTRADA)
const cascaron = archivosDe(CASCARON, entrada)
const enLaCarrera = juntar(entrada, cascaron)
const vista = (id) => archivosDe(VISTAS[id], enLaCarrera)
const hojaDelLector = archivosDe(HOJA_DEL_LECTOR, juntar(enLaCarrera, vista('horario')))
const motorDelLector = archivosDe(LECTOR, juntar(enLaCarrera, hojaDelLector))

const js = (archivos) => sumar(archivos.js, comprimido)
const css = (archivos) => sumar(archivos.css, comprimido)
const todo = (archivos) => js(archivos) + css(archivos)

/**
 * Lo que se vigila, en el orden en que se descarga. `tope` en kB.
 *
 *  - La portada: las cuatro primeras filas.
 *  - Entrar a una carrera añade su cascaron -el estado y las barras-, su
 *    pensum y la vista con la que abre. Solo una: las otras dos llegan
 *    despues, en reposo, con el plan y la paleta.
 *  - El lector de horarios va aparte: solo lo baja quien sube una foto, pero
 *    tiene que seguir siendo algo que se pueda bajar con datos. Su motor de
 *    OCR (4 MB) no se cuenta: tiene su propia cache y no crece con nuestro
 *    codigo.
 */
const PARTIDAS = [
  { nombre: 'portada · JS de entrada', kB: js(entrada), tope: 79.1 },
  { nombre: 'portada · CSS', kB: css(entrada), tope: 26.5 },
  {
    // Las que pinta cualquier pantalla: las unicas que se piden sin condicion
    nombre: 'portada · fuentes',
    kB: sumar(fuentes(/<link rel="preload"(?![^>]*media=)[^>]+as="font"[^>]*>/g), crudo),
    tope: 62,
  },
  {
    // La letra del mapa en un telefono: llega detras, con prioridad baja
    nombre: 'portada · fuentes en segundo plano',
    kB: sumar(fuentes(/<link rel="preload"[^>]+fetchpriority="low"[^>]*>/g), crudo),
    tope: 17.5,
  },
  { nombre: 'carrera · cascaron', kB: todo(cascaron), tope: 25.6 },
  {
    nombre: 'carrera · pensum mas pesado',
    kB: Math.max(...carreras.map((slug) => js(archivosDe(pensumDe(slug), entrada)))),
    tope: 3,
  },
  { nombre: 'vista · lista', kB: todo(vista('lista')), tope: 5.7 },
  { nombre: 'vista · mapa', kB: todo(vista('mapa')), tope: 16.3 },
  { nombre: 'vista · horario', kB: todo(vista('horario')), tope: 18.3 },
  { nombre: 'en reposo · plan de ruta', kB: todo(archivosDe(PLAN, enLaCarrera)), tope: 11.6 },
  { nombre: 'en reposo · paleta', kB: todo(archivosDe(PALETA, enLaCarrera)), tope: 2.4 },
  { nombre: 'lector · la hoja que lee la foto', kB: todo(hojaDelLector), tope: 12.9 },
  { nombre: 'lector · sin el motor', kB: todo(motorDelLector), tope: 18 },
]

const pasadas = PARTIDAS.filter((p) => p.kB > p.tope)
const de = (nombre) => PARTIDAS.find((p) => p.nombre === nombre).kB

console.log('\nPeso de lo que se descarga (kB comprimidos):')
for (const { nombre, kB: pesa, tope } of PARTIDAS) {
  const marca = pesa > tope ? '✗' : '✓'
  console.log(`  ${marca} ${nombre.padEnd(34)} ${pesa.toFixed(1).padStart(6)}  de ${tope}`)
}
const deLaPortada = sumar(PARTIDAS.slice(0, 4), (p) => p.kB)
const hastaLaVista = (id) =>
  deLaPortada + de('carrera · cascaron') + de('carrera · pensum mas pesado') + de(`vista · ${id}`)
console.log(
  `  portada ${deLaPortada.toFixed(0)} kB · entrar por la lista ${hastaLaVista('lista').toFixed(0)} kB` +
    ` · por el mapa ${hastaLaVista('mapa').toFixed(0)} kB · por el horario ${hastaLaVista('horario').toFixed(0)} kB`,
)

if (pasadas.length) {
  console.error(
    `\n${pasadas.length} partida(s) por encima de su tope. Aligera lo que viaja ahi,\n` +
      'o sube el tope en scripts/peso.js a sabiendas y cuenta por que en el commit.',
  )
  process.exit(1)
}
