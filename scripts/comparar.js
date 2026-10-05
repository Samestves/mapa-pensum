/**
 * Compara, pixel a pixel, las pantallas de dos builds.
 *
 *   npm run comparar -- ruta/al/build/de/antes
 *
 * Fotografia las mismas pantallas en ese build y en dist/, y dice cuales no
 * salen identicas. Las que difieren se guardan, la de antes y la de despues,
 * en la carpeta que imprime al acabar.
 *
 * Para que sirve. Hay cambios que no deben verse: recortar una fuente,
 * repartir una hoja de estilos, mover una regla de archivo. "No se ve nada
 * raro" no es una comprobacion; que veinte pantallas salgan con cero pixeles
 * distintos, si.
 *
 * Como se usa:
 *   1. npm run build, y se copia dist/ a otra carpeta: ese es el antes.
 *   2. Se hace el cambio y otro npm run build.
 *   3. npm run comparar -- la/carpeta/del/antes
 *
 * Las dos tandas se fotografian en las mismas condiciones: menos movimiento
 * -las animaciones quedan en su estado final-, el reloj parado en un lunes a
 * las 8:10 -el horario pinta "ahora"-, y con las fuentes ya cargadas. Una
 * toma que lleva un toque puede salir distinta una vez de cada muchas por un
 * cuadro de mas o de menos; si pasa, se repite antes de alarmarse.
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

const [antes] = process.argv.slice(2)
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

const irA = (vista) => (pagina) =>
  pagina.locator(`nav[aria-label="Vistas de la carrera"] button[aria-label*="${vista}"]`).tap()

/**
 * Las pantallas. De cada una: en que aparato, con que tema, por donde se
 * entra, con que vista abre, si lleva horario puesto, y lo que haya que
 * tocar antes de la foto.
 */
const TOMAS = [
  { nombre: 'portada · telefono oscuro', aparato: TELEFONO, tema: 'oscuro', ruta: '' },
  { nombre: 'portada · telefono claro', aparato: TELEFONO, tema: 'claro', ruta: '' },
  { nombre: 'portada · portatil oscuro', aparato: PORTATIL, tema: 'oscuro', ruta: '' },
  { nombre: 'portada · portatil claro', aparato: PORTATIL, tema: 'claro', ruta: '' },
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
    accion: (pagina) => pagina.mouse.click(720, 450),
  },
  {
    nombre: 'mapa · llegando desde la lista',
    aparato: TELEFONO,
    tema: 'oscuro',
    vista: 'lista',
    accion: irA('mapa'),
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
    nombre: 'plan de ruta · portatil',
    aparato: PORTATIL,
    tema: 'oscuro',
    vista: 'mapa',
    async accion(pagina) {
      await pagina.keyboard.press('Control+k')
      await pagina.waitForTimeout(500)
      await pagina.keyboard.type('planificar')
      await pagina.waitForTimeout(400)
      await pagina.keyboard.press('Enter')
    },
  },
]

/* Lo que se deja guardado antes de que la pagina arranque. Corre en la pagina. */
function prepararAlmacen([carrera, vista, tema, marcas, semana]) {
  if (vista) localStorage.setItem('mapa-pensum:vista', vista)
  localStorage.setItem('mapa-pensum:tema', tema)
  localStorage.setItem(`mapa-pensum:marcas:${carrera}`, JSON.stringify(marcas))
  if (semana) localStorage.setItem(`mapa-pensum:horario:${carrera}`, JSON.stringify(semana))
}

async function fotografiar(navegador, url, toma) {
  const { aparato, tema, vista, conHorario, accion } = toma
  const contexto = await navegador.newContext({
    ...aparato,
    hasTouch: Boolean(aparato.isMobile),
    colorScheme: tema === 'claro' ? 'light' : 'dark',
    reducedMotion: 'reduce',
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

  /* El reloj esta parado: se le da cuerda a mano para que corran los
     temporizadores de la pagina, y se espera de verdad a lo que no depende
     de ellos (la red, el pintado). */
  const asentar = async () => {
    await pagina.clock.runFor(3000)
    await pagina.waitForTimeout(1500)
  }
  await pagina.goto(url + (toma.ruta ?? RUTA_CARRERA))
  await asentar()
  if (accion) {
    await accion(pagina)
    await asentar()
  }
  await pagina.evaluate(() => document.fonts.ready.then(() => true))
  await pagina.waitForTimeout(600)
  const foto = await pagina.screenshot()
  await contexto.close()
  return foto
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

async function tanda(navegador, build, puerto) {
  const servidor = await servirBuild(build, puerto)
  const fotos = []
  for (const toma of TOMAS) fotos.push(await fotografiar(navegador, servidor.url, toma))
  await servidor.cerrar()
  return fotos
}

const navegador = await lanzarChrome()
const fotosDeAntes = await tanda(navegador, resolve(antes), 4181)
const fotosDeAhora = await tanda(navegador, DIST, 4182)

const mesa = await (await navegador.newContext()).newPage()
const carpeta = mkdtempSync(join(tmpdir(), 'mapa-pensum-comparar-'))
const archivo = (nombre) => nombre.replace(/[^a-z0-9]+/gi, '-')
let distintas = 0

for (const [i, toma] of TOMAS.entries()) {
  const { distintos, total } = await mesa.evaluate(diferencia, [
    fotosDeAntes[i].toString('base64'),
    fotosDeAhora[i].toString('base64'),
  ])
  if (distintos) {
    distintas++
    writeFileSync(join(carpeta, `${archivo(toma.nombre)}-antes.png`), fotosDeAntes[i])
    writeFileSync(join(carpeta, `${archivo(toma.nombre)}-despues.png`), fotosDeAhora[i])
  }
  const cuanto = total ? `${distintos} px distintos de ${total}` : 'otro tamaño'
  console.log(
    `${distintos ? '≠' : '='} ${toma.nombre.padEnd(32)} ${distintos ? cuanto : 'identica'}`,
  )
}

await navegador.close()

if (distintas) {
  console.error(
    `\n${distintas} pantalla(s) no salen iguales. Las dos versiones estan en ${carpeta}`,
  )
  process.exit(1)
}
console.log(`\nLas ${TOMAS.length} pantallas salen identicas.`)
