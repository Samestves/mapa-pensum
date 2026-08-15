import { useEffect } from 'react'

/**
 * Escape cierra lo que este abierto encima.
 *
 * Estaba escrito palabra por palabra en cuatro sitios -el menu de una clase,
 * el avance, el plan de ruta y la ficha del horario- y en un quinto a medias.
 * Cinco lineas identicas repetidas no molestan hasta el dia que una de las
 * copias se queda atras: basta que alguien añada un panel y se olvide de
 * copiarlas para que ese sea el unico que no responda a Escape, y eso no lo
 * nota nadie hasta que lo prueba con el teclado. Que sea una linea en el
 * componente hace que olvidarla se vea.
 *
 * Escucha en document y no en el panel: quien acaba de abrir algo casi nunca
 * tiene el foco dentro, asi que un manejador colgado del panel solo
 * responderia despues de tabular hasta el.
 *
 * `activo` existe para los que solo escuchan mientras estan en un estado
 * concreto -la confirmacion de borrar, por ejemplo-. Apagado no engancha
 * nada, en vez de enganchar y no hacer caso.
 */
export function useCerrarConEscape(alCerrar, activo = true) {
  useEffect(() => {
    if (!activo) return
    const tecla = (e) => e.key === 'Escape' && alCerrar()
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [alCerrar, activo])
}
