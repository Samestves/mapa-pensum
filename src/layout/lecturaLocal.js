import { celdaDe } from './pixelesHorario.js'
import { altoDeLetra, leerRejilla, sustituir } from './rejillaHorario.js'

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

const llenos = (clases) =>
  clases.reduce((n, c) => n + Object.values(c).filter((valor) => valor !== '').length, 0)
const codigosDe = (clases) => clases.map((c) => c.codigo).join(' ')

/* Una segunda lectura solo se acepta si no estropea nada: los mismos codigos,
   no mas dudas, y algun dato mas que antes. Releer un bloque para sacarle el
   aula y perder por el camino el codigo, que ya estaba bien, seria ir a peor. */
const mejora = (nueva, vieja) =>
  codigosDe(nueva.clases) === codigosDe(vieja.clases) &&
  nueva.dudas.length <= vieja.dudas.length &&
  llenos(nueva.clases) > llenos(vieja.clases)

/**
 * Lee el horario de una captura.
 *
 * @param {object} captura
 * @param {number} captura.ancho
 * @param {number} captura.alto
 * @param {(ampliacion: number) => Promise<{imagen: object, leer: Function}>} captura.ampliar
 *   La captura a ese tamaño: sus pixeles (`imagen`, como un ImageData) y
 *   `leer(zona)`, que devuelve las palabras de la pagina entera o, con zona,
 *   las de ese recorte, siempre en coordenadas de la pagina.
 * @param {object} [opciones]
 * @param {Set<string>} [opciones.codigos]  los codigos del pensum abierto
 * @returns {Promise<{clases: object[], dudas: string[], lecturas: number}>}
 *   Sin dudas, el resultado se puede usar sin preguntarle a nadie mas.
 */
export async function leerCaptura({ ancho, alto, ampliar }, opciones = {}) {
  let lecturas = 0

  const pasada = async (ampliacion) => {
    const pagina = await ampliar(ampliacion)
    const palabras = await pagina.leer()
    lecturas++
    return { ...pagina, ampliacion, palabras }
  }

  let pagina = await pasada(primeraAmpliacion(ancho, alto))
  const otra = segundaAmpliacion(pagina.ampliacion, altoDeLetra(pagina.palabras), ancho, alto)
  if (otra) pagina = await pasada(otra)

  const medir = (caja) => celdaDe(pagina.imagen, caja)
  let palabras = pagina.palabras
  let resultado = leerRejilla(palabras, medir, opciones)

  for (const zona of resultado.repasos) {
    const candidatas = sustituir(palabras, zona, await pagina.leer(zona))
    lecturas++
    const nuevo = leerRejilla(candidatas, medir, opciones)
    if (mejora(nuevo, resultado)) {
      palabras = candidatas
      resultado = nuevo
    }
  }

  return { clases: resultado.clases, dudas: resultado.dudas, lecturas }
}
