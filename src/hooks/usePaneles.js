import { useCallback, useState } from 'react'

/**
 * Que panel flotante esta abierto sobre el mapa.
 *
 * Son excluyentes: el de avance y el de avisos salen del mismo sitio de la
 * cabecera y se solapan en pantalla, asi que abrir uno cierra el otro. Esa
 * regla estaba escrita tres veces en VistaCarrera -al abrir avance, al abrir
 * avisos y al esconder la barra-, y cada sitio tenia que acordarse de apagar
 * el otro a mano. Con un solo valor la regla desaparece: no hay nada que
 * coordinar porque no puede haber dos.
 *
 * Se guarda cual esta abierto y no un booleano por panel, que es justo lo
 * que permitia el estado imposible de tener los dos a la vez.
 */
export function usePaneles() {
  const [abierto, setAbierto] = useState(null)

  const alternar = useCallback((panel) => {
    setAbierto((previo) => (previo === panel ? null : panel))
  }, [])

  const cerrar = useCallback(() => setAbierto(null), [])

  return { abierto, alternar, cerrar }
}
