/* El lector que corre en el aparato del estudiante: tesseract.js -un OCR de
   codigo abierto, compilado a WebAssembly- lee las palabras de la captura con
   su caja, y layout/lecturaLocal.js arma con ellas el horario. No sale ni un
   byte de la imagen del telefono, no hay cupo y no hay cola.

   Este archivo es solo el pegamento con el navegador: la bajada, el lienzo y
   el trabajador de tesseract. Todo lo que decide algo esta en layout/, con sus
   pruebas. Y se carga con import() desde data/leerHorario.js, solo cuando
   alguien va a subir una foto: de aqui cuelgan varios megas que la mayoria de
   las visitas no van a necesitar. */
import tesseract from 'tesseract.js/dist/tesseract.esm.min.js'
import PESOS from 'virtual:pesos-del-lector'
import { leerCaptura } from '../layout/lecturaLocal.js'
import { FalloLectura } from './leerHorario.js'

/* Los archivos pesados salen de node_modules y Vite los publica en este
   mismo dominio: el trabajador y el nucleo en /assets con su hash, y el modelo
   del idioma en /lector (vite.config.js cuenta por que). Se prefirio a un CDN por tres
   razones: la version del nucleo y la de la libreria no pueden separarse
   -vienen del mismo package-lock-, la aplicacion no pasa a depender de que
   jsdelivr este arriba ni le cuenta a un tercero quien sube un horario, y el
   service worker los guarda, asi que la segunda lectura no baja nada. No estan
   en public/ porque serian siete megas de binarios dentro del repositorio.

   Quedan FUERA de la precarga del service worker (scripts/serviceworker.js):
   se bajan al ir a subir la primera foto, no al abrir la aplicacion. */
import trabajador from 'tesseract.js/dist/worker.min.js?url'
import nucleoRapido from 'tesseract.js-core/tesseract-core-simd-lstm.wasm.js?url'
import nucleoLento from 'tesseract.js-core/tesseract-core-lstm.wasm.js?url'

/* El ingles es el modelo mas pequeño que hay y basta: lo que hay que leer bien
   son cifras, horas, "Secc" y "Aula", todo ASCII. Los nombres de las materias
   salen sin tildes, pero la materia se reconoce por el codigo. */
const IDIOMA = 'eng'
const CARPETA_DEL_IDIOMA = '/lector/4.0.0_best_int'

/* La cache en la que el service worker guarda el lector: CACHE_LECTOR en
   scripts/serviceworker.js. Tiene que llamarse igual, porque lo que se baja
   aqui es lo que despues el service worker le sirve a tesseract. */
const CACHE_LECTOR = 'mapa-pensum-lector'

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

const absoluta = (ruta) => new URL(ruta, location.href).href

/* Lo que hace falta tener para leer, cada uno con lo que mide ya abierto */
const SIMD = haySimd()
const TRABAJADOR = { url: absoluta(trabajador), peso: PESOS.trabajador }
const NUCLEO = SIMD
  ? { url: absoluta(nucleoRapido), peso: PESOS.nucleoRapido }
  : { url: absoluta(nucleoLento), peso: PESOS.nucleoLento }
const MODELO = {
  url: absoluta(`${CARPETA_DEL_IDIOMA}/${IDIOMA}.traineddata.gz`),
  peso: PESOS.idioma,
}
const ARCHIVOS = [TRABAJADOR, NUCLEO, MODELO]

/* Cada cuanto mira el vigilante (ver vigilante) */
const PULSO = 1000

/* Lo que se espera sin que llegue un solo byte antes de dar una bajada por
   perdida. La bajada entera no tiene tope: con datos lentos son minutos, y
   mientras avance -y la pantalla lo va contando- merece la pena seguir. Lo
   que no se espera es a una conexion que se quedo muda. */
const SIN_BYTES_MS = 20000

/* Lo que se espera sin una sola señal de tesseract antes de darlo por
   colgado. Leyendo avisa varias veces por segundo de cuanto lleva; al
   arrancar, en cambio, compila el nucleo y abre el modelo sin decir nada, y
   en un telefono viejo eso son unos cuantos segundos. Si el lector no quedo
   guardado de antemano, ademas lo baja en ese rato: de ahi la paciencia larga. */
const PACIENCIA = { arrancando: 45000, bajandoYArrancando: 120000, leyendo: 45000 }

/* El tope de la lectura entera, ya bajado el lector, por si algo se queda
   dando vueltas sin llegar a colgarse. Pasado esto ya no es leer: es tener a
   alguien mirando una barra. */
const TOPE_MS = 150000

/* Como parte tesseract la pagina antes de leer. "Texto suelto" busca palabras
   por toda la imagen sin suponer parrafos, que es lo que es una rejilla. Un
   recorte, en cambio, es un bloque de texto corriente. */
const TEXTO_SUELTO = '11'
const UN_BLOQUE = '6'

/* Lo que tesseract va diciendo mientras arranca, y que parte de la barra del
   arranque llena cada cosa. Compilar el nucleo es lo que mas tarda. */
const ARRANQUE = {
  'loading tesseract core': [0, 0.4],
  'initializing tesseract': [0.4, 0.55],
  'loading language traineddata': [0.55, 0.85],
  'initializing api': [0.85, 1],
}

/**
 * Un vigilante que salta si pasa `paciencia` sin que nadie le diga `latir()`.
 *
 * Solo cuenta con la pagina a la vista. Con el telefono en otra aplicacion
 * el navegador congela los relojes y la lectura con ellos, y al volver no
 * puede parecer que llevaba un minuto colgada.
 */
function vigilante(paciencia, alSaltar) {
  let quieto = 0
  const reloj = setInterval(() => {
    if (document.hidden) return
    quieto += PULSO
    if (quieto > paciencia) alSaltar()
  }, PULSO)
  return {
    latir: () => {
      quieto = 0
    },
    esperar: (nueva) => {
      paciencia = nueva
      quieto = 0
    },
    soltar: () => clearInterval(reloj),
  }
}

/* ---- La bajada ------------------------------------------------------------ */

/* La bajada en curso, si la hay. Es una para todos: la empieza el boton de
   subir la foto (ver precalentarLector en leerHorario.js) mientras se elige
   la imagen, y la lectura se suma a ella en vez de pedir lo mismo otra vez. */
let bajada = null
/* Cuanto va, mientras de verdad se esta bajando algo. null si no: o no ha
   empezado, o lo que se esta mirando es si ya estaba todo guardado. */
let fraccion = null
const oyentes = new Set()

const avisarBajada = (nueva) => {
  fraccion = nueva
  for (const oyente of oyentes) oyente(nueva)
}

/* Si hay un service worker que le vaya a servir a tesseract lo que se baje
   aqui. Sin el -la primera visita, una ventana privada- bajarlo aparte seria
   bajarlo dos veces: entonces lo baja tesseract al arrancar, y nada mas. */
const hayQuienLoSirva = () => Boolean(navigator.serviceWorker?.controller) && 'caches' in self

/* Un archivo, de la red a la cache del lector, contando los bytes. Se guarda
   aqui y no se deja al service worker: el lo guarda tambien, pero sin
   esperar a terminar, y tesseract podria pedirlo justo antes y bajarlo otra
   vez. */
async function bajarUno(cache, { url }, alLlegar) {
  const control = new AbortController()
  const guardian = vigilante(SIN_BYTES_MS, () => control.abort())
  try {
    const respuesta = await fetch(url, { signal: control.signal })
    if (!respuesta.ok || !respuesta.body) throw new Error(`${url} respondio ${respuesta.status}`)
    const trozos = []
    const lector = respuesta.body.getReader()
    for (;;) {
      const { done, value } = await lector.read()
      if (done) break
      guardian.latir()
      trozos.push(value)
      alLlegar(value.length)
    }
    /* El tipo va con el: el nucleo se carga con importScripts, y un script
       sin su tipo no se ejecuta */
    const tipo = respuesta.headers.get('content-type') ?? 'application/octet-stream'
    await cache.put(url, new Response(new Blob(trozos), { headers: { 'content-type': tipo } }))
  } finally {
    guardian.soltar()
  }
}

async function bajarLoQueFalta() {
  const cache = await caches.open(CACHE_LECTOR)
  const guardados = await Promise.all(ARCHIVOS.map((a) => cache.match(a.url)))
  const faltan = ARCHIVOS.filter((_, i) => !guardados[i])
  if (!faltan.length) return

  const total = faltan.reduce((suma, a) => suma + a.peso, 0)
  let bajado = 0
  avisarBajada(0)
  await Promise.all(
    faltan.map((archivo) =>
      bajarUno(cache, archivo, (bytes) => {
        bajado += bytes
        // Hasta que no este guardado no esta al cien
        avisarBajada(Math.min(bajado / total, 0.99))
      }),
    ),
  )
}

/**
 * Deja el lector guardado en el aparato, y lo baja si hace falta.
 *
 * Revienta si la bajada falla o se queda muda. Lo bajado hasta entonces no
 * sirve de nada -no se puede seguir un archivo a medias-, pero cada archivo
 * que llego entero queda guardado.
 *
 * @param {(fraccion: number) => void} [alAvance]  cuanto va, de 0 a 1. Solo
 *   se llama si hay algo que bajar.
 * @returns {Promise<boolean>}  si quedo guardado. false si no hay donde
 *   guardarlo: entonces lo baja tesseract al arrancar.
 */
export async function precargar(alAvance) {
  if (!hayQuienLoSirva()) return false
  if (alAvance) {
    oyentes.add(alAvance)
    // Si ya estaba bajando, se entera de por donde va sin esperar al siguiente trozo
    if (fraccion != null) alAvance(fraccion)
  }
  try {
    bajada ??= bajarLoQueFalta().finally(() => {
      bajada = null
      fraccion = null
    })
    await bajada
    return true
  } catch (error) {
    /* Sin sitio en el telefono para guardarlo. Tesseract lo bajara al
       arrancar y lo tendra en memoria: mas lento, pero lee. */
    if (error?.name === 'QuotaExceededError') return false
    throw error
  } finally {
    oyentes.delete(alAvance)
  }
}

/* ---- La lectura ----------------------------------------------------------- */

/* tesseract no devuelve un error cuando no arranca: lo tira por su cuenta y
   deja la promesa colgada. Con `errorHandler` el fallo llega aqui, y con el
   se rechaza la espera. */
function arrancar(alMensaje) {
  return new Promise((listo, fallar) => {
    tesseract
      .createWorker(IDIOMA, 1, {
        workerPath: TRABAJADOR.url,
        corePath: NUCLEO.url,
        langPath: absoluta(CARPETA_DEL_IDIOMA),
        /* El trabajador se abre desde su URL y no desde un blob: dentro de un
           blob las rutas no tienen dominio contra el que resolverse */
        workerBlobURL: false,
        /* tesseract guardaria el idioma en IndexedDB por su cuenta. Ya lo
           guarda el service worker, y dos copias de tres megas en un telefono
           sobran. */
        cacheMethod: 'none',
        logger: alMensaje,
        errorHandler: (error) => fallar(new Error(String(error?.message ?? error))),
      })
      .then(listo, fallar)
  })
}

/* Las palabras de tesseract, en coordenadas de la pagina: las de un recorte
   se devuelven a su sitio, y a su tamaño si se leyo ampliado */
const aPalabras = (datos, dx, dy, escala) =>
  (datos.blocks ?? [])
    .flatMap((bloque) => bloque.paragraphs)
    .flatMap((parrafo) => parrafo.lines)
    .flatMap((renglon) => renglon.words)
    .map((p) => ({
      texto: p.text,
      x0: Math.round(p.bbox.x0 / escala) + dx,
      y0: Math.round(p.bbox.y0 / escala) + dy,
      x1: Math.round(p.bbox.x1 / escala) + dx,
      y1: Math.round(p.bbox.y1 / escala) + dy,
    }))

function lienzoDe(ancho, alto) {
  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto
  return lienzo
}

/* La captura que entiende leerCaptura, hecha con un lienzo y un trabajador */
function capturaDe(mapa, ocr) {
  const leerLienzo = async (lienzo, modo, dx = 0, dy = 0, escala = 1) => {
    await ocr.setParameters({ tessedit_pageseg_mode: modo })
    const { data } = await ocr.recognize(lienzo, {}, { blocks: true, text: false })
    return aPalabras(data, dx, dy, escala)
  }

  return {
    ancho: mapa.width,
    alto: mapa.height,
    ampliar: async (ampliacion, zona) => {
      const { x0, y0, x1, y1 } = zona ?? { x0: 0, y0: 0, x1: mapa.width - 1, y1: mapa.height - 1 }
      const [ancho, alto] = [x1 - x0 + 1, y1 - y0 + 1]
      const lienzo = lienzoDe(Math.round(ancho * ampliacion), Math.round(alto * ampliacion))
      const pincel = lienzo.getContext('2d', { willReadFrequently: true })
      pincel.imageSmoothingQuality = 'high'
      // Fondo blanco: lo transparente de un PNG se leeria como negro
      pincel.fillStyle = '#ffffff'
      pincel.fillRect(0, 0, lienzo.width, lienzo.height)
      pincel.drawImage(mapa, x0, y0, ancho, alto, 0, 0, lienzo.width, lienzo.height)
      const pixeles = pincel.getImageData(0, 0, lienzo.width, lienzo.height)

      return {
        imagen: { ancho: pixeles.width, alto: pixeles.height, datos: pixeles.data },
        leer: (zona, escala = 1) => {
          if (!zona) return leerLienzo(lienzo, TEXTO_SUELTO)
          const [ancho, alto] = [zona.x1 - zona.x0 + 1, zona.y1 - zona.y0 + 1]
          const recorte = lienzoDe(Math.round(ancho * escala), Math.round(alto * escala))
          const pincel = recorte.getContext('2d')
          pincel.imageSmoothingQuality = 'high'
          pincel.drawImage(
            lienzo,
            zona.x0,
            zona.y0,
            ancho,
            alto,
            0,
            0,
            recorte.width,
            recorte.height,
          )
          return leerLienzo(recorte, UN_BLOQUE, zona.x0, zona.y0, escala)
        },
      }
    },
  }
}

const detalle = (error) => String(error?.message ?? error)

/**
 * Lee el horario de una imagen sin salir del aparato.
 *
 * Se lee del archivo original y no de la copia que se prepara para subir: esa
 * va en JPEG, y el JPEG emborrona justo los bordes de las letras pequeñas.
 *
 * Va contando por donde va con `alAvance`, siempre con su `paso`:
 *   'bajando'     el lector, la primera vez. Con `progreso` de 0 a 1.
 *   'arrancando'  tesseract compila su nucleo y abre el modelo. Con `progreso`,
 *                 y con `conBajada` si ademas tiene que bajarlo el.
 *   'leyendo'     la pagina entera. Con `progreso`.
 *   'acercando'   la pagina otra vez, mas grande: la letra salio pequeña.
 *   'repasando'   un recorte que merecia otra mirada. Con `hechos` y `total`.
 *
 * Revienta con un FalloLectura si no puede: 'ocr-red' si no se pudo bajar el
 * lector, 'ocr-lento' si se quedo sin avanzar o paso del tope, 'ocr-fallo' si
 * tesseract no arranca o se rompe. Y con un AbortError si se corta con `senal`.
 *
 * @param {Blob} archivo
 * @param {object} [opciones]
 * @param {Set<string>} [opciones.codigos]  los codigos del pensum abierto
 * @param {AbortSignal} [opciones.senal]
 * @param {(avance: object) => void} [opciones.alAvance]
 * @returns {Promise<{clases: object[], dudas: string[], lecturas: number}>}
 */
export async function leerEnElAparato(archivo, { codigos, senal, alAvance = () => {} } = {}) {
  let ocr = null
  let mapa = null
  let paso = null
  /* Por que se corto, si se corto. Lo que estuviera en marcha se deja
     colgado -un trabajador cerrado a media lectura no contesta nunca- y se
     sigue por `parada`, que es contra lo que compite cada espera. */
  let motivo = null
  let alCortar
  const parada = new Promise((_, fallar) => (alCortar = fallar))
  parada.catch(() => {})
  const cortar = (razon) => {
    if (motivo) return
    motivo = razon
    alCortar(razon)
    ocr?.terminate().catch(() => {})
  }
  const corre = (promesa) => Promise.race([promesa, parada])
  const porAbortar = () => cortar(new DOMException('cortado', 'AbortError'))
  if (senal?.aborted) porAbortar()
  senal?.addEventListener('abort', porAbortar, { once: true })

  const avisar = (avance) => {
    paso = avance.paso
    alAvance(avance)
  }

  try {
    let guardado
    try {
      guardado = await corre(precargar((progreso) => avisar({ paso: 'bajando', progreso })))
    } catch (error) {
      throw motivo ?? new FalloLectura('ocr-red', { tecnico: detalle(error) })
    }

    /* Sin el lector guardado, tesseract lo baja al arrancar y no cuenta los
       bytes: la pantalla tiene que saberlo para no parecer parada */
    const conBajada = !guardado
    avisar({ paso: 'arrancando', progreso: 0, conBajada })
    const lento = () => cortar(new FalloLectura('ocr-lento'))
    const guardian = vigilante(
      guardado ? PACIENCIA.arrancando : PACIENCIA.bajandoYArrancando,
      lento,
    )
    const tope = vigilante(TOPE_MS, lento)

    const alMensaje = ({ status, progress }) => {
      guardian.latir()
      const tramo = ARRANQUE[status]
      if (tramo && paso === 'arrancando') {
        avisar({ paso, progreso: tramo[0] + (tramo[1] - tramo[0]) * progress, conBajada })
      } else if (status === 'recognizing text' && (paso === 'leyendo' || paso === 'acercando')) {
        avisar({ paso, progreso: progress })
      }
    }

    try {
      try {
        /* Cada uno se apunta en cuanto llega, para que el `finally` lo
           encuentre y lo cierre. Y si llega despues de un corte, se cierra en
           el acto: ya no hay nadie esperandolo. */
        await corre(
          Promise.all([
            arrancar(alMensaje).then((nacido) => {
              if (motivo) nacido.terminate().catch(() => {})
              else ocr = nacido
            }),
            createImageBitmap(archivo).then((abierto) => {
              if (motivo) abierto.close?.()
              else mapa = abierto
            }),
          ]),
        )
      } catch (error) {
        if (motivo) throw motivo
        // Sin el lector guardado, lo mas probable es que no se pudiera bajar
        throw new FalloLectura(guardado ? 'ocr-fallo' : 'ocr-red', { tecnico: detalle(error) })
      }

      guardian.esperar(PACIENCIA.leyendo)
      try {
        return await corre(
          leerCaptura(capturaDe(mapa, ocr), {
            codigos,
            alAvance: (avance) => {
              guardian.latir()
              avisar(avance)
            },
          }),
        )
      } catch (error) {
        throw motivo ?? new FalloLectura('ocr-fallo', { tecnico: detalle(error) })
      }
    } finally {
      guardian.soltar()
      tope.soltar()
    }
  } finally {
    senal?.removeEventListener('abort', porAbortar)
    mapa?.close?.()
    /* Siempre se cierra: el nucleo ocupa mas de cien megas de memoria mientras
       vive, y en un telefono eso es la diferencia entre seguir o que el
       sistema mate la pestaña. */
    await ocr?.terminate().catch(() => {})
  }
}
