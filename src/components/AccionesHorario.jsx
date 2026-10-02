import { useEffect, useState } from 'react'
import { Check, Download, Loader2, Share2 } from 'lucide-react'

/* Lo que se queda el check a la vista despues de terminar */
const LISTO_MS = 1800

/**
 * Lo que se hace con la imagen del horario: descargarla y, en el telefono,
 * compartirla. Flotan sobre la esquina de abajo, en el mismo cristal que las
 * islas.
 *
 * Son dos botones y no uno que decide: descargar baja el archivo de una, en
 * cualquier aparato, y compartir abre la hoja del sistema -WhatsApp, guardar
 * en la galeria- solo donde la hay. Uno solo que compartia en el telefono
 * obligaba a pasar por la hoja para tener el archivo.
 *
 * En el telefono son circulos del tamaño de la isla del avance, en fila
 * justo encima de ella; en el ordenador, una pastilla con su texto.
 */
function AccionesHorario({ alDescargar, alCompartir }) {
  return (
    <div className="acciones-horario absolute z-30 flex gap-2.5">
      {alCompartir && (
        <BotonImagen
          icono={Share2}
          texto="Compartir"
          etiqueta="Compartir el horario como imagen"
          accion={alCompartir}
        />
      )}
      <BotonImagen
        icono={Download}
        texto="Descargar horario"
        etiqueta="Descargar el horario como imagen PNG"
        accion={alDescargar}
      />
    </div>
  )
}

/**
 * Un boton que dice en que va: girando mientras se dibuja la imagen y con un
 * check cuando acabo. `accion` devuelve 'cancelado' si se cerro la hoja de
 * compartir sin elegir nada: ahi no hay check que enseñar.
 */
function BotonImagen({ icono, texto, etiqueta, accion }) {
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
      setEstado((await accion()) === 'cancelado' ? 'quieto' : 'listo')
    } catch {
      setEstado('quieto')
    }
  }

  const Icono = estado === 'trabajando' ? Loader2 : estado === 'listo' ? Check : icono

  return (
    <button
      type="button"
      onClick={pulsar}
      aria-busy={estado === 'trabajando'}
      aria-label={etiqueta}
      title={etiqueta}
      data-estado={estado}
      className="barra-cristal grid size-[52px] place-items-center rounded-full text-tinta-suave transition-[color,transform] duration-200 active:scale-[0.94] md:flex md:size-auto md:h-11 md:gap-2 md:pr-4.5 md:pl-4 md:hover:-translate-y-0.5 md:hover:text-tinta"
    >
      <Icono size={18} className={estado === 'trabajando' ? 'animate-spin' : undefined} />
      <span className="hidden text-[12.5px] font-medium md:inline">
        {estado === 'listo' ? 'Listo' : texto}
      </span>
    </button>
  )
}

export default AccionesHorario
