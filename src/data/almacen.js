/**
 * El almacen del navegador, que no puede tumbar la aplicacion.
 *
 * localStorage no siempre existe aunque el navegador lo declare. Con los datos
 * de sitio bloqueados -una casilla que cualquiera puede marcar en Chrome, y lo
 * que hace Safari en algunas configuraciones-, CUALQUIER acceso lanza
 * SecurityError, incluida la simple lectura. No hay forma de preguntar antes:
 * hay que intentarlo y fallar.
 *
 * Seis de los nueve sitios que lo usaban ya lo envolvian en try/catch, con un
 * comentario que decia "modo privado: no pasa nada". Los otros tres no, y uno
 * de ellos era el tema, que se lee al arrancar. Comprobado con los datos de
 * sitio bloqueados: la excepcion subia por el render y React desmontaba el
 * arbol entero -de 66.283 caracteres de HTML a 0-. Pantalla en blanco por no
 * poder recordar un color.
 *
 * Que la defensa estuviera en seis sitios y faltara en tres no es mala suerte:
 * es lo que pasa siempre que una precaucion depende de que cada quien se
 * acuerde. Aqui el que se acuerda es el modulo, y no hay forma de saltarselo
 * sin escribir localStorage a mano.
 *
 * Guardar devuelve si pudo. Nadie lo mira todavia -perder una preferencia no
 * merece interrumpir a nadie-, pero el dia que algo si tenga que enterarse, el
 * dato esta ahi en vez de haberse tragado en silencio.
 */
export function leer(clave, porDefecto = null) {
  try {
    return localStorage.getItem(clave) ?? porDefecto
  } catch {
    return porDefecto
  }
}

export function guardar(clave, valor) {
  try {
    localStorage.setItem(clave, valor)
    return true
  } catch {
    return false
  }
}

/**
 * Lo mismo para lo que se guarda como JSON.
 *
 * El catch cubre las dos averias de golpe, que es justo lo que se quiere: el
 * almacen bloqueado y el JSON corrupto acaban igual -sin dato- y quien llama
 * no tiene por que distinguirlas para hacer lo mismo en los dos casos.
 */
export function leerJSON(clave, porDefecto) {
  try {
    const crudo = localStorage.getItem(clave)
    return crudo == null ? porDefecto : JSON.parse(crudo)
  } catch {
    return porDefecto
  }
}

export function guardarJSON(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
    return true
  } catch {
    return false
  }
}
