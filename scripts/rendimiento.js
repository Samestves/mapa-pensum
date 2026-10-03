/**
 * Banco de rendimiento del mapa. Se corre con: npm run rendimiento
 * (sobre el build: hace falta un npm run build antes).
 *
 * Por que existe. El mapa se volvia lento sin que nada fallara: un cambio
 * inocente -un filtro por tarjeta, un estado de hover un nivel mas arriba,
 * un texto que pasa a ser SVG- y en un telefono o un portatil modesto se
 * notaba semanas despues. Esto lo mide en cada cambio, en las mismas
 * condiciones, y sale con codigo 1 si algo se pasa de su presupuesto.
 *
 * Mide en Chrome real con la CPU frenada, para que un portatil modesto y un
 * telefono de gama baja se parezcan a lo que tiene la gente:
 *
 *   portatil  1920x960, raton y rueda, CPU x4
 *   telefono  390x844 tactil, pellizco y dedo, CPU x6
 *
 * Y presupuesta lo que no depende de la maquina en la que se corre: cuantas
 * veces se repinta el mapa en un gesto, cuanto se maqueta mientras se mueve y
 * cuanto JavaScript corre. Los cuadros perdidos se enseñan pero solo cuentan
 * en los gestos: sin GPU -en un servidor- el compositor va por software y los
 * desenfoques los pagaria la CPU.
 *
 * Usa el Chrome instalado. Si no lo encuentra, se le dice cual con la
 * variable CHROME (ruta al ejecutable).
 */

import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { chromium } from 'playwright-core'
import { preview } from 'vite'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')

if (!existsSync(join(raiz, 'dist/index.html'))) {
  console.error('No hay build. Corre primero: npm run build')
  process.exit(1)
}

/* Una carrera grande y un avance tipico: hay materias aprobadas, una en
   curso y frontera, asi que hay luces corriendo por los cables. */
const CARRERA = 'ingenieria-de-sistemas'
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

const APARATOS = {
  portatil: { viewport: { width: 1920, height: 960 }, deviceScaleFactor: 1, cpu: 4 },
  telefono: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    cpu: 6,
  },
}

/* Un cuadro de mas de 33 ms se ha comido al menos uno de pantalla: es lo que
   se siente como tiron. */
const CUADRO_PERDIDO = 33.5

/**
 * Los gestos y su presupuesto. Cada limite es el tope de lo que vale el
 * gesto entero, con margen sobre lo medido cuando se escribio:
 *
 *  - repintados: veces que se pinta el mapa de verdad. Un gesto estira la
 *    capa ya pintada y pinta una vez al acabar (ver layout/vistaViva.js); si
 *    esto sube, algo volvio a pintar cuadro a cuadro.
 *  - maquetado, estilo, script: ms del hilo principal, con la CPU frenada. Si
 *    el maquetado sube en un gesto, algo volvio a depender de la escala, como
 *    el texto en SVG (ver components/Texto.jsx).
 *  - perdidos: cuadros de mas de 33 ms.
 */
const ESCENARIOS = [
  {
    nombre: 'quieto',
    aparato: 'portatil',
    presupuesto: { script: 120, estilo: 150, maquetado: 5 },
    async gesto(p) {
      await p.mouse.move(5, 900)
      await p.waitForTimeout(2000)
    },
  },
  {
    nombre: 'rueda',
    aparato: 'portatil',
    presupuesto: { repintados: 14, maquetado: 15, perdidos: 3 },
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
    presupuesto: { repintados: 5, maquetado: 15, perdidos: 6 },
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
    presupuesto: { script: 900, maquetado: 150 },
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
    presupuesto: { repintados: 14, maquetado: 15, perdidos: 3 },
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
    presupuesto: { repintados: 5, maquetado: 15, perdidos: 3 },
    async gesto(p, cdp) {
      const toque = (type, puntos) =>
        cdp.send('Input.dispatchTouchEvent', {
          type,
          touchPoints: puntos.map(([x, y]) => ({ x, y, id: 1 })),
        })
      await toque('touchStart', [[300, 600]])
      for (let i = 1; i <= 40; i++) await toque('touchMove', [[300 - i * 6, 600 - i * 8]])
      await toque('touchEnd', [])
      await p.waitForTimeout(1200)
    },
  },
]

/* Lo que se va acumulando en la pagina mientras dura un gesto: el tiempo de
   cada cuadro y cuantas veces cambia la vista pintada del plano base. */
function empezarMedida() {
  const yo = {}
  window.__medida = yo
  yo.cuadros = []
  yo.repintados = 0
  const pintada = document.querySelector('.plano-base > svg > g')
  yo.observador = new MutationObserver((cambios) => (yo.repintados += cambios.length))
  yo.observador.observe(pintada, { attributes: true, attributeFilter: ['transform'] })
  const cuadro = (t) => {
    if (window.__medida !== yo) return
    yo.cuadros.push(t)
    requestAnimationFrame(cuadro)
  }
  requestAnimationFrame(cuadro)
}

function acabarMedida() {
  const yo = window.__medida
  window.__medida = null
  yo.observador.disconnect()
  const t = yo.cuadros
  return { cuadros: t.slice(1).map((x, i) => x - t[i]), repintados: yo.repintados }
}

async function metricas(cdp) {
  const { metrics } = await cdp.send('Performance.getMetrics')
  const de = (n) => metrics.find((m) => m.name === n)?.value ?? 0
  return {
    maquetado: de('LayoutDuration') * 1000,
    estilo: de('RecalcStyleDuration') * 1000,
    script: de('ScriptDuration') * 1000,
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

async function medirEscenario(navegador, url, escenario) {
  const { cpu, ...opciones } = APARATOS[escenario.aparato]
  const contexto = await navegador.newContext({ ...opciones, serviceWorkers: 'block' })
  const p = await contexto.newPage()
  await p.addInitScript((marcas) => {
    localStorage.setItem('mapa-pensum:vista', 'mapa')
    localStorage.setItem('mapa-pensum:marcas:ingenieria-de-sistemas', JSON.stringify(marcas))
  }, MARCAS)
  await p.goto(`${url}${CARRERA}`)
  await p.waitForSelector('.plano-base > svg > g')
  await p.waitForTimeout(2500)

  const cdp = await contexto.newCDPSession(p)
  await cdp.send('Performance.enable')
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu })

  const antes = await metricas(cdp)
  await p.evaluate(empezarMedida)
  await escenario.gesto(p, cdp)
  const { cuadros, repintados } = await p.evaluate(acabarMedida)
  const despues = await metricas(cdp)
  await contexto.close()

  const ordenados = [...cuadros].sort((a, b) => a - b)
  const resultado = {
    cuadros: cuadros.length,
    p95: ordenados[Math.floor(ordenados.length * 0.95)] ?? 0,
    perdidos: cuadros.filter((d) => d > CUADRO_PERDIDO).length,
    repintados,
    maquetado: despues.maquetado - antes.maquetado,
    estilo: despues.estilo - antes.estilo,
    script: despues.script - antes.script,
  }
  const excesos = Object.entries(escenario.presupuesto)
    .filter(([clave, tope]) => resultado[clave] > tope)
    .map(([clave, tope]) => `${clave} ${Math.round(resultado[clave])} > ${tope}`)
  return { ...resultado, excesos }
}

const servidor = await preview({ root: raiz, logLevel: 'silent', preview: { port: 4180 } })
const url = servidor.resolvedUrls.local[0]
const navegador = await lanzarChrome()

const filas = []
for (const escenario of ESCENARIOS) {
  const r = await medirEscenario(navegador, url, escenario)
  filas.push({
    escenario: `${escenario.aparato} · ${escenario.nombre}`,
    cuadros: r.cuadros,
    'p95 ms': Math.round(r.p95),
    perdidos: r.perdidos,
    repintados: r.repintados,
    'maquetado ms': Math.round(r.maquetado),
    'estilo ms': Math.round(r.estilo),
    'script ms': Math.round(r.script),
    presupuesto: r.excesos.length ? `✗ ${r.excesos.join(', ')}` : '✓',
  })
}

await navegador.close()
await servidor.close()

console.table(filas)
const fallos = filas.filter((f) => f.presupuesto !== '✓')
if (fallos.length) {
  console.error(`\n${fallos.length} gesto(s) por encima de su presupuesto.`)
  process.exit(1)
}
console.log('\nTodo dentro de presupuesto.')
