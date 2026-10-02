import { useCallback, useState } from 'react'

/* Marca para salir todos los avisos que haya en pantalla */
const retirarTodos = (lista) => lista.map((a) => (a.retirar ? a : { ...a, retirar: true }))

/**
 * Los avisos de lo que acabas de aprobar (ver AvisoRecogida): una materia
 * desde su ficha o un semestre entero desde su cabecera.
 *
 * Una lista y no uno solo, aunque en pantalla nunca haya mas de uno: si
 * apruebas otra cosa con un aviso todavia puesto, el viejo tiene que salir
 * con su animacion mientras el nuevo entra. Con uno solo, el nuevo
 * reemplazaba al viejo de golpe y durante un segundo no habia ninguno.
 * Todos menos el ultimo van con `retirar`.
 *
 * Cada aviso lleva `antes`, la marca que tenia cada materia que cambio, que
 * es justo lo que hay que volver a poner para deshacerlo; `etiqueta` y
 * `nombre`, lo que se aprobo; `desbloqueadas`, los nombres de lo que se
 * abrio, e `inmediato` si no hay luz de cable que esperar para entrar. Uno
 * `neutro` -desmarcar- va en gris y cuenta su `detalle` en vez de lo que se
 * abrio.
 */
export function useAvisos() {
  const [avisos, setAvisos] = useState([])

  const avisar = useCallback(
    (aviso) => setAvisos((lista) => [...retirarTodos(lista), { ...aviso, n: Date.now() }]),
    [],
  )
  const cerrarAviso = useCallback((n) => setAvisos((lista) => lista.filter((a) => a.n !== n)), [])
  const retirarAvisos = useCallback(
    () => setAvisos((lista) => (lista.length ? retirarTodos(lista) : lista)),
    [],
  )

  const vaciarAvisos = useCallback(() => setAvisos((lista) => (lista.length ? [] : lista)), [])

  return { avisos, avisar, cerrarAviso, retirarAvisos, vaciarAvisos }
}
