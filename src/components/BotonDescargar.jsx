import { useEffect, useState } from 'react'
import { Check, Download, Loader2 } from 'lucide-react'

/* Lo que se queda el check a la vista despues de terminar */
const LISTO_MS = 1800

/**
 * El boton de sacar el horario como imagen. Flota sobre la esquina de abajo
 * del horario, en el mismo cristal que las islas, y dice en que va: girando
 * mientras se dibuja la imagen y con un check cuando ya esta.
 *
 * Un solo boton para las dos cosas: baja el archivo de una y, en el
 * telefono, abre ademas la hoja de compartir (ver Horario). Quien solo
 * queria el archivo cierra la hoja y ya lo tiene.
 *
 * En el telefono es un circulo del tamaño de la isla del avance, justo
 * encima de ella; en el ordenador, una pastilla con su texto.
 */
function BotonDescargar({ alDescargar }) {
  const [estado, setEstado] = useState('quieto')

  useEffect(() => {
    if (estado !== 'listo') return
    const t = setTimeout(() => setEstado('quieto'), LISTO_MS)
    return () => clearTimeout(t)
  }, [estado])

  const pulsar = async () => {
    if (estado === 'trabajando') return
    setEstado('trabajando')
    try {
      await alDescargar()
      setEstado('listo')
    } catch {
      setEstado('quieto')
    }
  }

  const Icono = estado === 'trabajando' ? Loader2 : estado === 'listo' ? Check : Download

  return (
    <button
      type="button"
      onClick={pulsar}
      aria-busy={estado === 'trabajando'}
      aria-label="Descargar el horario como imagen"
      title="Descargar el horario como imagen PNG"
      data-estado={estado}
      className="boton-descargar barra-cristal absolute z-30 grid size-[52px] place-items-center rounded-full text-tinta-suave transition-[color,transform] duration-200 active:scale-[0.94] md:flex md:size-auto md:h-11 md:gap-2 md:pr-4.5 md:pl-4 md:hover:-translate-y-0.5 md:hover:text-tinta"
    >
      <Icono size={18} className={estado === 'trabajando' ? 'animate-spin' : undefined} />
      <span className="hidden text-[12.5px] font-medium md:inline">
        {estado === 'listo' ? 'Listo' : 'Descargar horario'}
      </span>
    </button>
  )
}

export default BotonDescargar
