/**
 * El uso en un telefono modesto: cambiar de vista, marcar una materia y
 * desplazar la lista. Una sola sesion que hace lo que hace un estudiante:
 * entra por la lista, mira el mapa, vuelve, abre el horario, y marca.
 *
 * Lo que se mide de cada toque es lo que tarda en VERSE, que es lo unico que
 * nota quien toca: del dedo al siguiente pintado.
 */

import {
  RUTA_CARRERA,
  abrirPagina,
  bloqueoDe,
  contarTrabajo,
  espiaDePagina,
  metricas,
} from './navegador.js'
import { resumenDeCuadros } from './presupuesto.js'

const boton = (vista) => `nav[aria-label="Vistas de la carrera"] button[aria-label*="${vista}"]`
const MARCAR = 'button[aria-label^="Marcar"]'
const DESMARCAR = 'button[aria-label^="Desmarcar"]'

/* Que tiene que estar a la vista para dar por abierta cada vista */
const SE_VE = {
  mapa: '.plano-base > svg > g',
  lista: MARCAR,
  horario: '.dibujo',
}

/**
 * Los pasos, en orden, y su presupuesto. Se juzga lo que no depende de lo
 * ocupado que este el equipo; los topes son lo medido al escribirlos, y al
 * cerrar cada fase de docs/plan-rendimiento.md bajan a lo nuevo medido.
 *
 *  - restilados, objetos: elementos a los que se les recalcula el estilo y
 *    objetos que se vuelven a maquetar por ese toque. Si al VOLVER a una
 *    vista ya montada salen miles, es que se rehace en vez de enseñarse.
 *  - cpu: ms de procesador del hilo principal, sin el freno. El tope es el
 *    doble de lo medido: con el equipo ocupado llega a subir eso, y lo que
 *    tiene que cazar es que algo cueste el doble, no un mal dia.
 *
 * Y se enseña, sin juzgarlo, lo que nota quien toca:
 *
 *  - respuesta: del toque al siguiente pintado (Event Timing), con el freno.
 *    Por encima de 200 ms ya se nota que la pantalla tarda.
 *  - bloqueo: tareas largas en el rato que sigue al toque.
 *
 * `medido: false` es un paso que solo coloca la sesion para el siguiente.
 */
const PASOS = [
  {
    nombre: 'lista → mapa, primera vez',
    ir: 'mapa',
    reposo: 3500,
    presupuesto: { restilados: 1420, objetos: 2070, cpu: 300 },
  },
  {
    nombre: 'mapa → lista, ya montada',
    ir: 'lista',
    presupuesto: { restilados: 90, objetos: 70, cpu: 150 },
  },
  {
    nombre: 'lista → horario, primera vez',
    ir: 'horario',
    reposo: 2500,
    presupuesto: { restilados: 530, objetos: 80, cpu: 200 },
  },
  {
    nombre: 'horario → mapa, ya montado',
    ir: 'mapa',
    presupuesto: { restilados: 430, objetos: 40, cpu: 140 },
  },
  { nombre: 'mapa → lista', ir: 'lista', medido: false },
  {
    nombre: 'marcar una materia',
    marcar: true,
    reposo: 2500,
    presupuesto: { restilados: 380, objetos: 980, cpu: 300, nodos: 6490 },
  },
]

const PRESUPUESTO_DESPLAZAR = { maquetados: 2, cpu: 540 }

/**
 * Donde tocar para acertarle a `selector`: el centro del primero que este a
 * la vista y sin nada encima. Devuelve null si no hay ninguno, que es mejor
 * que tocar a ciegas y medir un toque que no hizo nada.
 *
 * Corre en la pagina. Las barras flotan sobre la vista, asi que estar dentro
 * de la ventana no basta: se comprueba que el punto cae en el propio elemento.
 */
function puntoDe(selector) {
  for (const elemento of document.querySelectorAll(selector)) {
    const caja = elemento.getBoundingClientRect()
    if (!caja.width || caja.bottom <= 0 || caja.top >= innerHeight) continue
    const [x, y] = [caja.left + caja.width / 2, caja.top + caja.height / 2]
    if (elemento.contains(document.elementFromPoint(x, y))) return [x, y]
  }
  return null
}

/* Si hay algo de `selector` ocupando sitio en la ventana. La vista que se deja
   sigue montada pero sin caja (ver VistaCarrera), asi que con esto basta para
   saber cual es la que se ve. Corre en la pagina. */
function seVe(selector) {
  return [...document.querySelectorAll(selector)].some((elemento) => {
    const caja = elemento.getBoundingClientRect()
    return caja.width > 0 && caja.bottom > 0 && caja.top < innerHeight
  })
}

const contar = (pagina, selector) =>
  pagina.evaluate((s) => document.querySelectorAll(s).length, selector)

/* Un toque de dedo por el protocolo de Chrome y no con pagina.tap(): tap
   comprueba antes, dentro de la pagina, que el elemento se puede tocar, y con
   la CPU frenada esas comprobaciones salian en la medida como si fueran de
   la aplicacion. */
async function tocar(cdp, [x, y]) {
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y, id: 1 }],
  })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

async function darPaso({ navegador, pagina, cdp }, paso) {
  const selector = paso.marcar ? MARCAR : boton(paso.ir)
  const punto = await pagina.evaluate(puntoDe, selector)
  if (!punto) throw new Error(`«${paso.nombre}»: no hay donde tocar (${selector})`)
  const marcadas = paso.marcar ? await contar(pagina, DESMARCAR) : 0

  const antes = await metricas(cdp)
  const desde = await pagina.evaluate(() => performance.now())
  const trabajo = await contarTrabajo(navegador, pagina, async () => {
    await tocar(cdp, punto)
    await pagina.waitForTimeout(paso.reposo ?? 1800)
  })
  const espia = await pagina.evaluate(() => window.__espia)
  const despues = await metricas(cdp)

  /* Un toque que no hizo nada mediria rapidisimo: se comprueba que paso lo
     que tenia que pasar. */
  const hecho = paso.marcar
    ? (await contar(pagina, DESMARCAR)) > marcadas
    : await pagina.evaluate(seVe, SE_VE[paso.ir])
  if (!hecho) throw new Error(`«${paso.nombre}»: el toque no tuvo efecto`)

  return {
    ...trabajo,
    cpu: despues.cpu - antes.cpu,
    nodos: despues.nodos,
    respuesta: Math.max(0, ...espia.toques.filter((t) => t.inicio >= desde).map((t) => t.dura)),
    bloqueo: bloqueoDe(espia.largas, desde),
  }
}

/* Los cuadros de la pagina mientras se desplaza. Corren en la pagina. */
function empezarCuadros() {
  const yo = (window.__cuadros = [])
  const cuadro = (t) => {
    if (window.__cuadros !== yo) return
    yo.push(t)
    requestAnimationFrame(cuadro)
  }
  requestAnimationFrame(cuadro)
}

function acabarCuadros() {
  const t = window.__cuadros
  window.__cuadros = null
  return t.slice(1).map((x, i) => x - t[i])
}

async function desplazarLista({ pagina, cdp }) {
  const antes = await metricas(cdp)
  await pagina.evaluate(empezarCuadros)
  for (const distancia of [-2600, 2600, -2600]) {
    await cdp.send('Input.synthesizeScrollGesture', {
      x: 180,
      y: 420,
      yDistance: distancia,
      speed: 1800,
      gestureSourceType: 'touch',
    })
  }
  const cuadros = await pagina.evaluate(acabarCuadros)
  const despues = await metricas(cdp)
  return {
    maquetados: despues.maquetados - antes.maquetados,
    cpu: despues.cpu - antes.cpu,
    ...resumenDeCuadros(cuadros),
  }
}

export const uso = {
  nombre: 'uso',
  titulo: 'Uso · telefono modesto (360x740, CPU x6, 4G lenta)',
  leyenda:
    'Se juzgan restilados, objetos, maquetados, nodos (veces) y cpu (ms). respuesta, bloqueo, p95 y perdidos orientan.',
  async pasada({ navegador, url }) {
    const sesion = {
      navegador,
      ...(await abrirPagina(navegador, 'modesto', { vista: 'lista', espia: espiaDePagina })),
    }
    await sesion.pagina.goto(`${url}${RUTA_CARRERA}`)
    await sesion.pagina.waitForSelector(MARCAR)
    await sesion.pagina.waitForTimeout(2500)
    await sesion.frenar()

    const filas = []
    for (const paso of PASOS) {
      const medidas = await darPaso(sesion, paso)
      if (paso.medido === false) continue
      filas.push({ escenario: paso.nombre, medidas, presupuesto: paso.presupuesto })
    }
    filas.push({
      escenario: 'desplazar la lista',
      medidas: await desplazarLista(sesion),
      presupuesto: PRESUPUESTO_DESPLAZAR,
    })
    await sesion.cerrar()
    return filas
  },
}
