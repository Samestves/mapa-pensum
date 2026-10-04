/* El lector que corre en el aparato del estudiante: tesseract.js -un OCR de
   codigo abierto, compilado a WebAssembly- lee las palabras de la captura con
   su caja, y layout/lecturaLocal.js arma con ellas el horario. No sale ni un
   byte de la imagen del telefono, no hay cupo y no hay cola.

   Este archivo es solo el pegamento con el navegador: el lienzo y el
   trabajador de tesseract. Todo lo que decide algo esta en layout/, con sus
   pruebas. Y se carga con import() desde useLecturaHorario.js, solo cuando
   alguien sube una foto: de aqui cuelgan varios megas que la mayoria
   de las visitas no van a necesitar. */
import tesseract from 'tesseract.js/dist/tesseract.esm.min.js'
import { leerCaptura } from '../layout/lecturaLocal.js'

/* Los archivos pesados salen de node_modules y Vite los publica en este
   mismo dominio: el trabajador y el nucleo en /assets con su hash, y el modelo
   del idioma en /lector (vite.config.js cuenta por que). Se prefirio a un CDN por tres
   razones: la version del nucleo y la de la libreria no pueden separarse
   -vienen del mismo package-lock-, la aplicacion no pasa a depender de que
   jsdelivr este arriba ni le cuenta a un tercero quien sube un horario, y el
   service worker los guarda, asi que la segunda lectura no baja nada. No estan
   en public/ porque serian siete megas de binarios dentro del repositorio.

   Quedan FUERA de la precarga del service worker (scripts/serviceworker.js):
   se bajan al subir la primera foto, no al abrir la aplicacion. */
import trabajador from 'tesseract.js/dist/worker.min.js?url'
import nucleoRapido from 'tesseract.js-core/tesseract-core-simd-lstm.wasm.js?url'
import nucleoLento from 'tesseract.js-core/tesseract-core-lstm.wasm.js?url'

/* El ingles es el modelo mas pequeño que hay y basta: lo que hay que leer bien
   son cifras, horas, "Secc" y "Aula", todo ASCII. Los nombres de las materias
   salen sin tildes, pero la materia se reconoce por el codigo. */
const IDIOMA = 'eng'
const CARPETA_DEL_IDIOMA = '/lector/4.0.0_best_int'

/* Un modulo minimo de WebAssembly con una instruccion SIMD: si el navegador lo
   da por valido, puede con el nucleo rapido. Es la misma comprobacion que hace
   wasm-feature-detect, sin traerse la libreria. */
const CON_SIMD = new Uint8Array([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15,
  253, 98, 11,
])
const haySimd = () => {
  try {
    return WebAssembly.validate(CON_SIMD)
  } catch {
    return false
  }
}

/* Como parte tesseract la pagina antes de leer. "Texto suelto" busca palabras
   por toda la imagen sin suponer parrafos, que es lo que es una rejilla. Un
   recorte, en cambio, es un bloque de texto corriente. */
const TEXTO_SUELTO = '11'
const UN_BLOQUE = '6'

const absoluta = (ruta) => new URL(ruta, location.href).href

/* tesseract no devuelve un error cuando no arranca: lo tira por su cuenta y
   deja la promesa colgada. Con `errorHandler` el fallo llega aqui, y con el
   se rechaza la espera. */
function arrancar() {
  return new Promise((listo, fallar) => {
    tesseract
      .createWorker(IDIOMA, 1, {
        workerPath: absoluta(trabajador),
        corePath: absoluta(haySimd() ? nucleoRapido : nucleoLento),
        langPath: absoluta(CARPETA_DEL_IDIOMA),
        /* El trabajador se abre desde su URL y no desde un blob: dentro de un
           blob las rutas no tienen dominio contra el que resolverse */
        workerBlobURL: false,
        /* tesseract guardaria el idioma en IndexedDB por su cuenta. Ya lo
           guarda el service worker, y dos copias de tres megas en un telefono
           sobran. */
        cacheMethod: 'none',
        errorHandler: (error) => fallar(new Error(String(error?.message ?? error))),
      })
      .then(listo, fallar)
  })
}

const aPalabras = (datos, dx, dy) =>
  (datos.blocks ?? [])
    .flatMap((bloque) => bloque.paragraphs)
    .flatMap((parrafo) => parrafo.lines)
    .flatMap((renglon) => renglon.words)
    .map((p) => ({
      texto: p.text,
      x0: p.bbox.x0 + dx,
      y0: p.bbox.y0 + dy,
      x1: p.bbox.x1 + dx,
      y1: p.bbox.y1 + dy,
    }))

function lienzoDe(ancho, alto) {
  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto
  return lienzo
}

/* La captura que entiende leerCaptura, hecha con un lienzo y un trabajador */
function capturaDe(mapa, ocr) {
  const leerLienzo = async (lienzo, modo, dx = 0, dy = 0) => {
    await ocr.setParameters({ tessedit_pageseg_mode: modo })
    const { data } = await ocr.recognize(lienzo, {}, { blocks: true, text: false })
    return aPalabras(data, dx, dy)
  }

  return {
    ancho: mapa.width,
    alto: mapa.height,
    ampliar: async (ampliacion) => {
      const lienzo = lienzoDe(
        Math.round(mapa.width * ampliacion),
        Math.round(mapa.height * ampliacion),
      )
      const pincel = lienzo.getContext('2d', { willReadFrequently: true })
      pincel.imageSmoothingQuality = 'high'
      // Fondo blanco: lo transparente de un PNG se leeria como negro
      pincel.fillStyle = '#ffffff'
      pincel.fillRect(0, 0, lienzo.width, lienzo.height)
      pincel.drawImage(mapa, 0, 0, lienzo.width, lienzo.height)
      const pixeles = pincel.getImageData(0, 0, lienzo.width, lienzo.height)

      return {
        imagen: { ancho: pixeles.width, alto: pixeles.height, datos: pixeles.data },
        leer: (zona) => {
          if (!zona) return leerLienzo(lienzo, TEXTO_SUELTO)
          const [ancho, alto] = [zona.x1 - zona.x0 + 1, zona.y1 - zona.y0 + 1]
          const recorte = lienzoDe(ancho, alto)
          recorte
            .getContext('2d')
            .drawImage(lienzo, zona.x0, zona.y0, ancho, alto, 0, 0, ancho, alto)
          return leerLienzo(recorte, UN_BLOQUE, zona.x0, zona.y0)
        },
      }
    },
  }
}

/**
 * Lee el horario de una imagen sin salir del aparato.
 *
 * Se lee del archivo original y no de la copia que se prepara para subir: esa
 * va en JPEG, y el JPEG emborrona justo los bordes de las letras pequeñas.
 *
 * Revienta si tesseract no puede arrancar -sin red la primera vez, un
 * navegador sin WebAssembly- o si se corta con `senal`. Quien llama decide que
 * hacer: aqui no hay plan B.
 *
 * @param {Blob} archivo
 * @param {object} [opciones]
 * @param {Set<string>} [opciones.codigos]  los codigos del pensum abierto
 * @param {AbortSignal} [opciones.senal]
 * @returns {Promise<{clases: object[], dudas: string[], lecturas: number}>}
 */
export async function leerEnElAparato(archivo, { codigos, senal } = {}) {
  let ocr = null
  let mapa = null
  const cortar = () => ocr?.terminate()
  senal?.addEventListener('abort', cortar, { once: true })

  try {
    /* Cada uno se apunta en cuanto llega: si el otro falla, el `finally` tiene
       que encontrar lo que ya se abrio para poder cerrarlo */
    await Promise.all([
      arrancar().then((nacido) => (ocr = nacido)),
      createImageBitmap(archivo).then((abierto) => (mapa = abierto)),
    ])
    /* Si se corto mientras arrancaba, el trabajador acaba de nacer y nadie lo
       ha cerrado todavia */
    if (senal?.aborted) throw new DOMException('cortado', 'AbortError')
    return await leerCaptura(capturaDe(mapa, ocr), { codigos })
  } finally {
    senal?.removeEventListener('abort', cortar)
    mapa?.close?.()
    /* Siempre se cierra: el nucleo ocupa mas de cien megas de memoria mientras
       vive, y en un telefono eso es la diferencia entre seguir o que el
       sistema mate la pestaña. */
    await ocr?.terminate().catch(() => {})
  }
}
