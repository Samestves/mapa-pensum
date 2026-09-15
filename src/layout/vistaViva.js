/**
 * El pellizco en vivo: mover la capa ya pintada en vez de volver a pintarla.
 *
 * Pintar el mapa a otra escala es lo caro de un zoom. Chrome rehace la
 * maqueta de los doscientos y pico textos y vuelve a rasterizar todo lo que
 * se ve, y en un telefono eso son decenas de milisegundos por cuadro. Pero
 * mientras los dedos se mueven no hace falta nitidez, hace falta que el mapa
 * siga a los dedos. Asi que durante el gesto el <svg> ya pintado se estira y
 * se desplaza con un transform CSS, que resuelve la GPU sin tocar el hilo
 * principal, y al soltar se pinta una sola vez a la escala final.
 *
 * Dos vistas: la VIVA, a donde van los dedos, y la PINTADA, la que tiene el
 * DOM. Todo lo de aqui es aritmetica entre las dos, sin React, para poder
 * probarlo.
 */

/* Cuanto se deja estirar la capa antes de repintarla. Estirada al doble ya
   se nota borrosa; hasta aqui pasa por el desenfoque normal de un gesto. */
export const AUMENTO_MAX = 1.8

/* Holgura alrededor del contenido, en unidades del mapa: el halo de las
   tarjetas y los puntos de llegada de los cables asoman unos pixeles fuera
   de la caja que da el layout. */
const HOLGURA = 12

/**
 * El transform que hace que la capa pintada con `pintada` se vea como `viva`.
 * Un punto del mapa X cae en pantalla en p = x + escala * X con cada vista;
 * despejando, la viva es la pintada escalada k y desplazada (x, y).
 */
export function transformRelativo(viva, pintada) {
  const k = viva.escala / pintada.escala
  return { k, x: viva.x - k * pintada.x, y: viva.y - k * pintada.y }
}

/** Mismo sitio y misma escala: no hay nada que estirar */
export function mismaVista(a, b) {
  return a.x === b.x && a.y === b.y && a.escala === b.escala
}

/**
 * Si estirar la capa pintada basta para enseñar la vista viva sin que falte
 * nada.
 *
 * La capa solo tiene lo que cabia en la ventana cuando se pinto. Estirada,
 * cubre ese rectangulo transformado; si lo que la vista viva tiene de mapa
 * dentro de la ventana se sale de ahi, se veria un borde vacio. Pasa al
 * alejar con el mapa llenando la pantalla, o al arrastrar mientras se
 * pellizca: en esos cuadros toca pintar de verdad.
 *
 * Alejando desde el mapa entero si cubre: contenido y ventana encogen
 * alrededor del mismo punto, asi que lo que estaba dentro sigue dentro.
 */
export function capaCubre(viva, pintada, medida, anchoContenido, altoContenido) {
  const { k, x, y } = transformRelativo(viva, pintada)
  if (k > AUMENTO_MAX) return false

  const m = HOLGURA * viva.escala
  const x0 = Math.max(0, viva.x - m)
  const x1 = Math.min(medida.ancho, viva.x + anchoContenido * viva.escala + m)
  const y0 = Math.max(0, viva.y - m)
  const y1 = Math.min(medida.alto, viva.y + altoContenido * viva.escala + m)
  // El mapa entero fuera de la ventana: no hay nada que pueda faltar
  if (x0 >= x1 || y0 >= y1) return true

  const TOLERANCIA = 0.5
  return (
    x0 >= x - TOLERANCIA &&
    y0 >= y - TOLERANCIA &&
    x1 <= x + k * medida.ancho + TOLERANCIA &&
    y1 <= y + k * medida.alto + TOLERANCIA
  )
}
