import { useCallback, useEffect, useState } from 'react'

const CLAVE = 'mapa-pensum:tema'

function temaInicial() {
  const guardado = localStorage.getItem(CLAVE)
  if (guardado === 'claro' || guardado === 'oscuro') return guardado
  // Si el sistema pide claro se respeta; si no, oscuro por defecto
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'oscuro'
}

export function useTema() {
  const [tema, setTema] = useState(temaInicial)

  useEffect(() => {
    document.documentElement.dataset.tema = tema
    localStorage.setItem(CLAVE, tema)
  }, [tema])

  const alternarTema = useCallback(
    () => setTema((t) => (t === 'oscuro' ? 'claro' : 'oscuro')),
    [],
  )

  return { tema, alternarTema }
}
