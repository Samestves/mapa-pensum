import {
  Atom,
  Braces,
  BriefcaseBusiness,
  ChartColumn,
  CircuitBoard,
  Languages,
  ScrollText,
  Workflow,
} from 'lucide-react'
import { TONOS } from './paleta'

/* Etiqueta, color e icono de cada area. El color apunta a la variable CSS,
   asi que cambia solo al alternar tema claro/oscuro.

   El icono existe porque el nombre del area se escribe a 8 px en la esquina
   de la tarjeta, y a 8 px una palabra no es una palabra: es una mancha gris.
   Con la vista encajada -que es como se abre el mapa- "Ciencias basicas" y
   "Computacion" son el mismo borron. Una forma si sobrevive a ese tamaño.

   Se eligieron por lo que hay DENTRO de cada area en este pensum, no por la
   palabra: generales es sobre todo idiomas y expresion, de ahi Languages, y
   no un birrete, que ademas ya significa "planificar" en la barra. */
const AREAS = {
  generales: { etiqueta: 'Generales', color: 'var(--area-generales)', icono: Languages },
  'ciencias-basicas': {
    etiqueta: 'Ciencias básicas',
    color: 'var(--area-ciencias-basicas)',
    icono: Atom,
  },
  estadistica: { etiqueta: 'Estadística', color: 'var(--area-estadistica)', icono: ChartColumn },
  computacion: { etiqueta: 'Computación', color: 'var(--area-computacion)', icono: Braces },
  electronica: { etiqueta: 'Electrónica', color: 'var(--area-electronica)', icono: CircuitBoard },
  sistemas: { etiqueta: 'Sistemas', color: 'var(--area-sistemas)', icono: Workflow },
  gestion: { etiqueta: 'Gestión', color: 'var(--area-gestion)', icono: BriefcaseBusiness },
  tesis: { etiqueta: 'Trabajo de grado', color: 'var(--area-tesis)', icono: ScrollText },
}

export const colorArea = (area) => AREAS[area]?.color ?? 'var(--tinta-tenue)'
export const etiquetaArea = (area) => AREAS[area]?.etiqueta ?? area

/* null donde no hay area clasificada, que hoy es en ocho de las nueve
   carreras: ahi el nodo no dibuja icono y no pasa nada. */
export const iconoArea = (area) => AREAS[area]?.icono ?? null

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

/** El color de una clase: el que eligio el estudiante, o el de su area */
export const colorClase = (sesion, asignatura) =>
  sesion?.color ? colorIndice(sesion.color) : colorNodo(asignatura)
