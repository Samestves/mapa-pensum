/**
 * Los gestos del mapa: quieto, rueda, arrastre y hover en un portatil;
 * pellizco y dedo en un telefono.
 *
 * Por que existe. El mapa se volvia lento sin que nada fallara: un cambio
 * inocente -un filtro por tarjeta, un estado de hover un nivel mas arriba,
 * un texto que pasa a ser SVG- y en un telefono o un portatil modesto se
 * notaba semanas despues.
 *
 * Presupuesta lo que no depende de la maquina en la que se corre ni de lo
 * ocupada que este: cuantas veces se repinta el mapa en un gesto, cuantas se
 * maqueta y cuantas se recalculan estilos. Los ms y los cuadros perdidos se
 * enseñan y no se juzgan (ver metricas en navegador.js).
 */

import { RUTA_CARRERA, abrirPagina, metricas } from './navegador.js'
import { resumenDeCuadros } from './presupuesto.js'

/**
 * Los gestos y su presupuesto. Cada limite es el tope de lo que vale el
 * gesto entero, con margen sobre lo medido cuando se escribio:
 *
 *  - repintados: veces que se pinta el mapa de verdad. Un gesto estira la
 *    capa ya pintada y pinta una vez al acabar (ver layout/vistaViva.js); si
 *    esto sube, algo volvio a pintar cuadro a cuadro.
 *  - maquetados: veces que se maqueta. Si sube en un gesto, algo volvio a
 *    depender de la escala, como el texto en SVG (ver components/Texto.jsx).
 *  - recalculos: veces que se recalculan estilos. En reposo es una por cuadro
 *    mientras corra la luz de los cables; mas es que algo nuevo se anima.
 *  - cpu: ms de procesador del hilo principal, sin el freno, con tope ancho
 *    (ver uso.js).
 *
 * Antes se juzgaban ms de estilo y cuadros perdidos, y fallaban sin que nada
 * hubiera empeorado: comparado con el commit en que nacio este banco, el mapa
 * quieto restila lo mismo (4 elementos por cuadro) y el pellizco repinta
 * menos. Lo que cambiaba era lo ocupado que estaba el equipo.
 */
const ESCENARIOS = [
  {
    nombre: 'quieto',
    aparato: 'portatil',
    presupuesto: { repintados: 0, maquetados: 2, recalculos: 235, cpu: 400 },
    async gesto(p) {
      await p.mouse.move(5, 900)
      await p.waitForTimeout(2000)
    },
  },
  {
    nombre: 'rueda',
    aparato: 'portatil',
    mueve: true,
    presupuesto: { repintados: 5, maquetados: 8, recalculos: 435, cpu: 870 },
    async gesto(p) {
      await p.mouse.move(960, 480)
      for (const paso of [40, -40]) {
        for (let i = 0; i < 30; i++) {
          await p.mouse.wheel(0, paso)
          await p.waitForTimeout(16)
        }
        await p.waitForTimeout(300)
      }
    },
  },
  {
    nombre: 'arrastre',
    aparato: 'portatil',
    mueve: true,
    presupuesto: { repintados: 3, maquetados: 5, recalculos: 200, cpu: 520 },
    async gesto(p) {
      await p.mouse.move(960, 480)
      await p.mouse.down()
      for (let i = 1; i <= 60; i++) await p.mouse.move(960 - i * 10, 480 - i * 4)
      await p.mouse.up()
      await p.waitForTimeout(400)
    },
  },
  {
    nombre: 'hover',
    aparato: 'portatil',
    presupuesto: { repintados: 0, maquetados: 24, recalculos: 390, cpu: 900 },
    async gesto(p) {
      await p.mouse.move(100, 200)
      for (let i = 0; i <= 100; i++) {
        await p.mouse.move(100 + i * 16, 200 + (i % 30) * 18)
        await p.waitForTimeout(8)
      }
      await p.waitForTimeout(500)
    },
  },
  {
    nombre: 'pellizco',
    aparato: 'telefono',
    mueve: true,
    presupuesto: { repintados: 8, maquetados: 14, recalculos: 115, cpu: 360 },
    async gesto(p, cdp) {
      const toque = (type, puntos) =>
        cdp.send('Input.dispatchTouchEvent', {
          type,
          touchPoints: puntos.map(([x, y], i) => ({ x, y, id: i + 1 })),
        })
      const [cx, cy] = [195, 420]
      for (const [d0, d1] of [
        [300, 60],
        [60, 20],
        [20, 300],
      ]) {
        await toque('touchStart', [
          [cx - d0 / 2, cy],
          [cx + d0 / 2, cy],
        ])
        for (let i = 1; i <= 30; i++) {
          const d = d0 + ((d1 - d0) * i) / 30
          await toque('touchMove', [
            [cx - d / 2, cy],
            [cx + d / 2, cy],
          ])
        }
        await toque('touchEnd', [])
        await p.waitForTimeout(500)
      }
    },
  },
  {
    nombre: 'dedo',
    aparato: 'telefono',
    mueve: true,
    presupuesto: { repintados: 3, maquetados: 8, recalculos: 175, cpu: 275 },
    gesto: arrastrarConElDedo,
  },
  /* El mismo arrastre, despues de arrastrar, ir a la lista y volver. El mapa
     se queda montado y oculto mientras tanto (ver hooks/useCapasDeVistas.js)
     y al enseñarse otra vez tiene que seguir al dedo igual: hubo una version
     que al volver le rompia la animacion con la que se mueve la capa
     -la crea el primer arrastre, ver layout/moverCapa.js- y el mapa se
     quedaba quieto bajo el dedo. Entrando directo al mapa no se veia, y sin
     arrastrar antes de irse tampoco. */
  {
    nombre: 'dedo tras volver de la lista',
    aparato: 'telefono',
    mueve: true,
    async antes(p, cdp) {
      await arrastrarConElDedo(p, cdp)
      await irA(p, cdp, 'lista')
      await irA(p, cdp, 'mapa')
    },
    presupuesto: { repintados: 3, maquetados: 8, recalculos: 175, cpu: 275 },
    gesto: arrastrarConElDedo,
  },
]

async function arrastrarConElDedo(p, cdp) {
  const toque = (type, puntos) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: puntos.map(([x, y]) => ({ x, y, id: 1 })),
    })
  await toque('touchStart', [[300, 600]])
  for (let i = 1; i <= 40; i++) await toque('touchMove', [[300 - i * 6, 600 - i * 8]])
  await toque('touchEnd', [])
  await p.waitForTimeout(1200)
}

/* Ir a otra vista tocando su boton en la barra, como lo haria alguien */
async function irA(pagina, cdp, vista) {
  const [x, y] = await pagina.evaluate((v) => {
    const boton = [...document.querySelectorAll(`button[aria-label*="${v}"]`)].find(
      (b) => b.getBoundingClientRect().width > 0,
    )
    const caja = boton.getBoundingClientRect()
    return [caja.left + caja.width / 2, caja.top + caja.height / 2]
  }, vista)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await pagina.waitForTimeout(3000)
}

/* Lo que se va acumulando en la pagina mientras dura un gesto: el tiempo de
   cada cuadro y cuantas veces cambia la vista pintada del plano base. */
function empezarMedida() {
  const yo = {}
  window.__medida = yo
  yo.cuadros = []
  yo.repintados = 0
  yo.movida = 0
  yo.soltado = false
  for (const tipo of ['touchend', 'mouseup'])
    addEventListener(tipo, () => (yo.soltado = true), { capture: true, once: true })
  const pintada = document.querySelector('.plano-base > svg > g')
  const capa = document.querySelector('.capa-grafo')
  yo.observador = new MutationObserver((cambios) => (yo.repintados += cambios.length))
  yo.observador.observe(pintada, { attributes: true, attributeFilter: ['transform'] })
  const cuadro = (t) => {
    if (window.__medida !== yo) return
    yo.cuadros.push(t)
    /* Cuanto se aparta de su sitio la capa en este cuadro: lo que se ve
       moverse bajo el dedo mientras dura el gesto */
    if (!yo.soltado) {
      const m = new DOMMatrix(getComputedStyle(capa).transform)
      yo.movida = Math.max(yo.movida, Math.abs(m.e) + Math.abs(m.f) + Math.abs(m.a - 1) * 100)
    }
    requestAnimationFrame(cuadro)
  }
  requestAnimationFrame(cuadro)
}

function acabarMedida() {
  const yo = window.__medida
  window.__medida = null
  yo.observador.disconnect()
  const t = yo.cuadros
  return {
    cuadros: t.slice(1).map((x, i) => x - t[i]),
    repintados: yo.repintados,
    movida: yo.movida,
  }
}

async function medir(navegador, url, escenario) {
  const { pagina, cdp, frenar, cerrar } = await abrirPagina(navegador, escenario.aparato, {
    vista: 'mapa',
  })
  await pagina.goto(`${url}${RUTA_CARRERA}`)
  await pagina.waitForSelector('.plano-base > svg > g')
  await pagina.waitForTimeout(2500)
  await escenario.antes?.(pagina, cdp)
  await frenar()

  const antes = await metricas(cdp)
  await pagina.evaluate(empezarMedida)
  await escenario.gesto(pagina, cdp)
  const { cuadros, repintados, movida } = await pagina.evaluate(acabarMedida)
  const despues = await metricas(cdp)
  await cerrar()

  /* Un gesto que no movio el mapa mediria barato y pasaria cualquier tope */
  if (escenario.mueve && movida < 1) {
    throw new Error(
      `«${escenario.aparato} · ${escenario.nombre}»: el mapa no se movio con el gesto`,
    )
  }

  return {
    ...resumenDeCuadros(cuadros),
    repintados,
    maquetados: despues.maquetados - antes.maquetados,
    recalculos: despues.recalculos - antes.recalculos,
    cpu: despues.cpu - antes.cpu,
    estilo: despues.estilo - antes.estilo,
    script: despues.script - antes.script,
  }
}

export const gestos = {
  nombre: 'gestos',
  titulo: 'Gestos del mapa',
  leyenda:
    'Se juzgan repintados, maquetados, recalculos (veces) y cpu (ms). p95, perdidos, estilo y script orientan.',
  async pasada({ navegador, url }, quiere) {
    const filas = []
    for (const escenario of ESCENARIOS.filter((e) => quiere(e.nombre))) {
      filas.push({
        escenario: `${escenario.aparato} · ${escenario.nombre}`,
        medidas: await medir(navegador, url, escenario),
        presupuesto: escenario.presupuesto,
      })
    }
    return filas
  },
}
