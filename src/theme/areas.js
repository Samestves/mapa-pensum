import { TONOS } from './paleta.js'

// Etiquetas y color de acento por area. El color apunta a la variable CSS,
// asi que cambia solo al alternar tema claro/oscuro.
const AREAS = {
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
/* Una luz aclarada hacia --flujo-luz: el blanco en oscuro, la tinta en
   claro. Es el color de un cable encendido, y por eso tambien el del
   contorno que anuncia una ruta: lo que carga y lo que se enciende son la
   misma luz. */
export const avivar = (color) =>
  `color-mix(in oklab, var(--flujo-luz) var(--flujo-mezcla), ${color})`

export const colorNodo = (nodo) => {
  if (nodo?.area) return colorArea(nodo.area)
  if (!nodo?.codigo) return 'var(--tinta-suave)'
  return `var(--tono-${tonoDe(nodo.codigo)}, var(--tinta-suave))`
}

/**
 * Los colores que una clase del horario puede tomar a mano.
 *
 * No son los --tono-N del mapa: esos solo existen en las carreras sin areas
 * clasificadas, asi que en Sistemas la paleta habria salido entera del color
 * de reserva. Son ocho variables propias con su valor en cada tema, y se
 * guarda el numero -no el color-, para que al cambiar de tema el horario
 * cambie con el resto de la aplicacion.
 */
export const COLORES_CLASE = [1, 2, 3, 4, 5, 6, 7, 8]
export const colorIndice = (n) => `var(--clase-${n}, var(--tinta-suave))`

/* Los que se reparten solos. El ultimo de la paleta, el gris, no entra:
   es el color de "sin color", y solo sale si alguien lo elige. */
const AUTOMATICOS = COLORES_CLASE.length - 1

/**
 * El color de cada materia del horario que no lo tiene elegido: uno
 * distinto por materia, en el orden en que entraron al horario.
 *
 * Antes salia el de su area, y en una carrera como Sistemas medio semestre
 * es del mismo area: la semana entera quedaba de un solo azul y no se
 * distinguia una materia de la de al lado. Por orden de llegada, y no por
 * un hash del codigo, para que no se repita un color mientras haya libres;
 * y añadir una materia nueva no le cambia el color a las que ya estaban.
 */
export function coloresDelHorario(sesiones) {
  const colores = new Map()
  for (const s of sesiones) {
    if (!colores.has(s.codigo)) colores.set(s.codigo, (colores.size % AUTOMATICOS) + 1)
  }
  return colores
}

/** El numero que le toca a una materia: el suyo, o el siguiente libre si aun no esta. */
export const colorAutomatico = (colores, codigo) =>
  colores.get(codigo) ?? (colores.size % AUTOMATICOS) + 1

/** El color de una clase: el que eligio el estudiante, o el que le toca a su materia */
export const colorClase = (sesion, colores) =>
  colorIndice(sesion.color ?? colorAutomatico(colores, sesion.codigo))
