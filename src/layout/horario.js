/* Datos y medidas de la rejilla del horario. Aqui no hay React ni JSX: son
   los numeros que describen la semana, y viven aparte para que el
   componente se ocupe solo de dibujarlos. */

export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

/* La UDO dicta de siete de la mañana a nueve de la noche. La ultima fila
   dibujada es la de las 20:00, que termina justo en el cierre. */
export const ABRE = 7
export const CIERRA = 21

/* Alto de una fila de hora, en pixeles. Es lo que decide si la rejilla
   respira o se apelmaza, asi que es una constante con nombre y no un numero
   suelto perdido en una clase de Tailwind. */
export const ALTO_HORA = 112

/** Ancho de la columna de las horas. Cabe "11:00 AM" sin apretarse. */
export const ANCHO_HORAS = '5.5rem'

/** Las horas dibujadas, de la de apertura a la ultima antes del cierre */
export const horasDelDia = () =>
  Array.from({ length: CIERRA - ABRE }, (_, i) => ABRE + i)

/**
 * Pasa una hora de veinticuatro a doce con su sufijo.
 *
 * El resto de la aplicacion habla en veinticuatro horas, pero un horario se
 * lee de reojo y aqui el formato de doce es el que se reconoce sin pensar.
 */
export const enDoceHoras = (hora) =>
  `${((hora + 11) % 12) + 1}:00 ${hora < 12 ? 'AM' : 'PM'}`
