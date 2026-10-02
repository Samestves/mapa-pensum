import { useEffect, useState } from 'react'
import { Check, Download, Loader2 } from 'lucide-react'

/* Lo que se queda el check a la vista despues de guardar */
const LISTO_MS = 1800

/**
 * El boton de sacar el horario como imagen. Flota sobre la esquina de abajo
 * del horario, en el mismo cristal que las islas, y dice en que va: girando
 * mientras se dibuja la imagen y con un check cuando ya esta.
 *
 * Dos formas, como la barra de abajo:
 * - En el telefono, un circulo con el icono, del tamaño de la isla del
 *   avance y justo encima de ella: se lee como una pieza mas de esa columna
 *   y no como una pastilla suelta tapando las clases. El nombre va en
 *   aria-label.
 * - En el ordenador, la pastilla con su texto: ahi sobra sitio y "Descargar"
 *   se entiende sin adivinar el icono.
 *
 * `alDescargar` es la que hace el trabajo y dice como acabo: si se cancelo
 * la hoja de compartir del telefono, no hay check que enseñar.
 */
function BotonDescargar({ alDescargar }) {
  const [estado, setEstado] = useState('quieto')

  useEffect(() => {
    if (estado !== 'listo') return
    const t = setTimeout(() => setEstado('quieto'), LISTO_MS)
    return () => clearTimeout(t)
  }, [estado])

  const pulsar = async () => {
    if (estado === 'bajando') return
    setEstado('bajando')
    try {
      setEstado((await alDescargar()) === 'guardado' ? 'listo' : 'quieto')
    } catch {
      setEstado('quieto')
    }
  }

  const Icono = estado === 'bajando' ? Loader2 : estado === 'listo' ? Check : Download
  const texto = estado === 'listo' ? 'Listo' : 'Descargar horario'

  return (
    <button
      type="button"
      onClick={pulsar}
      aria-busy={estado === 'bajando'}
      aria-label="Descargar el horario como imagen"
      title="Descargar el horario como imagen PNG"
      data-estado={estado}
      className="boton-descargar barra-cristal absolute z-30 grid size-[52px] place-items-center rounded-full text-tinta-suave transition-[color,transform] duration-200 active:scale-[0.94] md:flex md:size-auto md:h-11 md:gap-2 md:pr-4.5 md:pl-4 md:hover:-translate-y-0.5 md:hover:text-tinta"
    >
      <Icono size={18} className={estado === 'bajando' ? 'animate-spin' : undefined} />
      <span className="hidden text-[12.5px] font-medium md:inline">{texto}</span>
    </button>
  )
}

export default BotonDescargar
