import {
  celdaDe,
  filasDeColumna,
  ocupadas,
  zonaConMasBordes,
  zonaDeLaTabla,
} from './pixelesHorario.js'
import {
  altoDeLetra,
  codigoDe,
  diaDe,
  franjasDe,
  leerRejilla,
  sustituir,
} from './rejillaHorario.js'

/* El orden en que se lee una captura en el aparato: a que tamaño, cuando se
   repite y que se vuelve a mirar de cerca. No sabe nada de canvas ni de
   tesseract: recibe una "captura" que sabe ampliarse y leerse, y con eso el
   mismo recorrido corre en el navegador, en Node y en las pruebas. */

/* El primer tamaño es una apuesta por el ancho: una captura del horario, con
   sus siete u ocho franjas, llevada a este ancho deja la letra en veintitantos
   pixeles, que es donde el OCR lee comodo. Ampliar menos de 1 no se hace:
   encoger nunca ayudo a leer. */
const ANCHO_COMODO = 2400
const AMPLIACION_MAXIMA = 3

/* Un lienzo mas grande que esto no cabe en la memoria de un telefono modesto */
const LADO_TOPE = 4096

/* Si tras la primera lectura la letra salio mas pequeña que el minimo -la
   apuesta fallo: muchas franjas, o una captura reducida-, se repite una vez
   apuntando al alto comodo. */
const LETRA_MINIMA = 17
const LETRA_COMODA = 26

/* Si la tabla ocupa menos que esto de lo que se leyo, se vuelve a leer
   recortada a ella (ver zonaDeLaTabla y zonaConMasBordes) */
const RECORTAR_POR_DEBAJO_DE = 0.6

/* Una imagen asi de alta respecto a su ancho es la captura de un telefono en
   vertical: la tabla, que es apaisada, no puede ocuparla entera */
const VERTICAL = 1.3

/* El tiempo que se les da a los detalles, contado desde el primer repaso.
   Cada repaso es la lectura de un recorte, y en un telefono modesto cuesta uno
   o dos segundos: con una docena de bloques sin aula, repasarlos todos le
   sumaria medio minuto a una lectura que ya vale. Lo que hace falta para que
   una clase exista -su bloque, su dia- se repasa siempre; el aula y la
   seccion, mientras quede tiempo (ver los repasos en leerRejilla). */
const PLAZO_DE_REPASOS = 12000

/* Un bloque sin leer que tampoco sale recortado se lee otra vez, recortado y
   al doble: en una captura borrosa, a veces es lo que le falta al codigo */
const SEGUNDA_MIRADA = 2

const acotar = (v, min, max) => Math.max(min, Math.min(max, v))

/** La ampliacion con la que se empieza a leer una imagen de ese tamaño. */
export function primeraAmpliacion(ancho, alto) {
  const tope = LADO_TOPE / Math.max(ancho, alto)
  return Math.min(acotar(ANCHO_COMODO / ancho, 1, AMPLIACION_MAXIMA), tope)
}

/**
 * La ampliacion de una segunda lectura, o null si no hace falta o no cabe.
 *
 * @param {number} letra  alto de la letra de la cabecera en la primera lectura
 */
export function segundaAmpliacion(ampliacion, letra, ancho, alto) {
  if (!letra || letra >= LETRA_MINIMA) return null
  const tope = LADO_TOPE / Math.max(ancho, alto)
  const nueva = Math.min((ampliacion * LETRA_COMODA) / letra, tope)
  // Si el tope no deja crecer de verdad, repetir es tiempo tirado
  return nueva > ampliacion * 1.2 ? nueva : null
}

const dentroDe = (zona, caja) =>
  caja.x0 >= zona.x0 && caja.x1 <= zona.x1 && caja.y0 >= zona.y0 && caja.y1 <= zona.y1
const areaDe = (z) => (z.x1 - z.x0 + 1) * (z.y1 - z.y0 + 1)

/* Una caja de una pagina leida -ampliada y quiza recortada- en medidas de la
   imagen original */
function aOriginal(pagina, caja, ancho, alto) {
  const { x0 = 0, y0 = 0 } = pagina.zona ?? {}
  const a = pagina.ampliacion
  return {
    x0: Math.max(0, x0 + Math.floor(caja.x0 / a)),
    y0: Math.max(0, y0 + Math.floor(caja.y0 / a)),
    x1: Math.min(ancho - 1, x0 + Math.ceil(caja.x1 / a)),
    y1: Math.min(alto - 1, y0 + Math.ceil(caja.y1 / a)),
  }
}

/* Si recortar a `zona` merece la pena: es bastante menor que lo que ya se leyo */
const mereceRecortar = (pagina, zona, ancho, alto) =>
  areaDe(zona) <
  areaDe(pagina.zona ?? { x0: 0, y0: 0, x1: ancho - 1, y1: alto - 1 }) * RECORTAR_POR_DEBAJO_DE

/**
 * La parte de la imagen original que merece una segunda lectura recortada,
 * o null: la tabla ocupa poco de la imagen, y dentro de ella cabe todo lo que
 * la primera lectura reconocio -los dias y los codigos-. Si algo de eso
 * quedara fuera, recortar perderia lo que ya se tenia.
 */
function zonaParaAcercar(pagina, ancho, alto) {
  const franjas = franjasDe(pagina.palabras)
  if (!franjas.length) return null
  const cabecera = franjas
    .map((f) => f.caja)
    .reduce((a, b) => ({
      x0: Math.min(a.x0, b.x0),
      y0: Math.min(a.y0, b.y0),
      x1: Math.max(a.x1, b.x1),
      y1: Math.max(a.y1, b.y1),
    }))
  const tabla = zonaDeLaTabla(pagina.imagen, cabecera)
  const conocidas = pagina.palabras.filter((p) => codigoDe(p.texto) || diaDe(p.texto))
  if (!conocidas.every((p) => dentroDe(tabla, p))) return null
  const zona = aOriginal(pagina, tabla, ancho, alto)
  return mereceRecortar(pagina, zona, ancho, alto) ? zona : null
}

/**
 * La parte de la imagen con mas contenido, o null: si no es bastante menor
 * que lo ya leido -una foto de una hoja, con bordes por todas partes- no hay
 * nada que recortar.
 */
function parteConMasContenido(pagina, ancho, alto) {
  const parte = zonaConMasBordes(pagina.imagen)
  const zona = parte && aOriginal(pagina, parte, ancho, alto)
  return zona && mereceRecortar(pagina, zona, ancho, alto) ? zona : null
}

const medidasDe = (zona) => [zona.x1 - zona.x0 + 1, zona.y1 - zona.y0 + 1]

/**
 * Como hacer la segunda lectura, o null si no hace falta: recortada a la
 * tabla si ocupa poco de la imagen, y mas grande si la letra salio pequeña.
 * Recortada se puede ampliar mas, porque el lienzo es menor.
 */
function acercamiento(pagina, ancho, alto) {
  const letra = altoDeLetra(pagina.palabras)
  const zona = zonaParaAcercar(pagina, ancho, alto)
  if (!zona) {
    const ampliacion = segundaAmpliacion(pagina.ampliacion, letra, ancho, alto)
    return ampliacion && { ampliacion }
  }
  const [zw, zh] = [zona.x1 - zona.x0 + 1, zona.y1 - zona.y0 + 1]
  const ampliacion = Math.max(
    primeraAmpliacion(zw, zh),
    segundaAmpliacion(pagina.ampliacion, letra, zw, zh) ?? 0,
  )
  return { ampliacion, zona }
}

const llenos = (clases) =>
  clases.reduce((n, c) => n + Object.values(c).filter((valor) => valor !== '').length, 0)

/* Cuantas veces sale cada codigo. Un conteo y no la lista en orden: una
   relectura deja las palabras del recorte al final, y con ellas su codigo. */
const cuenta = (clases) =>
  clases.reduce((veces, c) => veces.set(c.codigo, (veces.get(c.codigo) ?? 0) + 1), new Map())

/* Una relectura solo se acepta si no pierde nada de lo que habia -ningun
   codigo- y trae algo mas: una clase que faltaba o, con las mismas, algun
   dato mas sin mas dudas. Releer un bloque para sacarle el aula y perder por
   el camino el codigo, que ya estaba bien, seria ir a peor. */
function mejora(nueva, vieja) {
  const despues = cuenta(nueva.clases)
  for (const [codigo, veces] of cuenta(vieja.clases)) {
    if ((despues.get(codigo) ?? 0) < veces) return false
  }
  if (nueva.clases.length > vieja.clases.length) return true
  return nueva.dudas.length <= vieja.dudas.length && llenos(nueva.clases) > llenos(vieja.clases)
}

/**
 * Lee el horario de una captura.
 *
 * @param {object} captura
 * @param {number} captura.ancho
 * @param {number} captura.alto
 * @param {(ampliacion: number, zona?: object) => Promise<{imagen: object, leer: Function}>} captura.ampliar
 *   La captura a ese tamaño -o solo esa zona de ella, en medidas de la
 *   original-: sus pixeles (`imagen`, como un ImageData) y `leer(zona,
 *   escala)`, que devuelve las palabras de la pagina entera o, con zona, las
 *   de ese recorte -ampliado `escala` veces-, siempre en coordenadas de la
 *   pagina.
 * @param {object} [opciones]
 * @param {Set<string>} [opciones.codigos]  los codigos del pensum abierto
 * @param {(avance: {paso: string, motivo?: string, hechos?: number, total?: number}) => void} [opciones.alAvance]
 *   Se llama al empezar cada paso: 'leyendo' la pagina, 'acercando' si hay
 *   que leerla otra vez mas grande, y 'repasando' cada recorte, con su motivo.
 * @param {number} [opciones.plazoDeRepasos]  milisegundos para los detalles
 * @param {() => number} [opciones.ahora]  el reloj; las pruebas pasan uno de mentira
 * @returns {Promise<{clases: object[], dudas: string[], lecturas: number}>}
 *   Sin dudas, el resultado se puede usar sin preguntarle a nadie mas.
 */
export async function leerCaptura({ ancho, alto, ampliar }, opciones = {}) {
  const {
    codigos,
    alAvance = () => {},
    plazoDeRepasos = PLAZO_DE_REPASOS,
    ahora = Date.now,
  } = opciones
  let lecturas = 0

  const pasada = async (ampliacion, zona = null) => {
    alAvance({ paso: lecturas ? 'acercando' : 'leyendo' })
    const pagina = await ampliar(ampliacion, zona ?? undefined)
    const palabras = await pagina.leer()
    lecturas++
    return { ...pagina, ampliacion, zona, palabras }
  }
  /* Lo que se saca de una pagina: con sus pixeles se miden las celdas, se
     buscan bloques sin leer y se cuentan las filas */
  const deLaPagina = ({ imagen }) => ({
    medir: (caja) => celdaDe(imagen, caja),
    opciones: {
      codigos,
      ocupadas: (casillas) => ocupadas(imagen, casillas),
      filasEnColumna: (columna, muestra) => filasDeColumna(imagen, columna, muestra),
    },
  })
  const leerPagina = (pagina, palabras) => {
    const { medir, opciones } = deLaPagina(pagina)
    return leerRejilla(palabras, medir, opciones)
  }

  const leerZona = (zona) => pasada(primeraAmpliacion(...medidasDe(zona)), zona)
  const leerEntera = () => pasada(primeraAmpliacion(ancho, alto))

  /* En la captura de un telefono en vertical se busca la tabla antes de leer,
     mirando solo los pixeles, y la primera lectura ya va recortada a ella:
     leer la imagen entera seria ampliar mucho menos y gastar casi todo el
     tiempo en fondo y barras. */
  const vertical = alto > ancho * VERTICAL
  const parte =
    vertical && parteConMasContenido({ ...(await ampliar(1)), ampliacion: 1 }, ancho, alto)
  let pagina = await (parte ? leerZona(parte) : leerEntera())
  let resultado = leerPagina(pagina, pagina.palabras)

  /* Sin cabecera, se prueba una vez lo que falte por probar: la imagen
     entera si se empezo por una parte, o su parte con mas contenido si se
     empezo por la entera. Si tampoco hay rejilla, se queda la primera. */
  if (resultado.dudas.includes('sin-rejilla')) {
    const otraZona = parte ? null : parteConMasContenido(pagina, ancho, alto)
    const otra = parte ? await leerEntera() : otraZona && (await leerZona(otraZona))
    const leido = otra && leerPagina(otra, otra.palabras)
    if (leido && !leido.dudas.includes('sin-rejilla')) [pagina, resultado] = [otra, leido]
  }

  /* Solo se vuelve a leer la pagina si lo leido tiene dudas: si ya vale, otra
     lectura es tiempo tirado */
  const otra = resultado.dudas.length ? acercamiento(pagina, ancho, alto) : null
  if (otra) {
    pagina = await pasada(otra.ampliacion, otra.zona)
    resultado = leerPagina(pagina, pagina.palabras)
  }
  let palabras = pagina.palabras

  const { repasos } = resultado
  const hasta = ahora() + plazoDeRepasos
  for (const [hechos, { zona, motivo }] of repasos.entries()) {
    // Los detalles van al final: el primero que ya no cabe corta
    if (motivo === 'detalle' && ahora() > hasta) break
    alAvance({ paso: 'repasando', motivo, hechos, total: repasos.length })
    const escalas = motivo === 'bloque' ? [1, SEGUNDA_MIRADA] : [1]
    for (const escala of escalas) {
      const candidatas = sustituir(palabras, zona, await pagina.leer(zona, escala))
      lecturas++
      const nuevo = leerPagina(pagina, candidatas)
      if (mejora(nuevo, resultado)) {
        palabras = candidatas
        resultado = nuevo
        break
      }
    }
  }

  return { clases: resultado.clases, dudas: resultado.dudas, lecturas }
}
