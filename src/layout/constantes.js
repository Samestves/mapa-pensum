// Geometria del mapa. Todo el layout se deriva de aqui: cambiando estos numeros
// se mueve el grafo completo sin tocar ningun componente.

export const NODO = {
  ancho: 224,
  alto: 96,
  radio: 12,
  padIzq: 20, // deja sitio a la barra de acento del area
  padDer: 16,
}

// Ancho util para el texto dentro del nodo
export const ANCHO_TEXTO = NODO.ancho - NODO.padIzq - NODO.padDer

export const ESPACIADO = {
  // Hueco entre columnas. Todo el ruteo de cables ocurre aqui dentro.
  columna: 150,
  fila: 26,
}

export const MARGEN = { top: 24, right: 48, bottom: 72, left: 48 }

// Zona de electivas, debajo de los 10 semestres. Comparte las columnas del
// mapa principal para que se lea como una continuacion y no como otro dibujo.
export const ELECTIVAS = {
  // Aire entre el ultimo semestre y la zona: son dos mapas separados
  corredor: 110,
  encabezado: 52,
  alto: 62,
  fila: 14,
  separacionGrupo: 44,
}

// Franja reservada arriba de cada columna para el titulo del semestre
export const ALTO_ENCABEZADO = 56

export const TEXTO = {
  codigo: 10,
  nombre: 12.5,
  meta: 9.5,
  altoLinea: 14,
  maxLineas: 3,
  // Centro vertical del bloque de nombre dentro del nodo
  centroNombre: 56,
}

// El minimo es muy bajo a proposito: en un movil el mapa completo solo cabe
// a ~0.10, y "encajar en pantalla" tiene que poder cumplir lo que promete.
export const ZOOM = { min: 0.08, max: 2.5, paso: 1.25 }
