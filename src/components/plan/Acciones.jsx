import { Check, Download, ImageDown, Loader2, Share } from 'lucide-react'
import { useEffect, useState } from 'react'

import { puedeCompartir } from '../../data/compartir'

/* Lo que se queda el check a la vista despues de compartir */
const LISTO_MS = 1800

/**
 * Compartir la ruta como imagen y guardarla en PDF. El de compartir dice en
 * que va, como el de bajar el horario: girando mientras se dibuja la imagen
 * y con un check cuando salio. En el ordenador baja la imagen, y su icono lo
 * dice.
 */
export default function Acciones({ alImprimir, alCompartir, deshabilitado }) {
  const [enTelefono] = useState(puedeCompartir)
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
      // Cerrar la hoja de compartir sin mandar nada no merece un check
      setEstado((await alCompartir()) ? 'listo' : 'quieto')
    } catch {
      setEstado('quieto')
    }
  }

  const Icono =
    estado === 'trabajando' ? Loader2 : estado === 'listo' ? Check : enTelefono ? Share : ImageDown
  const etiqueta = enTelefono ? 'Compartir mi ruta como imagen' : 'Descargar mi ruta como imagen'

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={pulsar}
        disabled={deshabilitado}
        aria-busy={estado === 'trabajando'}
        title={etiqueta}
        aria-label={etiqueta}
        className="barra-cristal relative grid size-[52px] shrink-0 place-items-center rounded-full text-tinta-suave transition-transform active:scale-95 disabled:opacity-40"
      >
        <Icono
          size={18}
          strokeWidth={estado === 'listo' ? 2.2 : 1.9}
          className={
            estado === 'trabajando'
              ? 'animate-spin'
              : estado === 'listo'
                ? 'text-aprobada'
                : undefined
          }
        />
      </button>
      <button
        type="button"
        onClick={alImprimir}
        disabled={deshabilitado}
        className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-full bg-aprobada text-[15.5px] font-semibold text-[var(--lienzo)] transition-transform active:scale-[0.98] disabled:opacity-40"
      >
        <Download size={17} strokeWidth={2.2} />
        Guardar PDF
      </button>
    </div>
  )
}
