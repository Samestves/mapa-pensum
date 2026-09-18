// Geometria del mapa. Todo el layout se deriva de aqui: cambiando estos numeros
// se mueve el grafo completo sin tocar ningun componente.

export const NODO = {
  ancho: 224,
  alto: 96,
  /* Esquina casi recta. Con 14 la tarjeta se leia como un boton de telefono;
     con 7 se lee como una ficha, que es lo que es. */
  radio: 7,
  padIzq: 18,
  padDer: 16,
}

/* El icono de la materia: grande, en la esquina de abajo a la derecha y
   cortado por el borde de la tarjeta, como el emblema de una carta. `tam` es
   lo que mediria entero, y `ancho` y `alto` lo que asoma: algo mas de la
   mitad. Entero seria una ilustracion peleando con el nombre; cortado se lee
   como un sello de fondo. */
export const ICONO = { tam: 72, ancho: 50, alto: 46 }

/* Por debajo de esta escala los iconos no se dibujan: miden menos de veinte
   pixeles, la linea queda por debajo de medio pixel y solo ensucian, y el
   mapa entero a la vista es justo cuando mas tarjetas hay que pintar. */
export const ESCALA_ICONOS = 0.3

// Ancho util para el texto dentro del nodo
export const ANCHO_TEXTO = NODO.ancho - NODO.padIzq - NODO.padDer

export const ESPACIADO = {
  // Hueco entre columnas. Todo el ruteo de cables ocurre aqui dentro.
  columna: 150,
  fila: 26,
}

export const MARGEN = { top: 24, right: 48, bottom: 72, left: 48 }

// Franja de electivas, debajo de los semestres, en las carreras sin ruta
// oficial (ver layout/franjaElectivas.js). Comparte las columnas del mapa
// para leerse como su continuacion y no como otro dibujo.
export const FRANJA = {
  // Aire entre el ultimo semestre y la franja: las electivas no son un semestre mas
  corredor: 96,
  // Del rotulo del grupo a sus casillas
  encabezado: 48,
  // Entre filas de casillas, igual que entre materias
  fila: 26,
}

// Franja reservada arriba de cada columna para la cabecera del semestre: sus
// cuatro lineas ocupan unos 66 px, y el resto es el aire que la separa de la
// primera tarjeta. Todo lo de
// debajo -tarjetas, cables, electivas- se recoloca solo porque se deriva de
// aqui.
export const ALTO_ENCABEZADO = 84

export const TEXTO = {
  codigo: 10,
  // DISPONIBLE, CURSANDO: pequeño y muy espaciado, se lee como rotulo
  rotulo: 8.5,
  nombre: 14,
  meta: 10,
  altoLinea: 16.5,
  maxLineas: 3,
  // Linea base de la fila de arriba: codigo y estado
  lineaSuperior: 24,
  // Centro vertical del bloque de nombre dentro del nodo
  centroNombre: 55,
}

// El minimo es muy bajo a proposito: en un movil el mapa completo solo cabe
// a ~0.10, y "encajar en pantalla" tiene que poder cumplir lo que promete.
export const ZOOM = { min: 0.08, max: 2.5, paso: 1.25 }
