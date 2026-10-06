/**
 * Comprobaciones de la vista de lista en un navegador de verdad.
 *
 *   npm run verificar            (sobre el build: hace falta npm run build)
 *
 * La lista solo maqueta lo que esta cerca de la pantalla: cada semestre lleva
 * content-visibility: auto y el panel de cada fila cerrada, hidden (ver
 * estilos/lista.css y hojas.css). Es lo que la hace entrar rapido, y tambien
 * lo que puede romper sin que se note en una foto: saltar a algo que aun no
 * se ha pintado, plegar, volver de otra vista. Esto lo recorre como lo haria
 * alguien con el telefono y sale con codigo 1 si algo falla.
 *
 * Usa el Chrome y el servidor del banco (scripts/banco/navegador.js): mismas
 * variables, CHROME y DIST.
 */

import { RUTA_CARRERA, abrirPagina, prepararBanco } from '../banco/navegador.js'

const MARCAR = 'button[aria-label^="Marcar"]'
const LISTA = 'nav[aria-label="Vistas de la carrera"] button[aria-label*="lista"]'
const MAPA = 'nav[aria-label="Vistas de la carrera"] button[aria-label*="mapa"]'
/* Lo que tardan en asentarse un pliegue (360 ms) y el deslizamiento que lo
   espera (380 ms, ver deslizarA en VistaLista) */
const ASENTARSE = 1600

const banco = await prepararBanco()
const { pagina, cerrar } = await abrirPagina(banco.navegador, 'modesto', { vista: 'lista' })
await pagina.goto(banco.url + RUTA_CARRERA)
await pagina.waitForSelector(MARCAR)
await pagina.waitForTimeout(1500)

const resultados = []
async function comprobar(nombre, prueba) {
  try {
    const fallo = await prueba()
    resultados.push({ nombre, fallo })
  } catch (error) {
    resultados.push({ nombre, fallo: error.message.split('\n')[0] })
  }
}

/* Todo lo que sigue corre en la pagina. */
const desplazador = () => document.querySelector('.seccion-lista').closest('.overflow-y-auto')
const subirArriba = () => pagina.evaluate(() => (desplazador().scrollTop = 0))
await pagina.addScriptTag({ content: `window.desplazador = ${desplazador}` })

/** Si un elemento esta a la vista: dentro de la ventana y sin nada encima. */
function aLaVista(elemento) {
  const caja = elemento.getBoundingClientRect()
  if (!caja.height || caja.bottom <= 0 || caja.top >= innerHeight) return false
  const [x, y] = [caja.left + Math.min(caja.width / 2, 40), caja.top + caja.height / 2]
  return elemento.contains(document.elementFromPoint(x, y))
}
await pagina.addScriptTag({ content: `window.aLaVista = ${aLaVista}` })

/** Si un boton puede recibir el foco: lo cerrado no deberia. */
function enfocable(boton) {
  boton.focus()
  const si = document.activeElement === boton
  boton.blur()
  return si
}
await pagina.addScriptTag({ content: `window.enfocable = ${enfocable}` })

// 1. Saltar a un semestre desde el resumen: uno del final, que aun no se ha pintado
await comprobar('saltar a un semestre desde el resumen', async () => {
  await subirArriba()
  const ultimo = await pagina.evaluate(
    () => document.querySelectorAll('.seccion-lista[id^="lista-semestre"]').length,
  )
  await pagina.click(`section[aria-label="Tu avance"] button[aria-label^="Semestre ${ultimo}:"]`)
  await pagina.waitForTimeout(ASENTARSE)
  return pagina.evaluate((n) => {
    const seccion = document.getElementById(`lista-semestre-${n}`)
    const arriba = seccion.getBoundingClientRect().top
    if (arriba < 0 || arriba > innerHeight / 2)
      return `el semestre ${n} quedo a ${Math.round(arriba)} px, no arriba`
    const fila = seccion.querySelector('li button')
    if (!aLaVista(fila)) return `el semestre ${n} esta arriba pero sus filas no se ven`
  }, ultimo)
})

// 2. Ir a lo que esta lejos y aun sin pintar, desde la propia lista
await comprobar('«Elegir» una electiva lleva a su grupo, al final', async () => {
  await subirArriba()
  await pagina.waitForTimeout(300)
  const grupo = await pagina.evaluate(() => {
    const elegir = [...document.querySelectorAll('.seccion-lista li button')].find((b) =>
      b.textContent.includes('Elegir'),
    )
    if (!elegir) return null
    elegir.scrollIntoView({ block: 'center' })
    elegir.click()
    return true
  })
  if (!grupo) return 'esta carrera no tiene casillas de electiva en la lista'
  await pagina.waitForTimeout(ASENTARSE)
  return pagina.evaluate(() => {
    /* Los grupos van al final y son cortos: no pueden subir hasta arriba,
       basta con que queden enteros a la vista */
    const visibles = [...document.querySelectorAll('.seccion-lista[id^="lista-grupo"]')].filter(
      (s) => s.getBoundingClientRect().top >= 0 && s.getBoundingClientRect().bottom <= innerHeight,
    )
    if (!visibles.length) return 'ningun grupo de electivas quedo a la vista'
  })
})

await comprobar('ir a una materia de otro semestre desde sus pastillas', async () => {
  await subirArriba()
  await pagina.waitForTimeout(300)
  /* El par de filas mas alejado que une una pastilla */
  const par = await pagina.evaluate(() => {
    const semestreDe = (f) => Number(f.closest('.seccion-lista').id.replace('lista-semestre-', ''))
    const filas = [
      ...document.querySelectorAll('.seccion-lista[id^="lista-semestre"] li[id^="fila-"]'),
    ]
    const nombreDe = (f) => f.querySelector('button[aria-expanded] span').textContent.trim()
    let mejor = null
    for (const fila of filas)
      for (const pastilla of fila.querySelectorAll(':scope .plegable li button')) {
        const otra = filas.find((f) => f !== fila && nombreDe(f) === pastilla.textContent.trim())
        const lejos = otra && Math.abs(semestreDe(otra) - semestreDe(fila))
        if (lejos && (!mejor || lejos > mejor.lejos))
          mejor = { desde: fila.id, hasta: otra.id, nombre: nombreDe(otra), lejos }
      }
    return mejor
  })
  if (!par) return 'no hay pastillas que lleven a otro semestre'
  await pagina.evaluate((id) => {
    const fila = document.getElementById(id)
    fila.scrollIntoView({ block: 'center' })
    fila.querySelector('button[aria-expanded]').click()
  }, par.desde)
  await pagina.waitForTimeout(500)
  await pagina.evaluate(({ desde, nombre }) => {
    ;[...document.getElementById(desde).querySelectorAll(':scope .plegable li button')]
      .find((b) => b.textContent.trim() === nombre)
      .click()
  }, par)
  await pagina.waitForTimeout(ASENTARSE)
  return pagina.evaluate((hasta) => {
    const fila = document.getElementById(hasta)
    const nombre = fila.querySelector('button[aria-expanded]')
    if (nombre.getAttribute('aria-expanded') !== 'true') return `${hasta} no quedo abierta`
    if (!aLaVista(nombre))
      return `${hasta} no quedo a la vista (a ${Math.round(nombre.getBoundingClientRect().top)} px)`
    if (!aLaVista(fila.querySelector(':scope .plegable button')))
      return `${hasta}: su panel no se ve`
    nombre.click()
  }, par.hasta)
})

// 3. Plegar y desplegar un semestre
await comprobar('plegar y desplegar un semestre', async () => {
  await subirArriba()
  const id = await pagina.evaluate(() => {
    const abierta = [...document.querySelectorAll('.seccion-lista[id^="lista-semestre"]')].find(
      (s) => s.querySelector('.plegable').dataset.abierto === 'true',
    )
    abierta.scrollIntoView({ block: 'start' })
    return abierta.id
  })
  await pagina.waitForTimeout(300)
  const cabecera = `#${id} .cabecera-semestre button[aria-expanded]`
  await pagina.click(cabecera)
  await pagina.waitForTimeout(ASENTARSE)
  const plegado = await pagina.evaluate((id) => {
    const s = document.getElementById(id)
    const marcar = s.querySelector('li button')
    if (s.querySelector('.plegable').dataset.abierto !== 'false') return 'no se plego'
    if (marcar.getBoundingClientRect().height > 0 && aLaVista(marcar))
      return 'plegado, pero sus filas se siguen viendo'
    if (enfocable(marcar)) return 'plegado, pero sus filas se pueden enfocar con el tabulador'
  }, id)
  if (plegado) return plegado
  await pagina.click(cabecera)
  await pagina.waitForTimeout(ASENTARSE)
  return pagina.evaluate((id) => {
    const marcar = document.getElementById(id).querySelector('li button')
    if (!aLaVista(marcar)) return 'al desplegar, sus filas no se ven'
    if (!enfocable(marcar)) return 'al desplegar, sus filas no se pueden enfocar'
  }, id)
})

// 4. Abrir y cerrar una fila: el panel se ve abierto, se pliega con su animacion y cerrado no recibe el foco
await comprobar('abrir y cerrar una fila', async () => {
  await subirArriba()
  const id = await pagina.evaluate(() => {
    const fila = [...document.querySelectorAll('li[id^="fila-"]')].find((f) => aLaVista(f))
    fila.querySelector('button[aria-expanded]').click()
    return fila.id
  })
  await pagina.waitForTimeout(500)
  const abierta = await pagina.evaluate((id) => {
    const boton = document.getElementById(id).querySelector(':scope .plegable button')
    if (!aLaVista(boton)) return 'abierta, pero el selector no se ve'
    if (!enfocable(boton)) return 'abierta, pero el selector no se puede enfocar'
    document.getElementById(id).querySelector('button[aria-expanded]').click()
  }, id)
  if (abierta) return abierta
  /* A mitad del pliegue lo de dentro tiene que seguir pintado: si se quitara
     de golpe, el panel se cerraria en seco */
  await pagina.waitForTimeout(120)
  const aMitad = await pagina.evaluate(
    (id) =>
      getComputedStyle(document.getElementById(id).querySelector(':scope .plegable > *'))
        .contentVisibility,
    id,
  )
  if (aMitad === 'hidden') return 'a mitad del pliegue el panel ya no se pintaba'
  await pagina.waitForTimeout(600)
  return pagina.evaluate((id) => {
    const boton = document.getElementById(id).querySelector(':scope .plegable button')
    if (enfocable(boton)) return 'cerrada, pero el selector se puede enfocar'
  }, id)
})

// 5. La posicion se conserva al ir al mapa y volver
await comprobar('la posicion al volver del mapa', async () => {
  /* La posicion se lee ya asentada: al llegar, las secciones de alrededor se
     pintan y su alto de verdad corrige un poco el reservado */
  await pagina.evaluate(() => (desplazador().scrollTop = 1800))
  await pagina.waitForTimeout(600)
  const antes = await pagina.evaluate(() => desplazador().scrollTop)
  await pagina.click(MAPA)
  await pagina.waitForSelector('.plano-base > svg > g', { state: 'visible' })
  await pagina.waitForTimeout(800)
  await pagina.click(LISTA)
  await pagina.waitForTimeout(800)
  const despues = await pagina.evaluate(() => desplazador().scrollTop)
  if (Math.abs(despues - antes) > 2) return `estaba en ${antes} px y volvio a ${despues}`
})

// 6. Buscar en la pagina una materia de un semestre aun sin pintar. Es
// window.find, no el Ctrl+F del navegador, que no se puede pulsar desde
// aqui; los dos encuentran lo que hay dentro de content-visibility: auto.
await comprobar('buscar en la pagina una materia aun sin pintar', async () => {
  await subirArriba()
  await pagina.waitForTimeout(300)
  const busqueda = await pagina.evaluate(() => {
    const abiertas = [...document.querySelectorAll('.seccion-lista[id^="lista-semestre"]')].filter(
      (s) => s.querySelector('.plegable').dataset.abierto === 'true',
    )
    const nombre = abiertas
      .at(-1)
      .querySelector('li[id^="fila-"] button[aria-expanded] span')
      .textContent.trim()
    getSelection().removeAllRanges()
    return { nombre, hallada: window.find(nombre, true, false, true) }
  })
  if (!busqueda.hallada) return `no encontro «${busqueda.nombre}»`
})

// 7. Con las tres vistas montadas: las ocultas no reciben el foco ni los toques
await comprobar('las vistas ocultas no se tocan ni se enfocan', async () => {
  const HORARIO = 'nav[aria-label="Vistas de la carrera"] button[aria-label*="horario"]'
  await pagina.evaluate(() => (desplazador().scrollTop = 900))
  await pagina.waitForTimeout(600)
  const antes = await pagina.evaluate(() => desplazador().scrollTop)
  await pagina.click(HORARIO)
  await pagina.waitForSelector('.dibujo', { state: 'visible' })
  await pagina.waitForTimeout(800)
  await pagina.click(LISTA)
  await pagina.waitForTimeout(800)
  const despues = await pagina.evaluate(() => desplazador().scrollTop)
  if (Math.abs(despues - antes) > 2)
    return `al volver del horario la lista paso de ${antes} a ${despues} px`
  const oculto = await pagina.evaluate(() => {
    for (const vista of ['mapa', 'horario']) {
      const capa = document.querySelector(`[data-vista="${vista}"]`)
      if (!capa) return `no hay capa del ${vista}`
      const boton = capa.querySelector('button')
      if (boton && enfocable(boton)) return `un boton del ${vista}, oculto, se puede enfocar`
    }
  })
  if (oculto) return oculto
  /* Un toque de verdad en una fila: el clic de Playwright comprueba antes que
     lo que recibe el toque en ese punto es la propia fila */
  const fila = await pagina.evaluate(() => {
    const f = [...document.querySelectorAll('li[id^="fila-"]')].find((x) => aLaVista(x))
    return f && `#${f.id} button[aria-expanded]`
  })
  await pagina.click(fila, { timeout: 3000 })
  await pagina.waitForTimeout(500)
  const abierta = await pagina.$eval(fila, (b) => b.getAttribute('aria-expanded'))
  if (abierta !== 'true') return 'tocar una fila tras volver no la abrio'
  await pagina.click(fila)
})

await cerrar()
await banco.cerrar()

for (const { nombre, fallo } of resultados)
  console.log(`${fallo ? '✗' : '✓'} ${nombre}${fallo ? ` — ${fallo}` : ''}`)
const fallos = resultados.filter((r) => r.fallo).length
if (fallos) {
  console.error(`\n${fallos} comprobacion(es) fallaron.`)
  process.exit(1)
}
console.log('\nLa lista se comporta igual.')
