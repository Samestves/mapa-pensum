import { NODO } from './constantes.js'

/**
 * El rectangulo de una materia en coordenadas del mapa, o null si no esta
 * dibujada -una electiva que no has colocado, sin posicion-.
 */
export function cajaDeMateria(materia) {
  if (!materia || !Number.isFinite(materia.x) || !Number.isFinite(materia.y)) return null
  return { x0: materia.x, y0: materia.y, x1: materia.x + NODO.ancho, y1: materia.y + NODO.alto }
}

/**
 * El rectangulo mas pequeño que contiene a todas las materias dibujadas de
 * `materias` (las que no lo estan se saltan), o null si no hay ninguna.
 */
export function cajaQueAbarca(materias) {
  const cajas = materias.map(cajaDeMateria).filter(Boolean)
  if (!cajas.length) return null
  return {
    x0: Math.min(...cajas.map((c) => c.x0)),
    y0: Math.min(...cajas.map((c) => c.y0)),
    x1: Math.max(...cajas.map((c) => c.x1)),
    y1: Math.max(...cajas.map((c) => c.y1)),
  }
}

/* Cuanto aire se deja al correr el mapa para enseñar lo que desbloquea una
   materia al aprobarla. En el telefono, abajo queda la barra de las vistas. */
export const MARGEN_AL_APROBAR = { arriba: 48, abajo: 48, izq: 48, der: 48 }
export const MARGEN_AL_APROBAR_TELEFONO = { arriba: 32, abajo: 112, izq: 24, der: 24 }
