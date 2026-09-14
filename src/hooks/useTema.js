import { useCallback, useEffect, useState } from 'react'
import { guardar, leer } from '../data/almacen'

const CLAVE = 'mapa-pensum:tema'

function temaInicial() {
  const guardado = leer(CLAVE)
  if (guardado === 'claro' || guardado === 'oscuro') return guardado
  /* Oscuro siempre, sin preguntarle al sistema. Antes se respetaba
     prefers-color-scheme, y el resultado era que a quien lleva Windows en
     claro -o sea, casi todo el mundo- la aplicacion se le abria en claro sin
     haberlo pedido. El mapa esta pensado en oscuro: los ocho colores de area
     estan calibrados sobre lienzo negro y es ahi donde se distinguen mejor.
     Quien prefiera claro lo elige una vez y se le recuerda. */
  return 'oscuro'
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
