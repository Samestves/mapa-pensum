/**
 * Banco de rendimiento. Se corre con: npm run rendimiento
 * (sobre el build: hace falta un npm run build antes).
 *
 * Mide tres cosas, cada una en su archivo de scripts/banco:
 *
 *   arranque  lo que tarda en llegar la primera vez, en un telefono modesto
 *   uso       cambiar de vista, marcar y desplazar, en ese mismo telefono
 *   gestos    quieto, rueda, arrastre, hover, pellizco y dedo sobre el mapa
 *
 * Cada medida tiene un tope, y esto sale con codigo 1 si alguna se pasa: es
 * lo que evita que la aplicacion vuelva a ponerse lenta sin que nada falle.
 * Hay que correrlo antes de pasar nada a main.
 *
 *   npm run rendimiento                 todo
 *   npm run rendimiento -- uso          solo una de las tres
 *   npm run rendimiento -- gestos dedo  solo los escenarios que digan "dedo"
 *
 * Variables:
 *   PASADAS  cuantas veces se repite cada medida (3). Se enseña la mediana.
 *   DIST     otro build que medir en vez de dist/ (ver banco/navegador.js).
 *   CHROME   ruta al ejecutable de Chrome, si no se encuentra solo.
 *
 * Mientras corre no hay que usar el equipo para nada mas: otro proceso
 * tirando de la CPU sube los tiempos entre un 30 y un 80 %.
 */

import { arranque } from './banco/arranque.js'
import { gestos } from './banco/gestos.js'
import { prepararBanco } from './banco/navegador.js'
import { excesos, medianaDe, redondear, veredicto } from './banco/presupuesto.js'
import { uso } from './banco/uso.js'

const MEDIDAS = [arranque, uso, gestos]
const PASADAS = Number(process.env.PASADAS ?? 3)

const [cual, filtro = ''] = process.argv.slice(2)
const elegidas = cual ? MEDIDAS.filter((m) => m.nombre === cual) : MEDIDAS
if (!elegidas.length) {
  console.error(`No hay medida «${cual}». Las que hay: ${MEDIDAS.map((m) => m.nombre).join(', ')}`)
  process.exit(1)
}
const quiere = (escenario) => escenario.includes(filtro)

const banco = await prepararBanco()
const fallos = []

for (const medida of elegidas) {
  const pasadas = []
  for (let i = 0; i < PASADAS; i++) pasadas.push(await medida.pasada(banco, quiere))

  // Las pasadas traen los mismos escenarios en el mismo orden: se juntan por sitio
  const filas = pasadas[0].map(({ escenario, presupuesto }, i) => {
    const medidas = medianaDe(pasadas.map((pasada) => pasada[i].medidas))
    const pasados = excesos(medidas, presupuesto)
    if (pasados.length) fallos.push(`${medida.nombre} · ${escenario}: ${pasados.join(', ')}`)
    return { escenario, ...redondear(medidas), presupuesto: veredicto(pasados) }
  })

  console.log(`\n${medida.titulo}`)
  console.table(filas)
  console.log(medida.leyenda)
}

await banco.cerrar()

const pasadas = `mediana de ${PASADAS} pasada${PASADAS === 1 ? '' : 's'}`
if (fallos.length) {
  console.error(`\n${fallos.length} medida(s) por encima de su tope (${pasadas}):`)
  for (const fallo of fallos) console.error(`  ✗ ${fallo}`)
  process.exit(1)
}
console.log(`\nTodo dentro de presupuesto (${pasadas}).`)
