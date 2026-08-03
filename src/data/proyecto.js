/**
 * Lo que la interfaz necesita saber del proyecto en si, no de los pensums.
 *
 * El enlace al repositorio no esta ahi como firma. Esta en la misma frase que
 * dice de donde salieron los datos y que pueden tener errores: es parte de la
 * procedencia. Quien quiera comprobar de donde sale un dato, puede.
 */
export const REPO = 'https://github.com/Samestves/mapa-pensum'

/**
 * Abre un issue de GitHub con el formulario ya redactado.
 *
 * Un reporte que solo dice "hay un error en Sistemas" no se puede arreglar:
 * hace falta que materia, que dice el pensum oficial y de donde sale. Pedirlo
 * con el formulario en blanco no funciona, asi que va todo preescrito y al
 * estudiante solo le queda rellenar los huecos.
 *
 * Sin label: GitHub solo deja ponerlas a quien tiene permisos en el repo, y
 * para todos los demas la peticion falla en vez de abrir el formulario.
 */
export function enlaceReporte({ carrera } = {}) {
  const cuerpo = [
    `**Carrera:** ${carrera ?? '(¿cuál?)'}`,
    '',
    '**Materia:** (código y nombre, si aplica)',
    '',
    '**Qué está mal o qué falta**',
    '',
    '',
    '**Qué dice el pensum oficial**',
    '',
    '',
    '**De dónde lo sacas** (captura, PDF de la DACE, control de estudios…)',
    '',
  ].join('\n')

  const parametros = new URLSearchParams({
    title: carrera ? `Corrección en ${carrera}` : 'Corrección en los datos',
    body: cuerpo,
  })

  return `${REPO}/issues/new?${parametros}`
}
