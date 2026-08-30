import { TEXTO, ZOOM } from './constantes.js'

/**
 * Cuando el mapa deja de dibujar lo que ya no se puede leer.
 *
 * EL PROBLEMA, medido en el telefono donde ocurre. Un TECNO KI7 con Mali-G52,
 * pantalla de 360 px a densidad 3. Encajando el mapa entero:
 *
 *   escala 0,09   tarjeta de 20 px   nombre a 1,2 px   1165 elementos en pantalla
 *
 * Mil ciento sesenta y cinco elementos de SVG rasterizandose dentro de una
 * franja de mil pixeles. El registro del propio Chrome en ese aparato deja el
 * rastro:
 *
 *   ERROR: SharedImageManager::ProduceSkia: non-existent mailbox
 *   ERROR: GL_INVALID_VALUE: glReadbackImagePixels: Unknown mailbox
 *
 * El compositor pierde texturas y pinta basura repetida en bandas. Encaja con
 * lo observado: alejado se rompe, acercado va perfecto, porque acercado solo
 * hay treinta elementos en pantalla en vez de mil.
 *
 * Y encaja con lo que NO era. La primera sospecha fue el limite de textura de
 * 4096 que ese aparato tiene capado, y las cuentas la descartan: alejado el
 * lienzo mide 1036 px -por debajo de sobra- y acercado 11.508 -por encima-,
 * o sea justo al reves que el sintoma. No es el tamaño, es la cantidad.
 *
 * LA REGLA. Por debajo de la escala a la que el nombre de una materia baja de
 * 5,5 px, el texto y los iconos no se dibujan. No se pierde informacion: a esa
 * altura una palabra no es una palabra, es una mancha gris que ademas ensucia
 * el color de la tarjeta, que es lo unico que si se lee de lejos.
 *
 * Los 5,5 px no son un numero redondo elegido a ojo: es donde una palabra deja
 * de distinguirse de una raya.
 */
const ALTURA_MINIMA_LEGIBLE = 5.5

export const ZOOM_CON_DETALLE = ALTURA_MINIMA_LEGIBLE / TEXTO.nombre

/**
 * Si a esta escala el detalle de las tarjetas merece dibujarse.
 *
 * Se consulta una vez por fotograma en el UNICO elemento que ya cambia al
 * mover el mapa, y de ahi sale una clase de CSS. No se pasa como prop a los
 * nodos a proposito: seria una prop nueva en los 494 y cada rueda del raton
 * los repintaria todos, que es justo lo que el memo de NodoAsignatura existe
 * para evitar.
 */
export const hayDetalle = (escala) => escala >= ZOOM_CON_DETALLE

/** El tamaño en pantalla del nombre de una materia, para poder razonarlo. */
export const alturaDelNombre = (escala) => TEXTO.nombre * escala

/* La escala minima del mapa existe para que "encajar en pantalla" pueda
   cumplir lo que promete en un telefono. Es, por definicion, el caso en el que
   mas elementos caen a la vez en pantalla, y por tanto el que tiene que
   quedar por debajo del umbral. Si algun dia se subiera el minimo por encima,
   el detalle no se apagaria nunca y volveriamos al fallo. */
export const ELDETALLE_SE_APAGA_ALGUNA_VEZ = ZOOM.min < ZOOM_CON_DETALLE
