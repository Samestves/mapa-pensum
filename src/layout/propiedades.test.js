import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/*
 * Cada NOMBRE.propiedad de una constante objeto importada tiene que existir.
 *
 * oxlint con no-undef ve un identificador que no existe, pero no una
 * propiedad: NODO.barra pasa el lint y vale undefined en tiempo de ejecucion.
 * Asi se rompio el mapa tres veces, siempre en una rama que solo se pinta en
 * un caso concreto. Esta prueba lee cada archivo de src, mira que constantes
 * objeto importa y de donde, importa ese modulo de verdad y comprueba cada
 * propiedad que se lee.
 */

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const fuentes = (dir) =>
  readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre)
    if (statSync(ruta).isDirectory()) return fuentes(ruta)
    return /\.jsx?$/.test(nombre) && !nombre.endsWith('.test.js') ? [ruta] : []
  })

// import { A, B as C } from './x'  (tambien con un default delante)
const IMPORTS = /import\s+(?:[\w$]+\s*,\s*)?\{([^}]*)\}\s*from\s*['"](\.{1,2}\/[^'"]+)['"]/g

const sinComentarios = (texto) =>
  texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

/* El archivo .js de un import relativo, o null si no es un .js que Node pueda importar */
function moduloDe(desdeArchivo, especificador) {
  const base = resolve(dirname(desdeArchivo), especificador)
  const ruta = [base, `${base}.js`].find((r) => r.endsWith('.js') && existsSync(r))
  return ruta ?? null
}

const esObjetoPlano = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

test('cada NOMBRE.propiedad de una constante importada existe', async () => {
  const cache = new Map()
  const importar = async (ruta) => {
    if (!cache.has(ruta)) cache.set(ruta, import(pathToFileURL(ruta).href))
    return cache.get(ruta)
  }

  const fallos = []
  for (const archivo of fuentes(SRC)) {
    const texto = sinComentarios(readFileSync(archivo, 'utf8'))
    for (const [, lista, especificador] of texto.matchAll(IMPORTS)) {
      const ruta = moduloDe(archivo, especificador)
      if (!ruta) continue
      /* Solo los modulos que exportan una constante objeto -`export const X
         = {`- y solo si se importa alguna de ellas: el resto no tiene
         propiedades que vigilar, y muchos no se pueden cargar en Node. */
      const objetos = new Set(
        [...readFileSync(ruta, 'utf8').matchAll(/export const (\w+) = \{/g)].map((m) => m[1]),
      )
      const importados = lista.split(',').map((p) => p.trim().split(/\s+as\s+/)[0])
      if (!importados.some((n) => objetos.has(n))) continue
      let modulo
      try {
        modulo = await importar(ruta)
      } catch (error) {
        fallos.push(
          `${ruta}: Node no lo puede importar (${error.message.split('\n')[0]}). Pon .js a sus imports relativos.`,
        )
        continue
      }
      for (const pieza of lista.split(',')) {
        const [importado, local = importado] = pieza.trim().split(/\s+as\s+/)
        if (!importado || !esObjetoPlano(modulo[importado])) continue
        const objeto = modulo[importado]
        const accesos = new RegExp(`(?<![\\w$.])${local}\\.([A-Za-z_$][\\w$]*)`, 'g')
        for (const [, propiedad] of texto.matchAll(accesos)) {
          if (!(propiedad in objeto)) {
            fallos.push(`${archivo.slice(SRC.length + 1)}: ${local}.${propiedad} no existe en ${importado}`)
          }
        }
      }
    }
  }
  assert.deepEqual([...new Set(fallos)], [])
})
