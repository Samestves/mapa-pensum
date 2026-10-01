/**
 * Un texto listo para compararse en una busqueda: sin tildes y en minusculas.
 * Nadie escribe "Matemáticas" con tilde en un buscador, y "matematicas" tiene
 * que encontrarla igual.
 *
 * Vivia copiada en cuatro sitios -la paleta, el buscador del horario, el
 * selector de electivas y la importacion de horarios-, cada una con su
 * pequeña diferencia. Una sola copia es la unica forma de que las cuatro
 * busquedas encuentren lo mismo.
 */
export const sinTildes = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
