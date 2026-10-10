/**
 * Comprobaciones del mapa al volver a el desde otra vista.
 *
 *   npm run verificar            (sobre el build: hace falta npm run build)
 *
 * El mapa se queda montado y oculto mientras se mira la lista o el horario
 * Al volver tiene que comportarse igual que
 * la primera vez, y hubo una version en que no: el mapa se movia con la capa
 * de una animacion en pausa (layout/moverCapa.js), y al volver alguien la
 * reanudaba; a los pocos segundos acababa y el mapa se quedaba quieto bajo el
 * dedo. Ademas, reanudar una animacion de CSS desde JavaScript la deja fuera
 * de lo que diga el CSS para siempre, y el mapa pausa sus luces con CSS
 * (durante un gesto, con una materia enfocada, con una hoja abierta).
 *
 * En el telefono y en el portatil: arrastra, se va a las otras dos vistas,
 * vuelve y comprueba que el mapa sigue al gesto; y en el portatil, que las
 * luces se paran con una materia enfocada. En el telefono tambien se comprueba
 * el lanzamiento: el mapa sigue solo al soltar un arrastre rapido, se para si
 * se le pone un dedo y queda pintado en su sitio. Sale con codigo 1 si algo falla.
 *
 * Usa el Chrome y el servidor del banco (scripts/banco/navegador.js): mismas
 * variables, CHROME y DIST.
 */

import { RUTA_CARRERA, abrirPagina, prepararBanco } from '../banco/navegador.js'

const MAPA = '.plano-base > svg > g'
/* Lo que se tarda en cambiar de vista y en que acabe cualquier animacion de
   un segundo que alguien hubiera dejado corriendo */
const ASENTARSE = 2500

const banco = await prepararBanco()
const resultados = []
async function comprobar(nombre, prueba) {
  try {
    resultados.push({ nombre, fallo: await prueba() })
  } catch (error) {
    resultados.push({ nombre, fallo: error.message.split('\n')[0] })
  }
}

/** Ir a una vista con el boton que se vea, sea la barra de abajo o la cabecera */
async function irA(pagina, vista) {
  await pagina.locator(`button[aria-label*="${vista}"]`).filter({ visible: true }).first().click()
  await pagina.waitForTimeout(ASENTARSE)
}

/** Cuanto se aparta la capa del mapa de su sitio. Corre en la pagina. */
function desvio() {
  const m = new DOMMatrix(getComputedStyle(document.querySelector('.capa-grafo')).transform)
  return Math.abs(m.e) + Math.abs(m.f) + Math.abs(m.a - 1) * 100
}

/* Un toque del dedo, por CDP: el telefono lo recibe como si alguien lo tocara */
const toque = (cdp, type, x, y) =>
  cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }],
  })

/* El mayor desvio de la capa a mitad de un gesto: si el mapa sigue al gesto,
   la capa se estira mientras dura (ver layout/vistaViva.js) */
async function arrastrarConElDedo(pagina, cdp) {
  let mayor = 0
  await toque(cdp, 'touchStart', 300, 600)
  for (let i = 1; i <= 30; i++) {
    await toque(cdp, 'touchMove', 300 - i * 6, 600 - i * 8)
    if (i % 10 === 0) mayor = Math.max(mayor, await pagina.evaluate(desvio))
  }
  await toque(cdp, 'touchEnd')
  await pagina.waitForTimeout(800)
  return mayor
}

async function arrastrarConElRaton(pagina) {
  let mayor = 0
  await pagina.mouse.move(960, 480)
  await pagina.mouse.down()
  for (let i = 1; i <= 30; i++) {
    await pagina.mouse.move(960 - i * 10, 480 - i * 4)
    if (i % 10 === 0) mayor = Math.max(mayor, await pagina.evaluate(desvio))
  }
  await pagina.mouse.up()
  await pagina.waitForTimeout(800)
  return mayor
}

async function girarLaRueda(pagina) {
  let mayor = 0
  await pagina.mouse.move(960, 480)
  for (let i = 1; i <= 12; i++) {
    await pagina.mouse.wheel(0, -40)
    await pagina.waitForTimeout(16)
    if (i % 4 === 0) mayor = Math.max(mayor, await pagina.evaluate(desvio))
  }
  await pagina.waitForTimeout(800)
  return mayor
}

/* Un arrastre rapido: el dedo baja, corre deprisa hacia arriba y a la izquierda
   y no suelta todavia. Soltar lo decide quien llama, que antes quiere medir. */
async function arrastrarRapido(pagina, cdp) {
  await toque(cdp, 'touchStart', 300, 560)
  for (let i = 1; i <= 12; i++) {
    await toque(cdp, 'touchMove', 300 - i * 14, 560 - i * 7)
    /* Un toque cada 10 ms: a esa cadencia el gesto lleva velocidad al soltarlo */
    await pagina.waitForTimeout(10)
  }
}

/** Donde esta la primera tarjeta del mapa en pantalla. Corre en la pagina. */
const posicion = (pagina) =>
  pagina.evaluate(() => {
    const { x, y } = document.querySelector('.capa-grafo .grupo-nodo').getBoundingClientRect()
    return { x, y }
  })

/* Al soltar un arrastre rapido el mapa tiene que seguir solo, pararse si se le
   pone un dedo encima y quedar pintado en su sitio. Devuelve el primer fallo. */
async function probarLanzamiento(pagina, cdp) {
  await arrastrarRapido(pagina, cdp)
  const alSoltar = await posicion(pagina)
  await toque(cdp, 'touchEnd')

  /* 400 ms despues tiene que haber avanzado en el sentido del arrastre: si no,
     el mapa se paro al soltar y no hubo lanzamiento */
  await pagina.waitForTimeout(400)
  const despues = await posicion(pagina)
  if (alSoltar.x - despues.x <= 20) return 'el mapa no sigue solo al soltarlo'

  /* Con el mapa ya parado, dos lecturas separadas 300 ms no difieren, y la capa
     va sin estirar (desvio mide cuanto se aparta de su sitio) */
  await pagina.waitForTimeout(ASENTARSE)
  const parado = await posicion(pagina)
  await pagina.waitForTimeout(300)
  const luego = await posicion(pagina)
  const sinMoverse = Math.hypot(luego.x - parado.x, luego.y - parado.y) < 1
  if (!sinMoverse || (await pagina.evaluate(desvio)) >= 1)
    return 'el mapa lanzado no se queda quieto y pintado'

  /* Un segundo lanzamiento, y 200 ms despues de soltarlo un dedo se apoya en el
     mapa: tiene que quedarse ahi, sin seguir el impulso que le queda */
  await arrastrarRapido(pagina, cdp)
  await toque(cdp, 'touchEnd')
  await pagina.waitForTimeout(200)
  await toque(cdp, 'touchStart', 200, 400)
  const bajoElDedo = await posicion(pagina)
  await pagina.waitForTimeout(300)
  const conElDedo = await posicion(pagina)
  await toque(cdp, 'touchEnd')
  if (Math.hypot(conElDedo.x - bajoElDedo.x, conElDedo.y - bajoElDedo.y) >= 2)
    return 'un dedo no para el mapa lanzado'
}

async function sesion(aparato) {
  const sesion = await abrirPagina(banco.navegador, aparato, { vista: 'mapa' })
  /* El portatil, como uno sobrado: con 4 nucleos o menos la app va en modo
     ligero (ver data/ligero.js) y las luces no corren, y lo que se quiere
     ver es que corren y se paran cuando toca. Asi sale igual en cualquier
     equipo en que se corra esto. */
  if (aparato === 'portatil') {
    await sesion.pagina.addInitScript(() => {
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 })
      Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 })
    })
  }
  await sesion.pagina.goto(banco.url + RUTA_CARRERA)
  await sesion.pagina.waitForSelector(MAPA)
  await sesion.pagina.waitForTimeout(2000)
  return sesion
}

// 1. Telefono: el dedo mueve el mapa antes y despues de ir a la lista y al horario
{
  const { pagina, cdp, cerrar } = await sesion('telefono')
  await comprobar('telefono · el dedo mueve el mapa al entrar', async () => {
    const d = await arrastrarConElDedo(pagina, cdp)
    if (d < 1) return 'la capa no se movio con el dedo'
  })
  for (const otra of ['lista', 'horario']) {
    await comprobar(`telefono · el dedo mueve el mapa tras volver de ${otra}`, async () => {
      await irA(pagina, otra)
      await irA(pagina, 'mapa')
      const d = await arrastrarConElDedo(pagina, cdp)
      if (d < 1) return 'la capa no se movio con el dedo'
    })
  }
  await cerrar()
}

// 2. Portatil: raton y rueda tras volver, y las luces obedecen sus pausas de CSS
{
  const { pagina, cerrar } = await sesion('portatil')
  await comprobar('portatil · el raton y la rueda mueven el mapa al entrar', async () => {
    if ((await arrastrarConElRaton(pagina)) < 1) return 'el arrastre no movio la capa'
    if ((await girarLaRueda(pagina)) < 1) return 'la rueda no movio la capa'
  })
  await comprobar('portatil · el raton y la rueda mueven el mapa tras volver', async () => {
    await irA(pagina, 'lista')
    await irA(pagina, 'horario')
    await irA(pagina, 'mapa')
    if ((await arrastrarConElRaton(pagina)) < 1) return 'el arrastre no movio la capa'
    if ((await girarLaRueda(pagina)) < 1) return 'la rueda no movio la capa'
  })
  await comprobar('portatil · con una materia enfocada las luces se paran', async () => {
    /* Las luces corren en reposo; con el foco puesto el CSS las pausa (ver
       .plano-luces[data-foco] en estilos/mapa.css). Si alguien las reanudo
       desde JavaScript, el CSS ya no manda en ellas. */
    const corriendo = await pagina.evaluate(
      () =>
        [...document.querySelectorAll('.plano-luces .flujo')].flatMap((f) =>
          f.getAnimations().filter((a) => a.playState === 'running'),
        ).length,
    )
    if (!corriendo) return 'no hay luces corriendo en reposo: no se puede comprobar'
    /* Una materia que este a la vista y sin nada encima */
    const punto = await pagina.evaluate(() => {
      for (const nodo of document.querySelectorAll('[data-codigo]')) {
        const c = nodo.getBoundingClientRect()
        const [x, y] = [c.left + c.width / 2, c.top + c.height / 2]
        if (
          x > 0 &&
          y > 0 &&
          x < innerWidth &&
          y < innerHeight &&
          nodo.contains(document.elementFromPoint(x, y))
        )
          return [x, y]
      }
    })
    if (!punto) return 'no hay ninguna materia a la vista donde tocar'
    await pagina.mouse.click(...punto)
    await pagina.waitForTimeout(800)
    const siguen = await pagina.evaluate(
      () =>
        [...document.querySelectorAll('.plano-luces[data-foco] .flujo')].flatMap((f) =>
          f.getAnimations().filter((a) => a.playState === 'running'),
        ).length,
    )
    await pagina.keyboard.press('Escape')
    if (siguen) return `${siguen} luces siguen corriendo con el foco puesto`
  })
  await cerrar()
}

// 3. Telefono: el mapa lanzado por el dedo sigue solo, se frena y queda pintado
{
  const { pagina, cdp, cerrar } = await sesion('telefono')
  await comprobar('telefono · el lanzamiento sigue, se frena y queda pintado', () =>
    probarLanzamiento(pagina, cdp),
  )
  await cerrar()
}

await banco.cerrar()

for (const { nombre, fallo } of resultados)
  console.log(`${fallo ? '✗' : '✓'} ${nombre}${fallo ? ` — ${fallo}` : ''}`)
const fallos = resultados.filter((r) => r.fallo).length
if (fallos) {
  console.error(`\n${fallos} comprobacion(es) fallaron.`)
  process.exit(1)
}
console.log('\nEl mapa se comporta igual al volver.')
