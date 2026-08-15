import { useCallback, useEffect, useState } from 'react'
import { guardar, leer } from '../data/almacen'

const CLAVE = 'mapa-pensum:tema'

function temaInicial() {
  const guardado = leer(CLAVE)
  if (guardado === 'claro' || guardado === 'oscuro') return guardado
  // Si el sistema pide claro se respeta; si no, oscuro por defecto
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'oscuro'
}

export function useTema() {
  const [tema, setTema] = useState(temaInicial)

  useEffect(() => {
    document.documentElement.dataset.tema = tema
    guardar(CLAVE, tema)
  }, [tema])

  const alternarTema = useCallback(
    () => setTema((t) => (t === 'oscuro' ? 'claro' : 'oscuro')),
    [],
  )

  return { tema, alternarTema }
}
