/**
 * El codigo que hay que ENSEÑAR de una materia.
 *
 * Casi siempre es el suyo y ya. La excepcion es Ambiental, cuyo pensum viene
 * de un documento escaneado que repite algunos codigos en materias distintas.
 * La app necesita que el codigo sea unico -lo usa como identidad para las
 * claves de React y para el mapa de marcas-, asi que el normalizador
 * desambigua las repeticiones anadiendo un sufijo y guarda el original en
 * codigoFuente.
 *
 * Lo que se muestra tiene que ser el original: es el que el estudiante va a
 * encontrar en su pensum impreso. El sufijo es asunto interno nuestro y no
 * tiene por que salir a la pantalla.
 */
export const codigoVisible = (nodo) => nodo?.codigoFuente ?? nodo?.codigo ?? ''
