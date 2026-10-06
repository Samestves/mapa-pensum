import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { enReposo } from '../data/reposo'

/**
 * Pinta `children` una vez, invisible, cuando el aparato esta en reposo, y
 * lo quita al fotograma siguiente.
 *
 * La primera vez que se abre algo es mucho mas lenta que las siguientes: el
 * navegador compila el codigo de esos componentes y prepara cada tamaño de
 * letra que no habia usado. Medido a CPU x4, abrir el avance costaba 170 ms
 * la primera vez y 45 la segunda, y en un telefono modesto esa primera vez
 * era el tiron que se notaba al tocar. Asi esa primera vez pasa antes, sin
 * que nadie espere por ella.
 *
 * Invisible pero maquetado -visibility y no display-, que es lo que prepara
 * las letras. Fuera de la pantalla, sin puntero y fuera del arbol de
 * accesibilidad.
 */
export default function Precalentar({ children }) {
  const [fase, setFase] = useState('esperando')

  useEffect(() => {
    if (fase === 'esperando') return enReposo(() => setFase('pintando'))
    if (fase === 'pintando') {
      const id = requestAnimationFrame(() => setFase('hecho'))
      return () => cancelAnimationFrame(id)
    }
  }, [fase])

  if (fase !== 'pintando') return null
  return createPortal(
    <div aria-hidden="true" inert className="precalentar">
      {children}
    </div>,
    document.body,
  )
}
