/* Como se escribe un mes en la aplicacion. Aparte del exportador de la ruta,
   que tambien los usa: el avance enseña la fecha de grado en la primera
   pantalla, y por una fecha no tiene que cargar con lo que dibuja una imagen. */

const MESES_CORTOS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
]

/** "Octubre de 2030" */
export const MES = (fecha) => {
  const texto = fecha?.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : ''
}

/** "Oct 2030": la fecha de grado cuando va en grande y tiene que caber */
export const mesCorto = (fecha) => `${MESES_CORTOS[fecha.getMonth()]} ${fecha.getFullYear()}`
