/**
 * Lo que comparten todas las medidas del banco: el Chrome, el servidor del
 * build, los aparatos que se simulan y lo que se le lee al navegador.
 *
 * Mide en Chrome real con la CPU frenada, para que un portatil modesto y un
 * telefono de gama baja se parezcan a lo que tiene la gente. Usa el Chrome
 * instalado; si no lo encuentra, se le dice cual con la variable CHROME (ruta
 * al ejecutable).
 */

import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { preview } from 'vite'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..')

/* El build que se mide. Por defecto el del repo; con DIST se apunta a otro,
   que es como se comparan dos versiones con las mismas medidas: el build de
   un commit viejo, o el de una prueba, en otra carpeta. */
const DIST = process.env.DIST ? resolve(process.env.DIST) : join(RAIZ, 'dist')

/* Una carrera grande y un avance tipico: hay materias aprobadas, una en
   curso y frontera, asi que hay luces corriendo por los cables. */
export const CARRERA = 'ingenieria-de-sistemas'
const MARCAS = {
  '0021111': 'aprobada',
  '0061013': 'aprobada',
  '0071823': 'aprobada',
  '0081814': 'aprobada',
  '0091012': 'aprobada',
  '0101214': 'aprobada',
  '0051324': 'aprobada',
  '0081824': 'cursando',
}

/* La "4G lenta" de Lighthouse: 1,6 Mbps de bajada y 150 ms de ida y vuelta.
   Es mejor que mucha de la conexion con la que se abre esto en un pasillo. */
const RED_LENTA = {
  offline: false,
  latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
}

/**
 * Los aparatos que se simulan.
 *
 *   portatil  1920x960, raton y rueda, CPU x4
 *   telefono  390x844 tactil, CPU x6: el de los gestos del mapa
 *   modesto   360x740 tactil, CPU x6 y 4G lenta: el Android de gama baja con
 *             el que se mide lo que tarda en llegar y en responder
 */
export const APARATOS = {
  portatil: { viewport: { width: 1920, height: 960 }, deviceScaleFactor: 1, cpu: 4 },
  telefono: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    cpu: 6,
  },
  modesto: {
    viewport: { width: 360, height: 740 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    cpu: 6,
    red: RED_LENTA,
  },
}

/** Sirve el build y abre Chrome. Devuelve la direccion y como cerrarlo todo. */
export async function prepararBanco() {
  if (!existsSync(join(DIST, 'index.html'))) {
    console.error(`No hay build en ${DIST}. Corre primero: npm run build`)
    process.exit(1)
  }
  const servidor = await preview({
    root: RAIZ,
    logLevel: 'silent',
    build: { outDir: DIST },
    preview: { port: 4180 },
  })
  const navegador = await lanzarChrome()
  return {
    navegador,
    url: servidor.resolvedUrls.local[0],
    async cerrar() {
      await navegador.close()
      await servidor.close()
    },
  }
}

async function lanzarChrome() {
  if (process.env.CHROME) return chromium.launch({ executablePath: process.env.CHROME })
  try {
    return await chromium.launch({ channel: 'chrome' })
  } catch {
    console.error('No se encontro Chrome. Dile cual con CHROME=/ruta/al/ejecutable')
    process.exit(1)
  }
}

/**
 * Una pestaña nueva en el aparato pedido, con el avance de prueba ya guardado
 * y la vista con la que tiene que abrir la carrera. Sin service worker: cada
 * medida es una primera visita, sin nada guardado de la anterior.
 *
 * `espia` es una funcion que corre dentro de la pagina antes que nada: lo que
 * haya que ir apuntando desde el primer milisegundo.
 */
export async function abrirPagina(navegador, aparato, { vista, espia } = {}) {
  const { cpu, red, ...opciones } = APARATOS[aparato]
  const contexto = await navegador.newContext({ ...opciones, serviceWorkers: 'block' })
  const pagina = await contexto.newPage()
  await pagina.addInitScript(
    ([carrera, marcas, vistaInicial]) => {
      if (vistaInicial) localStorage.setItem('mapa-pensum:vista', vistaInicial)
      localStorage.setItem(`mapa-pensum:marcas:${carrera}`, JSON.stringify(marcas))
    },
    [CARRERA, MARCAS, vista],
  )
  if (espia) await pagina.addInitScript(espia)
  const cdp = await contexto.newCDPSession(pagina)
  await cdp.send('Performance.enable')

  return {
    pagina,
    cdp,
    /** Frena la CPU, y la red si el aparato la lleva lenta. */
    async frenar() {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu })
      if (red) {
        await cdp.send('Network.enable')
        await cdp.send('Network.emulateNetworkConditions', red)
      }
    },
    cerrar: () => contexto.close(),
  }
}

/**
 * Lo que lleva gastado el hilo principal y cuanto hay vivo en el documento.
 *
 * Hay tres clases de medida y no valen lo mismo:
 *
 *  - Las VECES (recalculos, maquetados, nodos) no dependen de la maquina ni
 *    de lo ocupada que este. Son las que se presupuestan con poco margen.
 *  - cpu es tiempo de procesador del hilo principal, sin el freno. Se mueve
 *    menos que el reloj, pero se mueve: se presupuesta con margen ancho.
 *  - maquetado, estilo y script son ms de RELOJ con el freno puesto. Suben
 *    con cualquier cosa que tire del equipo -medido: entre 1,4 y 3 veces con
 *    un juego en streaming abierto-, asi que se enseñan y no se juzgan.
 */
export async function metricas(cdp) {
  const { metrics } = await cdp.send('Performance.getMetrics')
  const de = (nombre) => metrics.find((m) => m.name === nombre)?.value ?? 0
  return {
    recalculos: de('RecalcStyleCount'),
    maquetados: de('LayoutCount'),
    nodos: de('Nodes'),
    cpu: de('ThreadTime') * 1000,
    maquetado: de('LayoutDuration') * 1000,
    estilo: de('RecalcStyleDuration') * 1000,
    script: de('ScriptDuration') * 1000,
  }
}

/**
 * Cuanto se restila y se maqueta mientras corre `accion`, contado con la
 * traza de Chrome: elementos a los que se les recalcula el estilo y objetos
 * que se vuelven a maquetar.
 *
 * Es la medida mas fiable que hay de "cuanto se rehizo": sale igual en un
 * equipo rapido que en uno lento, y con el equipo ocupado. Volver a una
 * vista que ya estaba montada y ver aqui dos mil objetos es que se esta
 * reconstruyendo en vez de enseñarse.
 *
 * Solo la categoria ligera de la traza: las detalladas frenan lo que miden.
 */
export async function contarTrabajo(navegador, pagina, accion) {
  await navegador.startTracing(pagina, { categories: ['devtools.timeline'] })
  await accion()
  const { traceEvents } = JSON.parse((await navegador.stopTracing()).toString())
  const sumar = (evento, cuanto) =>
    traceEvents.reduce((suma, e) => (e.name === evento ? suma + (cuanto(e) ?? 0) : suma), 0)
  return {
    restilados: sumar('UpdateLayoutTree', (e) => e.args?.elementCount),
    objetos: sumar('Layout', (e) => e.args?.beginData?.dirtyObjects),
  }
}

/**
 * Lo que se apunta dentro de la pagina mientras carga y mientras se usa: las
 * tareas largas, el primer pintado, y lo que tarda cada toque en verse.
 *
 * Corre en la pagina, no aqui: no puede usar nada de este archivo.
 */
export function espiaDePagina() {
  const yo = (window.__espia = { largas: [], toques: [], primerPintado: 0 })
  const mirar = (tipo, apuntar, mas = {}) =>
    new PerformanceObserver((lista) => lista.getEntries().forEach(apuntar)).observe({
      type: tipo,
      buffered: true,
      ...mas,
    })
  mirar('longtask', (e) => yo.largas.push({ inicio: e.startTime, dura: e.duration }))
  mirar('paint', (e) => {
    if (e.name === 'first-contentful-paint') yo.primerPintado = e.startTime
  })
  /* Event Timing: del toque al siguiente pintado. Solo las entradas con
     interactionId son de un gesto de verdad. */
  mirar(
    'event',
    (e) => e.interactionId && yo.toques.push({ inicio: e.startTime, dura: e.duration }),
    { durationThreshold: 16 },
  )
}

/* Una tarea de mas de 50 ms no deja pasar un toque: lo que sobra de 50 es el
   rato en que la pagina no responde (el Total Blocking Time de Lighthouse). */
const TAREA_LARGA = 50

/** Cuantos ms bloquearon las tareas largas desde `desde`. */
export const bloqueoDe = (largas, desde = 0) =>
  largas
    .filter((t) => t.inicio >= desde)
    .reduce((suma, t) => suma + Math.max(0, t.dura - TAREA_LARGA), 0)
