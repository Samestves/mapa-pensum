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

export async function cargarCarrera(slug) {
  const cargar = modulos[`./carreras/${slug}.json`]
  if (!cargar) throw new Error(`No existe la carrera "${slug}"`)
  const modulo = await cargar()
  return modulo.default
}
