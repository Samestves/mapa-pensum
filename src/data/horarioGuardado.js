/**
 * El horario guardado de cada carrera, visto desde fuera de su pantalla.
 *
 * useHorario lo escribe y lo lee por carrera, con la clave CLAVE_HORARIO y el
 * slug detras. Aqui vive la misma clave para que el latido pueda contar cuantas
 * clases tiene cada carrera sin montar el hook ni conocer lo que hay dentro de
 * cada fila. No cambiar el formato: lo que ya esta guardado en los telefonos
 * depende de el.
 */
export const CLAVE_HORARIO = 'mapa-pensum:horario'
export const claveHorario = (slug) => `${CLAVE_HORARIO}:${slug}`

/* Mismo tope que las carreras de una visita en el latido: nadie lleva horario
   en mas de cuatro carreras a la vez, y el numero no debe crecer sin limite. */
const TOPE_CARRERAS = 4

/**
 * { slug: numeroDeClases } de las carreras con al menos una clase guardada.
 *
 * Nunca lanza. Sin almacen -bloqueado, o inexistente- no hay horarios que
 * contar; una clave corrupta solo pierde su carrera y las demas siguen
 * contando. No mira que hay dentro de cada clase: eso lo decide useHorario al
 * leer, y aqui solo interesa cuantas hay.
 */
export function horariosGuardados(almacen) {
  const cuenta = {}
  try {
    const origen = almacen ?? localStorage
    const prefijo = `${CLAVE_HORARIO}:`
    for (let i = 0; i < origen.length && Object.keys(cuenta).length < TOPE_CARRERAS; i++) {
      const clave = origen.key(i)
      if (!clave?.startsWith(prefijo)) continue
      const slug = clave.slice(prefijo.length)
      try {
        const clases = JSON.parse(origen.getItem(clave))
        if (slug && Array.isArray(clases) && clases.length) cuenta[slug] = clases.length
      } catch {
        // Una clave corrupta no tumba a las demas carreras
      }
    }
  } catch {
    // Sin almacenamiento no hay nada que contar
  }
  return cuenta
}
