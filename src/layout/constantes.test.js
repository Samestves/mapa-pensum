import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import * as CONSTANTES from './constantes.js'

/**
 * Que nadie lea una constante que ya no existe.
 *
 * Esta prueba nace de un fallo que ha ocurrido DOS veces, el mismo, en el
 * mismo archivo. Al quitar la barra de acento de las tarjetas se borro
 * `NODO.barra` de constantes.js, y una rama de NodoHueco.jsx se quedo leyendo
 * `NODO.barra.x`. En produccion eso es "Cannot read properties of undefined
 * (reading 'x')" y la pantalla entera cae al aviso de error: el mapa dibuja
 * cero nodos.
 *
 * Lo peor no es el fallo, es que NADA lo ve:
 *
 *   el lint    no puede: es una propiedad de un objeto importado, no un
 *              identificador suelto
 *   el build   compila sin rechistar, porque leer una clave que no esta es
 *              JavaScript legal
 *   el ojo     mira la mitad del componente que si se dibuja, y esa rama solo
 *              aparece cuando una casilla de electiva TIENE materia elegida
 *
 * Asi que lo comprueba esto: se leen los componentes como texto, se buscan
 * todos los accesos del tipo `NODO.algo` y se exige que ese `algo` exista de
 * verdad. Es tosco -no entiende el codigo, solo lo mira- y precisamente por
 * eso cubre lo que el lint no alcanza.
 */

const RAIZ = path.join(import.meta.dirname, '..')

/* Los objetos de constantes.js cuyas claves se leen por todas partes. Se
   listan a mano y no se sacan del modulo entero para no acabar comprobando
   funciones sueltas, que no tienen claves que valga la pena vigilar. */
const VIGILADOS = ['NODO', 'TEXTO', 'ESPACIADO', 'MARGEN', 'ELECTIVAS', 'ZOOM']

function archivosDe(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const completo = path.join(dir, e.name)
    if (e.isDirectory()) return archivosDe(completo)
    return /\.jsx?$/.test(e.name) && !e.name.endsWith('.test.js') ? [completo] : []
  })
}

test('las constantes del mapa', async (t) => {
  /* Todo src menos el propio constantes.js. Empezo mirando solo components y
     layout, y ZOOM salio como huerfano cuando en realidad lo lee un hook: una
     prueba que mira medio arbol da falsos positivos justo en lo que menos se
     revisa. */
  const fuentes = ['components', 'layout', 'hooks', 'theme', 'data']
    .flatMap((carpeta) => archivosDe(path.join(RAIZ, carpeta)))
    .filter((f) => !f.endsWith('constantes.js'))

  await t.test('hay algo que mirar', () => {
    assert.ok(fuentes.length > 20, `solo encontre ${fuentes.length} archivos`)
  })

  await t.test('nadie lee una clave que no existe', () => {
    const rotas = []

    for (const archivo of fuentes) {
      const codigo = fs.readFileSync(archivo, 'utf8')
      for (const objeto of VIGILADOS) {
        const patron = new RegExp(`\\b${objeto}\\.([A-Za-z_$][\\w$]*)`, 'g')
        for (const [, clave] of codigo.matchAll(patron)) {
          if (!(clave in CONSTANTES[objeto])) {
            rotas.push(`${path.relative(RAIZ, archivo)} lee ${objeto}.${clave}`)
          }
        }
      }
    }

    assert.deepEqual(
      rotas,
      [],
      `\n  ${rotas.join('\n  ')}\n  y eso en produccion es "Cannot read properties of undefined"`,
    )
  })

  await t.test('y todo lo que se exporta se usa en alguna parte', () => {
    const todo = fuentes.map((f) => fs.readFileSync(f, 'utf8')).join('\n')
    const huerfanas = []

    for (const objeto of VIGILADOS) {
      for (const clave of Object.keys(CONSTANTES[objeto])) {
        if (!new RegExp(`\\b${objeto}\\.${clave}\\b`).test(todo)) {
          huerfanas.push(`${objeto}.${clave}`)
        }
      }
    }

    /* El otro lado del mismo problema: una constante que ya no lee nadie es
       geometria muerta que la proxima persona va a intentar respetar. */
    assert.deepEqual(huerfanas, [], `\n  sobran: ${huerfanas.join(', ')}`)
  })
})
