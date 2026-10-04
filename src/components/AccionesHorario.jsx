import { useEffect, useState } from 'react'
import { Check, Copy, Download, Loader2, MoreHorizontal, Share2 } from 'lucide-react'

/* Lo que se queda el check a la vista despues de terminar */
const LISTO_MS = 1800

const QUIETO = 'quieto'
const TRABAJANDO = 'trabajando'
const LISTO = 'listo'

/**
 * Un boton que hace algo que tarda -dibujar la imagen del horario- y dice en
 * que va: gira mientras trabaja y enseña un check cuando ya esta.
 *
 * `alPulsar` puede devolver false para decir que al final no se hizo -quien
 * abre la hoja de compartir y la cierra sin mandar nada no ha compartido-, y
 * entonces no hay check que enseñar.
 */
function BotonAccion({ icono, etiqueta, hecho, conTexto, alPulsar }) {
  const [estado, setEstado] = useState(QUIETO)

  useEffect(() => {
    if (estado !== LISTO) return
    const reloj = setTimeout(() => setEstado(QUIETO), LISTO_MS)
    return () => clearTimeout(reloj)
  }, [estado])

  const pulsar = async () => {
    if (estado === TRABAJANDO) return
    setEstado(TRABAJANDO)
    try {
      setEstado((await alPulsar()) === false ? QUIETO : LISTO)
    } catch {
      setEstado(QUIETO)
    }
  }

  const Icono = estado === TRABAJANDO ? Loader2 : estado === LISTO ? Check : icono

  return (
    <button
      type="button"
      onClick={pulsar}
      aria-busy={estado === TRABAJANDO}
      aria-label={etiqueta}
      title={conTexto ? undefined : etiqueta}
      data-con-texto={conTexto || undefined}
      className="accion-horario"
    >
      <Icono
        size={17}
        strokeWidth={1.6}
        className={estado === TRABAJANDO ? 'animate-spin' : undefined}
      />
      {conTexto && <span>{estado === LISTO ? hecho : etiqueta}</span>}
    </button>
  )
}

/**
 * Lo que se le puede hacer al horario entero: sacarlo de la aplicacion y lo
 * demas, que va en un menu.
 *
 * Compartir y copiar son la misma accion en dos aparatos -mandarle el horario
 * a alguien-: en el telefono la hoja de compartir del sistema, en el
 * ordenador el portapapeles, que se pega en cualquier chat. Sale la que este
 * aparato sabe hacer; llegan como null las que no. Con el horario vacio no
 * hay nada que sacar y llegan las tres asi: queda solo el menu.
 *
 * @param {boolean} props.conTexto  con la palabra al lado del icono: en escritorio
 * @param {(boton: HTMLElement) => void} props.alAbrirMas  abre el menu de lo demas
 */
function AccionesHorario({
  conTexto = false,
  masAbierto,
  alCompartir,
  alCopiar,
  alDescargar,
  alAbrirMas,
}) {
  return (
    <div className={`flex shrink-0 items-center ${conTexto ? 'gap-1' : '-mr-2.5'}`}>
      {alCompartir && (
        <BotonAccion
          icono={Share2}
          etiqueta="Compartir"
          hecho="Compartido"
          conTexto={conTexto}
          alPulsar={alCompartir}
        />
      )}
      {alCopiar && (
        <BotonAccion
          icono={Copy}
          etiqueta="Copiar imagen"
          hecho="Copiada"
          conTexto={conTexto}
          alPulsar={alCopiar}
        />
      )}
      {alDescargar && (
        <BotonAccion
          icono={Download}
          etiqueta="Descargar"
          hecho="Descargado"
          conTexto={conTexto}
          alPulsar={alDescargar}
        />
      )}
      <button
        type="button"
        aria-label="Más acciones del horario"
        aria-expanded={masAbierto}
        onClick={(e) => alAbrirMas(e.currentTarget)}
        className="accion-horario"
      >
        <MoreHorizontal size={18} strokeWidth={1.6} />
      </button>
    </div>
  )
}

export default AccionesHorario
