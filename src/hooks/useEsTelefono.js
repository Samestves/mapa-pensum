import { useConsulta } from './useConsulta'

/* El corte esta donde la aplicacion cambia de forma: por debajo, las vistas
   viven en la barra de abajo y lo que se abre sube como una hoja. */
const CONSULTA = '(max-width: 767px)'

/**
 * True mientras la ventana sea de telefono. Se re-evalua al girar.
 *
 * La pregunta la hacen varios sitios -el horario, la ficha de una clase, el
 * lector-, y dos copias del mismo corte es como acaban desincronizadas.
 */
export function useEsTelefono() {
  return useConsulta(CONSULTA)
}
