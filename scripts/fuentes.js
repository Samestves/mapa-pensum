/**
 * Recorta las fuentes a lo que se escribe en español y deja en src/fuentes/
 * los archivos y la hoja que los declara. Se corre con: npm run fuentes
 * (ya lo hacen npm run dev y npm run build).
 *
 * Por que. Las cuatro fuentes eran mas de la mitad de lo que pesa la portada:
 * 126 kB de 228. El paquete de cada una ya viene partido por alfabetos y el
 * navegador solo baja el latino, pero "latino" son doscientos y pico
 * caracteres -islandes, frances, danes- y todos los dibujos alternativos de
 * cada letra. Aqui se escribe en español.
 *
 * Que se quita, y que no:
 *  - Los caracteres que el español no usa. Los que si, estan en CARACTERES.
 *  - Los rasgos tipograficos que la aplicacion no enciende: juegos
 *    estilisticos, fracciones, versalitas. Se quedan los que el navegador
 *    aplica solo y las cifras tabulares (tabular-nums), que si se usan.
 *  - NO se tocan los ejes: Inter conserva el de tamaño optico, que es por lo
 *    que se eligio (ver --font-sans en estilos/tema.css), y todos los pesos.
 *
 * Asi una letra recortada es, pixel a pixel, la misma que la original.
 *
 * Cada fuente se declara dos veces, y sin solaparse: el recorte, para los
 * caracteres del español, y el archivo latino entero, solo para el RESTO de
 * su rango. Si aparece un caracter de fuera -una «ç» en el nombre de un
 * profesor- el navegador baja el entero para ese caracter: cuesta peso, no se
 * ve mal. Que no se solapen importa: con dos declaraciones cubriendo la misma
 * letra, document.fonts.load baja las dos, y cada navegador decide a su
 * manera cual gana.
 *
 * Los alfabetos que el paquete trae ademas (cirilico, griego, vietnamita) no
 * se declaran: una letra de esos sale con la del sistema.
 *
 * Se generan y no se guardan en el repositorio, como src/data/carreras: son
 * binarios que salen de node_modules y de este archivo.
 */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import subsetFont from 'subset-font'

const YO = fileURLToPath(import.meta.url)
const RAIZ = join(dirname(YO), '..')
const SALIDA = join(RAIZ, 'src/fuentes')
const SELLO = join(SALIDA, '.sello')

const ASCII = Array.from({ length: 95 }, (_, i) => String.fromCodePoint(0x20 + i)).join('')

/* Lo que se escribe en español: el teclado, las letras con tilde y diéresis
   en las dos cajas -las mayusculas hacen falta aunque nadie las escriba,
   porque los rotulos van con text-transform-, la eñe, los signos de apertura
   y la puntuacion de imprenta que usan los textos. */
const CARACTERES = `${ASCII} ¡¿ªº«»·°±×÷ÁÉÍÓÚÜÑáéíóúüñ–—‘’“”…•€−`

/* Lo que cubre el archivo "latino" de cada paquete: el reparto de Google
   Fonts, igual en las tres familias. */
const LATINO =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,' +
  'U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'

/* Los rasgos que el navegador aplica sin que nadie se lo pida (ligaduras,
   interletraje, alternativas de contexto, marcas) y las cifras tabulares. */
const RASGOS = ['calt', 'ccmp', 'kern', 'liga', 'locl', 'mark', 'mkmk', 'rclt', 'rvrn', 'tnum']

/* Cada fuente: de que archivo sale y como se declara. */
const FUENTES = [
  {
    nombre: 'inter',
    familia: 'Inter Variable',
    peso: '100 900',
    formato: 'woff2-variations',
    origen: '@fontsource-variable/inter/files/inter-latin-opsz-normal.woff2',
  },
  {
    nombre: 'jost',
    familia: 'Jost Variable',
    peso: '100 900',
    formato: 'woff2-variations',
    origen: '@fontsource-variable/jost/files/jost-latin-wght-normal.woff2',
  },
  {
    nombre: 'plex-mono-300',
    familia: 'IBM Plex Mono',
    peso: '300',
    formato: 'woff2',
    origen: '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-300-normal.woff2',
  },
  {
    nombre: 'plex-mono-400',
    familia: 'IBM Plex Mono',
    peso: '400',
    formato: 'woff2',
    origen: '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2',
  },
]

const leerOrigen = (fuente) => readFileSync(join(RAIZ, 'node_modules', fuente.origen))

const puntosDe = (caracteres) => new Set([...caracteres].map((c) => c.codePointAt(0)))

/** Los puntos de un unicode-range ya escrito: "U+0000-00FF,U+0131" */
function puntosDelRango(rango) {
  const puntos = new Set()
  for (const tramo of rango.split(',')) {
    const [de, a = de] = tramo.replace('U+', '').split('-')
    for (let p = parseInt(de, 16); p <= parseInt(a, 16); p++) puntos.add(p)
  }
  return puntos
}

/** Unos puntos como los pide unicode-range, con los tramos seguidos juntos. */
function rangoUnicode(puntos) {
  const tramos = []
  for (const punto of [...puntos].sort((a, b) => a - b)) {
    const ultimo = tramos.at(-1)
    if (ultimo && punto === ultimo[1] + 1) ultimo[1] = punto
    else tramos.push([punto, punto])
  }
  const hex = (n) => n.toString(16).toUpperCase()
  return tramos.map(([de, a]) => (de === a ? `U+${hex(de)}` : `U+${hex(de)}-${hex(a)}`)).join(',')
}

const declarar = (fuente, archivo, rango) => `@font-face {
  font-family: '${fuente.familia}';
  font-style: normal;
  font-display: swap;
  font-weight: ${fuente.peso};
  src: url(./${archivo}) format('${fuente.formato}');
  unicode-range: ${rango};
}`

/**
 * Los caracteres de los pensum que se quedarian fuera del recorte.
 *
 * Lo que se dibuja siempre son los nombres de las materias: si uno trae un
 * caracter de fuera, cada estudiante de esa carrera bajaria la fuente
 * completa por una letra. Mejor enterarse aqui y añadirla a CARACTERES.
 */
function fueraDelRecorte() {
  const dentro = new Set(CARACTERES)
  const fuera = new Set()
  const mirar = (carpeta) => {
    for (const entrada of readdirSync(carpeta, { withFileTypes: true })) {
      const ruta = join(carpeta, entrada.name)
      if (entrada.isDirectory()) mirar(ruta)
      else if (entrada.name.endsWith('.json')) {
        for (const c of readFileSync(ruta, 'utf8')) if (c > '~' && !dentro.has(c)) fuera.add(c)
      }
    }
  }
  mirar(join(RAIZ, 'datos'))
  return [...fuera]
}

/* Con que se hicieron los archivos que hay: este guion y las fuentes de
   origen. Si nada de eso cambio no hay nada que rehacer, y arrancar el
   servidor de desarrollo no espera dos segundos cada vez. */
function selloActual() {
  const sello = createHash('sha256').update(readFileSync(YO))
  for (const fuente of FUENTES) sello.update(leerOrigen(fuente))
  return sello.digest('hex')
}

const fuera = fueraDelRecorte()
if (fuera.length) {
  console.error(
    `Hay caracteres en datos/ que el recorte de fuentes no trae: ${fuera.join(' ')}\n` +
      'Añadelos a CARACTERES en scripts/fuentes.js.',
  )
  process.exit(1)
}

const sello = selloActual()
const alDia =
  existsSync(SELLO) &&
  readFileSync(SELLO, 'utf8') === sello &&
  FUENTES.every((f) => existsSync(join(SALIDA, `${f.nombre}-es.woff2`)))

if (alDia) {
  console.log('Fuentes: al dia.')
} else {
  mkdirSync(SALIDA, { recursive: true })
  const español = puntosDe(CARACTERES)
  const resto = new Set([...puntosDelRango(LATINO)].filter((punto) => !español.has(punto)))
  const kB = (bytes) => (bytes / 1024).toFixed(1)
  const declaraciones = []
  let antes = 0
  let despues = 0

  for (const fuente of FUENTES) {
    const original = leerOrigen(fuente)
    const recorte = await subsetFont(original, CARACTERES, {
      targetFormat: 'woff2',
      keepFeatures: RASGOS,
    })
    writeFileSync(join(SALIDA, `${fuente.nombre}-es.woff2`), recorte)
    writeFileSync(join(SALIDA, `${fuente.nombre}-latino.woff2`), original)
    declaraciones.push(
      declarar(fuente, `${fuente.nombre}-es.woff2`, rangoUnicode(español)),
      declarar(fuente, `${fuente.nombre}-latino.woff2`, rangoUnicode(resto)),
    )
    antes += original.length
    despues += recorte.length
  }

  writeFileSync(
    join(SALIDA, 'fuentes.css'),
    `/* Generado por scripts/fuentes.js. No se edita a mano. */\n\n${declaraciones.join('\n\n')}\n`,
  )
  writeFileSync(SELLO, sello)
  console.log(`Fuentes: ${kB(antes)} kB → ${kB(despues)} kB, ${español.size} caracteres.`)
}
