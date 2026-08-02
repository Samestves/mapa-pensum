import { TONOS } from './paleta'

// Etiquetas y color de acento por area. El color apunta a la variable CSS,
// asi que cambia solo al alternar tema claro/oscuro.
export const AREAS = {
  generales: { etiqueta: 'Generales', color: 'var(--area-generales)' },
  'ciencias-basicas': { etiqueta: 'Ciencias básicas', color: 'var(--area-ciencias-basicas)' },
  estadistica: { etiqueta: 'Estadística', color: 'var(--area-estadistica)' },
  computacion: { etiqueta: 'Computación', color: 'var(--area-computacion)' },
  electronica: { etiqueta: 'Electrónica', color: 'var(--area-electronica)' },
  sistemas: { etiqueta: 'Sistemas', color: 'var(--area-sistemas)' },
  gestion: { etiqueta: 'Gestión', color: 'var(--area-gestion)' },
  tesis: { etiqueta: 'Trabajo de grado', color: 'var(--area-tesis)' },
}

export const colorArea = (area) => AREAS[area]?.color ?? 'var(--tinta-tenue)'
export const etiquetaArea = (area) => AREAS[area]?.etiqueta ?? area

/**
 * Reparte un codigo entre los TONOS disponibles. Parece azar, pero es un
 * hash: la misma materia sale siempre del mismo color, en cada recarga y en
 * cada dispositivo. Un random de verdad cambiaria el mapa cada vez que
 * entras, y eso hace que dejes de reconocerlo.
 */
function tonoDe(codigo) {
  let h = 2166136261
  for (let i = 0; i < codigo.length; i++) {
    h ^= codigo.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (Math.abs(h) % TONOS) + 1
}

/**
 * Color de acento de una materia. Donde hay area clasificada manda el area
 * (Sistemas); donde no, se reparte entre los diez tonos que VistaCarrera
 * publica como --tono-N en el contenedor.
 *
 * Va por variable CSS y no por un color calculado en props para que el
 * cambio de tema siga siendo instantaneo y para no arrastrar un resolutor
 * hasta el ultimo componente del arbol.
 */
export const colorNodo = (nodo) => {
  if (nodo?.area) return colorArea(nodo.area)
  if (!nodo?.codigo) return 'var(--tinta-suave)'
  return `var(--tono-${tonoDe(nodo.codigo)}, var(--tinta-suave))`
}
