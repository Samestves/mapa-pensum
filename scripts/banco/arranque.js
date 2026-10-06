/**
 * El arranque en frio en un telefono modesto: lo que tarda en verse algo, en
 * verse lo que se vino a buscar y en poder tocarlo, la primera vez que se
 * entra y sin nada guardado.
 *
 * Es la medida que mas pesa para quien llega desde un enlace: si esto tarda,
 * no llega a ver lo fluido que va lo demas.
 */

import {
  RUTA_CARRERA,
  abrirPagina,
  bloqueoDe,
  contarTrabajo,
  descargasDePagina,
  espiaDePagina,
  metricas,
} from './navegador.js'

/* Lo que se espera, ya visible la pantalla, antes de leer las medidas: la
   pagina sigue preparando cosas en reposo -pinta de antemano el avance (ver
   components/Precalentar.jsx) y baja las vistas que aun no se han abierto
   (ver components/carreraPorTrozos.js)-, y ese trabajo tambien cuenta. */
const REPOSO_MS = 3000

/**
 * Las entradas y su presupuesto. Se juzga lo que no depende de lo ocupado
 * que este el equipo; los topes son lo medido al escribirlos con poco margen,
 * y al cerrar cada fase de docs/plan-rendimiento.md bajan a lo nuevo medido.
 *
 *  - peticiones: cuantas cosas se piden hasta que la pantalla esta visible.
 *    Una de mas puede ser otro viaje de 150 ms en cadena. Lo que la pagina
 *    baja despues, en reposo, no cuenta aqui: va en `detras`.
 *  - nodos: tamaño del documento. En una carrera cuenta tambien el texto
 *    prerenderizado para buscadores, que se maqueta antes de que React lo
 *    sustituya.
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
 *  - visible: cuando esta pintado aquello a lo que se entro (`listo`).
 *  - bloqueo: ms en que un toque no habria tenido respuesta.
 *  - kB: lo descargado hasta ver la pantalla, y `detras`, lo que llega
 *    despues sin que nadie espere por ello. Quien vigila el peso es
 *    scripts/peso.js, en cada build.
 */
const ESCENARIOS = [
  {
    nombre: 'portada',
    ruta: '',
    listo: '.tarjeta-carrera',
    presupuesto: { peticiones: 7, nodos: 905, objetos: 820, cpu: 1000 },
  },
  {
    nombre: 'carrera por la lista',
    ruta: RUTA_CARRERA,
    vista: 'lista',
    listo: 'button[aria-label^="Marcar"]',
    presupuesto: { peticiones: 14, nodos: 4470, restilados: 2735, objetos: 3690, cpu: 1150 },
  },
  {
    nombre: 'carrera por el mapa',
    ruta: RUTA_CARRERA,
    vista: 'mapa',
    listo: '.plano-base > svg > g',
    presupuesto: { peticiones: 14, nodos: 2855, restilados: 2320, objetos: 3600, cpu: 1150 },
  },
]

async function medir(navegador, url, escenario) {
  const { pagina, cdp, frenar, cerrar } = await abrirPagina(navegador, 'modesto', {
    vista: escenario.vista,
    espia: espiaDePagina,
    listo: escenario.listo,
  })
  await frenar()

  const trabajo = await contarTrabajo(navegador, pagina, async () => {
    await pagina.goto(url + escenario.ruta, { waitUntil: 'commit' })
    await pagina.waitForFunction(() => window.__espia?.visible, null, { timeout: 90_000 })
    await pagina.waitForTimeout(REPOSO_MS)
  })

  const espia = await pagina.evaluate(() => window.__espia)
  const descargas = await pagina.evaluate(descargasDePagina, espia.montado)
  const { nodos, cpu } = await metricas(cdp)
  await cerrar()

  return {
    peticiones: descargas.antes.peticiones,
    nodos,
    ...trabajo,
    cpu,
    primerPintado: espia.primerPintado,
    visible: espia.visible,
    bloqueo: bloqueoDe(espia.largas),
    kB: descargas.antes.kB,
    detras: descargas.despues.kB,
  }
}

export const arranque = {
  nombre: 'arranque',
  titulo: 'Arranque en frio · telefono modesto (360x740, CPU x6, 4G lenta)',
  leyenda:
    'Se juzgan peticiones, nodos, restilados, objetos (veces) y cpu (ms). primerPintado, visible y bloqueo orientan. kB es lo bajado hasta ver la pantalla; detras, lo que llega despues.',
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
