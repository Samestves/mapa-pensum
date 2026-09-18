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
export function capaCubre(
  viva,
  pintada,
  medida,
  anchoContenido,
  altoContenido,
  aumentoMax = AUMENTO_MAX,
) {
  const { k, x, y } = transformRelativo(viva, pintada)
  if (k > aumentoMax) return false

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

/* En un viaje de camara se deja estirar mas que en el pellizco. El viaje
   dura menos de medio segundo y va deprisa justo al principio, que es
   cuando la capa esta mas estirada: el ojo va siguiendo el movimiento y no
   llega a leer letras. Con los dedos, en cambio, el mapa se para donde uno
   quiera y ahi si se veria borroso. */
export const AUMENTO_VIAJE = 3

/**
 * La vista a la que pintar el mapa UNA vez para hacer un viaje de camara
 * entero estirando la capa, sin volver a pintar en ningun cuadro. O null si
 * no hay ninguna que sirva y toca pintar cada cuadro, como antes.
 *
 * Tiene que tener dentro lo que se ve al salir y lo que se ve al llegar. Lo
 * de en medio va solo: cada esquina de la ventana recorre el mapa en una
 * sola direccion durante el viaje, asi que no se sale de lo que cubren las
 * dos puntas.
 *
 * Se prueba primero la punta mas cercana, la de mas escala, que es la que
 * solo hay que encoger y se ve nitida todo el viaje:
 *
 *  - Alejarse, que es lo que hace aprobar: si el mapa entero ya cabia,
 *    encoger lo pintado basta. Si llenaba la pantalla, encogerlo destaparia
 *    los bordes, asi que se pinta el destino: al salir se ve algo estirado
 *    y al llegar esta nitido sin pintar nada mas.
 *  - Acercarse: lo que ya esta pintado se estira, y se pinta nitido al
 *    final.
 *  - Desplazarse, cuando ninguna punta contiene a la otra: una vista algo
 *    mas lejana que abarque las dos, y se pinta nitido al final.
 */
export function vistaParaViaje(desde, hasta, medida, anchoContenido, altoContenido) {
  const cubre = (viva, pintada) =>
    capaCubre(viva, pintada, medida, anchoContenido, altoContenido, AUMENTO_VIAJE)
  const [cerca, lejos] = hasta.escala < desde.escala ? [desde, hasta] : [hasta, desde]
  if (cubre(lejos, cerca)) return cerca
  if (cubre(cerca, lejos)) return lejos

  // Lo que se ve de mapa desde cada punta, en coordenadas del mapa
  const visto = (v) => ({
    x0: Math.max(-HOLGURA, -v.x / v.escala),
    y0: Math.max(-HOLGURA, -v.y / v.escala),
    x1: Math.min(anchoContenido + HOLGURA, (medida.ancho - v.x) / v.escala),
    y1: Math.min(altoContenido + HOLGURA, (medida.alto - v.y) / v.escala),
  })
  const a = visto(desde)
  const b = visto(hasta)
  const x0 = Math.min(a.x0, b.x0)
  const y0 = Math.min(a.y0, b.y0)
  const x1 = Math.max(a.x1, b.x1)
  const y1 = Math.max(a.y1, b.y1)
  if (x1 <= x0 || y1 <= y0) return null

  const escala = Math.min(medida.ancho / (x1 - x0), medida.alto / (y1 - y0))
  const base = {
    escala,
    x: (medida.ancho - (x1 + x0) * escala) / 2,
    y: (medida.alto - (y1 + y0) * escala) / 2,
  }
  return cubre(desde, base) && cubre(hasta, base) ? base : null
}
