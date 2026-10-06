/**
 * Compara las pantallas de dos builds: pixel a pixel y estilo a estilo.
 *
 *   npm run comparar -- ruta/al/build/de/antes
 *   npm run comparar -- ruta/al/build/de/antes --movimiento
 *   npm run comparar -- ruta/al/build/de/antes horario
 *
 * Abre las mismas pantallas en ese build y en dist/ y dice cuales no salen
 * identicas. De cada una compara dos cosas:
 *
 *  - La foto. Las que difieren se guardan, la de antes y la de despues, en la
 *    carpeta que imprime al acabar.
 *  - Los estilos calculados de cada elemento, propiedad por propiedad. Ve lo
 *    que una foto no: una transicion que cambio de duracion, una regla que
 *    ahora gana a otra en algo que en esa pantalla no se nota. De lo que
 *    difiere imprime el elemento y las propiedades.
 *
 * Para que sirve. Hay cambios que no deben verse: recortar una fuente,
 * repartir una hoja de estilos, mover una regla de archivo. "No se ve nada
 * raro" no es una comprobacion; que treinta pantallas salgan con cero pixeles
 * y cero estilos distintos, si.
 *
 * Como se usa:
 *   1. npm run build, y se copia dist/ a otra carpeta: ese es el antes.
 *   2. Se hace el cambio y otro npm run build.
 *   3. npm run comparar -- la/carpeta/del/antes
 *
 * Las dos versiones se abren a la vez y en las mismas condiciones: menos
 * movimiento -las animaciones quedan en su estado final-, el reloj parado en
 * un lunes a las 8:10 -el horario pinta "ahora"- y con las fuentes cargadas.
 *
 * Con --movimiento se abren con las animaciones puestas y se comparan solo
 * los estilos: es la pasada que ve las reglas de animacion y de transicion,
 * que con menos movimiento estan todas apagadas. Las fotos ahi no valen: una
 * luz que corre por un cable no cae dos veces en el mismo sitio.
 *
 * Una palabra detras filtra las pantallas por nombre. Una toma que lleva un
 * toque puede salir distinta una vez de cada muchas por un cuadro de mas o
 * de menos; si pasa, se repite antes de alarmarse.
 */

import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import {
  CARRERA,
  DIST,
  MARCAS,
  RUTA_CARRERA,
  lanzarChrome,
  servirBuild,
} from './banco/navegador.js'

const argumentos = process.argv.slice(2)
const CON_MOVIMIENTO = argumentos.includes('--movimiento')
const [antes, filtro = ''] = argumentos.filter((a) => !a.startsWith('--'))
if (!antes) {
  console.error('Falta el build con el que comparar: npm run comparar -- ruta/al/build/de/antes')
  process.exit(1)
}

const TELEFONO = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true }
const PORTATIL = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }

/* Una semana corta, para ver el horario con clases puestas */
const minutos = (hora) => {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}
const clase = (codigo, dia, inicio, fin, seccion, aula, profesor) => ({
  id: `${codigo}-${dia}-${minutos(inicio)}`,
  codigo,
  dia,
  inicio: minutos(inicio),
  fin: minutos(fin),
  seccion,
  aula,
  profesor,
})
const SEMANA = [
  clase('0081814', 0, '7:00', '8:40', '01', 'A-12', 'Pérez'),
  clase('0101214', 1, '8:50', '10:30', '03', 'LAB-2', 'Rodríguez'),
  clase('0071823', 2, '10:40', '12:20', '02', 'B-4', 'Gómez'),
  clase('0061013', 4, '7:00', '9:30', '01', 'C-1', 'Marcano'),
]

const AHORA = new Date('2026-10-05T08:10:00')

/* Una materia y una casilla de electiva del mapa, por su nombre accesible */
const UNA_MATERIA = 'g[role="button"][aria-label*="Matemáticas II ·"]'
const UNA_CASILLA = 'g[role="button"][aria-label*="casilla libre"]'

const irA = (vista) => (pagina) =>
  pagina.locator(`nav[aria-label="Vistas de la carrera"] button[aria-label*="${vista}"]`).tap()

const abrirPaleta = async (pagina) => {
  await pagina.keyboard.press('Control+k')
  await pagina.waitForTimeout(500)
}

const abrirPlan = async (pagina) => {
  await abrirPaleta(pagina)
  await pagina.keyboard.type('planificar')
  await pagina.waitForTimeout(400)
  await pagina.keyboard.press('Enter')
}

/**
 * Las pantallas. De cada una: en que aparato, con que tema, por donde se
 * entra, con que vista abre, si lleva horario puesto, y lo que haya que
 * tocar antes de la foto.
 *
 * `sinVista` deja colgado el codigo de la carrera para fotografiar lo que se
 * ve mientras baja: la silueta de carga.
 */
const TOMAS = [
  { nombre: 'portada · telefono oscuro', aparato: TELEFONO, tema: 'oscuro', ruta: '' },
  { nombre: 'portada · telefono claro', aparato: TELEFONO, tema: 'claro', ruta: '' },
  { nombre: 'portada · portatil oscuro', aparato: PORTATIL, tema: 'oscuro', ruta: '' },
  { nombre: 'portada · portatil claro', aparato: PORTATIL, tema: 'claro', ruta: '' },
  { nombre: 'silueta de carga · telefono', aparato: TELEFONO, tema: 'oscuro', sinVista: true },
  { nombre: 'silueta de carga · portatil', aparato: PORTATIL, tema: 'claro', sinVista: true },
  { nombre: 'lista · telefono oscuro', aparato: TELEFONO, tema: 'oscuro', vista: 'lista' },
  { nombre: 'lista · telefono claro', aparato: TELEFONO, tema: 'claro', vista: 'lista' },
  { nombre: 'lista · portatil oscuro', aparato: PORTATIL, tema: 'oscuro', vista: 'lista' },
  { nombre: 'mapa · portatil oscuro', aparato: PORTATIL, tema: 'oscuro', vista: 'mapa' },
  { nombre: 'mapa · portatil claro', aparato: PORTATIL, tema: 'claro', vista: 'mapa' },
  { nombre: 'mapa · telefono oscuro', aparato: TELEFONO, tema: 'oscuro', vista: 'mapa' },
  {
    nombre: 'mapa · ficha de una materia',
    aparato: PORTATIL,
    tema: 'oscuro',
    vista: 'mapa',
    accion: (pagina) => pagina.locator(UNA_MATERIA).click(),
  },
  {
    nombre: 'mapa · ficha en el telefono',
    aparato: TELEFONO,
    tema: 'claro',
    vista: 'mapa',
    accion: (pagina) => pagina.locator(UNA_MATERIA).tap(),
  },
  {
    nombre: 'mapa · llegando desde la lista',
    aparato: TELEFONO,
    tema: 'oscuro',
    vista: 'lista',
    accion: irA('mapa'),
  },
  {
    nombre: 'electiva · panel en el portatil',
    aparato: PORTATIL,
    tema: 'oscuro',
    vista: 'mapa',
    accion: (pagina) => pagina.locator(UNA_CASILLA).first().click(),
  },
  {
    nombre: 'electiva · hoja en el telefono',
    aparato: TELEFONO,
    tema: 'oscuro',
    vista: 'mapa',
    accion: (pagina) => pagina.locator(UNA_CASILLA).first().tap(),
  },
  { nombre: 'horario vacio · telefono', aparato: TELEFONO, tema: 'oscuro', vista: 'horario' },
  { nombre: 'horario vacio · portatil claro', aparato: PORTATIL, tema: 'claro', vista: 'horario' },
  {
    nombre: 'horario · telefono oscuro',
    aparato: TELEFONO,
    tema: 'oscuro',
    vista: 'horario',
    conHorario: true,
  },
  {
    nombre: 'horario · portatil oscuro',
    aparato: PORTATIL,
    tema: 'oscuro',
    vista: 'horario',
    conHorario: true,
  },
  {
    nombre: 'horario · portatil claro',
    aparato: PORTATIL,
    tema: 'claro',
    vista: 'horario',
    conHorario: true,
  },
  {
    nombre: 'horario · una clase abierta',
    aparato: PORTATIL,
    tema: 'oscuro',
    vista: 'horario',
    conHorario: true,
    accion: (pagina) => pagina.locator('button[aria-label^="Acciones de"]').first().click(),
  },
  {
    /* Un archivo que no es una imagen: la hoja del lector se abre y acaba
       en su aviso de fallo, que es una pantalla quieta. */
    nombre: 'lector · no pudo abrir la foto',
    aparato: TELEFONO,
    tema: 'oscuro',
    vista: 'horario',
    async accion(pagina) {
      await pagina
        .locator('input[type="file"]')
        .first()
        .setInputFiles({
          name: 'horario.png',
          mimeType: 'image/png',
          buffer: Buffer.from('esto no es una imagen'),
        })
      await pagina.waitForTimeout(1500)
    },
  },
  {
    nombre: 'avance · telefono',
    aparato: TELEFONO,
    tema: 'oscuro',
    vista: 'lista',
    accion: (pagina) =>
      pagina
        .locator('nav[aria-label="Vistas de la carrera"] button[aria-label^="Tu avance"]')
        .tap(),
  },
  {
    nombre: 'avance · portatil',
    aparato: PORTATIL,
    tema: 'oscuro',
    vista: 'mapa',
    accion: (pagina) => pagina.locator('button[aria-label*="avance" i]').first().click(),
  },
  {
    nombre: 'paleta · portatil',
    aparato: PORTATIL,
    tema: 'claro',
    vista: 'mapa',
    accion: abrirPaleta,
  },
  {
    nombre: 'plan de ruta · portatil',
    aparato: PORTATIL,
    tema: 'oscuro',
    vista: 'mapa',
    accion: abrirPlan,
  },
  {
    nombre: 'plan de ruta · telefono',
    aparato: TELEFONO,
    tema: 'claro',
    vista: 'lista',
    async accion(pagina) {
      await pagina
        .locator('nav[aria-label="Vistas de la carrera"] button[aria-label^="Tu avance"]')
        .tap()
      await pagina.waitForTimeout(900)
      await pagina.locator('button:has-text("Planificar")').first().tap()
    },
  },
  {
    /* Lo que sale por la impresora: la copia de la hoja que el plan cuelga
       de <body> al imprimir, con las reglas de impresion puestas. */
    nombre: 'plan de ruta · impreso',
    aparato: PORTATIL,
    tema: 'oscuro',
    vista: 'mapa',
    async accion(pagina) {
      await abrirPlan(pagina)
      await pagina.waitForTimeout(900)
      await pagina.evaluate(() => window.dispatchEvent(new Event('beforeprint')))
      await pagina.emulateMedia({ media: 'print' })
    },
  },
].filter((toma) => toma.nombre.includes(filtro))

/* Lo que se deja guardado antes de que la pagina arranque. Corre en la pagina. */
function prepararAlmacen([carrera, vista, tema, marcas, semana]) {
  if (vista) localStorage.setItem('mapa-pensum:vista', vista)
  localStorage.setItem('mapa-pensum:tema', tema)
  localStorage.setItem(`mapa-pensum:marcas:${carrera}`, JSON.stringify(marcas))
  if (semana) localStorage.setItem(`mapa-pensum:horario:${carrera}`, JSON.stringify(semana))
}

/** Abre una toma en un build y la deja lista para mirarla. */
async function abrir(navegador, url, toma) {
  const { aparato, tema, vista, conHorario, accion, sinVista } = toma
  const contexto = await navegador.newContext({
    ...aparato,
    hasTouch: Boolean(aparato.isMobile),
    colorScheme: tema === 'claro' ? 'light' : 'dark',
    reducedMotion: CON_MOVIMIENTO ? 'no-preference' : 'reduce',
    serviceWorkers: 'block',
  })
  const pagina = await contexto.newPage()
  await pagina.clock.install({ time: AHORA })
  await pagina.addInitScript(prepararAlmacen, [
    CARRERA,
    vista,
    tema,
    MARCAS,
    conHorario ? SEMANA : null,
  ])
  // Una peticion que no se contesta nunca: el codigo de la carrera no llega
  if (sinVista) await pagina.route('**/assets/VistaCarrera-*.js', () => {})

  /* El reloj esta parado: se le da cuerda a mano para que corran los
     temporizadores de la pagina, y se espera de verdad a lo que no depende
     de ellos (la red, el pintado). */
  const asentar = async () => {
    await pagina.clock.runFor(3000)
    await pagina.waitForTimeout(1500)
  }
  await pagina.goto(url + (toma.ruta ?? RUTA_CARRERA), { waitUntil: 'commit' })
  await asentar()
  if (accion) {
    await accion(pagina)
    await asentar()
  }
  await pagina.evaluate(() => document.fonts.ready.then(() => true))
  await pagina.waitForTimeout(600)
  return { pagina, cerrar: () => contexto.close() }
}

/* Cuenta los pixeles que cambian de una foto a otra. Corre en una pagina en
   blanco, con un lienzo: asi no hace falta traer un decodificador de PNG.
   Un canal tiene que moverse mas de 8 de 255 para contar; por debajo es el
   redondeo del suavizado, no un cambio. */
async function diferencia([antesB64, despuesB64]) {
  const cargar = async (b64) =>
    createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob())
  const [a, b] = await Promise.all([cargar(antesB64), cargar(despuesB64)])
  if (a.width !== b.width || a.height !== b.height) return { distintos: a.width * a.height }
  const pixeles = (imagen) => {
    const lienzo = new OffscreenCanvas(imagen.width, imagen.height)
    const pincel = lienzo.getContext('2d')
    pincel.drawImage(imagen, 0, 0)
    return pincel.getImageData(0, 0, imagen.width, imagen.height).data
  }
  const [pa, pb] = [pixeles(a), pixeles(b)]
  let distintos = 0
  for (let i = 0; i < pa.length; i += 4) {
    const salto = Math.max(
      Math.abs(pa[i] - pb[i]),
      Math.abs(pa[i + 1] - pb[i + 1]),
      Math.abs(pa[i + 2] - pb[i + 2]),
    )
    if (salto > 8) distintos++
  }
  return { distintos, total: pa.length / 4 }
}

/**
 * La huella de los estilos de cada elemento de la pagina, y de sus ::before
 * y ::after: por cada uno, un numero que cambia si cambia cualquiera de sus
 * propiedades calculadas. La clave es el camino hasta el elemento desde
 * <body>, por posiciones, sin contar lo que no se pinta -un <script>, un
 * <link>-: un build puede llevar uno mas y no por eso cambia nada.
 *
 * Antes para lo que este en marcha: un valor a media animacion no saldria
 * dos veces igual, y lo que se compara es lo que mandan las reglas.
 *
 * Corre en la pagina.
 */
function huellasDeEstilo() {
  for (const animacion of document.getAnimations()) animacion.cancel()
  const resumir = (texto) => {
    let n = 0
    for (let i = 0; i < texto.length; i++) n = (Math.imul(n, 31) + texto.charCodeAt(i)) | 0
    return n
  }
  /* Se suma propiedad a propiedad y no de corrido: las variables del tema
     salen en un orden distinto en cada build, y con los mismos valores la
     huella tiene que ser la misma. */
  const leer = (elemento, pseudo) => {
    const estilo = getComputedStyle(elemento, pseudo)
    let suma = 0
    for (let i = 0; i < estilo.length; i++) {
      suma = (suma + resumir(`${estilo[i]}:${estilo.getPropertyValue(estilo[i])}`)) | 0
    }
    return suma
  }
  const SIN_PINTAR = new Set(['SCRIPT', 'LINK', 'STYLE', 'TEMPLATE', 'NOSCRIPT'])
  const huellas = {}
  const andar = (elemento, camino) => {
    huellas[camino] = leer(elemento)
    for (const pseudo of ['::before', '::after']) {
      if (getComputedStyle(elemento, pseudo).content !== 'none') {
        huellas[camino + pseudo] = leer(elemento, pseudo)
      }
    }
    let i = 0
    for (const hijo of elemento.children) {
      if (!SIN_PINTAR.has(hijo.tagName)) andar(hijo, `${camino}/${i++}`)
    }
  }
  andar(document.body, '')
  return huellas
}

/** Las propiedades calculadas de unos elementos, por su camino. Corre en la pagina. */
function estilosDe(caminos) {
  const SIN_PINTAR = new Set(['SCRIPT', 'LINK', 'STYLE', 'TEMPLATE', 'NOSCRIPT'])
  const hijos = (elemento) => [...elemento.children].filter((h) => !SIN_PINTAR.has(h.tagName))
  return caminos.map((camino) => {
    const [ruta, pseudo] = camino.split('::')
    let elemento = document.body
    for (const i of ruta.split('/').filter(Boolean)) elemento = elemento && hijos(elemento)[i]
    if (!elemento) return { quien: '(no esta)', propiedades: {} }
    const estilo = getComputedStyle(elemento, pseudo ? `::${pseudo}` : undefined)
    const propiedades = {}
    for (let i = 0; i < estilo.length; i++) {
      propiedades[estilo[i]] = estilo.getPropertyValue(estilo[i])
    }
    const clases = typeof elemento.className === 'string' ? elemento.className : ''
    const quien =
      elemento.tagName.toLowerCase() +
      (clases ? '.' + clases.trim().split(/\s+/).slice(0, 3).join('.') : '') +
      (pseudo ? `::${pseudo}` : '')
    return { quien, propiedades }
  })
}

/* Cuantos elementos distintos se detallan por pantalla: con los primeros
   basta para ir a la regla, y el resto suele ser lo mismo repetido. */
const DETALLE = 4

/** Los elementos cuyo estilo no coincide entre las dos paginas, con lo que cambia. */
async function estilosDistintos(a, b) {
  const [ha, hb] = await Promise.all([a.evaluate(huellasDeEstilo), b.evaluate(huellasDeEstilo)])
  const caminos = [...new Set([...Object.keys(ha), ...Object.keys(hb)])]
  const distintos = caminos.filter((c) => ha[c] !== hb[c])
  const muestra = distintos.slice(0, DETALLE)
  const [da, db] = await Promise.all([
    a.evaluate(estilosDe, muestra),
    b.evaluate(estilosDe, muestra),
  ])
  const detalle = muestra.map((_, i) => {
    const propiedades = Object.keys({ ...da[i].propiedades, ...db[i].propiedades })
      .filter((p) => da[i].propiedades[p] !== db[i].propiedades[p])
      .map((p) => `${p}: ${da[i].propiedades[p]} → ${db[i].propiedades[p]}`)
    return `${db[i].quien === '(no esta)' ? da[i].quien : db[i].quien}\n        ${propiedades.slice(0, 6).join('\n        ') || '(solo existe en una de las dos)'}`
  })
  return { cuantos: distintos.length, de: caminos.length, detalle }
}

const navegador = await lanzarChrome()
const [servidorAntes, servidorAhora] = [
  await servirBuild(resolve(antes), 4181),
  await servirBuild(DIST, 4182),
]
const mesa = await (await navegador.newContext()).newPage()
const carpeta = mkdtempSync(join(tmpdir(), 'mapa-pensum-comparar-'))
const archivo = (nombre) => nombre.replace(/[^a-z0-9]+/gi, '-')
let distintas = 0

console.log(
  CON_MOVIMIENTO
    ? 'Con las animaciones puestas: se comparan los estilos, no las fotos.\n'
    : 'Con menos movimiento: se comparan las fotos y los estilos.\n',
)

for (const toma of TOMAS) {
  const [a, b] = await Promise.all([
    abrir(navegador, servidorAntes.url, toma),
    abrir(navegador, servidorAhora.url, toma),
  ])

  let pixeles = { distintos: 0 }
  if (!CON_MOVIMIENTO) {
    const [fotoAntes, fotoAhora] = await Promise.all([a.pagina.screenshot(), b.pagina.screenshot()])
    pixeles = await mesa.evaluate(diferencia, [
      fotoAntes.toString('base64'),
      fotoAhora.toString('base64'),
    ])
    if (pixeles.distintos) {
      writeFileSync(join(carpeta, `${archivo(toma.nombre)}-antes.png`), fotoAntes)
      writeFileSync(join(carpeta, `${archivo(toma.nombre)}-despues.png`), fotoAhora)
    }
  }
  const estilos = await estilosDistintos(a.pagina, b.pagina)
  await Promise.all([a.cerrar(), b.cerrar()])

  const igual = !pixeles.distintos && !estilos.cuantos
  if (!igual) distintas++
  const partes = []
  if (pixeles.distintos) {
    partes.push(pixeles.total ? `${pixeles.distintos} px de ${pixeles.total}` : 'otro tamaño')
  }
  if (estilos.cuantos) partes.push(`${estilos.cuantos} elementos de ${estilos.de} con otro estilo`)
  console.log(
    `${igual ? '=' : '≠'} ${toma.nombre.padEnd(34)} ${igual ? `identica (${estilos.de} elementos)` : partes.join(' · ')}`,
  )
  for (const linea of estilos.detalle) console.log(`      ${linea}`)
}

await navegador.close()
await Promise.all([servidorAntes.cerrar(), servidorAhora.cerrar()])

if (distintas) {
  console.error(
    `\n${distintas} pantalla(s) no salen iguales.` +
      (CON_MOVIMIENTO ? '' : ` Las fotos que difieren estan en ${carpeta}`),
  )
  process.exit(1)
}
console.log(`\nLas ${TOMAS.length} pantallas salen identicas.`)
