import indice from './carreras/indice.json'

/**
 * Catalogo de carreras. El indice es pequeño (nombre, color y silueta) y va
 * en el bundle inicial porque el selector lo necesita entero. El pensum de
 * cada carrera pesa mucho mas y se baja solo cuando se abre esa carrera:
 * nadie deberia pagar los 107 nodos de Agronomica por mirar Sistemas.
 */
export const CARRERAS = indice

// Vite convierte esto en un import dinamico por archivo, o sea un chunk por
// carrera. Agregar una carrera es dejar caer su JSON: el glob la recoge sin
// que haya que tocar codigo.
// El indice se excluye: ya viene estatico arriba, y tenerlo en las dos vias
// hace que Vite no pueda sacarlo a su propio chunk.
const modulos = import.meta.glob(['./carreras/*.json', '!./carreras/indice.json'])

export const existe = (slug) => CARRERAS.some((c) => c.slug === slug)

export const resumenDe = (slug) => CARRERAS.find((c) => c.slug === slug) ?? null

// Lo ya bajado se guarda aqui. Sin esto, entrar a una carrera siempre pasaba
// por un tick asincrono y por tanto por un fotograma de pantalla vacia,
// aunque el chunk estuviera desde hacia rato en memoria.
const cache = new Map()
const enVuelo = new Map()

/** Devuelve la carrera si ya esta bajada, o null. No hace red. */
export const carreraEnCache = (slug) => cache.get(slug) ?? null

export async function cargarCarrera(slug) {
  if (cache.has(slug)) return cache.get(slug)
  if (enVuelo.has(slug)) return enVuelo.get(slug)

  const cargar = modulos[`./carreras/${slug}.json`]
  if (!cargar) throw new Error(`No existe la carrera "${slug}"`)

  const promesa = cargar()
    .then((modulo) => {
      cache.set(slug, modulo.default)
      enVuelo.delete(slug)
      return modulo.default
    })
    .catch((e) => {
      enVuelo.delete(slug)
      throw e
    })

  enVuelo.set(slug, promesa)
  return promesa
}

/**
 * Empieza a bajar una carrera sin esperarla. Se llama al pasar el raton o el
 * dedo por encima de su tarjeta, que ocurre decimas de segundo antes del
 * click: para cuando el usuario suelta, el pensum ya esta en memoria y entrar
 * es instantaneo.
 *
 * Los fallos se tragan a proposito: esto es una apuesta, y si sale mal el
 * click de verdad volvera a intentarlo y ahi si se reportara el error.
 */
export function precargarCarrera(slug) {
  if (!slug || cache.has(slug) || enVuelo.has(slug)) return
  cargarCarrera(slug).catch(() => {})
}
