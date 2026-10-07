import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

/**
 * Imprimir sin tener la hoja de papel montada todo el rato.
 *
 * La copia que va a la impresora se monta justo antes de imprimir y se quita
 * al terminar: mantenerla montada obligaba a rehacerla en cada movimiento del
 * mando de carga sin que nadie la viera. flushSync la deja pintada y medida
 * antes de que el navegador tome la foto. Tambien se engancha a beforeprint,
 * para que Ctrl+P con el plan abierto saque la hoja y no la pantalla.
 */
export default function useImpresion() {
  const [imprimiendo, setImprimiendo] = useState(false)

  useEffect(() => {
    const antes = () => flushSync(() => setImprimiendo(true))
    const despues = () => setImprimiendo(false)
    window.addEventListener('beforeprint', antes)
    window.addEventListener('afterprint', despues)
    return () => {
      window.removeEventListener('beforeprint', antes)
      window.removeEventListener('afterprint', despues)
    }
  }, [])

  const imprimir = () => {
    flushSync(() => setImprimiendo(true))
    window.print()
  }

  return { imprimiendo, imprimir }
}
