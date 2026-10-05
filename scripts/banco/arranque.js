/**
 * El arranque en frio en un telefono modesto: lo que tarda en verse algo, en
 * verse lo que se vino a buscar y en poder tocarlo, la primera vez que se
 * entra y sin nada guardado.
 *
 * Es la medida que mas pesa para quien llega desde un enlace: si esto tarda,
 * no llega a ver lo fluido que va lo demas.
 */

import {
  CARRERA,
  abrirPagina,
  bloqueoDe,
  contarTrabajo,
  espiaDePagina,
  metricas,
} from './navegador.js'

/* Lo que se espera, ya visible la pantalla, antes de leer las medidas: la
   pagina sigue preparando cosas en reposo (ver components/Precalentar.jsx), y
   ese trabajo tambien cuenta. */
const REPOSO_MS = 3000

/**
 * Las entradas y su presupuesto. Se juzga lo que no depende de lo ocupado
 * que este el equipo; los topes son lo medido al escribirlos con poco margen,
 * y al cerrar cada fase de docs/plan-rendimiento.md bajan a lo nuevo medido.
 *
 *  - peticiones: cuantas cosas se piden. Una de mas puede ser otro viaje de
 *    150 ms en cadena.
 *  - nodos: tamaño del documento.
 *  - restilados, objetos: elementos a los que se les calcula estilo y objetos
 *    que se maquetan hasta que la pantalla se queda quieta. En la portada los
 *    restilados no se juzgan: sus animaciones de entrada los hacen bailar
 *    entre 3 000 y 5 600 segun cuantos cuadros de a tiempo a pintar.
 *  - cpu: ms de procesador del hilo principal, sin el freno, con tope ancho
 *    (ver uso.js).
 *
 * Y se enseña, sin juzgarlo, lo que nota quien entra, que es reloj y cambia
 * con el equipo:
 *
 *  - primerPintado: cuando deja de verse el fondo vacio.
 *  - visible: cuando esta en pantalla aquello a lo que se entro (`listo`).
 *  - bloqueo: ms en que un toque no habria tenido respuesta.
 *  - kB: lo descargado. Quien lo vigila es scripts/peso.js, en cada build.
 */
const ESCENARIOS = [
  {
    nombre: 'portada',
    ruta: '',
    listo: '.tarjeta-carrera',
    presupuesto: { peticiones: 9, nodos: 900, objetos: 820, cpu: 1000 },
  },
  {
    nombre: 'carrera por la lista',
    ruta: CARRERA,
    vista: 'lista',
    listo: 'button[aria-label^="Marcar"]',
    presupuesto: { peticiones: 12, nodos: 4050, restilados: 2300, objetos: 2880, cpu: 1150 },
  },
  {
    nombre: 'carrera por el mapa',
    ruta: CARRERA,
    vista: 'mapa',
    listo: '.plano-base > svg > g',
    presupuesto: { peticiones: 12, nodos: 2430, restilados: 1880, objetos: 2790, cpu: 1150 },
  },
]

/** Cuenta lo que se pide y lo que pesa mientras dura la carga. */
async function contarDescargas(cdp) {
  const total = { peticiones: 0, kB: 0 }
  await cdp.send('Network.enable')
  cdp.on('Network.loadingFinished', (e) => {
    total.peticiones += 1
    total.kB += e.encodedDataLength / 1024
  })
  return total
}

async function medir(navegador, url, escenario) {
  const { pagina, cdp, frenar, cerrar } = await abrirPagina(navegador, 'modesto', {
    vista: escenario.vista,
    espia: espiaDePagina,
  })
  const descargado = await contarDescargas(cdp)
  await frenar()

  let visible
  const trabajo = await contarTrabajo(navegador, pagina, async () => {
    const salida = Date.now()
    await pagina.goto(url + escenario.ruta, { waitUntil: 'commit' })
    await pagina.waitForSelector(escenario.listo, { timeout: 90_000 })
    visible = Date.now() - salida
    await pagina.waitForTimeout(REPOSO_MS)
  })

  const espia = await pagina.evaluate(() => window.__espia)
  const { nodos, cpu } = await metricas(cdp)
  await cerrar()

  return {
    peticiones: descargado.peticiones,
    nodos,
    ...trabajo,
    cpu,
    primerPintado: espia.primerPintado,
    visible,
    bloqueo: bloqueoDe(espia.largas),
    kB: descargado.kB,
  }
}

export const arranque = {
  nombre: 'arranque',
  titulo: 'Arranque en frio · telefono modesto (360x740, CPU x6, 4G lenta)',
  leyenda:
    'Se juzgan peticiones, nodos, restilados, objetos (veces) y cpu (ms). primerPintado, visible y bloqueo orientan.',
  async pasada({ navegador, url }, quiere) {
    const filas = []
    for (const escenario of ESCENARIOS.filter((e) => quiere(e.nombre))) {
      filas.push({
        escenario: escenario.nombre,
        medidas: await medir(navegador, url, escenario),
        presupuesto: escenario.presupuesto,
      })
    }
    return filas
  },
}
