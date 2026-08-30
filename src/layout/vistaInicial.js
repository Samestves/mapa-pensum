import { NODO, ESPACIADO, MARGEN, ALTO_ENCABEZADO } from './constantes.js'
import { ZOOM_CON_DETALLE } from './detalle.js'

/**
 * Donde arranca el mapa la primera vez que se abre.
 *
 * Antes arrancaba encajando el pensum entero, y encajar el pensum entero en un
 * telefono es el peor sitio posible para empezar. El lienzo mide 3686 x 1000 y
 * una pantalla de telefono 360 x 700: son proporciones de 3,7 contra 0,5, o
 * sea que para que quepa a lo ancho hay que encoger siete veces mas de lo que
 * haria falta a lo alto. Sale escala 0,10, la tarjeta queda en 20 px y el
 * nombre de la materia en 1,2. Ahi no hay nada que leer, y es ademas la unica
 * zona donde el mapa da problemas de dibujado en moviles flojos.
 *
 * Asi que no se arranca ahi. Se arranca en el semestre por el que va el
 * estudiante, entero y a un tamaño en el que se lee. Encajar sigue estando en
 * su boton para quien quiera la vista general.
 *
 * La escala no se elige a ojo: es la que hace que ese semestre quepa de arriba
 * abajo. Es la definicion de "enseñame donde voy" -el semestre es la unidad en
 * la que se piensa una carrera, no la materia suelta ni el pensum entero-, y
 * de paso deja ver un trozo del siguiente, que es lo que viene despues.
 */

const acotar = (v, min, max) => Math.min(Math.max(v, min), max)

/** Lo que ocupa de alto un semestre con `materias` materias. */
export const altoDeUnSemestre = (materias) =>
  ALTO_ENCABEZADO + materias * NODO.alto + Math.max(materias - 1, 0) * ESPACIADO.fila

/**
 * El semestre por el que va el estudiante: el primero que aun tiene algo sin
 * aprobar. Con la carrera terminada no hay ninguno, y entonces se abre en el
 * ultimo, que es donde estaba.
 */
export function columnaDeArranque(columnas, nodos, estaAprobada) {
  if (!columnas.length) return null
  const pendiente = columnas.find((c) =>
    nodos.some((n) => n.semestre === c.semestre && !estaAprobada(n.codigo)),
  )
  return pendiente ?? columnas[columnas.length - 1]
}

/**
 * La escala a la que ese semestre cabe entero de arriba abajo.
 *
 * Nunca por debajo del umbral en el que el texto deja de dibujarse -arrancar
 * sin texto es justo lo que esto viene a evitar- ni por encima de 1, que es el
 * tamaño natural: ampliar de salida se sentiria como que el mapa esta roto al
 * reves.
 */
export function escalaDeArranque(alto, materias) {
  return acotar(alto / (altoDeUnSemestre(materias) + MARGEN.top * 2), ZOOM_CON_DETALLE, 1)
}

/**
 * La vista de arranque, o null si todavia no se sabe el tamaño de la ventana
 * o el pensum viene vacio. Quien llama decide que hacer con el null; aqui no
 * se inventa una vista a medias.
 */
export function vistaDeArranque(medida, columnas, nodos, estaAprobada) {
  if (!medida.ancho || !medida.alto) return null
  const columna = columnaDeArranque(columnas, nodos, estaAprobada)
  if (!columna) return null

  const escala = escalaDeArranque(medida.alto, columna.cantidad)
  const usado = altoDeUnSemestre(columna.cantidad) * escala

  return {
    escala,
    // El centro de la columna al centro de la ventana.
    x: medida.ancho / 2 - (columna.x + NODO.ancho / 2) * escala,
    // El semestre centrado a lo alto, con su cabecera incluida.
    y: (medida.alto - usado) / 2 - MARGEN.top * escala,
  }
}
